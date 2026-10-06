import { test } from "@playwright/test";
import { DEFAULT_COLOR_THEME, type ThemeMode } from "../src/lib/themes";
import { scanThemeSurfaces } from "./accessibility";

for (const mode of ["light", "dark"] satisfies ThemeMode[]) {
  test(`accessibility: directory, detail and comparison in default ${mode} theme`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await scanThemeSurfaces(page, testInfo, DEFAULT_COLOR_THEME, mode, true);
  });
}
