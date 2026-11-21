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

async function tool(page: Page, name: string, input: unknown = {}) {
  await page.waitForFunction((key) => (window as ToolWindow).catalogTools?.has(key), name);
  return page.evaluate(({ name, input }) => (window as ToolWindow).catalogTools?.get(name)?.execute(input), { name, input });
}

async function act(page: Page, ...steps: Step[]) {
  const result = await tool(page, "act", { steps });
  expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
}

for (const failure of ["storage", "blob"] as const) {
  test(`agent stops before deleting a setup when backup ${failure} fails`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
    await act(page,
      { ref: "Estimate workload", action: "press" },
      { ref: "Setup name", action: "setValue", args: ["Only copy"] },
      { ref: "Save setup", action: "press" },
      { ref: "Manage setups", action: "press" },
    );
    const downloads: string[] = [];
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await page.evaluate((failure) => {
      if (failure === "blob") {
        URL.createObjectURL = () => { throw new Error("Blob unavailable"); };
        return;
      }
      const getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === "kilo-models-saved-setups") {
          Storage.prototype.getItem = getItem;
          throw new Error("Storage unavailable");
        }
        return getItem.call(this, key);
      };
    }, failure);
    expect(await tool(page, "act", { steps: [
      { ref: "Export backup", action: "press" },
      { ref: "Delete Only copy", action: "press" },
    ] })).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/Could not (read|start)/) } });
    await expect(page.getByRole("region", { name: "Saved setups" }).getByRole("alert")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
    await act(page, { ref: "Estimate workload", action: "press" });
    await expect(page.getByRole("region", { name: "Saved setups" }).getByRole("combobox")).toContainText("Only copy");
    expect(downloads).toEqual([]);
  });
}

test("agent receives download-start and model ID clipboard errors", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await act(page,
    { ref: "Model results", action: "setModelCompared", args: ["fixture/model-01", true] },
    { ref: "Compare", action: "press" }, { ref: "More actions", action: "press" },
  );
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error("Blob unavailable"); }; });
  const exportResult = await tool(page, "act", { steps: [
    { ref: "Export CSV", action: "press" }, { ref: "Close comparison", action: "press" },
  ] });
  expect(exportResult).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringContaining("CSV download could not start") } });
  await expect(page.getByRole("dialog").getByText(/CSV download could not start/)).toBeVisible();
  expect(downloads).toEqual([]);

  await page.goto("/models/fixture%2Fmodel-01");
  await expect(page.getByRole("button", { name: "Copy model ID" })).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", { value: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")) });
  });
  const copyResult = await tool(page, "act", { steps: [
    { ref: "Copy model ID", action: "press" }, { ref: "Back to directory", action: "press" },
  ] });
  expect(copyResult).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringContaining("Could not copy") } });
  await expect(page.getByText(/Select and copy the model ID/)).toBeVisible();
  await expect(page.getByText("fixture/model-01", { exact: true }).first()).toBeVisible();
});

