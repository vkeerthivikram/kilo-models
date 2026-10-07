import { expect, test } from "@playwright/test";

test("comparison respects reduced motion without fading its text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?compare=fixture%2Fmodel-01%2Cfixture%2Fmodel-02");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Compare Models", exact: true })).toBeVisible();
  await expect(dialog).toHaveCSS("transition-duration", "0s");
  const overlay = page.locator("[data-slot='sheet-overlay']");
  await expect(overlay).toHaveCSS("transition-duration", "0s");
  await expect(overlay).toHaveCSS("opacity", "1");
  await expect(dialog).toHaveCSS("opacity", "1");
  await expect(dialog).not.toHaveAttribute("data-starting-style", "");
  await dialog.getByRole("button", { name: "Close comparison", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("comparison retains normal transitions and remains usable when motion is allowed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?compare=fixture%2Fmodel-01%2Cfixture%2Fmodel-02");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Compare Models", exact: true })).toBeVisible();
  await expect(dialog).toHaveCSS("transition-duration", "0.2s");
  const overlay = page.locator("[data-slot='sheet-overlay']");
  await expect(overlay).toHaveCSS("transition-duration", "0.15s");
  await expect(overlay).toHaveCSS("opacity", "1");
  await expect(dialog).toHaveCSS("opacity", "1");
  await dialog.getByRole("button", { name: "Close comparison", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
