import { expect, test, type Page } from "@playwright/test";
import { catalog } from "./catalog";

type Step = { ref: string; action: string; args?: unknown[] };
type Tool = { name: string; execute(input: unknown): unknown };
type ToolWindow = Window & { catalogTools?: Map<string, Tool> };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map<string, Tool>();
    Object.defineProperty(window, "catalogTools", { value: tools });
    Object.defineProperty(document, "modelContext", { value: {
      registerTool(tool: Tool, { signal }: { signal: AbortSignal }) {
        tools.set(tool.name, tool);
        signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
        return Promise.resolve();
      },
    } });
  });
});

async function act(page: Page, steps: Step[]) {
  return tool(page, "act", { steps });
}

async function tool(page: Page, name: string, input: unknown = {}) {
  await page.waitForFunction((key) => (window as ToolWindow).catalogTools?.has(key), name);
  return page.evaluate(({ name, input }) => (window as ToolWindow).catalogTools?.get(name)?.execute(input), { name, input });
}

function holdResponse() {
  let signalRequest!: () => void;
  let release!: () => void;
  const requested = new Promise<void>((resolve) => { signalRequest = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  return { requested, release, hold: () => { signalRequest(); return released; } };
}

async function holdCalculatorChunk(page: Page, gate: ReturnType<typeof holdResponse>, fail = false) {
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    const response = await route.fetch();
    if ((await response.text()).includes("Comparison cost estimates")) {
      await gate.hold();
      if (fail) return route.abort();
    }
    await route.fulfill({ response });
  });
}

async function nextInteraction(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }));
}

test("a failed return-address write keeps the latest view, workload and scroll", async ({ page }) => {
  await page.goto("/?view=list&search=Fixture&requests=12");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const link = page.getByRole("link", { name: "Fixture Model 10", exact: true });
  await link.scrollIntoViewIfNeeded();
  const scrollY = await page.evaluate(() => {
    const key = "kilo-models-directory-return";
    sessionStorage.setItem(key, JSON.stringify({ href: "/?search=outdated&requests=2", scrollY: 0 }));
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && this === sessionStorage) {
        Storage.prototype.setItem = setItem;
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      }
      return setItem.call(this, name, value);
    };
    return window.scrollY;
  });
  expect(scrollY).toBeGreaterThan(0);
  await link.click();
  const back = page.getByRole("link", { name: "Back to Directory" });
  await expect(back).toHaveAttribute("href", /search=Fixture/);
  await back.click();
  await expect(page).toHaveURL((url) => url.pathname === "/" && url.searchParams.get("view") === "list" &&
    url.searchParams.get("search") === "Fixture" && url.searchParams.get("requests") === "12");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
});

for (const healthy of [true, false]) {
  test(`agent waits for the directory to ${healthy ? "load before favoriting" : "fail before skipping the favorite"}`, async ({ page }) => {
    const response = holdResponse();
    await page.route("**/api/models", async (route) => {
      await response.hold();
      await route.fulfill({ status: healthy ? 200 : 503, json: healthy ? { data: catalog, fetchedAt: new Date().toISOString() } : {} });
    });
    await page.goto("/models/fixture%2Fmodel-01?requests=7");
    await expect(page.getByRole("button", { name: "Copy model ID" })).toBeEnabled();

    let done = false;
    const result = act(page, [
      { ref: "Back to Directory", action: "press" },
      { ref: "Model results", action: "setModelFavorite", args: ["fixture/model-01", true] },
    ]).finally(() => { done = true; });
    await response.requested;
    await nextInteraction(page);
    const finishedWhileLoading = done;
    response.release();
    const outcome = await result;

    expect(finishedWhileLoading).toBe(false);
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.searchParams.get("requests") === "7");
    if (healthy) {
      expect(outcome).toMatchObject({ ok: true });
      const remove = page.getByRole("button", { name: "Remove Fixture Model 01 from favorites", exact: true });
      await expect(remove).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(remove).toHaveAttribute("aria-pressed", "true");
    } else {
      expect(outcome).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/directory|catalog/i) } });
      await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
      expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("fixture/model-01");
    }
  });
}

