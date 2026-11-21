import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import { DEFAULT_WORKLOAD } from "../src/lib/calculator-workload";
import { SAVED_SETUPS_STORAGE_KEY, exportSavedSetupsBackup, type SavedSetup } from "../src/lib/saved-setups";
import { catalog } from "./catalog";

// Run with the production server listening at KILO_MODELS_NATIVE_URL (default: http://127.0.0.1:3220).
const baseURL = process.env.KILO_MODELS_NATIVE_URL ?? "http://127.0.0.1:3220";
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), SAVED_SETUPS_STORAGE_KEY);
const panel = (page: Page) => page.getByRole("region", { name: "Saved setups" });
const manage = (page: Page) => panel(page).getByText("Manage setups", { exact: true });
const storageBusy = /storage.*busy/i;
const original: SavedSetup = {
  id: "only",
  name: "Only copy",
  workload: { ...DEFAULT_WORKLOAD, requests: 7 },
  directoryQuery: "view=list",
  includesDirectoryView: true,
};

type Batch = { ok: boolean; steps: unknown[]; error?: { step: number; message: string } };
type ToolResponse = { invocationId: string; status: string; output?: string | Batch; errorText?: string };

async function productionPage(context: BrowserContext, raw?: string) {
  const page = await context.newPage();
  if (raw !== undefined) await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem("native-setup-seeded")) {
      localStorage.setItem(key, raw);
      sessionStorage.setItem("native-setup-seeded", "yes");
    }
  }, { key: SAVED_SETUPS_STORAGE_KEY, raw });

  const session = await context.newCDPSession(page);
  const frames = new Map<string, string>();
  const responses = new Map<string, ToolResponse>();
  session.on("WebMCP.toolsAdded", ({ tools }: { tools: { name: string; frameId: string }[] }) => {
    for (const tool of tools) frames.set(tool.name, tool.frameId);
  });
  session.on("WebMCP.toolResponded", (result: ToolResponse) => { responses.set(result.invocationId, result); });
  await session.send("WebMCP.enable");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Fixture Model 01", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Estimate workload", exact: true }).click();
  await expect(panel(page)).toBeVisible();

  async function act(...names: string[]): Promise<Batch> {
    await expect.poll(() => frames.has("act")).toBe(true);
    const frameId = frames.get("act");
    assert.ok(frameId);
    const { invocationId } = await session.send("WebMCP.invokeTool", {
      frameId,
      toolName: "act",
      // Chromium accepts structured values here. The generated type only accepts string values.
      input: { steps: names.map((ref) => ({ ref, action: "press" })) } as unknown as Record<string, string>,
    });
    await expect.poll(() => responses.has(invocationId), { timeout: 20_000 }).toBe(true);
    const { status, output, errorText } = responses.get(invocationId)!;
    responses.delete(invocationId);
    assert.equal(status, "Completed", errorText);
    assert.ok(output);
    return typeof output === "string" ? JSON.parse(output) : output;
  }
  return { page, act };
}

function failure(result: Batch, pattern: RegExp) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.deepEqual(result.steps, []);
  assert.equal(result.error?.step, 0);
  assert.match(result.error?.message ?? "", pattern);
}

async function holdWriter(context: BrowserContext) {
  const writer = await context.newPage();
  await writer.goto("/");
  await writer.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("kilo-models-storage-locks", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("locks"); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("locks", "readwrite");
      const store = transaction.objectStore("locks");
      transaction.oncomplete = () => {
        db.close();
        document.documentElement.dataset.nativeStorageReleased = "true";
      };
      transaction.onabort = () => reject(transaction.error);
      const next = () => {
        store.get("barrier").onsuccess = () => {
          if (!document.documentElement.dataset.releaseNativeStorage) {
            next();
            resolve();
          }
        };
      };
      next();
    };
  }));
  return async () => {
    await writer.evaluate(() => { document.documentElement.dataset.releaseNativeStorage = "true"; });
    await expect(writer.locator("html")).toHaveAttribute("data-native-storage-released", "true");
    await writer.close();
  };
}

const browser = await chromium.launch({ channel: "chromium", args: ["--enable-blink-features=WebMCP"] });
async function check(name: string, run: (context: BrowserContext) => Promise<void>) {
  const context = await browser.newContext({ baseURL, reducedMotion: "reduce" });
  await context.route("**/api/models", (route) => route.fulfill({ json: {
    data: catalog.slice(0, 2),
    fetchedAt: new Date().toISOString(),
  } }));
  try {
    await run(context);
    console.log("PASS", name);
  } finally {
    await context.close();
  }
}

