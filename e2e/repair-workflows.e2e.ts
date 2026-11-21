import { expect, test } from "@playwright/test";
import { catalog } from "./catalog";
import { batch, catalogResponse, directoryReady, mockWebMCP, openFilters, press } from "./repair-support";

const storageKey = "kilo-models-comparison";
const first = catalog[0];
const second = catalog[1];

test.beforeEach(async ({ page }) => { await mockWebMCP(page); });

test("a pending model ID copy stops the batch and ignores late completion", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("button", { name: "Copy model ID" })).toBeEnabled();
  await page.evaluate(() => {
    const deferred = Promise.withResolvers<void>();
    Object.defineProperty(window, "finishCopy", { value: deferred.resolve });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => deferred.promise } });
  });
  await page.clock.install();
  const attempt = batch(page, press("Copy model ID"), press("Full specifications"));
  await expect(page.getByRole("button", { name: "Copying..." })).toBeVisible();
  await page.clock.fastForward(9000);
  await expect(page.getByText(/Could not copy/).first()).toBeVisible({ timeout: 500 });
  expect(await attempt).toMatchObject({ ok: false, steps: [], error: { step: 0 } });
  await page.evaluate(() => Reflect.get(window, "finishCopy")());
  await expect(page.getByText("Model ID copied.")).toHaveCount(0);
  await expect(page.getByText("Full specifications", { exact: true }).locator("..")).not.toHaveAttribute("open", "");
});

test("an agent is told if favorite changes only in memory", async ({ page }) => {
  await page.goto("/");
  await directoryReady(page);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "kilo-models-favorites") throw new DOMException("Full", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  const result = await batch(page, { ref: "Model results", action: "setModelFavorite", args: [first.id, true] }, press("Favorites"));
  expect(result).toMatchObject({ ok: false, steps: [], error: { step: 0 } });
  await expect(page.getByRole("button", { name: "Remove Fixture Model 01 from favorites" })).toBeVisible();
  await expect(page.getByRole("button", { name: /All models/ })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await directoryReady(page);
  await expect(page.getByRole("button", { name: "Add Fixture Model 01 to favorites" })).toBeVisible();
});

test("a comparison survives detail navigation when its first write fails", async ({ page }) => {
  await page.goto("/");
  await directoryReady(page);
  await page.evaluate((storageKey) => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === storageKey) { Storage.prototype.setItem = write; throw new Error("Temporarily unavailable"); }
      return write.call(this, key, value);
    };
  }, storageKey);
  await page.getByRole("button", { name: "Add Fixture Model 01 to comparison" }).click();
  await expect(page).toHaveURL(/compare=/);
  await page.getByRole("link", { name: "Fixture Model 01", exact: true }).click();
  await expect(page.locator("[data-model-detail-ready]").getByRole("button", { name: "Remove Fixture Model 01 from comparison", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Directory" }).click();
  await directoryReady(page);
  await expect(page.getByRole("button", { name: "Remove Fixture Model 01 from comparison" }).first()).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify([first.id]));
});

test("a partial refresh preserves missing comparison models for a healthy refresh", async ({ page }) => {
  const snapshot = await catalogResponse(page, catalog);
  await page.goto("/");
  await directoryReady(page);
  for (const model of [first, second]) {
    await page.getByRole("button", { name: `Add ${model.name} to comparison` }).click();
  }
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify([first.id, second.id]));
  snapshot.data = [second];
  snapshot.excludedCount = 1;
  await page.getByRole("button", { name: "Refresh catalog" }).click();
  await expect(page.getByText(/1 catalog entry/)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify([first.id, second.id]));
  expect(new URL(page.url()).searchParams.get("compare")).toContain(first.id);
  await page.locator("[data-model-compare]").click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify([first.id]));
  snapshot.data = catalog;
  delete snapshot.excludedCount;
  await page.getByRole("button", { name: "Refresh catalog" }).click();
  await expect(page.getByRole("button", { name: "Remove Fixture Model 01 from comparison" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Fixture Model 02 to comparison" })).toBeVisible();

  snapshot.data = [second];
  await page.getByRole("button", { name: "Refresh catalog" }).click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe("[]");

  const retained = catalog.slice(0, 10).map(({ id }) => id);
  snapshot.data = [catalog[11]];
  snapshot.excludedCount = 10;
  await page.goto(`/?compare=${encodeURIComponent(retained.join(","))}`);
  await expect(page.locator("[data-model-compare]")).toBeDisabled();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify(retained));
});