test("a comparison detail link waits for the destination specifications", async ({ page }) => {
  const response = holdResponse();
  await page.route((url) => decodeURIComponent(url.pathname) === "/models/fixture/model-01", async (route) => {
    await response.hold();
    await route.continue();
  });
  await page.goto("/?search=Fixture&requests=7&compare=fixture%2Fmodel-01");
  await expect(page.getByRole("link", { name: "View details for Fixture Model 01", exact: true })).toBeVisible();
  let done = false;
  const result = act(page, [
    { ref: "View details for Fixture Model 01", action: "press" },
    { ref: "Full specifications", action: "press" },
  ]).finally(() => { done = true; });
  await response.requested;
  await nextInteraction(page);
  const finishedWhileLoading = done;
  response.release();
  const outcome = await result;
  expect(outcome, JSON.stringify(outcome)).toMatchObject({ ok: true });
  expect(finishedWhileLoading).toBe(false);
  await expect(page.getByRole("heading", { name: "Fixture Model 01", level: 1 })).toBeVisible();
  await expect(page.getByText("Supported Parameters", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Directory" })).toHaveAttribute("href", /search=Fixture/);
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
});

test("the cold calculator tab waits for its fields and the warm tab keeps the workload", async ({ page }) => {
  const calculator = holdResponse();
  await page.goto("/?requests=7&compare=fixture%2Fmodel-01");
  const dialog = page.getByRole("dialog", { name: "Compare Models" });
  await expect(dialog.getByRole("region", { name: "Comparison specifications" })).toBeVisible();
  await holdCalculatorChunk(page, calculator);
  const result = act(page, [
    { ref: "tabs", action: "setValue", args: ["calculator"] },
    { ref: "Requests", action: "setValue", args: ["21"] },
  ]);
  await calculator.requested;
  await expect(dialog.getByText("Loading cost calculator…", { exact: true })).toBeVisible();
  await nextInteraction(page);
  calculator.release();
  const outcome = await result;
  expect(outcome, JSON.stringify(outcome)).toMatchObject({ ok: true });
  await expect(dialog.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("21");
  expect(await act(page, [
    { ref: "tabs", action: "setValue", args: ["overview"] },
    { ref: "tabs", action: "setValue", args: ["calculator"] },
    { ref: "Requests", action: "setValue", args: ["22"] },
  ])).toMatchObject({ ok: true });
  await expect(dialog.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("22");
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "22");
});

test("a failed lazy calculator chunk stops the dependent action", async ({ page }) => {
  const calculator = holdResponse();
  await page.goto("/?requests=7&compare=fixture%2Fmodel-01");
  const dialog = page.getByRole("dialog", { name: "Compare Models" });
  await expect(dialog.getByRole("region", { name: "Comparison specifications" })).toBeVisible();
  await holdCalculatorChunk(page, calculator, true);
  const result = act(page, [
    { ref: "tabs", action: "setValue", args: ["calculator"] },
    { ref: "Close comparison", action: "press" },
  ]);
  await calculator.requested;
  await nextInteraction(page);
  calculator.release();
  expect(await result).toMatchObject({
    ok: false, steps: [], error: { step: 0, message: expect.stringContaining("comparison tab could not load") },
  });
  await expect(dialog.getByRole("alert").filter({ hasText: "This tab could not load" })).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
  await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Comparison specifications" })).toBeVisible();
});

test("related models advertise and execute just their available action", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-59?requests=7");
  const similar = page.getByRole("heading", { name: "Similar Models", exact: true }).locator("..");
  await expect(similar.getByRole("link").first()).toBeVisible();
  await expect.poll(() => tool(page, "query", { within: "Similar models" })).toEqual([
    expect.objectContaining({ component: "catalog-results" }),
  ]);
  const result = await tool(page, "query", { within: "Similar models" });
  expect(result).toMatchObject([{ actions: ["openModel"] }]);
  const [component] = result as [{ items: [{ value: string; label: string }] }];
  const item = component.items[0];
  expect(await act(page, [{ ref: "Similar models", action: "openModel", args: [item.value] }])).toMatchObject({ ok: true });
  await expect(page.getByRole("heading", { name: item.label, level: 1 })).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
});

for (const [index, id] of ["p/q", "p%2Fq", "p%252Fq", "p/100%", ".", ".."].entries()) {
  test(`the generated detail link opens the exact model ID ${id}`, async ({ page }) => {
    const name = `Fixture Model ${index + 53}`;
    await page.goto(`/?view=${index % 2 ? "list" : "grid"}&search=${encodeURIComponent(name)}&requests=7`);
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    const result = await act(page, [{ ref: "Model results", action: "openModel", args: [id] }]);
    expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
    await expect(page).toHaveURL(new URL(href!, page.url()).href);
    await expect(page.getByRole("heading", { name, level: 1, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(`${name} — Kilo Models`);
    expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: "Model description", modelId: id }),
    ]));
    await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
    await page.reload();
    await expect(page.getByRole("heading", { name, level: 1, exact: true })).toBeVisible();
  });
}
