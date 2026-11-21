import { expect, test, type Page } from "@playwright/test";
import { catalog } from "./catalog";

interface Step { ref: string; action: string; args?: unknown[] }
interface FixtureTool { name: string; execute(input: unknown): unknown }
type ToolWindow = Window & { presentationTools?: Map<string, FixtureTool> };

async function exposeTools(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, FixtureTool>();
    Object.defineProperty(window, "presentationTools", { value: tools });
    Object.defineProperty(document, "modelContext", { value: {
      registerTool(tool: FixtureTool, { signal }: { signal: AbortSignal }) {
        tools.set(tool.name, tool);
        signal.addEventListener("abort", () => tools.delete(tool.name), { once: true });
        return Promise.resolve();
      },
    } });
  });
}

async function tool(page: Page, name: string, input: unknown = {}) {
  await page.waitForFunction((key) => (window as ToolWindow).presentationTools?.has(key), name);
  return page.evaluate(({ name, input }) => (window as ToolWindow).presentationTools?.get(name)?.execute(input), { name, input });
}

async function act(page: Page, ...steps: Step[]) {
  const result = await tool(page, "act", { steps });
  expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
}

async function customizeDirectory(page: Page, models: typeof catalog) {
  await page.route(/\/api\/models(?:\?|$)/, (route) => route.fulfill({ json: {
    data: models, excludedCount: 0, fetchedAt: "2026-01-01T00:00:00.000Z",
  } }));
}

test("21 SDK opens inline help and reads explanations only while their disclosures are open", async ({ page }) => {
  await exposeTools(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const filters = page.getByRole("button", { name: /^Filters/ });
  if (await filters.isVisible()) await filters.click();
  await expect(page.getByText(/Reasoning indicates support/)).toBeHidden();
  expect(await tool(page, "read_catalog")).not.toEqual(expect.arrayContaining([expect.objectContaining({ section: "About capabilities" })]));
  await act(page, { ref: "About capabilities", action: "press" });
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "About capabilities", text: expect.stringContaining("Tool calling") }),
  ]));
  await page.locator("summary").filter({ hasText: /^About capabilities$/ }).press("Enter");
  await expect(page.getByText(/Reasoning indicates support/)).toBeHidden();
  await act(page, { ref: "Advanced filters", action: "press" }, { ref: "About context", action: "press" });
  await act(page, { ref: "Estimate workload", action: "press" }, { ref: "About tokens", action: "press" },
    { ref: "Advanced usage", action: "press" }, { ref: "About caching", action: "press" });
  const readable = await tool(page, "read_catalog");
  for (const section of ["About context", "About tokens", "About caching"]) {
    expect(readable).toEqual(expect.arrayContaining([expect.objectContaining({ section, text: expect.stringMatching(/\S/) })]));
  }
  expect(readable).not.toEqual(expect.arrayContaining([expect.objectContaining({ section: "About capabilities" })]));
});

test("22 SDK reads the result total, view, current page and range after pagination and filtering", async ({ page }) => {
  await exposeTools(page);
  await page.goto("/?view=grid");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const summary = async (view: string, pageNumber: number, pages: number, range: string, total: number) => {
    const data = await tool(page, "read_catalog");
    expect(data).toEqual(expect.arrayContaining([expect.objectContaining({ section: "Directory results", text: expect.stringContaining(`${view} view. Page ${pageNumber} of ${pages}. Showing ${range} of ${total} matches.`) })]));
    return (data as { section: string }[]).filter(({ section }) => section === "Model result");
  };
  expect(await summary("Grid", 1, 3, "1–24", 60)).toHaveLength(24);
  await act(page, { ref: "Next page", action: "press" }, { ref: "List view", action: "press" });
  await expect(page.getByRole("link", { name: "Fixture Model 25", exact: true })).toBeVisible();
  expect(await summary("List", 2, 3, "25–48", 60)).toHaveLength(24);
  await page.getByRole("textbox", { name: "Search models" }).fill("Fixture Model 03");
  await expect(page.getByRole("link", { name: "Fixture Model 03", exact: true })).toBeVisible();
  expect(await summary("List", 1, 1, "1–1", 1)).toHaveLength(1);
  await act(page, { ref: "Model results", action: "setModelCompared", args: ["fixture/model-03", true] }, { ref: "Compare", action: "press" });
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await tool(page, "read_catalog")).not.toEqual(expect.arrayContaining([expect.objectContaining({ section: "Directory results" })]));
});