test("agent filters and compares using the visible catalog and shareable workload", async ({ page }) => {
  await page.goto("/?inputTokens=100&outputTokens=10&requests=2");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const mobileFilters = page.getByRole("button", { name: /^Filters/ });
  if (await mobileFilters.isVisible()) await act(page, { ref: "Filters", action: "press" });
  await act(page, { ref: "All providers", action: "press" });
  const rejected = await tool(page, "act", { steps: [{ ref: "Choose providers", action: "setValue", args: [["ghost-provider"]] }] });
  expect(rejected).toMatchObject({ ok: false, error: { message: expect.stringContaining("Choose providers listed") } });
  await expect(page).toHaveURL((url) => !url.searchParams.has("providers"));
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await act(page,
    { ref: "Choose providers", action: "setValue", args: [["fixture", "fixture"]] },
    { ref: "Advanced filters", action: "press" },
    { ref: "Total budget", action: "setValue", args: ["0.8"] },
  );
  await expect(page).toHaveURL((url) => url.searchParams.get("providers") === "fixture" && url.searchParams.get("maxBudget") === "0.8");
  const invalidBudget = await tool(page, "act", { steps: [
    { ref: "Total budget", action: "setValue", args: ["-1"] },
    { ref: "Search models", action: "setValue", args: ["Unreachable"] },
  ] });
  expect(invalidBudget).toMatchObject({ ok: false, error: { message: expect.stringContaining("0 or more") } });
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue("");
  await expect(page).toHaveURL((url) => url.searchParams.get("maxBudget") === "0.8");
  const results = await tool(page, "read_catalog");
  expect(results).toEqual(expect.arrayContaining([
    expect.objectContaining({ modelId: "fixture/model-01", text: expect.stringContaining("Fixture Model 01") }),
    expect.objectContaining({ modelId: "fixture/model-02", text: expect.stringContaining("Fixture Model 02") }),
  ]));
  expect(await tool(page, "query", { within: "Model results", text: "Fixture Model 01" })).toEqual([
    expect.objectContaining({ items: [{ value: "fixture/model-01", label: "Fixture Model 01" }] }),
  ]);
  await act(page, { ref: "Model results", action: "openModel", args: ["fixture/model-01"] });
  await expect(page.getByRole("heading", { level: 1, name: "Fixture Model 01", exact: true })).toBeVisible();
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Model specifications and pricing", modelId: "fixture/model-01" }),
    expect.objectContaining({ section: "Model description", modelId: "fixture/model-01", text: expect.stringContaining("synthetic model") }),
  ]));
  await act(page, { ref: "Back to directory", action: "press" });
  await expect(page).toHaveURL((url) => url.searchParams.get("maxBudget") === "0.8");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await act(page,
    { ref: "Model results", action: "setModelCompared", args: ["fixture/model-01", true] },
    { ref: "Model results", action: "setModelCompared", args: ["fixture/model-02", true] },
    { ref: "Compare", action: "press" },
  );
  const dialog = page.getByRole("dialog", { name: "Compare Models" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "fixture/model-01,fixture/model-02");
  await act(page, { ref: "tabs", action: "setValue", args: ["calculator"] });
  await expect(dialog.getByRole("region", { name: "Cost estimates" })).toBeVisible();
  const table = await dialog.getByRole("region", { name: "Cost estimates" }).innerText();
  expect(await tool(page, "read_catalog")).toEqual([
    expect.objectContaining({ section: "Comparison cost estimates", text: table.trim() }),
  ]);
  await act(page, { ref: "Full cost breakdown", action: "press" });
  for (const modelId of ["fixture/model-01", "fixture/model-02"]) {
    expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: "Comparison cost breakdown", modelId, text: expect.stringMatching(/Uncached input[\s\S]*Request fee/) }),
    ]));
  }
  await act(page,
    { ref: "tabs", action: "setValue", args: ["overview"] },
    { ref: "Remove Fixture Model 02 from comparison table", action: "press" },
  );
  await expect(dialog.getByText("1 model selected", { exact: true })).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "fixture/model-01");
});

