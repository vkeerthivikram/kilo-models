import { expect, test } from "@playwright/test";
import { catalog } from "./catalog";

test("one persistent status announces partial catalog entries and clears after healthy refresh", async ({ page }) => {
  let refreshCount = 0;
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: catalog.slice(0, 2), fetchedAt: new Date().toISOString(),
      ...(route.request().method() === "POST" && ++refreshCount === 1 ? { excludedCount: 1 } : {}) }),
  }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const catalogStatus = page.getByRole("button", { name: "Refresh catalog", exact: true }).locator("..").getByRole("status");
  await expect(catalogStatus).toHaveCount(1);
  await expect(catalogStatus).toHaveText("");
  const initialStatus = await catalogStatus.elementHandle();

  await page.getByRole("button", { name: "Refresh catalog", exact: true }).click();
  await expect(catalogStatus).toHaveCount(1);
  await expect(catalogStatus).toHaveText("1 catalog entry could not be included and was hidden.");
  await expect(catalogStatus).toBeVisible();
  expect(await catalogStatus.evaluate((node, initialNode) => node === initialNode, initialStatus)).toBe(true);
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Refresh catalog", exact: true }).click();
  await expect(catalogStatus).toHaveCount(1);
  await expect(catalogStatus).toHaveText("");
  expect(await catalogStatus.evaluate((node, initialNode) => node === initialNode, initialStatus)).toBe(true);
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await initialStatus?.dispose();
});
