import {
  KILOCODE_THEMES,
  type KiloThemeDefinition,
  type ThemeVariant,
} from "@/lib/kilocode-theme-data";

export type ColorTheme = (typeof KILOCODE_THEMES)[number]["id"];
export type ThemeMode = "light" | "dark";

type ThemeSwatch = {
  light: string;
  dark: string;
  accent: string;
};

type ThemeOption = {
  id: ColorTheme;
  name: string;
  swatch: ThemeSwatch;
};

const MODE_NEUTRAL_LUMINANCE_THRESHOLD = 0.06;

export const DEFAULT_COLOR_THEME: ColorTheme = "oc-2";

export const THEMES: readonly ThemeOption[] = KILOCODE_THEMES.map((theme) => ({
  id: theme.id,
  name: theme.name,
  swatch: {
    light: theme.light.palette.primary,
    dark: theme.dark.palette.primary,
    accent:
      ("accent" in theme.dark.palette ? theme.dark.palette.accent : undefined) ??
      theme.dark.palette.info,
  },
}));

const THEME_BY_ID = new Map<ColorTheme, KiloThemeDefinition>(
  KILOCODE_THEMES.map((theme) => [theme.id, theme]),
);

function getTheme(themeId: ColorTheme): KiloThemeDefinition {
  return THEME_BY_ID.get(themeId) ?? KILOCODE_THEMES[0];
}

function getVariant(theme: KiloThemeDefinition, mode: ThemeMode): ThemeVariant {
  return mode === "dark" ? theme.dark : theme.light;
}

function mix(base: string, tint: string, tintPercent: number): string {
  return `color-mix(in oklab, ${base} ${100 - tintPercent}%, ${tint} ${tintPercent}%)`;
}

