import { expect, test } from "@playwright/test";
import { catalog } from "./catalog";
import { readFile } from "node:fs/promises";

test("search shortcut respects editing and provider search preserves selected choices", async ({ page }) => {
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: catalog.slice(0, 2).map((model, index) => ({ ...model, id: `${index === 0 ? "alpha" : "zeta"}/model` })), fetchedAt: new Date().toISOString() }) }));
  await page.goto("/");
  // Loaded models prove client hydration/effects are ready; the search shell is server-rendered.
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const search = page.getByRole("textbox", { name: "Search models", exact: true });
  await expect(search).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await page.keyboard.type("/");
  await expect(search).toHaveValue("/");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  const filters = page.getByRole("button", { name: /^Filters/ });
  if (await filters.isVisible()) await filters.click();
  await page.getByRole("button", { name: "All providers", exact: true }).click();
  const chooser = page.getByRole("group", { name: "Choose providers" });
  await chooser.getByRole("checkbox", { name: /^zeta/i }).check();
  await page.getByRole("textbox", { name: "Search providers", exact: true }).fill("no-such-provider");
  await page.getByRole("button", { name: "Clear provider search", exact: true }).click();
  await expect(chooser.getByRole("checkbox").first()).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Search providers", exact: true })).toBeFocused();
});

test("usage resets preserve filters and comparison while summaries expose restored assumptions", async ({ page }) => {
  await page.goto("/?tools=true&inputTokens=3000&images=2&cachePercent=25&requests=7&period=month");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Fixture Model 01 to comparison", exact: true }).click();
  const summary = page.locator("summary").filter({ hasText: "Estimate workload" });
  await expect(summary).toContainText("25% cached");
  await summary.click();
  await page.getByRole("button", { name: "Clear advanced usage", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Input tokens per request", exact: true })).toHaveValue("3000");
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("7");
  await page.getByRole("button", { name: "Reset usage", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Input tokens per request", exact: true })).toHaveValue("2000");
  await expect(page).toHaveURL((url) => url.searchParams.get("tools") === "true" && url.searchParams.get("compare") === "fixture/model-01" && !url.searchParams.has("images"));
});

test("empty results offer a targeted recovery and budget links directly to usage", async ({ page }) => {
  await page.goto("/?maxBudget=0.000001");
  await expect(page.getByRole("heading", { name: "No models found", exact: true })).toBeVisible();
  const filters = page.getByRole("button", { name: /^Filters/ });
  if (await filters.isVisible()) await filters.click();
  await page.getByRole("button", { name: "Edit budget workload", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Input tokens per request", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Remove budget limit", exact: true }).click();
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
});

test("saved setup preview identifies applied and changed usage", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  const setups = page.getByRole("region", { name: "Saved setups", exact: true });
  await setups.getByRole("textbox", { name: "Setup name", exact: true }).fill("Daily chat");
  await setups.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(setups.getByText(/^Preview:/)).toContainText("1,000 requests/batch");
  await setups.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(setups.getByText("Active setup: Daily chat", { exact: true })).toBeVisible();
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).fill("7");
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).press("Enter");
  await expect(setups.getByText("Changed since applying Daily chat.", { exact: true })).toBeVisible();
});

test("comparison opens with essentials and keeps detailed tools discoverable", async ({ page }, testInfo) => {
  await page.goto("/?compare=fixture%2Fmodel-01%2Cfixture%2Fmodel-02");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Compare Models", exact: true })).toBeVisible();
  await expect(dialog.getByRole("rowheader", { name: "Tokenizer", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("rowheader", { name: /^Estimated batch cost/ })).toBeVisible();
  if (["desktop-chromium", "mobile-chromium"].includes(testInfo.project.name)) {
    const path = testInfo.outputPath("comparison-essentials.png");
    await page.screenshot({ path });
    await testInfo.attach("comparison-essentials", { path, contentType: "image/png" });
  }
  await dialog.getByRole("checkbox", { name: "Full specifications", exact: true }).check();
  await expect(dialog.getByRole("rowheader", { name: "Tokenizer", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Export CSV", exact: true })).toBeHidden();
  await dialog.locator("summary").filter({ hasText: "More actions" }).click();
  await expect(dialog.getByRole("button", { name: "Export CSV", exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("kilo-model-comparison.csv");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const csv = await readFile(downloadPath!, "utf8");
  expect(csv).toContain("Fixture Model 01");
  expect(csv).toContain("Fixture Model 02");
  await page.keyboard.press("/");
  await expect(dialog.getByRole("heading", { name: "Compare Models", exact: true })).toBeVisible();
  const costsTab = dialog.getByRole("tab", { name: /Cost Calculator|Costs/ });
  await costsTab.click();
  await dialog.getByRole("textbox", { name: "Setup name", exact: true }).fill("Compare daily");
  await dialog.getByRole("button", { name: "Save setup", exact: true }).click();
  await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
  await costsTab.click();
  await expect(dialog.getByText("Active setup: Compare daily", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close comparison", exact: true }).click();
});

test("list preference survives a new visit but explicit shared view wins", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/?view=grid");
  await expect(page.getByRole("button", { name: "Grid view", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("collapsing calculator inputs keeps limits and cost visible", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-01?outputTokens=999999");
  await expect(page.getByText(/Output exceeds this model/)).toBeVisible();
  await page.getByRole("button", { name: "Cost Calculator", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Input tokens per request", exact: true })).toBeHidden();
  await expect(page.getByText(/Output exceeds this model/)).toBeVisible();
  await expect(page.getByText("Per request", { exact: true }).first()).toBeVisible();
});
