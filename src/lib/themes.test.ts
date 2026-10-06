import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildColorThemeVariables, getThemesForMode, type ColorTheme } from "./themes";

// WCAG 2.2 relative luminance, independently checked against black/white (21:1).
function contrast(first: string, second: string): number {
  const luminance = (hex: string) => {
    assert.match(hex, /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Text correction must resolve to an opaque color");
    if (hex.length === 4) hex = `#${hex.slice(1).split("").map((channel) => channel + channel).join("")}`;
    const channels = [1, 3, 5].map((offset) => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const firstLum = luminance(first), secondLum = luminance(second);
  return (Math.max(firstLum, secondLum) + 0.05) / (Math.min(firstLum, secondLum) + 0.05);
}

test("contrast regression fixtures use the WCAG formula and real browser backgrounds", () => {
  assert.equal(contrast("#000000", "#ffffff"), 21);
  assert.ok(Math.abs(contrast("#727a82", "#fdfaf4") - 4.18) < 0.01);
  assert.ok(contrast("#2d2d2d", "#8a8a8a") < 4.5);
});

// Backgrounds come from axe's actual OKLab-rendered browser colors, not RGB interpolation.
const cases: [ColorTheme, string[]][] = [
  ["ayu", ["#fdfaf4", "#f7f5ef"]],
  ["carbonfox", ["#8e8e8e", "#8a8a8a"]],
  ["catppuccin", ["#f5e0dc"]],
  ["catppuccin-latte", ["#eff1f5"]],
  ["everforest", ["#fdf6e3"]],
  ["kanagawa", ["#ede4d9", "#e7ddd2", "#ece2d8"]],
  ["rose-pine-dawn", ["#faf4ed"]],
  ["solarized", ["#fdf6e3"]],
  ["tokyonight-light", ["#e1e2e7"]],
];

for (const [theme, backgrounds] of cases) {
  test(`${theme} light muted text clears 4.5:1 on the failing browser surfaces`, () => {
    const variables = buildColorThemeVariables(theme, "light");
    for (const background of backgrounds) assert.ok(contrast(variables["--muted-foreground"], background) >= 4.5);
  });
}

test("Night Owl primary button text meets 4.5:1 instead of choosing an insufficient near-black", () => {
  const variables = buildColorThemeVariables("nightowl", "light");
  assert.ok(contrast(variables["--primary-foreground"], variables["--primary"]) >= 4.5);
});

test("Catppuccin Frappe dark muted text clears the rendered raised-surface contrast failure", () => {
  assert.ok(contrast(buildColorThemeVariables("catppuccin-frappe", "dark")["--muted-foreground"], "#3c4155") >= 4.5);
});

test("primary and destructive colors remain readable when used as body text", () => {
  for (const theme of ["ayu", "carbonfox", "catppuccin"] as const) {
    const variables = buildColorThemeVariables(theme, "light");
    for (const role of ["--primary", "--destructive"]) assert.ok(contrast(variables[role], variables["--background"]) >= 4.5);
  }
});

test("every selectable palette keeps normal text and colored button labels above the WCAG floor", () => {
  for (const mode of ["light", "dark"] as const) {
    for (const theme of getThemesForMode(mode)) {
      const variables = buildColorThemeVariables(theme.id, mode);
      for (const role of ["--foreground", "--muted-foreground", "--primary", "--destructive"]) {
        assert.ok(contrast(variables[role], variables["--background"]) >= 4.5, `${theme.id}/${mode} ${role} body text`);
      }
      assert.ok(contrast(variables["--primary-foreground"], variables["--primary"]) >= 4.5, `${theme.id}/${mode} primary button`);
      assert.ok(contrast(variables["--destructive-foreground"], variables["--destructive"]) >= 4.5, `${theme.id}/${mode} destructive button`);
    }
  }
});
