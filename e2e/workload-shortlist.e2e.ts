import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { catalog } from "./catalog";

async function attachVisualEvidence(page: Page, testInfo: TestInfo, name: string) {
  if (!["desktop-chromium", "mobile-chromium"].includes(testInfo.project.name)) return;
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: name === "workload-shortlist" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

test("workload and complete budget filters survive reload and can be removed", async ({ page }, testInfo) => {
  await page.goto("/?fitsWorkload=true&maxBudget=0.8&requests=100&images=2&searches=1");
  const links = page.getByRole("link", { name: /^Fixture Model \d+$/ });
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveText("Fixture Model 02");
  await attachVisualEvidence(page, testInfo, "workload-shortlist");
  await page.reload();
  await expect(links).toHaveCount(1);
  await page.locator("summary").filter({ hasText: "Estimate workload" }).click();
  await page.getByRole("spinbutton", { name: "Output tokens per request", exact: true }).fill("9000");
  await page.getByRole("spinbutton", { name: "Output tokens per request", exact: true }).press("Tab");
  await expect(page.getByRole("heading", { name: "No models found", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove filter: Fits workload", exact: true }).click();
  await page.getByRole("button", { name: "Remove filter: Batch budget ≤ $0.8", exact: true }).click();
  await expect(links).toHaveCount(24);
  await expect(page).toHaveURL((url) => !url.searchParams.has("fitsWorkload") && !url.searchParams.has("maxBudget") &&
    url.searchParams.get("requests") === "100" && url.searchParams.get("images") === "2" &&
    url.searchParams.get("searches") === "1" && url.searchParams.get("outputTokens") === "9000");
});

test("unknown limits stay labeled and are excluded from a verified workload shortlist", async ({ page }) => {
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ data: [
      catalog[0],
      { ...catalog[1], top_provider: { ...catalog[1].top_provider, max_completion_tokens: 100 } },
      { ...catalog[2], top_provider: { ...catalog[2].top_provider, max_completion_tokens: 0 } },
    ], fetchedAt: new Date().toISOString() }),
  }));
  await page.goto("/?view=list");
  await expect(page.getByText(/Limits unknown/)).toBeVisible();
  const filters = page.getByRole("button", { name: /^Filters/ });
  if (await filters.isVisible()) await filters.click();
  await page.locator("summary").filter({ hasText: "Advanced filters" }).click();
  await page.getByRole("button", { name: "Fits workload", exact: true }).click();
  const links = page.getByRole("link", { name: /^Fixture Model \d+$/ });
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveText("Fixture Model 01");
});

test("comparison exposes separate charge amounts and one complete total", async ({ page }, testInfo) => {
  await page.goto("/?compare=fixture%2Fmodel-02&inputTokens=100&outputTokens=10&requests=2&cachePercent=50&cacheWriteTokens=20&images=2&searches=3");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: /Cost Calculator|Costs/ }).click();
  await dialog.getByText("Full cost breakdown", { exact: true }).click();
  const breakdown = dialog.locator("details").filter({ has: page.getByText("Full cost breakdown", { exact: true }) });
  await expect(breakdown.getByText("Cache reads", { exact: true })).toBeVisible();
  await expect(breakdown.getByText("Cache writes", { exact: true })).toBeVisible();
  await expect(breakdown.getByText("Request fee", { exact: true })).toBeVisible();
  // 30 regular tokens: .000060; 50 reads: .000025; 20 writes: .000030;
  // output .000020 + images .002 + searches .003 => .005135 per request.
  await expect(breakdown.getByText("$0.000060", { exact: true })).toBeVisible();
  await expect(breakdown.getByText("$0.005135", { exact: true })).toBeVisible();
  await expect(breakdown.getByText("$0.0103", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await breakdown.scrollIntoViewIfNeeded();
  await attachVisualEvidence(page, testInfo, "comparison-breakdown");
});
