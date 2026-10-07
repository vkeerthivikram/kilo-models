import { expect, test } from "@playwright/test";
import { catalog } from "./catalog";

test("clearing filters removes URL defaults and preserves the current view and usage", async ({ page }) => {
  await page.goto("/?free=true&hideRetired=true&fitsWorkload=true&reasoning=true&tools=true&view=list&requests=7");
  const filters = page.getByRole("group", { name: "Active filters", exact: true });
  await expect(filters).toBeVisible();
  await filters.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(filters).toHaveCount(0);
  await expect(page).toHaveURL((url) => ["free", "hideRetired", "fitsWorkload", "reasoning", "tools", "search", "page"].every((key) => !url.searchParams.has(key)) && url.searchParams.get("requests") === "7" && url.searchParams.get("view") === "list");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
});

test("charts show full names in tooltips and keyboard navigation exposes actual specification values", async ({ page }) => {
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    data: catalog.slice(0, 2).map((model, index) => ({ ...model, name: index === 0 ? "openai/computer-use-preview" : "Another model" })), fetchedAt: new Date().toISOString(),
  }) }));
  await page.goto("/?compare=fixture/model-01,fixture/model-02");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Charts", exact: true }).click();
  const pricing = dialog.getByRole("region", { name: "Pricing comparison", exact: true });
  const profile = dialog.getByRole("region", { name: "Specification profile", exact: true });
  await expect(pricing.getByText(/^1\.\s*openai\/computer…$/)).toBeVisible();
  const radar = profile.getByRole("application");
  await expect(radar).toHaveAttribute("tabindex", "0");
  await radar.focus();
  await expect(profile.getByText("128,000 tokens", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(profile.getByText("8,000 tokens", { exact: true }).first()).toBeVisible();
  await expect(profile.locator(".recharts-tooltip-wrapper").getByText("openai/computer-use-preview", { exact: true })).toBeVisible();
});

test("null request fees and duplicate capabilities remain usable without secure UUID generation", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined }));
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    data: [{ ...catalog[0], pricing: { ...catalog[0].pricing, request: null },
      architecture: { ...catalog[0].architecture, input_modalities: ["text", "image", "image"] },
      expiration_date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    }], fetchedAt: new Date().toISOString(),
  }) }));
  await page.goto("/?requests=7&view=list");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const results = page.getByRole("region", { name: "Model results", exact: true });
  await expect(results.getByText("image input", { exact: true })).toHaveCount(1);
  await expect(results.getByText(/^Retires soon/)).toBeVisible();
  await expect(results.getByText("$0.0210", { exact: true })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Estimate workload" }).click();
  await page.getByRole("textbox", { name: "Setup name", exact: true }).fill("HTTP-compatible plan");
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(page.getByText("Saved “HTTP-compatible plan”.", { exact: true })).toBeVisible();
});