test("agent reads detailed prices and warnings and keeps the search when opening a comparison", async ({ page }) => {
  await page.route((url) => decodeURIComponent(url.pathname) === "/models/fixture/model-01", async (route) => {
    // Keep navigation in flight past the directory's search debounce.
    await new Promise((resolve) => setTimeout(resolve, 650));
    await route.continue();
  });
  await page.goto("/?page=2&view=list&inputTokens=200000");
  await expect(page.getByRole("link", { name: "Fixture Model 25", exact: true })).toBeVisible();
  await act(page,
    { ref: "Search models", action: "setValue", args: ["Fixture Model 01"] },
    { ref: "Model results", action: "openModel", args: ["fixture/model-01"] },
    { ref: "Full specifications", action: "press" },
  );
  await expect(page.getByRole("heading", { level: 1, name: "Fixture Model 01", exact: true })).toBeVisible();
  await act(page,
    { ref: "Other published rates", action: "press" },
  );
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Model specifications and pricing", text: expect.stringMatching(/Tokenizer\s+fixture[\s\S]*Cache Read\s+\$0\.50\/M/) }),
    expect.objectContaining({ section: "Model workload", text: expect.stringContaining("200,000 input") }),
    expect.objectContaining({ section: "Model cost estimate", text: expect.stringMatching(/128,000-token context limit[\s\S]*hypothetical cost[\s\S]*\$221\.0000/) }),
  ]));
  const breakdown = expect.objectContaining({ section: "Model cost breakdown", modelId: "fixture/model-01", text: expect.stringMatching(/Uncached input[\s\S]*Request fee/) });
  expect(await tool(page, "read_catalog")).not.toEqual(expect.arrayContaining([breakdown]));
  await act(page, { ref: "Full cost breakdown", action: "press" });
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([breakdown]));

  await act(page,
    { ref: "Add Fixture Model 01 to comparison", action: "press" },
    { ref: "View comparison", action: "press" },
  );
  await expect(page.getByRole("dialog", { name: "Compare Models" })).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname === "/" &&
    url.searchParams.get("search") === "Fixture Model 01" && !url.searchParams.has("page") &&
    url.searchParams.get("view") === "list" && url.searchParams.get("inputTokens") === "200000" &&
    url.searchParams.get("compare") === "fixture/model-01");

  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Fixture Model 01", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue("Fixture Model 01");
  await expect(page).toHaveURL((url) => url.searchParams.get("search") === "Fixture Model 01" && !url.searchParams.has("page"));
});

