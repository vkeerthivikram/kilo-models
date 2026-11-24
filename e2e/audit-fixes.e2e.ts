import { expect, test } from "@playwright/test";
import { COMPARISON_STORAGE_KEY } from "../src/lib/comparison-storage";
import { SAVED_SETUPS_STORAGE_KEY } from "../src/lib/saved-setups";
import { catalog } from "./catalog";
import { catalogResponse, directoryReady, mockWebMCP } from "./repair-support";

test("dark mode has its background even before client code executes", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, colorScheme: "dark" });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(31, 31, 31)");
  } finally {
    await context.close();
  }
});

test("a saved alternative palette is applied without waiting for hydration", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("kilo-color-theme", "dracula");
  });
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-kilo-theme", "dracula");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(29, 30, 40)");
});

test("local comparison survives reload and Back without turning into a shared-link arrival", async ({ context, page }) => {
  await page.goto("/");
  await directoryReady(page);
  await page.getByRole("button", { name: "Add Fixture Model 02 to comparison" }).click();
  await expect(page).toHaveURL(/compare=/);
  await page.getByRole("textbox", { name: "Search models" }).fill("Fixture Model 0");
  await expect(page).toHaveURL(/search=/);
  const sharedUrl = page.url();
  await page.reload();
  await directoryReady(page);
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("link", { name: "Fixture Model 03", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fixture Model 03" })).toBeVisible();
  await page.goBack();
  await directoryReady(page);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Remove Fixture Model 02 from comparison" }).first()).toBeVisible();
  const recipient = await context.newPage();
  await recipient.goto(sharedUrl);
  await expect(recipient.getByRole("dialog")).toBeVisible();
});

test("unavailable comparison selections are counted and can be cleared", async ({ page }) => {
  const snapshot = await catalogResponse(page, catalog);
  snapshot.excludedCount = 10;
  const ids = Array.from({ length: 10 }, (_, index) => `unavailable/${index}`);
  await page.goto(`/?compare=${ids.join(",")}`);
  await directoryReady(page);
  const tray = page.getByRole("region", { name: "Model comparison" });
  await expect(tray.getByRole("status")).toContainText("10 / 10 selected");
  await expect(tray.getByText("10 unavailable", { exact: true })).toBeVisible();
  const compare = page.getByRole("button", { name: "Add Fixture Model 01 to comparison" });
  await expect(compare).toBeDisabled();
  await tray.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(compare).toBeEnabled();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), COMPARISON_STORAGE_KEY)).toBe("[]");
});

test("pruning a local comparison after a healthy refresh does not make it a shared arrival", async ({ page }) => {
  const snapshot = await catalogResponse(page, catalog);
  await page.goto("/");
  await directoryReady(page);
  for (const name of ["Fixture Model 01", "Fixture Model 02"]) {
    await page.getByRole("button", { name: `Add ${name} to comparison` }).click();
  }
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "fixture/model-01,fixture/model-02");
  snapshot.data = [catalog[0]];
  await page.getByRole("button", { name: "Refresh catalog", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "fixture/model-01");
  await page.reload();
  await directoryReady(page);
  await expect(page.getByRole("region", { name: "Model comparison" }).getByRole("button", { name: "Compare", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("a cross-tab clear does not hide directory tools after adding another model", async ({ context, page }) => {
  await page.addInitScript(({ key, id }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([id]));
  }, { key: COMPARISON_STORAGE_KEY, id: catalog[1].id });
  await mockWebMCP(page);
  await page.goto("/");
  await directoryReady(page);
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await other.evaluate((key) => localStorage.setItem(key, "[]"), COMPARISON_STORAGE_KEY);
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "Add Fixture Model 03 to comparison" }).click();
  await expect(page.getByRole("button", { name: "Remove Fixture Model 03 from comparison" }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const tools = (window as unknown as { repairTools: Map<string, { execute: () => unknown }> }).repairTools;
    return tools.get("read_catalog")?.execute();
  })).toEqual(expect.arrayContaining([expect.objectContaining({ modelId: catalog[2].id, section: "Model result" })]));
});

test("stale favorites do not count as present, and an empty catalog has its own recovery", async ({ page }) => {
  const snapshot = await catalogResponse(page, catalog);
  await page.addInitScript(() => localStorage.setItem("kilo-models-favorites", '["unavailable/model"]'));
  await page.goto("/?fav=true");
  await expect(page.getByRole("button", { name: "Favorites", exact: true })).toContainText("0");
  await expect(page.getByRole("heading", { name: "Your shortlist starts here" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("kilo-models-favorites"))).toBe('["unavailable/model"]');
  snapshot.data = [];
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "No models available" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear search and filters" })).toHaveCount(0);
});

test("blank searches do not create active filters or survive application of an older saved setup", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("kilo-models-saved-setups", JSON.stringify({ version: 1, setups: [{
    id: "blank", name: "Empty search", workload: { inputTokens: 5, outputTokens: 1, requests: 1, period: "batch", cachePercent: 0 },
    directoryQuery: "search=&view=list", includesDirectoryView: true,
  }] })));
  await page.goto("/");
  await directoryReady(page);
  await page.getByRole("textbox", { name: "Search models" }).fill("   ");
  await expect(page.getByRole("group", { name: "Active filters" })).toHaveCount(0);
  await page.getByRole("button", { name: "Estimate workload", exact: true }).click();
  await page.getByRole("combobox", { name: "Saved setup" }).selectOption("blank");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Active setup: Empty search", { exact: true })).toBeVisible();
  await expect(page).toHaveURL((url) => !url.searchParams.has("search") && url.searchParams.get("view") === "list");
});

