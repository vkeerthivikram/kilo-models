import { expect, test } from "@playwright/test";
import { catalog } from "./catalog";

test("partial catalog stays usable and a healthy refresh clears the exclusion notice", async ({ page }) => {
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: catalog.slice(0, 2), fetchedAt: new Date().toISOString(),
      ...(route.request().method() === "POST" ? {} : { excludedCount: 1 }) }),
  }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 model unavailable because their catalog data could not be verified" })).toBeVisible();
  await page.getByRole("button", { name: "Refresh catalog", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "could not be verified" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
});
