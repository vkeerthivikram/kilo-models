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
    if (channel <= 0.03928) return channel / 12.92;
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
  const dark = "#111111";
  return contrastRatio(background, light) >= contrastRatio(background, dark)
    ? light
    : dark;
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
  const foreground = palette.ink;
  const card = mix(background, foreground, mode === "dark" ? 8 : 3);
  const popover = mix(background, foreground, mode === "dark" ? 10 : 4);
  const secondary = mix(background, foreground, mode === "dark" ? 14 : 8);
  const muted = mix(background, foreground, mode === "dark" ? 22 : 12);
  const accentSurface = mix(background, accent, mode === "dark" ? 24 : 14);
  const border = mix(background, foreground, mode === "dark" ? 30 : 18);
  const sidebar = mix(background, foreground, mode === "dark" ? 7 : 3);

  const mutedForeground =
    variant.overrides?.["text-weak"] ??
    variant.overrides?.["syntax-comment"] ??
    mix(background, foreground, mode === "dark" ? 56 : 52);

  return {
    "--background": background,
    "--foreground": foreground,
    "--card": card,
    "--card-foreground": foreground,
    "--popover": popover,
    "--popover-foreground": foreground,
    "--primary": palette.primary,
    "--primary-foreground": readableText(palette.primary),
    "--secondary": secondary,
    "--secondary-foreground": foreground,
    "--muted": muted,
    "--muted-foreground": mutedForeground,
    "--accent": accentSurface,
    "--accent-foreground": readableText(accent),
    "--destructive": palette.error,
    "--destructive-foreground": readableText(palette.error),
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
    "--sidebar-primary": palette.primary,
    "--sidebar-primary-foreground": readableText(palette.primary),
    "--sidebar-accent": accentSurface,
    "--sidebar-accent-foreground": readableText(accent),
    "--sidebar-border": border,
    "--sidebar-ring": interactive,
  };
}