test("a fresh catalog is reused after returning from a model, but Refresh still fetches", async ({ page }) => {
  const methods: string[] = [];
  await page.route("**/api/models", (route) => {
    methods.push(route.request().method());
    return route.fulfill({ json: { data: catalog, fetchedAt: new Date().toISOString() } });
  });
  await page.goto("/");
  await directoryReady(page);
  const initial = [...methods];
  expect(initial.length).toBeGreaterThan(0);
  expect(initial.every((method) => method === "GET")).toBe(true);
  await page.getByRole("link", { name: "Fixture Model 01", exact: true }).click();
  await page.getByRole("link", { name: "Back to Directory" }).click();
  await directoryReady(page);
  expect(methods).toEqual(initial);
  await page.getByRole("button", { name: "Refresh catalog", exact: true }).click();
  await expect.poll(() => methods).toEqual([...initial, "POST"]);
});

for (const method of ["GET", "POST"]) {
  test(`the catalog negotiates gzip for ${method} without changing its response data`, async ({ request }) => {
    const plain = await request.fetch("/api/models", { method, headers: { "Accept-Encoding": "identity" } });
    expect(plain.ok()).toBe(true);
    expect(plain.headers()["content-encoding"]).toBeUndefined();
    expect(plain.headers()["cache-control"]).toBe("no-store");
    const { data } = await plain.json();
    expect(data.length).toBeGreaterThan(0);

    const compressed = await request.fetch("/api/models", { method, headers: { "Accept-Encoding": "gzip" } });
    expect(compressed.ok()).toBe(true);
    expect(compressed.headers()["content-encoding"]).toBe("gzip");
    expect(compressed.headers()["cache-control"]).toBe("no-store");
    expect((await compressed.json()).data).toEqual(data);

    const excluded = await request.fetch("/api/models", { method, headers: { "Accept-Encoding": "gzip;q=0" } });
    expect(excluded.ok()).toBe(true);
    expect(excluded.headers()["content-encoding"]).toBeUndefined();
    expect((await excluded.json()).data).toEqual(data);
  });
}

test("legacy alias filters group models under the provider without changing their IDs", async ({ page }) => {
  await page.goto("/?providers=~fixture&search=Fixture+Model+60");
  await expect(page.getByRole("group", { name: "Active filters" })).toContainText("Provider: fixture");
  await page.getByRole("link", { name: "Fixture Model 60", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fixture Model 60", level: 1 })).toBeVisible();
  await expect(page.locator("[data-model-detail-ready] code")).toHaveText("~fixture/model-60:free");
});

test("setup recovery is opt-in, survives a failed download, and keeps readable records", async ({ page }) => {
  const setup = { id: "keep", name: "Keep me", workload: { inputTokens: 4, outputTokens: 1, requests: 2, period: "batch", cachePercent: 0 }, directoryQuery: "", includesDirectoryView: false };
  const original = JSON.stringify({ version: 1, setups: [setup, { ...setup, id: "duplicate", name: "KEEP ME" }, { id: "broken" }] });
  await page.addInitScript(({ key, raw }) => {
    localStorage.setItem(key, raw);
    URL.createObjectURL = () => { throw new Error("Download blocked by test"); };
  }, { key: SAVED_SETUPS_STORAGE_KEY, raw: original });
  await page.goto("/");
  await directoryReady(page);
  await page.getByRole("button", { name: "Estimate workload", exact: true }).click();
  await page.getByRole("button", { name: "Manage setups", exact: true }).click();
  await page.getByRole("button", { name: "Download original data", exact: true }).click();
  await expect(page.getByRole("region", { name: "Saved setups" }).getByRole("alert")).toContainText("Could not start the backup download");
  const stored = () => page.evaluate((key) => localStorage.getItem(key), SAVED_SETUPS_STORAGE_KEY);
  expect(await stored()).toBe(original);
  const review = page.getByRole("button", { name: "Review setup recovery", exact: true });
  await review.click();
  expect(await stored()).toBe(original);
  await page.getByRole("button", { name: "Cancel recovery", exact: true }).click();
  expect(await stored()).toBe(original);
  await review.click();
  await page.getByRole("button", { name: "Confirm recovery", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Recovered 1 saved setup" })).toBeVisible();
  expect(JSON.parse((await stored())!).setups).toEqual([{ ...setup, workload: { ...setup.workload, images: 0, searches: 0, cacheWriteTokens: 0 } }]);
  await page.getByRole("textbox", { name: "Setup name", exact: true }).fill("After recovery");
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  await expect(page.getByText("Saved “After recovery”.", { exact: true })).toBeVisible();
});
