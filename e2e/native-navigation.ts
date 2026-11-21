import assert from "node:assert/strict";
import { chromium, expect, type Page } from "@playwright/test";
import { catalog } from "./catalog";

// Run with the production server listening at KILO_MODELS_NATIVE_URL.
const baseURL = process.env.KILO_MODELS_NATIVE_URL ?? "http://127.0.0.1:3220";
type Step = { ref: string; action: string; args?: unknown[] };
type ToolResult = { invocationId: string; status: string; output?: string | { content?: { text?: string }[] }; errorText?: string };
type BatchResult = { ok: boolean; steps: unknown[]; error?: { step: number; message: string } };

async function nativeTools(page: Page) {
  const session = await page.context().newCDPSession(page);
  const frames = new Map<string, string>();
  const responses = new Map<string, ToolResult>();
  session.on("WebMCP.toolsAdded", ({ tools }: { tools: { name: string; frameId: string }[] }) => {
    for (const tool of tools) frames.set(tool.name, tool.frameId);
  });
  session.on("WebMCP.toolResponded", (result: ToolResult) => { responses.set(result.invocationId, result); });
  await session.send("WebMCP.enable");
  return async <Result>(toolName: string, input: object): Promise<Result> => {
    await expect.poll(() => frames.has(toolName)).toBe(true);
    const frameId = frames.get(toolName)!;
    const { invocationId } = await session.send("WebMCP.invokeTool", { frameId, toolName, input: input as Record<string, string> });
    await expect.poll(() => responses.has(invocationId), { timeout: 20_000 }).toBe(true);
    const { status, output, errorText } = responses.get(invocationId)!;
    responses.delete(invocationId);
    assert.equal(status, "Completed", errorText);
    assert.ok(output);
    const body = typeof output === "object" ? output.content?.[0]?.text : output;
    return (typeof body === "string" ? JSON.parse(body) : output) as Result;
  };
}

