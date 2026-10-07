import { test } from "@playwright/test";
import { DEFAULT_COLOR_THEME, getThemesForMode, type ThemeMode } from "../src/lib/themes";
import { scanThemeSurfaces } from "./accessibility";

// Every available theme/mode pair is scanned in Chromium. Default light/dark
// smoke scans run in every browser and viewport project in the companion spec.
for (const mode of ["light", "dark"] satisfies ThemeMode[]) {
  for (const theme of getThemesForMode(mode).filter(({ id }) => id !== DEFAULT_COLOR_THEME)) {
    test(`accessibility: ${theme.name} ${mode} directory, detail and comparison`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await scanThemeSurfaces(page, testInfo, theme.id, mode);
    });
  }
}