test("agent manages favorites and setups and starts browser exports", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, "writeText", { value: () => Promise.reject(new Error("Clipboard unavailable")) });
  });
  await page.goto("/?view=list");
  const first = page.getByRole("link", { name: "Fixture Model 01", exact: true });
  await expect(first).toBeVisible();
  const firstResult = {
    section: "Model result",
    modelId: "fixture/model-01",
    rates: { input: "$1/M", output: "$2/M", currency: "USD", perTokens: 1_000_000 },
  };
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ ...firstResult, favorite: false }),
  ]));
  await act(page,
    { ref: "Model results", action: "setModelFavorite", args: ["fixture/model-01", true] },
    { ref: "Estimate workload", action: "press" },
    { ref: "Requests", action: "setValue", args: ["7"] },
    { ref: "Setup name", action: "setValue", args: ["Agent setup"] },
    { ref: "Save setup", action: "press" },
  );
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
  await expect(page.getByRole("button", { name: "Remove Fixture Model 01 from favorites" })).toHaveAttribute("aria-pressed", "true");
  const setups = page.getByRole("region", { name: "Saved setups" });
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Saved setup status", text: "Saved “Agent setup”." }),
    expect.objectContaining({ ...firstResult, favorite: true }),
  ]));
  await expect(setups.getByText(/^Preview:/)).toContainText("7 requests");
  await act(page,
    { ref: "Requests", action: "setValue", args: ["11"] },
    { ref: "Setup name", action: "setValue", args: ["Protected setup"] },
    { ref: "Save setup", action: "press" },
    { ref: "Manage setups", action: "press" },
  );
  const duplicate = await tool(page, "act", { steps: [
    { ref: "Requests", action: "setValue", args: ["17"] },
    { ref: "Setup name", action: "setValue", args: ["Agent setup"] },
    { ref: "Save setup", action: "press" },
    { ref: "Update workload & view", action: "press" },
  ] });
  expect(duplicate).toMatchObject({ ok: false, error: { step: 2, message: expect.stringContaining("A setup already has this name") } });
  await expect(setups.getByText(/^Preview:/)).toContainText("11 requests");
  const invalidSelection = await tool(page, "act", { steps: [
    { ref: "Saved setup", action: "setValue", args: [null] },
    { ref: "Apply", action: "press" },
  ] });
  expect(invalidSelection).toMatchObject({ ok: false, error: { step: 0 } });
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "17");
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Saved setup error", text: "A setup already has this name. Choose a different name." }),
  ]));
  await act(page,
    { ref: "Saved setup", action: "setValue", args: ["Agent setup · Workload + view"] },
    { ref: "Delete Agent setup", action: "press" },
    { ref: "Undo deletion of Agent setup", action: "press" },
  );
  await expect(setups.getByRole("status")).toContainText("Restored “Agent setup”");
  await act(page,
    { ref: "Setup name", action: "setValue", args: ["Second setup"] },
    { ref: "Save setup", action: "press" },
    { ref: "Saved setup", action: "setValue", args: ["Agent setup · Workload + view"] },
    { ref: "Rename", action: "press" },
    { ref: "New name for Agent setup", action: "setValue", args: ["Renamed setup"] },
    { ref: "Save name", action: "press" },
    { ref: "Requests", action: "setValue", args: ["8"] },
  );
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "8");
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Saved setup preview", text: expect.stringMatching(/7 requests[\s\S]*Saved view:/) }),
    expect.objectContaining({ section: "Active saved setup", text: expect.stringContaining("Changed since applying") }),
  ]));
  await act(page, { ref: "Apply", action: "press" });
  await expect(setups.getByRole("status")).toContainText("Applied “Renamed setup”");
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
  const backup = page.waitForEvent("download");
  await act(page, { ref: "Export backup", action: "press" });
  expect((await backup).suggestedFilename()).toBe("kilo-models-setups.json");

  await act(page,
    { ref: "Model results", action: "setModelCompared", args: ["fixture/model-01", true] },
    { ref: "Compare", action: "press" },
    { ref: "Copy link", action: "press" },
  );
  const dialog = page.getByRole("dialog", { name: "Compare Models" });
  await expect(dialog.getByRole("textbox", { name: "Comparison link" })).toHaveValue(/requests=7/);
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Comparison link", text: expect.stringMatching(/^http.+[?&]requests=7(?:&|$)/) }),
  ]));
  const csv = page.waitForEvent("download");
  await act(page, { ref: "More actions", action: "press" }, { ref: "Export CSV", action: "press" });
  expect((await csv).suggestedFilename()).toBe("kilo-model-comparison.csv");
  await act(page, { ref: "tabs", action: "setValue", args: ["calculator"] });
  await expect(dialog.getByRole("spinbutton", { name: "Requests", exact: true })).toBeVisible();
  await act(page, { ref: "Requests", action: "setValue", args: ["23"] }, { ref: "Setup name", action: "setValue", args: ["Comparison draft"] });
  await expect(dialog.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("23");
  await expect(dialog.getByRole("textbox", { name: "Setup name", exact: true })).toHaveValue("Comparison draft");
  await act(page, { ref: "Copy link", action: "press" });
  await expect(dialog.getByRole("textbox", { name: "Comparison link" })).toHaveValue(/requests=23/);
  await act(page, { ref: "Requests", action: "setValue", args: ["31"] });
  await expect(dialog.getByRole("textbox", { name: "Comparison link" })).toHaveValue(/requests=31/);
  await act(page, { ref: "tabs", action: "setValue", args: ["charts"] });
  await expect(dialog.getByText(/The Overview table provides/)).toBeVisible();
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Charts guide", text: expect.stringContaining("Overview table") }),
  ]));
});

