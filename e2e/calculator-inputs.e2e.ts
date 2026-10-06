import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Wait for the public detail actions to become interactive after hydration.
  // Server-rendered numeric inputs can be filled before React attaches handlers.
  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
});

test("calculator keeps a blank draft while typing and commits on blur", async ({ page }) => {
  const input = page.getByRole("spinbutton", { name: "Input tokens per request", exact: true });
  await expect(input).toHaveValue("2000");
  await input.fill("");
  await expect(input).toHaveValue("");
  await expect(page).toHaveURL((url) => !url.searchParams.has("inputTokens"));
  await input.fill("3500");
  await expect(input).toHaveValue("3500");
  await expect(page).toHaveURL((url) => !url.searchParams.has("inputTokens"));
  await input.press("Tab");
  await expect(page).toHaveURL((url) => url.searchParams.get("inputTokens") === "3500");
  await page.reload();
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  await expect(input).toHaveValue("3500");
});

test("calculator commits fractional cache percentages with Enter and rejects invalid percentages", async ({ page }) => {
  const cache = page.getByRole("spinbutton", { name: "Cached input (%)", exact: true });
  await cache.fill("25.5");
  await expect(cache).toHaveValue("25.5");
  await expect(cache).toHaveAttribute("aria-invalid", "false");
  await expect(page).toHaveURL((url) => !url.searchParams.has("cachePercent"));
  await cache.press("Enter");
  await expect(page).toHaveURL((url) => url.searchParams.get("cachePercent") === "25.5");
  await page.reload();
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  await expect(cache).toHaveValue("25.5");
  for (const invalid of ["101", "-1"]) {
    await cache.fill(invalid);
    await expect(cache).toHaveValue(invalid);
    await expect(cache).toHaveAttribute("aria-invalid", "true");
    await expect(cache).toHaveAccessibleDescription("Enter a percentage from 0 to 100.");
    await cache.press("Tab");
    await expect(cache).toHaveValue("25.5");
    await expect(page).toHaveURL((url) => url.searchParams.get("cachePercent") === "25.5");
  }
  await cache.fill("0");
  await cache.press("Enter");
  await expect(cache).toHaveValue("0");
  await expect(page).toHaveURL((url) => !url.searchParams.has("cachePercent"));
});

test("blank or invalid count drafts retain the last committed safe integer", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-01?requests=3");
  await expect(page.getByRole("button", { name: "Copy model ID", exact: true })).toBeEnabled();
  const requests = page.getByRole("spinbutton", { name: "Requests", exact: true });
  for (const invalid of ["", "0", "-2", "1.5", "9007199254740992"]) {
    await requests.fill(invalid);
    await expect(requests).toHaveValue(invalid);
    if (invalid !== "") await expect(requests).toHaveAttribute("aria-invalid", "true");
    await requests.press("Tab");
    await expect(requests).toHaveValue("3");
    await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "3");
  }
  await requests.fill("1");
  await requests.press("Enter");
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "1");

  await page.getByText("Additional billing", { exact: true }).click();
  for (const label of ["Input tokens per request", "Output tokens per request", "Images per request", "Searches per request", "Cache-write tokens per request"]) {
    const field = page.getByRole("spinbutton", { name: label, exact: true });
    const committed = await field.inputValue();
    await field.fill("1.5");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await field.press("Tab");
    await expect(field).toHaveValue(committed);
    await field.fill("0");
    await field.press("Enter");
    await expect(field).toHaveValue("0");
  }
});

test("external URL changes preserve active drafts and presets refresh committed fields", async ({ page }) => {
  const input = page.getByRole("spinbutton", { name: "Input tokens per request", exact: true });
  const requests = page.getByRole("spinbutton", { name: "Requests", exact: true });
  await input.fill("3500");
  await page.evaluate(() => window.history.pushState(null, "", "?inputTokens=7000&requests=4"));
  await expect(requests).toHaveValue("4");
  await expect(input).toHaveValue("3500");
  await input.press("Tab");
  await expect(page).toHaveURL((url) => url.searchParams.get("inputTokens") === "3500" && url.searchParams.get("requests") === "4");
  await page.evaluate(() => window.history.pushState(null, "", "?inputTokens=9000&requests=4"));
  await expect(input).toHaveValue("9000");
  await page.getByRole("button", { name: "Small request", exact: true }).click();
  await expect(input).toHaveValue("500");
  await expect(page.getByRole("spinbutton", { name: "Output tokens per request", exact: true })).toHaveValue("150");
  await expect(requests).toHaveValue("4");
  await expect(page).toHaveURL((url) => url.searchParams.get("inputTokens") === "500" && url.searchParams.get("outputTokens") === "150");
});