try {
  await check("#1 native Import backup stops Delete, human import accepts valid and rejects invalid data", async (context) => {
    const { page, act } = await productionPage(context);
    await panel(page).getByRole("textbox", { name: "Setup name" }).fill(original.name);
    assert.equal((await act("Save setup", "Manage setups")).ok, true);
    const before = await stored(page);
    let openCount = 0;
    page.on("filechooser", () => { openCount += 1; });
    failure(await act("Import backup", "Delete Only copy"), /needs a person/);
    assert.equal(openCount, 0);
    assert.equal(await stored(page), before);

    const pick = async (buffer?: Buffer) => {
      const picker = page.waitForEvent("filechooser");
      await panel(page).getByRole("button", { name: "Import backup", exact: true }).click();
      await (await picker).setFiles(buffer ? { name: "setups.json", mimeType: "application/json", buffer } : []);
    };
    await pick();
    assert.equal(await stored(page), before);
    await pick(Buffer.from("{broken"));
    await expect(panel(page).getByRole("alert")).toContainText("valid JSON");
    assert.equal(await stored(page), before);
    await pick(Buffer.from(exportSavedSetupsBackup([{ ...original, id: "new", name: "From human import" }])));
    await expect(panel(page).getByRole("status")).toContainText("Imported 1 setup");
    await page.reload();
    const data = JSON.parse((await stored(page))!);
    assert.deepEqual(data.setups.map((setup: SavedSetup) => setup.name), ["Only copy", "From human import"]);
  });

  await check("#2 native export and mutation reject incomplete data and recovery downloads the original bytes", async (context) => {
    const raw = JSON.stringify({ version: 1, setups: [original,
      { ...original, name: "Unreadable workload", workload: { requests: -1 } }] }, null, 2);
    const { page, act } = await productionPage(context, raw);
    await panel(page).getByRole("combobox").selectOption(original.id);
    await expect(panel(page).getByText(/7 requests/)).toBeVisible();
    await manage(page).click();
    failure(await act("Export backup", "Delete Only copy"), /unreadable/);
    assert.equal(await stored(page), raw);
    await panel(page).getByRole("textbox", { name: "Setup name" }).fill("New setup");
    failure(await act("Save setup"), /unreadable/);
    const download = page.waitForEvent("download");
    await panel(page).getByRole("button", { name: "Download original data", exact: true }).click();
    assert.deepEqual(await readFile((await (await download).path())!), Buffer.from(raw));
    await page.reload();
    assert.equal(await stored(page), raw);
  });

  await check("#3 native Save and Update reject an accepted 513-character search", async (context) => {
    const raw = JSON.stringify({ version: 1, setups: [original] });
    const { page, act } = await productionPage(context, raw);
    await panel(page).getByRole("combobox").selectOption(original.id);
    assert.equal((await act("Apply")).ok, true);
    await expect(panel(page).getByText("Active setup: Only copy", { exact: true })).toBeVisible();
    const search = "x".repeat(513);
    await page.getByRole("textbox", { name: "Search models" }).fill(search);
    await expect(page).toHaveURL((url) => url.searchParams.get("search") === search);
    await expect(panel(page).getByText("Changed since applying Only copy.", { exact: true })).toBeVisible();
    await panel(page).getByRole("textbox", { name: "Setup name" }).fill("Oversized search");
    failure(await act("Save setup", "Manage setups"), /saved search/);
    await expect(panel(page).locator("details")).not.toHaveAttribute("open");
    await manage(page).click();
    failure(await act("Update workload & view"), /saved search/);
    await expect(panel(page).getByText("Saved view: List view", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue(search);
    assert.equal(await stored(page), raw);
  });

  for (const releaseInTime of [false, true]) {
    await check(`#4 native queued IndexedDB save ${releaseInTime ? "completes after timely release" : "fails without writing after timeout"}`, async (context) => {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "locks", { value: undefined });
        const get = IDBObjectStore.prototype.get;
        IDBObjectStore.prototype.get = function (key) {
          if (key === "kilo-models-saved-setups") document.documentElement.dataset.nativeStorageQueued = "true";
          return get.call(this, key);
        };
      });
      const release = await holdWriter(context);
      const { page, act } = await productionPage(context);
      await panel(page).getByRole("textbox", { name: "Setup name" }).fill("Queued setup");
      const pending = act("Save setup", "Manage setups");
      await expect(page.locator("html")).toHaveAttribute("data-native-storage-queued", "true");
      assert.equal(await stored(page), null);
      await expect(panel(page).locator("details")).not.toHaveAttribute("open");
      if (releaseInTime) {
        await release();
        assert.equal((await pending).ok, true);
        await expect(panel(page).locator("details")).toHaveAttribute("open");
      } else {
        failure(await pending, storageBusy);
        await expect(panel(page).locator("details")).not.toHaveAttribute("open");
        await release();
        // A follow-up writer reaching its transaction proves the queue drained before reloading.
        await (await holdWriter(context))();
        assert.equal(await stored(page), null);
      }
      await page.reload();
      if (releaseInTime) assert.equal(JSON.parse((await stored(page))!).setups[0].name, "Queued setup");
      else assert.equal(await stored(page), null);
    });
  }
} finally {
  await browser.close();
}