test("agent rejects invalid input before a later step can save a stale workload", async ({ page }) => {
  await page.goto("/?requests=7");
  const model = page.getByRole("link", { name: "Fixture Model 01", exact: true });
  await expect(model).toBeVisible();
  const invalidSearch = await tool(page, "act", { steps: [{ ref: "Search models", action: "setValue", args: [53] }] });
  expect(invalidSearch).toMatchObject({ ok: false, error: { message: expect.stringContaining("as a string") } });
  await expect(model).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue("");

  await act(page,
    { ref: "Estimate workload", action: "press" },
    { ref: "Setup name", action: "setValue", args: ["Minimum requests"] },
  );
  const invalidRequests = await tool(page, "act", { steps: [
    { ref: "Requests", action: "setValue", args: ["0"] },
    { ref: "Save setup", action: "press" },
  ] });
  expect(invalidRequests).toMatchObject({ ok: false, error: { message: expect.stringContaining("Requests: Enter a whole number from 1") } });
  const setups = page.getByRole("region", { name: "Saved setups" });
  await expect(setups.getByText(/No saved setups yet/)).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Requests", exact: true })).toHaveValue("7");
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7");
});

test("direct model visits expose descriptions and open safety reports to the agent", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-59?requests=7");
  await expect(page.getByRole("heading", { name: "Fixture Model 59", exact: true })).toBeVisible();
  const detail = await tool(page, "read_catalog");
  expect(detail).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Model description", modelId: "fixture/model-59", text: expect.stringContaining("synthetic model") }),
    expect.objectContaining({ section: "Safety report", modelId: "fixture/model-59", text: expect.stringContaining("View safety metrics") }),
  ]));
  await act(page, { ref: "View safety metrics", action: "press" });
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Safety report", modelId: "fixture/model-59", text: expect.stringContaining("Reported Safety Score") }),
  ]));
  const similar = page.getByRole("heading", { name: "Similar Models", exact: true }).locator("..").getByRole("link").first();
  await expect(similar).toHaveAttribute("href", /\?requests=7$/);
  await similar.click();
  await expect(page).toHaveURL((url) => url.searchParams.get("requests") === "7" && !url.pathname.endsWith("model-59"));
});

test("agent can distinguish unavailable, empty, and stale catalogs and use catalog modalities", async ({ page }) => {
  let available = false;
  let failRefresh = false;
  await page.route("**/api/models", (route) => {
    if (!available || (failRefresh && route.request().method() === "POST")) {
      return route.fulfill({ status: 502, json: { error: "Fixture unavailable" } });
    }
    const model = { ...catalog[0], architecture: { ...catalog[0].architecture, input_modalities: ["pdf"], output_modalities: ["video"] } };
    return route.fulfill({ json: { data: [model], fetchedAt: new Date().toISOString() } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Models could not be loaded" })).toBeVisible();
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([expect.objectContaining({ section: "Catalog unavailable" })]));
  available = true;
  await act(page, { ref: "Try again", action: "press" });
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  if (await page.getByRole("button", { name: "Filters", exact: true }).isVisible()) {
    await act(page, { ref: "Filters", action: "press" });
  }
  await act(page,
    { ref: "Tool calling", action: "press" },
    { ref: "Advanced filters", action: "press" },
    { ref: "pdf input", action: "press" },
    { ref: "video output", action: "press" },
  );
  await expect(page).toHaveURL((url) => url.searchParams.get("inputModalities") === "pdf" && url.searchParams.get("outputModalities") === "video");
  await act(page, { ref: "Search models", action: "setValue", args: ["No matching fixture"] });
  await expect(page.getByRole("heading", { name: "No models found" })).toBeVisible();
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([expect.objectContaining({ section: "Catalog results status" })]));
  failRefresh = true;
  expect(await tool(page, "act", { steps: [{ ref: "Refresh catalog", action: "press" }] })).toMatchObject({ ok: false, error: { step: 0 } });
  await expect(page.getByText("Refresh failed. Showing last loaded catalog.")).toBeVisible();
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Catalog status", text: expect.stringContaining("Showing last loaded catalog") }),
  ]));
});