test("23 duplicate comparison names show their IDs and support removing one without removing the other", async ({ page }) => {
  await exposeTools(page);
  await customizeDirectory(page, catalog.slice(0, 3).map((model, index) => index < 2 ? { ...model, name: "Common name" } : model));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Common name", exact: true })).toHaveCount(2);
  await act(page, ...catalog.slice(0, 3).map((model) => ({ ref: "Model results", action: "setModelCompared", args: [model.id, true] })));
  const tray = page.getByRole("region", { name: "Model comparison" });
  const first = `Remove Common name (${catalog[0].id}) from comparison`;
  const second = `Remove Common name (${catalog[1].id}) from comparison`;
  await expect(tray.getByText(catalog[0].id, { exact: true })).toBeVisible();
  await expect(tray.getByText(catalog[1].id, { exact: true })).toBeVisible();
  await expect(tray.getByRole("button", { name: second, exact: true })).toBeVisible();
  await act(page, { ref: first, action: "press" });
  await expect(tray.getByText(catalog[0].id, { exact: true })).toHaveCount(0);
  // The remaining item is now unique, so it keeps the short label.
  await expect(tray.getByRole("button", { name: second, exact: true })).toHaveCount(0);
  await expect(tray.getByRole("button", { name: "Remove Common name from comparison", exact: true })).toBeVisible();
  await expect(tray.getByRole("button", { name: "Remove Fixture Model 03 from comparison", exact: true })).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "fixture/model-02,fixture/model-03");
  await page.reload();
  await expect(tray.getByRole("button", { name: "Remove Common name from comparison", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await tray.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "View details for Common name" })).toBeVisible();
});

for (const { width, height } of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 667, height: 375 }]) {
  test(`28 comparison content stays reachable after denied copy at ${width}×${height}`, async ({ page, hasTouch }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?compare=fixture%2Fmodel-01%2Cfixture%2Fmodel-02");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", {
      configurable: true, value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    }));
    const copy = dialog.getByRole("button", { name: "Copy link" });
    if (hasTouch) await copy.tap();
    else await copy.click();
    await expect(dialog.getByRole("textbox", { name: "Comparison link" })).toBeVisible();
    const more = dialog.locator("summary").filter({ hasText: /^More actions$/ });
    if (hasTouch) await more.tap();
    else await more.click();
    await expect(dialog.getByRole("button", { name: "Export CSV" })).toBeInViewport();
    const specifications = dialog.getByRole("region", { name: "Comparison specifications" });
    const firstRow = specifications.getByRole("rowheader").first();
    const lastRow = specifications.getByRole("rowheader").last();
    await firstRow.scrollIntoViewIfNeeded();
    await expect(firstRow).toBeInViewport({ ratio: 0.5 });
    const header = specifications.getByRole("columnheader", { name: "Specification", exact: true });
    const firstBounds = (await firstRow.boundingBox())!;
    const headerBounds = (await header.boundingBox())!;
    expect(firstBounds.y).toBeGreaterThanOrEqual(headerBounds.y + headerBounds.height - 1);
    await specifications.focus();
    await page.keyboard.press("End");
    await expect(lastRow).toBeInViewport({ ratio: 0.5 });
    const charts = dialog.getByRole("tab", { name: "Charts" });
    if (hasTouch) await charts.tap();
    else await charts.click();
    const guide = dialog.getByText("The Overview table provides a summary.", { exact: false });
    await guide.scrollIntoViewIfNeeded();
    await expect(guide).toBeInViewport({ ratio: 0.5 });
    const costs = dialog.getByRole("tab", { name: /Cost Calculator|Costs/ });
    if (hasTouch) await costs.tap();
    else await costs.click();
    const requests = dialog.getByRole("spinbutton", { name: "Requests", exact: true });
    if (hasTouch) await requests.tap();
    else await requests.click();
    await requests.fill("17");
    await expect(requests).toBeInViewport({ ratio: 0.5 });
    await expect(requests).toHaveValue("17");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
}

test("29 a keyboard-focused card link draws a visible focus indicator without taking over its controls", async ({ page }) => {
  await page.goto("/?view=grid");
  const card = page.locator('[data-model-id="fixture/model-01"]');
  const link = card.getByRole("link", { name: "Fixture Model 01", exact: true });
  await expect(link).toBeVisible();
  async function visibleKeyboardFocus(target: typeof link) {
    await target.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(target).toBeFocused();
    await expect.poll(() => target.evaluate((node) => {
      const linkStyle = getComputedStyle(node);
      const stretch = getComputedStyle(node, "::after");
      return (parseFloat(linkStyle.outlineWidth) > 0 && linkStyle.outlineStyle !== "none") ||
        (parseFloat(stretch.outlineWidth) > 0 && stretch.outlineStyle !== "none" && parseFloat(stretch.outlineOffset) <= -parseFloat(stretch.outlineWidth));
    })).toBe(true);
  }
  await visibleKeyboardFocus(link);
  const favorite = card.getByRole("button", { name: /favorites/ });
  const compare = card.getByRole("button", { name: /comparison/ });
  await favorite.focus();
  await page.keyboard.press("Enter");
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await compare.focus();
  await page.keyboard.press("Enter");
  await expect(compare).toHaveAttribute("aria-pressed", "true");
  await link.press("Enter");
  await expect(page.getByRole("heading", { name: "Fixture Model 01", level: 1, exact: true })).toBeVisible();
  const related = page.getByRole("link", { name: "Fixture Model 02", exact: true });
  await expect(related).toBeVisible();
  await visibleKeyboardFocus(related);
});