const browser = await chromium.launch({ channel: "chromium", args: ["--enable-blink-features=WebMCP"] });
async function check(label: string, run: (page: Page, tool: Awaited<ReturnType<typeof nativeTools>>) => Promise<void>) {
  const context = await browser.newContext({ baseURL, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await run(page, await nativeTools(page));
    console.log("PASS", label);
  } finally {
    await context.close();
  }
}

const press = (ref: string): Step => ({ ref, action: "press" });
try {
  await check("#12 terminal comparison detail stops its dependent action", async (page, tool) => {
    const removed = { ...catalog[0], id: "fixture/removed-model", name: "Removed model" };
    await page.route("**/api/models", (route) => route.fulfill({ json: { data: [removed], fetchedAt: new Date().toISOString() } }));
    let requested!: () => void;
    let release!: () => void;
    const seen = new Promise<void>((resolve) => { requested = resolve; });
    const ready = new Promise<void>((resolve) => { release = resolve; });
    await page.route((url) => decodeURIComponent(url.pathname) === "/models/fixture/removed-model", async (route) => {
      requested();
      await ready;
      await route.continue();
    });
    await page.goto("/?requests=7&compare=fixture%2Fremoved-model");
    await expect(page.getByRole("link", { name: "View details for Removed model" })).toBeVisible();
    let finished = false;
    const checking = tool<BatchResult>("act", { steps: [
      press("View details for Removed model"), press("Close comparison"),
    ] }).finally(() => { finished = true; });
    await seen;
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }));
    const finishedWhileHeld = finished;
    release();
    const result = await checking;
    assert.equal(finishedWhileHeld, false);
    assert.equal(result.ok, false, JSON.stringify(result));
    assert.deepEqual(result.steps, []);
    assert.equal(result.error?.step, 0);
    assert.match(result.error?.message ?? "", /model detail.*unavailable/);
    await expect(page.getByRole("heading", { name: "Model not found", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Directory" })).toHaveAttribute("href", /requests=7/);
    assert.equal((await tool<BatchResult>("act", { steps: [press("Back to Directory")] })).ok, true);
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.searchParams.get("requests") === "7");
  });

  await check("#13 a failed production calculator chunk stops the native batch", async (page, tool) => {
    await page.route("**/api/models", (route) => route.fulfill({ json: { data: [catalog[0]], fetchedAt: new Date().toISOString() } }));
    await page.goto("/?requests=7&compare=fixture%2Fmodel-01");
    const dialog = page.getByRole("dialog", { name: "Compare Models" });
    await expect(dialog.getByRole("region", { name: "Comparison specifications" })).toBeVisible();
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      const response = await route.fetch();
      if ((await response.text()).includes("Comparison cost estimates")) return route.abort();
      await route.fulfill({ response });
    });
    const result = await tool<BatchResult>("act", { steps: [
      { ref: "tabs", action: "setValue", args: ["calculator"] }, press("Close comparison"),
    ] });
    assert.equal(result.ok, false, JSON.stringify(result));
    assert.deepEqual(result.steps, []);
    assert.equal(result.error?.step, 0);
    assert.match(result.error?.message ?? "", /comparison tab could not load/);
    await expect(dialog.getByRole("alert")).toContainText("This tab could not load");
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
  });

  await check("#25 native related-model discovery and navigation preserve the exact ID and workload", async (page, tool) => {
    await page.goto("/?requests=7");
    const first = page.locator("a[data-model-link]").first();
    await expect(first).toBeVisible();
    await first.click();
    const similar = page.getByRole("heading", { name: "Similar Models" }).locator("..");
    await expect(similar.getByRole("link").first()).toBeVisible();
    type Related = { actions: string[]; items: { value: string; label: string }[] };
    await expect.poll(async () => Array.isArray(await tool("query", { within: "Similar models" }))).toBe(true);
    const [results] = await tool<Related[]>("query", { within: "Similar models" });
    assert.deepEqual(results.actions, ["openModel"]);
    const selection = results.items[0];
    const result = await tool<BatchResult>("act", { steps: [{ ref: "Similar models", action: "openModel", args: [selection.value] }] });
    assert.equal(result.ok, true, JSON.stringify(result));
    await expect(page.getByRole("heading", { name: selection.label, exact: true, level: 1 })).toBeVisible();
    await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
    const catalog = await tool<{ modelId?: string; section: string }[]>("read_catalog", {});
    assert.ok(catalog.some(({ section, modelId }) => section === "Model description" && modelId === selection.value));
  });

  await check("#10 current visit state wins after a return-address write fails", async (page, tool) => {
    await page.goto("/?requests=12&view=list");
    const link = page.locator("a[data-model-link]").nth(9);
    await expect(link).toBeVisible();
    await link.scrollIntoViewIfNeeded();
    const previousScroll = await page.evaluate(() => {
      const key = "kilo-models-directory-return";
      sessionStorage.setItem(key, JSON.stringify({ href: "/?search=obsolete", scrollY: 1 }));
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
    assert.ok(previousScroll > 1);
    await link.press("Enter");
    const back = page.getByRole("link", { name: "Back to Directory" });
    await expect(back).toHaveAttribute("href", /view=list/);
    const detailUrl = page.url();
    const returnUrl = new URL((await back.getAttribute("href"))!, baseURL).href;
    const [popup] = await Promise.all([
      page.context().waitForEvent("page"),
      back.click({ modifiers: ["ControlOrMeta"] }),
    ]);
    await expect(popup).toHaveURL(returnUrl);
    await expect(page).toHaveURL(detailUrl);
    await popup.close();
    const result = await tool<BatchResult>("act", { steps: [press("Back to Directory")] });
    assert.equal(result.ok, true, JSON.stringify(result));
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.searchParams.get("requests") === "12" && url.searchParams.get("view") === "list");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(previousScroll);
    await page.goBack();
    await expect(page).toHaveURL(detailUrl);
    await page.goForward();
    await expect(page).toHaveURL(returnUrl);
  });
} finally {
  await browser.close();
}
