import { strict as assert } from "node:assert";
import { afterEach, beforeEach, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_WORKLOAD } from "../lib/calculator-workload";
import { exportSavedSetupsBackup, importSavedSetupsBackup, inspectSavedSetups, parseSavedSetups, SAVED_SETUPS_STORAGE_KEY } from "../lib/saved-setups";
import { useSavedSetups } from "./use-saved-setups";

const locksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
beforeEach(() => {
  Object.defineProperty(navigator, "locks", { configurable: true, value: {
    request: (_key: string, _options: unknown, update: () => unknown) => Promise.resolve().then(update),
  } });
});
afterEach(() => {
  if (locksDescriptor) Object.defineProperty(navigator, "locks", locksDescriptor);
  else Reflect.deleteProperty(navigator, "locks");
});

test("recovering saved setups refuses stale confirmations and failed writes", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const setup = { id: "ok", name: "Readable", workload: DEFAULT_WORKLOAD, directoryQuery: "", includesDirectoryView: false };
  const original = JSON.stringify({ version: 1, setups: [setup, { ...setup, id: "bad", name: "readable" }] });
  let value = original;
  let writesBlocked = false;
  let actions: ReturnType<typeof useSavedSetups> | undefined;
  function Probe() { actions = useSavedSetups(); return null; }
  try {
    const localStorage = { getItem: () => value, setItem: (_key: string, next: string) => {
      if (writesBlocked) throw new Error("full");
      value = next;
    } };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, dispatchEvent: () => true } });
    renderToStaticMarkup(<Probe />);
    assert.ok(actions);
    assert.equal(inspectSavedSetups(value).hasUnreadableStorage, true);
    assert.equal((await actions.saveSetup("New", DEFAULT_WORKLOAD)).ok, false);
    assert.deepEqual(actions.exportBackup("recovery"), { ok: true, backup: original });
    assert.equal((await actions.recoverSetups("an older version")).ok, false);
    writesBlocked = true;
    assert.equal((await actions.recoverSetups(original)).ok, false);
    assert.equal(value, original);
    writesBlocked = false;
    assert.deepEqual(await actions.recoverSetups(original), { ok: true, count: 1 });
    assert.deepEqual(inspectSavedSetups(value), { setups: [setup], hasUnreadableStorage: false });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("saved setup management persists rename, detail update, undo, and backup merge", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>();
  let actions: ReturnType<typeof useSavedSetups> | undefined;
  function Probe() { actions = useSavedSetups(); return null; }
  const stored = () => parseSavedSetups(values.get(SAVED_SETUPS_STORAGE_KEY) ?? null);
  try {
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
    renderToStaticMarkup(<Probe />);
    assert.ok(actions);
    const saved = await actions.saveSetup("Coding", DEFAULT_WORKLOAD, "fitsWorkload=true&maxBudget=10");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal((await actions.renameSetup(saved.setup.id, "Cheap coding")).ok, true);
    assert.equal((await actions.updateSetup(saved.setup.id, { ...DEFAULT_WORKLOAD, requests: 5 })).ok, true);
    assert.equal(stored()[0].name, "Cheap coding");
    assert.equal(stored()[0].workload.requests, 5);
    assert.equal(new URLSearchParams(stored()[0].directoryQuery).get("maxBudget"), "10");
    const exported = actions.exportBackup();
    assert.equal(exported.ok, true);
    if (!exported.ok) return;
    const deleted = await actions.deleteSetup(saved.setup.id);
    assert.equal(deleted.ok, true);
    if (!deleted.ok) return;
    assert.equal(stored().length, 0);
    assert.equal((await actions.restoreSetup(deleted.deleted)).ok, true);
    assert.equal(stored()[0].name, "Cheap coding");
    const duplicates = await actions.importBackup(exported.backup);
    assert.equal(duplicates.ok, true);
    if (!duplicates.ok) return;
    assert.equal(duplicates.imported, 0);
    assert.equal(duplicates.duplicates, 1);
    assert.equal((await actions.deleteSetup(saved.setup.id)).ok, true);
    const restored = await actions.importBackup(exported.backup);
    assert.equal(restored.ok, true);
    if (!restored.ok) return;
    assert.equal(restored.imported, 1);
    assert.equal(stored()[0].workload.requests, 5);
    assert.equal((await actions.deleteSetup("already-gone")).ok, false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("blocked writes cannot rename, replace, delete, restore, or import saved data", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>();
  let actions: ReturnType<typeof useSavedSetups> | undefined;
  let writesBlocked = false, readsBlocked = false;
  function Probe() { actions = useSavedSetups(); return null; }
  try {
    const storage = {
      getItem: (key: string) => { if (readsBlocked) throw new Error("read denied"); return values.get(key) ?? null; },
      setItem: (key: string, value: string) => { if (writesBlocked) throw new Error("full"); values.set(key, value); },
    };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
    renderToStaticMarkup(<Probe />);
    assert.ok(actions);
    const saved = await actions.saveSetup("Original", DEFAULT_WORKLOAD, "tools=true");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const original = values.get(SAVED_SETUPS_STORAGE_KEY);
    const incoming = { ...saved.setup, id: "new", name: "New setup" };
    writesBlocked = true;
    for await (const result of [
      actions.renameSetup(saved.setup.id, "Changed"),
      actions.updateSetup(saved.setup.id, { ...DEFAULT_WORKLOAD, requests: 7 }, "view=list"),
      actions.deleteSetup(saved.setup.id),
      actions.restoreSetup({ setup: incoming, index: 0 }),
      actions.importBackup(exportSavedSetupsBackup([incoming])),
    ]) {
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.error, /storage is unavailable or full/i);
      assert.equal(values.get(SAVED_SETUPS_STORAGE_KEY), original);
    }
    assert.equal(actions.exportBackup().ok, true);
    readsBlocked = true;
    assert.equal((await actions.renameSetup(saved.setup.id, "Changed")).ok, false);
    assert.equal(actions.exportBackup().ok, false);
    assert.equal(values.get(SAVED_SETUPS_STORAGE_KEY), original);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("saving works when insecure HTTP does not expose randomUUID", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const values = new Map<string, string>();
  let actions: ReturnType<typeof useSavedSetups> | undefined;
  function Probe() { actions = useSavedSetups(); return null; }
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
      dispatchEvent: () => true,
    } });
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: {} });
    renderToStaticMarkup(<Probe />);
    assert.ok(actions);
    assert.equal((await actions.saveSetup("First HTTP setup", DEFAULT_WORKLOAD)).ok, true);
    assert.equal((await actions.saveSetup("Second HTTP setup", DEFAULT_WORKLOAD)).ok, true);
    const setups = parseSavedSetups(values.get(SAVED_SETUPS_STORAGE_KEY) ?? null);
    assert.equal(setups.length, 2);
    assert.notEqual(setups[0].id, setups[1].id);
    assert.ok(setups.every((setup) => setup.id.length > 0));
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});

