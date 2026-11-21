import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_WORKLOAD } from "../src/lib/calculator-workload";
import { SAVED_SETUPS_STORAGE_KEY } from "../src/lib/saved-setups";
import { batch as act, mockWebMCP, press } from "./repair-support";

type SetupWindow = Window & {
  releaseSetupLock: () => void;
  releaseSetupOpen: () => void;
};

test.beforeEach(async ({ page }) => { await mockWebMCP(page); });

const panel = (page: Page) => page.getByRole("region", { name: "Saved setups" });
const management = (page: Page) => panel(page).locator("details");
const stored = (page: Page) => page.evaluate((key) => localStorage.getItem(key), SAVED_SETUPS_STORAGE_KEY);
const original = {
  id: "only",
  name: "Only copy",
  workload: { ...DEFAULT_WORKLOAD, requests: 7 },
  directoryQuery: "view=list",
  includesDirectoryView: true,
};

async function openSetups(page: Page, raw?: string) {
  if (raw !== undefined) await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem("seed-setup-storage")) {
      localStorage.setItem(key, raw);
      sessionStorage.setItem("seed-setup-storage", "1");
    }
  }, { key: SAVED_SETUPS_STORAGE_KEY, raw });
  await page.goto("/");
  await page.getByRole("button", { name: "Estimate workload", exact: true }).click();
}

const unreadableStorage = [
  { name: "mixed", raw: JSON.stringify({ version: 1, setups: [original, { ...original, id: "bad", name: "Broken workload", workload: { ...original.workload, requests: -1 } }] }, null, 2), usable: true },
  { name: "corrupt", raw: "{ unreadable\n  ♥", usable: false },
  { name: "unknown-version", raw: JSON.stringify({ version: 2, setups: [original], futureField: "保つ" }, null, 2), usable: false },
];

for (const { name, raw, usable } of unreadableStorage) {
  test(`saved setup mutations and exports preserve ${name} stored data`, async ({ page }) => {
    await openSetups(page, raw);
    if (usable) {
      await panel(page).getByRole("combobox").selectOption(original.id);
      await expect(panel(page).getByText(/7 requests/).first()).toBeVisible();
    }
    await panel(page).getByText("Manage setups", { exact: true }).click();
    const exports = await act(page, press("Export backup"), press(usable ? "Delete Only copy" : "Manage setups"));
    expect.soft(exports).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/unreadable|unsupported/i) } });
    expect.soft(await stored(page)).toBe(raw);
    // Exercise Save against the original bytes even if the preceding export batch regresses.
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: SAVED_SETUPS_STORAGE_KEY, raw });

    await panel(page).getByRole("textbox", { name: "Setup name" }).fill("New setup");
    const saved = await act(page, press("Save setup"));
    expect.soft(saved).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/unreadable|unsupported/i) } });
    expect.soft(await stored(page)).toBe(raw);
    await page.reload();
    expect.soft(await stored(page)).toBe(raw);
    await page.getByRole("button", { name: "Estimate workload", exact: true }).click();
    await panel(page).getByText("Manage setups", { exact: true }).click();
    const recovery = panel(page).getByRole("button", { name: "Download original data", exact: true });
    await expect(recovery).toBeVisible({ timeout: 2000 });
    const downloadPromise = page.waitForEvent("download");
    await recovery.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("kilo-models-setups-recovery.json");
    expect(await readFile((await download.path())!)).toEqual(Buffer.from(raw));
  });
}

test("legacy setup records can still export and save normally", async ({ page }) => {
  const { id, name, directoryQuery } = original;
  const { inputTokens, outputTokens, requests, period, cachePercent } = original.workload;
  await openSetups(page, JSON.stringify([{ id, name, directoryQuery, workload: { inputTokens, outputTokens, requests, period, cachePercent } }]));
  await panel(page).getByRole("textbox", { name: "Setup name" }).fill("New setup");
  expect(await act(page, press("Save setup"), press("Manage setups"))).toMatchObject({ ok: true });
  const downloadPromise = page.waitForEvent("download");
  await panel(page).getByRole("button", { name: "Export backup", exact: true }).click();
  const download = await downloadPromise;
  expect(JSON.parse(await readFile((await download.path())!, "utf8"))).toMatchObject({
    version: 1,
    setups: [original, { name: "New setup" }],
  });
  await page.reload();
  expect(JSON.parse((await stored(page))!)).toMatchObject({ version: 1, setups: [original, { name: "New setup" }] });
});

test("an accepted oversized search changes the active setup and cannot overwrite or save a view", async ({ page }) => {
  const raw = JSON.stringify({ version: 1, setups: [original] });
  await openSetups(page, raw);
  await panel(page).getByRole("combobox").selectOption(original.id);
  await panel(page).getByRole("button", { name: "Apply", exact: true }).click();
  await expect(panel(page).getByText("Active setup: Only copy", { exact: true })).toBeVisible();
  await expect(panel(page).getByText("Saved view: List view", { exact: true })).toBeVisible();
  const search = "x".repeat(513);
  await page.getByRole("textbox", { name: "Search models" }).fill(search);
  await expect(page).toHaveURL((url) => url.searchParams.get("search") === search);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect.soft(panel(page).getByText("Changed since applying Only copy.", { exact: true })).toBeVisible({ timeout: 2000 });

  await panel(page).getByText("Manage setups", { exact: true }).click();
  const updated = await act(page, press("Update workload & view"));
  expect.soft(updated).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/search/i) } });
  await panel(page).getByRole("textbox", { name: "Setup name" }).fill("Keep this search");
  const saved = await act(page, press("Save setup"));
  expect.soft(saved).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/search/i) } });
  await expect(panel(page).getByText("Saved view: List view", { exact: true })).toBeVisible();
  expect.soft(await stored(page)).toBe(raw);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Search models" })).toHaveValue(search);
  expect(await stored(page)).toBe(raw);
});