test("an explicit empty comparison clears storage even with an empty catalog", async ({ page }) => {
  const snapshot = await catalogResponse(page, catalog);
  await page.goto("/");
  await directoryReady(page);
  await page.getByRole("button", { name: "Add Fixture Model 01 to comparison" }).click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(JSON.stringify([first.id]));
  snapshot.data = [];
  await page.goto("/?compare=");
  await expect(page.getByRole("heading", { name: "No models available" })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe("[]");
  snapshot.data = catalog;
  await page.goto("/");
  await directoryReady(page);
  await expect(page.getByRole("button", { name: "Add Fixture Model 01 to comparison" })).toBeVisible();
});

test("pending search preserves newer pagination and yields to Back and Forward", async ({ page }) => {
  await page.goto("/");
  await directoryReady(page);
  await page.clock.install();
  const result = await batch(page, { ref: "Search models", action: "setValue", args: ["Fixture"] }, press("Next page"));
  expect(result).toMatchObject({ ok: true });
  await page.clock.fastForward(1000);
  await expect(page).toHaveURL((url) => url.searchParams.get("search") === "Fixture" && url.searchParams.get("page") === "2");
  await expect(page.getByRole("link", { name: "Fixture Model 25" })).toBeVisible();
  await page.evaluate(() => history.pushState(null, "", "/?search=Model+02"));
  const search = page.getByRole("textbox", { name: "Search models" });
  await expect(search).toHaveValue("Model 02");
  await search.fill("abandoned");
  await page.goBack();
  await page.clock.fastForward(1000);
  await expect(search).toHaveValue("Fixture");
  await page.goForward();
  await expect(search).toHaveValue("Model 02");
});

test("literal escaped providers, commas and modalities round-trip", async ({ page }) => {
  await catalogResponse(page, [
    { ...first, id: "org%2Cinc/a", architecture: { ...first.architecture, input_modalities: ["img%2Ctest"], output_modalities: ["a,b"] } },
    { ...second, id: "org,inc/b", architecture: { ...second.architecture, input_modalities: ["img,test"], output_modalities: ["a%2Cb"] } },
  ]);
  await page.goto("/");
  await directoryReady(page);
  await openFilters(page);
  await page.getByRole("button", { name: "All providers" }).click();
  await page.getByRole("checkbox", { name: /org%2Cinc/i }).check();
  await expect(page).toHaveURL(/providers=/);
  const chosen = page.getByRole("link", { name: first.name, exact: true });
  await expect(chosen).toBeVisible();
  await page.reload();
  await expect(chosen).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("link", { name: second.name, exact: true })).toHaveCount(0);

  await openFilters(page);
  await page.locator("summary").filter({ hasText: "Advanced filters" }).click();
  await page.getByRole("button", { name: "img%2Ctest input", exact: true }).click();
  await page.getByRole("button", { name: "a,b output", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.has("inputModalities") && url.searchParams.has("outputModalities"));
  await page.reload();
  await expect(chosen).toBeVisible();
  await openFilters(page);
  await expect(page.getByRole("button", { name: "img%2Ctest input", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "a,b output", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator("summary").filter({ hasText: "Estimate workload" }).click();
  await page.getByLabel("Setup name", { exact: true }).fill("Exact filters");
  await page.getByRole("button", { name: "Save setup", exact: true }).click();
  const preview = page.locator('[data-agent-catalog="Saved setup preview"]');
  await expect(preview).toContainText("Providers: org%2Cinc");
  await expect(preview).toContainText("Input types: img%2Ctest");
  await expect(preview).toContainText("Output types: a,b");
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.getByRole("link", { name: second.name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(chosen).toBeVisible();
  await expect(page.getByRole("link", { name: second.name, exact: true })).toHaveCount(0);
});

test("a stalled initial request eventually offers retry and ignores its late response", async ({ page }) => {
  const held = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const completed = Promise.withResolvers<void>();
  await page.route("**/api/models", async (route) => {
    const initial = route.request().method() === "GET";
    if (initial) {
      started.resolve();
      await held.promise;
    }
    await route.fulfill({ json: { data: initial ? [second] : [first], fetchedAt: "2026-11-20T10:00:00Z" } }).catch(() => {});
    if (initial) completed.resolve();
  });
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByText("Loading catalog…")).toBeVisible();
  await started.promise;
  await page.clock.fastForward(13_000);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await directoryReady(page);
  held.resolve();
  await completed.promise;
  await expect(page.getByRole("link", { name: second.name, exact: true })).toHaveCount(0);
});

test("release-date sorting lists positive dates before missing, null and zero", async ({ page }) => {
  const zero = { ...first, created: 0 };
  const missing = { ...catalog[2], created: undefined } as unknown as typeof first;
  const unknown = { ...catalog[3], created: null } as unknown as typeof first;
  const latest = catalog[4];
  await catalogResponse(page, [zero, missing, unknown, latest, second]);
  const rows = page.locator("[data-agent-catalog='Model result']");
  for (const [sort, expectedFirst, expectedSecond] of [["created-asc", second, latest], ["created-desc", latest, second]] as const) {
    await page.goto(`/?sort=${sort}`);
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toHaveAttribute("data-model-id", expectedFirst.id);
    await expect(rows.nth(1)).toHaveAttribute("data-model-id", expectedSecond.id);
  }
});

test("search text cannot shadow a named capability toggle", async ({ page }) => {
  await page.goto("/?search=Tool+calling+filter&reasoning=true");
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue("Tool calling filter");
  await openFilters(page);
  const result = await batch(page, press("Tool calling filter"), press("Tool calling filter"), press("Remove filter: Reasoning"));
  expect(result).toMatchObject({ ok: true });
  await expect(page).toHaveURL((url) => !url.searchParams.has("tools") && !url.searchParams.has("reasoning") && url.searchParams.get("search") === "Tool calling filter");
  await expect(page.getByRole("button", { name: "Remove filter: Search: Tool calling filter", exact: true })).toBeVisible();
  expect(await batch(page, { ref: "Search filter", action: "remove" })).toMatchObject({ ok: true });
  await expect(page).toHaveURL((url) => !url.searchParams.has("search"));
});
