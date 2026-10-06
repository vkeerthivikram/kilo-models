import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { ThemeMode } from "../src/lib/themes";

export async function scanThemeSurfaces(page: Page, testInfo: TestInfo, theme: string, mode: ThemeMode, scanGrid = false) {
  await page.addInitScript(({ colorTheme, colorMode }) => {
    localStorage.setItem("kilo-color-theme", colorTheme);
    localStorage.setItem("theme", colorMode);
  }, { colorTheme: theme, colorMode: mode });

  async function scan(surface: string) {
    await expect(page.locator("html")).toHaveAttribute("data-kilo-theme", theme);
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${mode}\\b`));
    await expect(page).toHaveTitle(/\S/);
    const titleBefore = await page.evaluate(() => ({
      title: document.title,
      elements: Array.from(document.querySelectorAll("title"), (element) => ({ html: element.outerHTML, parent: element.parentElement?.tagName })),
    }));
    const result = await new AxeBuilder({ page }).analyze();
    const titleAfter = await page.evaluate(() => ({
      title: document.title,
      elements: Array.from(document.querySelectorAll("title"), (element) => ({ html: element.outerHTML, parent: element.parentElement?.tagName })),
    }));
    const documentPath = testInfo.outputPath(`${surface}-${theme}-${mode}-document.json`);
    await writeFile(documentPath, JSON.stringify({ before: titleBefore, after: titleAfter, frames: page.frames().map((frame) => frame.url()) }, null, 2));
    await testInfo.attach(`${surface}-document.json`, { path: documentPath, contentType: "application/json" });
    const fileName = `${surface}-${theme}-${mode}-axe.json`;
    const path = testInfo.outputPath(fileName);
    await writeFile(path, JSON.stringify(result, null, 2));
    await testInfo.attach(fileName, { path, contentType: "application/json" });
    const violations = result.violations.map(({ id, impact, description, nodes }) => ({
      id, impact, description, nodeCount: nodes.length,
      nodes: nodes.slice(0, 5).map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
    expect.soft(violations, `${surface}: ${theme}/${mode}`).toEqual([]);
  }

  // The default cross-browser scans cover a full page of grid/list results.
  // Theme scans use one representative row to avoid rescanning identical markup.
  const directorySearch = scanGrid ? "" : "&search=Fixture%20Model%2001";
  await page.goto(`/?view=list${directorySearch}`);
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  async function expandDirectoryControls() {
    const filters = page.getByRole("button", { name: /^Filters/ });
    if (await filters.isVisible()) await filters.click();
    await page.locator("summary").filter({ hasText: "Estimate workload" }).click();
    await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toBeVisible();
    await page.getByText("Additional billing", { exact: true }).click();
    await expect(page.getByRole("spinbutton", { name: "Images per request", exact: true })).toBeVisible();
  }
  await expandDirectoryControls();
  await scan("directory-list");
  if (scanGrid) {
    // Scan a fully loaded grid; the user-facing view transition is covered by directory.e2e.ts.
    await page.goto("/?view=grid");
    await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Grid view", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL((url) => url.searchParams.get("view") === "grid");
    await expandDirectoryControls();
    await scan("directory-grid");
  }

  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("heading", { name: "Fixture Model 01", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  await page.getByText("Additional billing", { exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Images per request", exact: true })).toBeVisible();
  await scan("detail");

  await page.goto(`/?compare=fixture%2Fmodel-01%2Cfixture%2Fmodel-02${directorySearch}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Compare Models", exact: true })).toBeVisible();
  await scan("comparison-overview");
  await dialog.getByRole("tab", { name: /Cost Calculator|Costs/ }).click();
  await expect(dialog.getByRole("spinbutton", { name: "Requests", exact: true })).toBeVisible();
  await dialog.getByText("Additional billing", { exact: true }).click();
  await expect(dialog.getByRole("spinbutton", { name: "Images per request", exact: true })).toBeVisible();
  await dialog.locator("summary").filter({ hasText: "Full cost breakdown" }).click();
  await expect(dialog.getByText("Uncached input", { exact: true }).first()).toBeVisible();
  await scan("comparison-costs");
}
