import { expect, test } from "@playwright/test";
import { catalog } from "./catalog";

test("comparison totals fit phone widths, update with usage and precede saved setups", async ({ page }, testInfo) => {
  await page.goto("/?compare=fixture/model-01,fixture/model-02");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: /Costs|Cost Calculator/ }).click();
  const table = dialog.getByRole("table", { name: "Estimated costs, lowest available total first" });
  await expect(table.getByRole("columnheader")).toHaveCount(2);
  await expect(table.getByRole("cell", { name: "$23.0000", exact: true })).toBeVisible();
  await dialog.getByRole("spinbutton", { name: "Requests", exact: true }).fill("100");
  await dialog.getByRole("spinbutton", { name: "Requests", exact: true }).press("Enter");
  await expect(table.getByRole("cell", { name: "$2.3000", exact: true })).toBeVisible();
  const region = dialog.getByRole("region", { name: "Cost estimates", exact: true });
  await expect.poll(() => region.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const beforeSaved = await table.evaluate((element) => {
    const saved = element.closest('[role="dialog"]')?.querySelector('section[aria-labelledby]');
    return saved && Boolean(element.compareDocumentPosition(saved) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(beforeSaved).toBe(true);
  await region.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("comparison-totals.png") });
  await dialog.locator("summary").filter({ hasText: "Full cost breakdown" }).click();
  await expect(dialog.getByText("Uncached input", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("Request fee", { exact: true }).first()).toBeVisible();
});

test("pricing chart distinguishes shared names and uses input and output labels", async ({ page }) => {
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    data: catalog.slice(0, 2).map((model, index) => ({ ...model, name: index === 0 ? "AionLabs: Aion 3.5" : "AionLabs: Aion 3.5 Mini" })), fetchedAt: new Date().toISOString(),
  }) }));
  await page.goto("/?compare=fixture/model-01,fixture/model-02");
  await page.getByRole("tab", { name: "Charts", exact: true }).click();
  const pricing = page.getByRole("region", { name: "Pricing comparison", exact: true });
  for (const label of ["1. Aion 3.5", "2. Aion 3.5 Mini", "Input", "Output"]) {
    await expect(pricing.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(pricing.getByRole("list", { name: "Chart models" })).toContainText("AionLabs: Aion 3.5 Mini");
});

test("phone landing page exposes first model prices within the initial viewport", async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, "Phone density check");
  await page.goto("/");
  const firstModel = page.locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "Fixture Model 01", exact: true }) });
  await expect(firstModel.getByText("$1/M", { exact: true })).toBeVisible();
  expect(await firstModel.getByText("$1/M", { exact: true }).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("compact-directory.png") });
});