test("backup storage errors cannot masquerade as backup validation errors", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  let actions: ReturnType<typeof useSavedSetups> | undefined;
  function Probe() { actions = useSavedSetups(); return null; }
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      localStorage: { getItem: () => { throw new Error("This backup storage read failed"); } },
    } });
    renderToStaticMarkup(<Probe />);
    assert.ok(actions);
    assert.deepEqual(actions.exportBackup(), {
      ok: false, error: "Could not read saved setups. Allow browser storage, then try again.",
    });
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("large backups round trip when pretty-printing would exceed the limit", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  let actions: ReturnType<typeof useSavedSetups> | undefined;
  function Probe() { actions = useSavedSetups(); return null; }
  const query = new URLSearchParams({ providers: "a".repeat(2000), inputModalities: "a".repeat(2000),
    outputModalities: "a".repeat(2000), minContext: `${"0".repeat(1999)}1`, maxInputPrice: "1" });
  const setups = Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: `Fixture ${index}`,
    workload: DEFAULT_WORKLOAD, directoryQuery: query.toString(), includesDirectoryView: true }));
  const padding = Math.floor((198_500 - JSON.stringify({ version: 1, setups }).length) / setups.length);
  assert.ok(padding > 0 && padding < 2000);
  query.set("maxInputPrice", `${"0".repeat(padding)}1`);
  const stored = JSON.stringify({ version: 1, setups: setups.map((setup) => ({ ...setup, directoryQuery: query.toString() })) });
  assert.ok(stored.length < 200_000);
  assert.equal(parseSavedSetups(stored).length, 20);
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => stored } } });
    renderToStaticMarkup(<Probe />);
    assert.ok(actions);
    const exported = actions.exportBackup();
    assert.ok(exported.ok);
    assert.ok(new TextEncoder().encode(exported.backup).length <= 200_000);
    assert.ok(JSON.stringify(JSON.parse(exported.backup), null, 2).length > 200_000);
    const imported = importSavedSetupsBackup([], exported.backup);
    assert.ok(imported.ok);
    assert.deepEqual(imported.setups, parseSavedSetups(stored));
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

for (const [description, query] of [
  ["provider filters", new URLSearchParams({ providers: ["a".repeat(700), "b".repeat(700), "c".repeat(700)].join(",") })],
  ["total directory view", new URLSearchParams({ providers: "漢".repeat(700), inputModalities: "字".repeat(700), outputModalities: "語".repeat(700) })],
] as const) {
  test(`saving and updating a setup reject an oversized ${description}`, async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    const values = new Map<string, string>();
    let actions: ReturnType<typeof useSavedSetups> | undefined;
    function Probe() { actions = useSavedSetups(); return null; }
    try {
      const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
      Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
      renderToStaticMarkup(<Probe />);
      assert.ok(actions);
      const existing = await actions.saveSetup("Original", DEFAULT_WORKLOAD, "view=list");
      assert.ok(existing.ok);
      const stored = values.get(SAVED_SETUPS_STORAGE_KEY);
      const saved = await actions.saveSetup("Oversized", DEFAULT_WORKLOAD, query);
      const updated = await actions.updateSetup(existing.setup.id, { ...DEFAULT_WORKLOAD, requests: 9 }, query);
      const error = description === "provider filters" ? /provider filters/i : /directory view/i;
      assert.deepEqual([saved.ok, updated.ok], [false, false]);
      if (!saved.ok) assert.match(saved.error, error);
      if (!updated.ok) assert.match(updated.error, error);
      assert.equal(values.get(SAVED_SETUPS_STORAGE_KEY), stored);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });
}