function normalizeHex(hex: string): string | null {
  const value = hex.trim();
  if (!value.startsWith("#")) return null;

  const clean = value.slice(1);
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  if (clean.length === 6) return `#${clean}`;

  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);

  return { r, g, b };
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const toLinear = (value: number) => {
    const channel = value / 255;
    if (channel <= 0.04045) return channel / 12.92;
    return Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(colorA: string, colorB: string): number {
  const a = relativeLuminance(colorA);
  const b = relativeLuminance(colorB);
  if (a == null || b == null) return 1;

  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableText(background: string): string {
  const light = "#ffffff";
  const dark = "#000000";
  return contrastRatio(background, light) >= contrastRatio(background, dark)
    ? light
    : dark;
}

type ColorVector = [number, number, number];

// OKLab conversion uses the published reference matrices, matching CSS color-mix's space.
// https://bottosson.github.io/posts/oklab/#converting-from-linear-srgb-to-oklab
function toOklab(hex: string): ColorVector {
  const rgb = hexToRgb(hex);
  if (!rgb) return [0, 0, 0];
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([lightness, a, b]: ColorVector): string {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((value) => {
    const linear = Math.max(0, Math.min(1, value));
    const channel = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
    return Math.round(channel * 255).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function mixedHex(base: string, tint: string, tintPercent: number): string {
  const first = toOklab(base), second = toOklab(tint), amount = tintPercent / 100;
  return fromOklab(first.map((value, index) => value * (1 - amount) + second[index] * amount) as ColorVector);
}

// Resolve only the hex and OKLab mix expressions generated in this module.
function resolvedColor(color: string): string {
  const match = /^color-mix\(in oklab, (#[0-9a-f]{3,6}) \d+%, (#[0-9a-f]{3,6}) (\d+)%\)$/i.exec(color);
  return match ? mixedHex(match[1], match[2], Number(match[3])) : color;
}

function readableOnSurfaces(preferred: string, surfaces: string[], ink: string): string {
  const color = resolvedColor(preferred);
  const minimumContrast = (text: string) => Math.min(...surfaces.map((surface) => contrastRatio(text, surface)));
  // Leave headroom for browser rounding and translucent table/button surfaces.
  const target = 4.65;
  if (minimumContrast(color) >= target) return color;
  const extreme = minimumContrast("#000000") >= minimumContrast("#ffffff") ? "#000000" : "#ffffff";
  const destination = minimumContrast(ink) >= target ? ink : extreme;
  for (let percent = 1; percent <= 100; percent++) {
    const candidate = mixedHex(color, destination, percent);
    if (minimumContrast(candidate) >= target) return candidate;
  }
  return extreme;
}

function variantMatchesMode(variant: ThemeVariant, mode: ThemeMode): boolean {
  const lum = relativeLuminance(variant.palette.neutral);
  if (lum == null) return true;

  return mode === "light"
    ? lum > MODE_NEUTRAL_LUMINANCE_THRESHOLD
    : lum <= MODE_NEUTRAL_LUMINANCE_THRESHOLD;
}

export function isValidColorTheme(value: string): value is ColorTheme {
  return THEME_BY_ID.has(value as ColorTheme);
}

export function isThemeAvailableInMode(
  themeId: ColorTheme,
  mode: ThemeMode,
): boolean {
  const theme = getTheme(themeId);
  return variantMatchesMode(getVariant(theme, mode), mode);
}

export function getThemesForMode(mode: ThemeMode): readonly ThemeOption[] {
  return THEMES.filter((theme) => isThemeAvailableInMode(theme.id, mode));
}

export function getDefaultColorThemeForMode(mode: ThemeMode): ColorTheme {
  if (isThemeAvailableInMode(DEFAULT_COLOR_THEME, mode)) {
    return DEFAULT_COLOR_THEME;
  }

  const firstMatch = getThemesForMode(mode)[0];
  return firstMatch?.id ?? DEFAULT_COLOR_THEME;
}

export function buildColorThemeVariables(
  themeId: ColorTheme,
  mode: ThemeMode,
): Record<string, string> {
  const theme = getTheme(themeId);
  const variant = getVariant(theme, mode);
  const palette = variant.palette;
  const accent = palette.accent ?? palette.info;
  const interactive = palette.interactive ?? palette.primary;

  const background = palette.neutral;
  const originalInk = palette.ink;
  let foreground = originalInk;
  const card = mix(background, foreground, mode === "dark" ? 8 : 3);
  const popover = mix(background, foreground, mode === "dark" ? 10 : 4);
  const secondary = mix(background, foreground, mode === "dark" ? 14 : 8);
  const muted = mix(background, foreground, mode === "dark" ? 22 : 12);
  const accentSurface = mix(background, accent, mode === "dark" ? 24 : 14);
  const border = mix(background, foreground, mode === "dark" ? 30 : 18);
  const sidebar = mix(background, foreground, mode === "dark" ? 7 : 3);

  // Syntax-comment colors are too faint for descriptions and form labels.
  const textSurfaces = [background, card, popover, secondary, muted, accentSurface, sidebar].map(resolvedColor);
  foreground = readableOnSurfaces(originalInk, textSurfaces, originalInk);
  const mutedForeground = readableOnSurfaces(mix(background, originalInk, 78), textSurfaces, foreground);
  const primary = readableOnSurfaces(palette.primary, textSurfaces, foreground);
  const destructive = readableOnSurfaces(palette.error, textSurfaces, foreground);

  return {
    "--background": background,
    "--foreground": foreground,
    "--card": card,
    "--card-foreground": foreground,
    "--popover": popover,
    "--popover-foreground": foreground,
    "--primary": primary,
    "--primary-foreground": readableText(primary),
    "--secondary": secondary,
    "--secondary-foreground": foreground,
    "--muted": muted,
    "--muted-foreground": mutedForeground,
    "--accent": accentSurface,
    "--accent-foreground": foreground,
    "--destructive": destructive,
    "--destructive-foreground": readableText(destructive),
    "--border": border,
    "--input": border,
    "--ring": interactive,
    "--chart-1": palette.primary,
    "--chart-2": accent,
    "--chart-3": palette.success,
    "--chart-4": palette.warning,
    "--chart-5": palette.diffDelete ?? palette.error,
    "--radius": "0.5rem",
    "--sidebar": sidebar,
    "--sidebar-foreground": foreground,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": readableText(primary),
    "--sidebar-accent": accentSurface,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-border": border,
    "--sidebar-ring": interactive,
  };
}
