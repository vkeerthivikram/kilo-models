import { expect, test, type Page } from "@playwright/test";

async function revealFilters(page: Page) {
  const button = page.getByRole("button", { name: /^Filters/ });
  if (await button.isVisible()) await button.click();
}

test("everyday directory keeps detailed filters behind a keyboard-accessible disclosure", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await revealFilters(page);
  await expect(page.getByRole("button", { name: /^Free models only/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "All providers", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Tool calling/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search providers", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "All providers", exact: true }).click();
  await page.getByRole("textbox", { name: "Search providers", exact: true }).fill("fixture");
  const provider = page.getByRole("checkbox", { name: /^fixture/i });
  await provider.focus();
  await provider.press("Space");
  await expect(provider).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "1 selected", exact: true })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Search providers", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Remove filter: Provider: fixture", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove filter: Provider: fixture", exact: true }).click();
  const advanced = page.locator("summary").filter({ hasText: "Advanced filters" });
  await expect(advanced).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Minimum context · tokens", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Fits workload", exact: true })).toBeHidden();
  await advanced.focus();
  await advanced.press("Enter");
  await page.getByRole("spinbutton", { name: "Minimum context · tokens", exact: true }).fill("20000");
  await page.getByRole("spinbutton", { name: "Minimum context · tokens", exact: true }).press("Tab");
  await expect(page).toHaveURL((url) => url.searchParams.get("minContext") === "20000");
  await advanced.click();
  await expect(page.getByRole("button", { name: "Remove filter: Context ≥ 20,000 tokens", exact: true })).toBeVisible();
  await page.reload();
  await revealFilters(page);
  await expect(page.getByRole("spinbutton", { name: "Minimum context · tokens", exact: true })).toHaveValue("20000");
  await expect(advanced).toContainText("1 active");
  await page.getByRole("button", { name: "Remove filter: Context ≥ 20,000 tokens", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Minimum context · tokens", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Fixture Model \d+$/ })).toHaveCount(24);
  if (["desktop-chromium", "mobile-chromium"].includes(testInfo.project.name)) {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
    const path = testInfo.outputPath("simple-directory.png");
    await page.screenshot({ path });
    await testInfo.attach("simple-directory", { path, contentType: "image/png" });
  }
});

test("calculator starts with three inputs while advanced usage remains editable and survives sharing", async ({ page }, testInfo) => {
  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  await expect(page.getByRole("spinbutton")).toHaveCount(3);
  await expect(page.getByRole("combobox", { name: "Estimate period", exact: true })).toBeHidden();
  const advanced = page.locator("summary").filter({ hasText: "Advanced usage" });
  await advanced.focus();
  await advanced.press("Enter");
  await page.getByRole("spinbutton", { name: "Cached input (%)", exact: true }).fill("25.5");
  await page.getByRole("spinbutton", { name: "Cached input (%)", exact: true }).press("Enter");
  await page.getByRole("combobox", { name: "Estimate period", exact: true }).selectOption("month");
  await page.getByRole("spinbutton", { name: "Images per request", exact: true }).fill("2");
  await page.getByRole("spinbutton", { name: "Images per request", exact: true }).press("Enter");
  await expect(page).toHaveURL((url) => url.searchParams.get("cachePercent") === "25.5" && url.searchParams.get("images") === "2" && url.searchParams.get("period") === "month");
  await page.reload();
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  await expect(advanced).toContainText("25.5% cached");
  await expect(advanced).toContainText("2 images/request");
  await expect(page.getByRole("spinbutton", { name: "Cached input (%)", exact: true })).toHaveValue("25.5");
  await expect(page.getByRole("spinbutton", { name: "Images per request", exact: true })).toHaveValue("2");
  await expect(page.getByRole("combobox", { name: "Estimate period", exact: true })).toHaveValue("month");
  await expect(page).toHaveURL((url) => url.searchParams.get("cachePercent") === "25.5" && url.searchParams.get("images") === "2" && url.searchParams.get("period") === "month");
  if (["desktop-chromium", "mobile-chromium"].includes(testInfo.project.name)) {
    const path = testInfo.outputPath("advanced-calculator.png");
    await advanced.evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.screenshot({ path });
    await testInfo.attach("advanced-calculator", { path, contentType: "image/png" });
  }
  await page.getByRole("spinbutton", { name: "Cached input (%)", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "Cached input (%)", exact: true }).press("Enter");
  await page.getByRole("spinbutton", { name: "Images per request", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "Images per request", exact: true }).press("Enter");
  await page.getByRole("combobox", { name: "Estimate period", exact: true }).selectOption("batch");
  await expect(advanced).not.toContainText("cached");
  await expect(page.getByRole("spinbutton", { name: "Images per request", exact: true })).toBeVisible();
});

test("save and apply stay visible while occasional setup actions wait under Manage setups", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  const setups = page.getByRole("region", { name: "Saved setups", exact: true });
  await setups.getByRole("textbox", { name: "Setup name", exact: true }).fill("Everyday");
  await setups.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(setups.getByRole("button", { name: "Apply", exact: true })).toBeVisible();
  for (const name of ["Rename", "Update workload", "Export backup", "Import backup"]) {
    await expect(setups.getByRole("button", { name, exact: true })).toBeHidden();
  }
  const manage = setups.locator("summary").filter({ hasText: "Manage setups" });
  await manage.focus();
  await manage.press("Enter");
  await setups.getByRole("button", { name: "Rename", exact: true }).click();
  await setups.getByRole("textbox", { name: "New name for Everyday", exact: true }).fill("Renamed everyday");
  await setups.getByRole("button", { name: "Save name", exact: true }).click();
  await manage.click();
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).fill("7");
  await page.getByRole("spinbutton", { name: "Requests", exact: true }).press("Enter");
  await setups.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("1000");
  await expect(setups.getByRole("status")).toHaveText("Applied “Renamed everyday”.");
  await expect(setups.getByRole("button", { name: "Rename", exact: true })).toBeHidden();
});