test("agent opens a model from comparison and returns to the filtered directory", async ({ page }) => {
  await page.goto("/?search=Fixture&view=list&page=2&compare=fixture%2Fmodel-25");
  const dialog = page.getByRole("dialog", { name: "Compare Models" });
  await expect(dialog.getByRole("link", { name: "View details for Fixture Model 25", exact: true })).toBeVisible();
  await act(page, { ref: "View details for Fixture Model 25", action: "press" });
  await expect(page.getByRole("heading", { level: 1, name: "Fixture Model 25" })).toBeVisible();
  await act(page, { ref: "Back to directory", action: "press" });
  await expect(page).toHaveURL((url) => url.pathname === "/" && url.searchParams.get("view") === "list" &&
    url.searchParams.get("search") === "Fixture" && url.searchParams.get("page") === "2");
  await expect(page.getByRole("link", { name: "Fixture Model 25", exact: true })).toBeVisible();
});

test("agent follows a similar model while retaining the workload", async ({ page }) => {
  await page.goto("/models/fixture%2Fmodel-59?requests=7");
  const first = page.getByRole("heading", { name: "Similar Models", exact: true }).locator("..").getByRole("link").first();
  const target = new URL((await first.getAttribute("href"))!, page.url());
  const id = decodeURIComponent(target.pathname.split("/").at(-1)!);
  await expect.poll(() => tool(page, "query", { within: "Similar models" })).toEqual([
    expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ value: id })]) }),
  ]);
  await act(page, { ref: "Similar models", action: "openModel", args: [id] });
  await expect(page).toHaveURL(target.href);
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Model description", modelId: id }),
  ]));
});

test("active capability toggles remain addressable by name", async ({ page }) => {
  await page.goto("/?reasoning=true");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  if (await page.getByRole("button", { name: "Filters", exact: true }).isVisible()) {
    await act(page, { ref: "Filters", action: "press" });
  }
  await act(page,
    { ref: "Tool calling filter", action: "press" }, { ref: "Tool calling filter", action: "press" },
    { ref: "Reasoning filter", action: "press" }, { ref: "Reasoning filter", action: "press" },
    { ref: "Remove filter: Reasoning", action: "press" },
  );
  await expect(page).toHaveURL((url) => !url.searchParams.has("reasoning") && !url.searchParams.has("tools"));
});

test("a delayed refresh failure stops a dependent agent action and can retry", async ({ page }) => {
  let finish!: () => void;
  const response = new Promise<void>((resolve) => { finish = resolve; });
  let requests = 0;
  await page.route("**/api/models", async (route) => {
    if (route.request().method() === "POST" && ++requests === 1) {
      await response;
      return route.fulfill({ status: 503, json: {} });
    }
    return route.fulfill({ json: { data: [catalog[0]], fetchedAt: new Date().toISOString() } });
  });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const batch = tool(page, "act", { steps: [
    { ref: "Refresh catalog", action: "press" },
    { ref: "Model results", action: "setModelFavorite", args: ["fixture/model-01", true] },
  ] });
  await expect(page.getByText("Checking Kilo for updates…")).toBeVisible();
  const favorite = page.getByRole("button", { name: "Add Fixture Model 01 to favorites", exact: true });
  const started = await page.evaluate(() => localStorage.getItem("kilo-models-favorites"));
  finish();
  expect(await batch).toMatchObject({ ok: false, steps: [], error: { step: 0 } });
  expect(started).toBeNull();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await act(page, { ref: "Retry refresh", action: "press" });
  await expect(page.getByRole("button", { name: "Refresh catalog" })).toBeEnabled();
  expect(requests).toBe(2);
});