test("30 appearance exposes the selected mode and palette in separate accessibility groups", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    localStorage.setItem("kilo-color-theme", "one-light");
  });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Toggle theme" });
  await trigger.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const modes = menu.getByRole("group", { name: "Mode", exact: true });
  const palettes = menu.getByRole("group", { name: "Color Theme", exact: true });
  await expect(modes).toMatchAriaSnapshot(`
    - group "Mode":
      - menuitemradio "Light" [checked]
      - menuitemradio "Dark"
      - menuitemradio "System"
  `);
  const atom = palettes.getByRole("menuitemradio", { name: "One Light", exact: true, checked: true });
  await expect(atom).toBeVisible();
  const light = modes.getByRole("menuitemradio", { name: "Light", exact: true });
  await light.focus();
  await page.keyboard.press("ArrowDown");
  await expect(modes.getByRole("menuitemradio", { name: "Dark", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(modes.getByRole("menuitemradio", { name: "System", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await trigger.press("Enter");
  await expect(modes.getByRole("menuitemradio", { name: "System", checked: true })).toBeVisible();
  await expect(atom).toHaveCount(0);
  const selected = await page.locator("html").getAttribute("data-kilo-theme");
  expect(selected).not.toBe("one-light");
  await expect(palettes.getByRole("menuitemradio", { checked: true })).toHaveCount(1);
});

test("31 slash keeps keyboard focus in an open menu or dialog and respects editing and composition", async ({ page }) => {
  await page.goto("/");
  const theme = page.getByRole("button", { name: "Toggle theme" });
  const search = page.getByRole("textbox", { name: "Search models" });
  await theme.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("/");
  await page.keyboard.type("xyz");
  await expect(search).not.toBeFocused();
  await expect(search).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(theme).toBeFocused();
  await theme.dispatchEvent("keydown", { key: "/", isComposing: true, bubbles: true });
  await expect(theme).toBeFocused();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await page.keyboard.type("fixture/");
  await expect(search).toHaveValue("fixture/");
  await search.fill("");
  await page.getByRole("button", { name: "Add Fixture Model 01 to comparison", exact: true }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("/");
  await page.keyboard.type("xyz");
  await expect(search).not.toBeFocused();
  await expect(search).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

for (const width of [390, 850]) {
  test(`32 ${width}px list and grid expose the same fixture capabilities`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/?view=list");
    const model = page.locator('[data-model-id="fixture/model-01"]');
    await expect(model.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
    for (const label of [/image input/i, "Reasoning", "Tools"]) {
      await expect(model.getByText(label, { exact: true })).toBeVisible();
      expect(await model.ariaSnapshot()).toMatch(new RegExp(String(label).replace(/^\/|\/i$/g, ""), "i"));
    }
    await page.getByRole("button", { name: "Grid view", exact: true }).click();
    for (const label of [/image input/i, "Reasoning", "Tools"]) {
      await expect(model.getByText(label, { exact: true })).toBeVisible();
      expect(await model.ariaSnapshot()).toMatch(new RegExp(String(label).replace(/^\/|\/i$/g, ""), "i"));
    }
  });
}

test("33 blank model names fall back to IDs in grid, list and SDK discovery", async ({ page }) => {
  await exposeTools(page);
  await customizeDirectory(page, catalog.slice(0, 3).map((model, index) => index < 2 ? { ...model, name: index ? "   " : "" } : model));
  await page.goto("/?view=grid");
  await expect(page.getByRole("link", { name: "Fixture Model 03", exact: true })).toBeVisible();
  for (const view of ["Grid", "List"]) {
    await page.getByRole("button", { name: `${view} view`, exact: true }).click();
    for (const model of catalog.slice(0, 2)) {
      await expect(page.getByRole("link", { name: model.id, exact: true })).toBeVisible({ timeout: 1800 });
      expect(await tool(page, "query", { within: "Model results", text: model.id })).toEqual([
        expect.objectContaining({ items: [{ value: model.id, label: model.id }] }),
      ]);
    }
    await expect(page.getByRole("link", { name: "Fixture Model 03", exact: true })).toBeVisible();
  }
  await act(page, { ref: "Model results", action: "openModel", args: [catalog[0].id] });
  await expect(page.locator("[data-model-detail-ready]")).toHaveAttribute("data-model-detail-ready", catalog[0].id);
});

test("34 the SDK reads populated capability lists only after full specifications are opened", async ({ page }) => {
  await exposeTools(page);
  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("heading", { name: "Fixture Model 01", level: 1 })).toBeVisible();
  expect(await tool(page, "read_catalog")).not.toEqual(expect.arrayContaining([expect.objectContaining({ section: "Full specifications" })]));
  await act(page, { ref: "Full specifications", action: "press" });
  await expect(page.getByText("Supported Parameters", { exact: true })).toBeVisible();
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([expect.objectContaining({ section: "Full specifications", modelId: "fixture/model-01", text: expect.stringMatching(/Input types\s+text\s+image[\s\S]*Supported Parameters\s+tools\s+reasoning/i) })]));
});