async function holdIndexedDbLock(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    delete document.documentElement.dataset.setupLockReleased;
    const request = indexedDB.open("kilo-models-storage-locks", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("locks");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("locks", "readwrite");
      const store = transaction.objectStore("locks");
      function keepAlive() {
        store.get("barrier").onsuccess = () => {
          if (!release) {
            keepAlive();
            resolve();
          }
        };
      }
      let release = false;
      (window as unknown as SetupWindow).releaseSetupLock = () => { release = true; };
      transaction.oncomplete = () => {
        db.close();
        document.documentElement.dataset.setupLockReleased = "true";
      };
      transaction.onabort = () => reject(transaction.error);
      keepAlive();
    };
  }));
}

for (const releaseBeforeDeadline of [false, true]) {
  test(`an SDK save ${releaseBeforeDeadline ? "succeeds when the IndexedDB writer releases its lock" : "times out and cancels its queued IndexedDB write"}`, async ({ context, page }) => {
    await context.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
    const writer = await context.newPage();
    await writer.goto("/");
    await holdIndexedDbLock(writer);
    await page.addInitScript(() => {
      const get = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function (key) {
        if (key === "kilo-models-saved-setups") document.documentElement.dataset.setupLockQueued = "true";
        return get.call(this, key);
      };
    });
    await openSetups(page);
    await panel(page).getByRole("textbox", { name: "Setup name" }).fill("Queued setup");
    const resultPromise = act(page, press("Save setup"), press("Manage setups"));
    await expect(page.locator("html")).toHaveAttribute("data-setup-lock-queued", "true");
    expect(await stored(page)).toBeNull();
    await expect(management(page)).not.toHaveAttribute("open");
    if (releaseBeforeDeadline) await writer.evaluate(() => (window as unknown as SetupWindow).releaseSetupLock());
    const result = await resultPromise;
    if (releaseBeforeDeadline) {
      expect(result).toMatchObject({ ok: true });
      await expect(management(page)).toHaveAttribute("open");
      await expect(panel(page).getByText("Active setup: Queued setup", { exact: true })).toBeVisible();
    } else {
      await expect.soft(panel(page).getByRole("alert")).toContainText(/storage.*(busy|timed out)/i, { timeout: 1500 });
      expect.soft(result).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/storage.*(busy|timed out)/i) } });
      await expect.soft(management(page)).not.toHaveAttribute("open", { timeout: 1500 });
      await writer.evaluate(() => (window as unknown as SetupWindow).releaseSetupLock());
    }
    await expect(writer.locator("html")).toHaveAttribute("data-setup-lock-released", "true");
    // An additional real write transaction can only complete once the earlier queued operation finishes.
    await holdIndexedDbLock(writer);
    await writer.evaluate(() => (window as unknown as SetupWindow).releaseSetupLock());
    await expect(writer.locator("html")).toHaveAttribute("data-setup-lock-released", "true");
    await page.reload();
    const final = await stored(page);
    if (releaseBeforeDeadline) expect(JSON.parse(final!)).toMatchObject({ setups: [{ name: "Queued setup" }] });
    else expect(final).toBeNull();
  });
}

test("an SDK save times out opening IndexedDB and can retry after the late database closes", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "locks", { value: undefined });
    const open = IDBFactory.prototype.open;
    let hold = true;
    IDBFactory.prototype.open = function (name, version) {
      const request = open.call(this, name, version);
      if (!hold || name !== "kilo-models-storage-locks") return request;
      hold = false;
      let success: ((event: Event) => void) | null = null;
      Object.defineProperty(request, "onsuccess", {
        set(handler: typeof success) { success = handler; },
      });
      request.addEventListener("success", (event) => {
        const database = request.result;
        const close = database.close;
        database.close = function () {
          document.documentElement.dataset.setupOpenClosed = "true";
          return close.call(this);
        };
        (window as unknown as SetupWindow).releaseSetupOpen = () => success?.call(request, event);
        document.documentElement.dataset.setupOpenHeld = "true";
      }, { once: true });
      return request;
    };
  });
  await openSetups(page);
  const name = panel(page).getByRole("textbox", { name: "Setup name" });
  await name.fill("Open timed out");
  const pending = act(page, press("Save setup"), press("Manage setups"));
  await expect(page.locator("html")).toHaveAttribute("data-setup-open-held", "true");
  expect(await pending).toMatchObject({ ok: false, steps: [], error: { step: 0, message: expect.stringMatching(/storage.*busy/i) } });
  await expect(management(page)).not.toHaveAttribute("open");
  await page.evaluate(() => (window as unknown as SetupWindow).releaseSetupOpen());
  await expect(page.locator("html")).toHaveAttribute("data-setup-open-closed", "true");
  expect(await stored(page)).toBeNull();

  await name.fill("Retried setup");
  expect(await act(page, press("Save setup"), press("Manage setups"))).toMatchObject({ ok: true });
  await expect(management(page)).toHaveAttribute("open");
  await page.reload();
  expect(JSON.parse((await stored(page))!)).toMatchObject({ setups: [{ name: "Retried setup" }] });
});