test("ordered agent favorite actions wait for the shared lock", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await other.evaluate(() => new Promise<void>((held) => {
    void navigator.locks.request("kilo-models-favorites", () => new Promise<void>((release) => {
      window.addEventListener("release-favorites-lock", () => release(), { once: true });
      held();
    }));
  }));
  const batch = tool(page, "act", { steps: [
    { ref: "Model results", action: "setModelFavorite", args: ["fixture/model-01", true] },
    { ref: "Model results", action: "setModelFavorite", args: ["fixture/model-01", false] },
  ] });
  await expect.poll(() => other.evaluate(async () => (await navigator.locks.query()).pending?.length)).toBe(1);
  await other.evaluate(() => window.dispatchEvent(new Event("release-favorites-lock")));
  expect(await batch).toMatchObject({ ok: true });
  await page.reload();
  await expect(page.getByRole("button", { name: "Add Fixture Model 01 to favorites", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kilo-models-favorites") ?? "[]"))).toEqual([]);
});

test("initial catalog retry failures stop the batch and disable the retry button while pending", async ({ page }) => {
  let release!: () => void;
  let succeed = false;
  let posts = 0;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/models", async (route) => {
    if (route.request().method() === "POST" && ++posts === 1) await pending;
    return succeed
      ? route.fulfill({ json: { data: [catalog[0]], fetchedAt: new Date().toISOString() } })
      : route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  const batch = tool(page, "act", { steps: [
    { ref: "Try again", action: "press" }, { ref: "Toggle theme", action: "press" },
  ] });
  await expect.poll(() => posts).toBe(1);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeDisabled();
  release();
  expect(await batch).toMatchObject({ ok: false, steps: [], error: { step: 0 } });
  expect(posts).toBe(1);
  succeed = true;
  await act(page, { ref: "Try again", action: "press" });
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  expect(posts).toBe(2);
});

test("chart values expose exact chart prices and known zero separately from unknown", async ({ page }) => {
  const models = [
    { ...catalog[0], supported_parameters: [], pricing: { prompt: "1.001e-7", completion: "0" } },
    { ...catalog[1], supported_parameters: undefined, pricing: { prompt: "1.002e-7" } },
  ];
  await page.route("**/api/models", (route) => route.fulfill({ json: { data: models, fetchedAt: new Date().toISOString() } }));
  await page.goto("/?compare=fixture%2Fmodel-01,fixture%2Fmodel-02");
  await expect(page.getByRole("dialog")).toBeVisible();
  await act(page, { ref: "tabs", action: "setValue", args: ["charts"] });
  await expect(page.getByRole("heading", { name: "Chart values", exact: true })).toBeVisible();
  expect(await tool(page, "read_catalog")).toEqual(expect.arrayContaining([
    expect.objectContaining({ section: "Chart values", modelId: models[0].id, text: expect.stringMatching(/\$0\.1001[\s\S]*\$0 \/ 1M[\s\S]*Supported parameters[\s\S]*0/) }),
    expect.objectContaining({ section: "Chart values", modelId: models[1].id, text: expect.stringMatching(/\$0\.1002[\s\S]*Unavailable[\s\S]*Supported parameters[\s\S]*Unknown/) }),
  ]));
});

test("comparison selection, sharing and removal preserve an ID containing a comma", async ({ page }) => {
  const models = ["p/x,p/y", "p/x", "p/y"].map((id, index) => ({ ...catalog[index], id }));
  await page.route("**/api/models", (route) => route.fulfill({ json: { data: models, fetchedAt: new Date().toISOString() } }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await act(page, { ref: "Model results", action: "setModelCompared", args: [models[0].id, true] });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("kilo-models-comparison") ?? "[]"));
  await expect.poll(stored).toEqual([models[0].id]);
  await page.reload();
  const dialog = page.getByRole("dialog", { name: "Compare Models" });
  await expect(page.getByRole("region", { name: "Model comparison" })).toContainText("Fixture Model 01");
  await expect(dialog).toBeHidden();
  const sharedUrl = new URL(page.url());
  sharedUrl.searchParams.set("view", "list");
  await page.goto(sharedUrl.href);
  await expect(dialog.getByRole("link", { name: "View details for Fixture Model 01" })).toBeVisible();
  await expect(dialog.getByText("1 model selected", { exact: true })).toBeVisible();
  await act(page, { ref: "Remove Fixture Model 01 from comparison table", action: "press" });
  await expect.poll(stored).toEqual([]);
  await expect(page).toHaveURL((url) => url.searchParams.get("compare") === "");
});
