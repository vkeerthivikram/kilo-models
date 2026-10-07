import { strict as assert } from "node:assert";
import { test } from "node:test";
import { addSavedSetup, applySavedSetup, deleteSavedSetup, exportSavedSetupsBackup, importSavedSetupsBackup, parseSavedSetups, readSavedSetups, renameSavedSetup, restoreDeletedSetup, sanitizeSavedSetupQuery, savedViewSummary, serializeSavedSetups, updateSavedSetup, writeSavedSetups } from "./saved-setups";
import { DEFAULT_WORKLOAD } from "./calculator-workload";

test("a named workload and directory view survive storage without comparison or page state", () => {
  const result = addSavedSetup([], "  Cheap coding models  ", { ...DEFAULT_WORKLOAD, inputTokens: 8000, images: 3, searches: 2, cacheWriteTokens: 100 }, "?sort=price-asc&tools=true&maxInputPrice=2&view=list&fav=true&hideRetired=true&compare=a,b&page=4&redirect=javascript:evil", "setup-one");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const [restored] = parseSavedSetups(serializeSavedSetups(result.setups));
  assert.equal(restored.name, "Cheap coding models");
  assert.deepEqual(restored.workload, { ...DEFAULT_WORKLOAD, inputTokens: 8000, images: 3, searches: 2, cacheWriteTokens: 100 });
  const query = new URLSearchParams(restored.directoryQuery);
  assert.equal(query.get("tools"), "true");
  assert.equal(query.get("maxInputPrice"), "2");
  assert.equal(query.get("fav"), "true");
  assert.equal(query.get("hideRetired"), "true");
  assert.equal(query.get("compare"), null);
  assert.equal(query.get("page"), null);
  assert.equal(query.get("redirect"), null);
});

test("older workloads restore optional costs as zero while malformed entries are discarded", () => {
  const old = { id: "old", name: "Old setup", workload: { inputTokens: 2000, outputTokens: 500, requests: 1000, period: "batch", cachePercent: 0 }, directoryQuery: "tools=true" };
  const entries = [old, { ...old, id: "bad-extra", name: "Bad extra", workload: { ...old.workload, images: null } }, { ...old, id: "bad", name: "Bad request", workload: { ...old.workload, requests: -1 } }, { ...old, id: "dupe", name: " old SETUP " }];
  const restored = parseSavedSetups(JSON.stringify({ version: 1, setups: entries }));
  assert.equal(restored.length, 1);
  assert.equal(restored[0].workload.images, 0);
  assert.equal(restored[0].workload.searches, 0);
  assert.equal(restored[0].workload.cacheWriteTokens, 0);
});

test("corrupt, oversized, and unknown-version storage safely starts empty", () => {
  for (const stored of [null, "{broken", "null", "42", "{}", '{"version":2,"setups":[]}', " ".repeat(200_001)]) assert.deepEqual(parseSavedSetups(stored), []);
});

test("setup limits reject empty names, duplicates, long names, and a twenty-first setup", () => {
  assert.equal(addSavedSetup([], " ", DEFAULT_WORKLOAD, "", "empty").ok, false);
  assert.equal(addSavedSetup([], "x".repeat(61), DEFAULT_WORKLOAD, "", "long").ok, false);
  const first = addSavedSetup([], "Coding", DEFAULT_WORKLOAD, "", "one");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(addSavedSetup(first.setups, " coding ", DEFAULT_WORKLOAD, "", "two").ok, false);
  const twenty = Array.from({ length: 20 }, (_, index) => ({ ...first.setup, id: String(index), name: `Setup ${index}` }));
  assert.equal(addSavedSetup(twenty, "Another", DEFAULT_WORKLOAD, "", "twenty-one").ok, false);
  assert.equal(parseSavedSetups(serializeSavedSetups([...twenty, { ...first.setup, id: "extra" }])).length, 20);
});

test("unavailable or full storage reports failure without claiming a setup was saved", () => {
  const blocked = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("full"); } };
  assert.deepEqual(readSavedSetups(blocked), []);
  const result = writeSavedSetups(blocked, []);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /storage is unavailable or full/i);
});

test("invalid filter values are excluded from saved directory state", () => {
  const params = sanitizeSavedSetupQuery("sort=bad&view=unknown&free=maybe&minContext=1.5&maxInputPrice=Infinity&maxOutputPrice=0&compare=test&search=coding&providers=alpha,beta");
  assert.equal(params.get("sort"), null);
  assert.equal(params.get("view"), null);
  assert.equal(params.get("free"), null);
  assert.equal(params.get("minContext"), null);
  assert.equal(params.get("maxInputPrice"), null);
  assert.equal(params.get("maxOutputPrice"), "0");
  assert.equal(params.get("search"), "coding");
  assert.equal(params.get("providers"), "alpha,beta");
});

test("a saved workload-cost sort survives roundtrip in either direction", () => {
  for (const sort of ["cost-asc", "cost-desc"]) {
    const result = addSavedSetup([], "Cost-ranked workload", { ...DEFAULT_WORKLOAD, images: 2, searches: 1 }, `sort=${sort}&tools=true`, "cost");
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    const [restored] = parseSavedSetups(serializeSavedSetups(result.setups));
    assert.equal(new URLSearchParams(restored.directoryQuery).get("sort"), sort);
    assert.equal(restored.workload.images, 2);
    assert.equal(restored.workload.searches, 1);
  }
});

test("workload-only setups carry explicit scope while an empty directory view remains a view", () => {
  const workloadOnly = addSavedSetup([], "Detail workload", DEFAULT_WORKLOAD, undefined, "detail");
  const emptyView = addSavedSetup([], "Default directory", DEFAULT_WORKLOAD, "", "directory");
  assert.equal(workloadOnly.ok, true);
  assert.equal(emptyView.ok, true);
  if (!workloadOnly.ok || !emptyView.ok) return;
  assert.equal(workloadOnly.setup.includesDirectoryView, false);
  assert.equal(emptyView.setup.includesDirectoryView, true);
  const restored = parseSavedSetups(serializeSavedSetups([workloadOnly.setup, emptyView.setup]));
  assert.equal(restored[0].includesDirectoryView, false);
  assert.equal(restored[1].includesDirectoryView, true);
});

test("old saved records without scope retain their saved directory view", () => {
  const old = { id: "old-view", name: "Old view", workload: DEFAULT_WORKLOAD, directoryQuery: "" };
  assert.equal(parseSavedSetups(JSON.stringify([old]))[0].includesDirectoryView, true);
});

test("applying a workload-only setup updates workload and leaves the current directory untouched", async () => {
  const result = addSavedSetup([], "Detail workload", { ...DEFAULT_WORKLOAD, inputTokens: 50000 }, undefined, "detail");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  let workload = DEFAULT_WORKLOAD;
  let directoryQuery = "tools=true&fav=true&view=list&sort=cost-desc&compare=one,two";
  await applySavedSetup(result.setup, (next) => { workload = next; }, (query) => { directoryQuery = query.toString(); });
  assert.equal(workload.inputTokens, 50000);
  assert.equal(directoryQuery, "tools=true&fav=true&view=list&sort=cost-desc&compare=one,two");
});

test("applying an empty saved directory view explicitly resets its directory state", async () => {
  const result = addSavedSetup([], "Default directory", DEFAULT_WORKLOAD, "", "default");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  let directoryQuery = "tools=true&view=list";
  await applySavedSetup(result.setup, () => {}, (query) => { directoryQuery = query.toString(); });
  assert.equal(directoryQuery, "");
});

test("create, read, and delete named setups through browser storage", () => {
  let stored: string | null = null;
  const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
  const result = addSavedSetup(readSavedSetups(storage), "Monthly image work", { ...DEFAULT_WORKLOAD, period: "month", images: 4 }, "tools=true", "one");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(writeSavedSetups(storage, result.setups).ok, true);
  assert.equal(readSavedSetups(storage)[0].workload.images, 4);
  assert.equal(writeSavedSetups(storage, deleteSavedSetup(readSavedSetups(storage), "one")).ok, true);
  assert.deepEqual(readSavedSetups(storage), []);
});

test("renaming a setup preserves its workload and view and rejects name conflicts", () => {
  const created = addSavedSetup([], "Coding", DEFAULT_WORKLOAD, "tools=true&fitsWorkload=true&maxBudget=12.50", "coding");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const renamed = renameSavedSetup(created.setups, "coding", "  Coding budget  ");
  assert.equal(renamed.ok, true);
  if (!renamed.ok) return;
  assert.equal(renamed.setup.name, "Coding budget");
  assert.equal(renamed.setup.id, "coding");
  assert.deepEqual(renamed.setup.workload, DEFAULT_WORKLOAD);
  assert.equal(new URLSearchParams(renamed.setup.directoryQuery).get("maxBudget"), "12.50");
  assert.equal(new URLSearchParams(renamed.setup.directoryQuery).get("fitsWorkload"), "true");
  const another = addSavedSetup(renamed.setups, "Other", DEFAULT_WORKLOAD, undefined, "other");
  assert.equal(another.ok, true);
  if (!another.ok) return;
  assert.equal(renameSavedSetup(another.setups, "other", "CODING BUDGET").ok, false);
  assert.equal(renameSavedSetup(another.setups, "other", " ").ok, false);
  assert.equal(renameSavedSetup(another.setups, "other", "x".repeat(61)).ok, false);
  assert.equal(renameSavedSetup(another.setups, "missing", "Renamed").ok, false);
});

test("updating from detail preserves a saved view, while directory updates refresh that view", () => {
  const created = addSavedSetup([], "Coding", DEFAULT_WORKLOAD, "tools=true&fitsWorkload=true&maxBudget=10", "coding");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const detailed = updateSavedSetup(created.setups, "coding", { ...DEFAULT_WORKLOAD, images: 2, inputTokens: 50000 });
  assert.equal(detailed.ok, true);
  if (!detailed.ok) return;
  assert.equal(detailed.setup.workload.images, 2);
  assert.equal(detailed.setup.workload.inputTokens, 50000);
  assert.equal(detailed.setup.name, "Coding");
  assert.equal(new URLSearchParams(detailed.setup.directoryQuery).get("maxBudget"), "10");
  const refreshed = updateSavedSetup(detailed.setups, "coding", DEFAULT_WORKLOAD, "view=list&maxBudget=20&compare=one,two&page=3");
  assert.equal(refreshed.ok, true);
  if (!refreshed.ok) return;
  assert.equal(refreshed.setup.directoryQuery, "view=list&maxBudget=20");
  const workloadOnly = addSavedSetup([], "Workload", DEFAULT_WORKLOAD, undefined, "workload");
  assert.equal(workloadOnly.ok, true);
  if (!workloadOnly.ok) return;
  const updated = updateSavedSetup(workloadOnly.setups, "workload", { ...DEFAULT_WORKLOAD, requests: 20 }, "tools=true");
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.equal(updated.setup.includesDirectoryView, false);
  assert.equal(updated.setup.directoryQuery, "");
  assert.equal(updateSavedSetup(updated.setups, "missing", DEFAULT_WORKLOAD).ok, false);
  assert.equal(updateSavedSetup(updated.setups, "workload", { ...DEFAULT_WORKLOAD, requests: -1 }).ok, false);
});

test("undo restores the deleted setup in place without overwriting conflicts or exceeding capacity", () => {
  const created = addSavedSetup([], "Middle", DEFAULT_WORKLOAD, "maxBudget=0", "middle");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const entries = [{ ...created.setup, id: "first", name: "First" }, created.setup, { ...created.setup, id: "last", name: "Last" }];
  const restored = restoreDeletedSetup(deleteSavedSetup(entries, "middle"), { setup: created.setup, index: 1 });
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.deepEqual(restored.setups.map((setup) => setup.id), ["first", "middle", "last"]);
  assert.equal(restored.setup.directoryQuery, "maxBudget=0");
  assert.equal(restoreDeletedSetup(entries, { setup: created.setup, index: 1 }).ok, false);
  assert.equal(restoreDeletedSetup([{ ...created.setup, id: "other", name: "MIDDLE" }], { setup: created.setup, index: 0 }).ok, false);
  const twenty = Array.from({ length: 20 }, (_, index) => ({ ...created.setup, id: String(index), name: `Setup ${index}` }));
  assert.equal(restoreDeletedSetup(twenty, { setup: created.setup, index: 0 }).ok, false);
});

test("backup roundtrip preserves scope and queries and merges without replacing existing setups", () => {
  const first = addSavedSetup([], "Coding", DEFAULT_WORKLOAD, "fitsWorkload=true&maxBudget=12.5", "coding");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = addSavedSetup(first.setups, "Images", { ...DEFAULT_WORKLOAD, images: 3 }, undefined, "images");
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const backup = exportSavedSetupsBackup(second.setups);
  assert.equal(JSON.parse(backup).format, "kilo-models-saved-setups");
  assert.equal(JSON.parse(backup).version, 1);
  const restored = importSavedSetupsBackup([], backup);
  assert.equal(restored.ok, true);
  if (!restored.ok) return;
  assert.deepEqual(restored.setups, second.setups);
  assert.equal(restored.imported, 2);
  const merged = importSavedSetupsBackup([{ ...first.setup, name: "Existing coding", workload: { ...DEFAULT_WORKLOAD, requests: 7 } }], backup);
  assert.equal(merged.ok, true);
  if (!merged.ok) return;
  assert.equal(merged.imported, 1);
  assert.equal(merged.duplicates, 1);
  assert.equal(merged.setups[0].name, "Existing coding");
  assert.equal(merged.setups[0].workload.requests, 7);
  assert.equal(merged.setups[1].includesDirectoryView, false);
});

test("backup merge reports duplicate names and capacity without overwriting any current setup", () => {
  const created = addSavedSetup([], "Existing", DEFAULT_WORKLOAD, undefined, "existing");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const nineteen = Array.from({ length: 19 }, (_, index) => ({ ...created.setup, id: String(index), name: `Current ${index}` }));
  const incoming = [{ ...created.setup, id: "duplicate-name", name: "CURRENT 0" }, { ...created.setup, id: "first-new", name: "First new" }, { ...created.setup, id: "second-new", name: "Second new" }];
  const result = importSavedSetupsBackup(nineteen, exportSavedSetupsBackup(incoming));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.imported, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.overCapacity, 1);
  assert.equal(result.setups.length, 20);
  assert.deepEqual(result.setups.slice(0, 19), nineteen);
});

test("invalid, oversized, or unsupported backup data is rejected as a whole", () => {
  const created = addSavedSetup([], "Valid", DEFAULT_WORKLOAD, undefined, "valid");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const payload = { format: "kilo-models-saved-setups", version: 1, setups: created.setups };
  for (const text of ["broken", "null", "[]", JSON.stringify({ ...payload, format: "other" }), JSON.stringify({ ...payload, version: 99 }), " ".repeat(200_001), JSON.stringify({ ...payload, setups: Array(21).fill(created.setup) }), JSON.stringify({ ...payload, setups: [created.setup, { ...created.setup, id: "bad", workload: { ...DEFAULT_WORKLOAD, requests: -1 } }] })]) {
    const result = importSavedSetupsBackup(created.setups, text);
    assert.equal(result.ok, false);
  }
  assert.equal(created.setups.length, 1);
  assert.throws(() => exportSavedSetupsBackup(Array(21).fill(created.setup)));
  const unicodeOversized = JSON.stringify({ ...payload, extra: "漢".repeat(80_000) });
  assert.equal(importSavedSetupsBackup(created.setups, unicodeOversized).ok, false);
});

test("saved directory queries stay readable after Unicode values are URL encoded", () => {
  const created = addSavedSetup([], "Encoded", DEFAULT_WORKLOAD, new URLSearchParams({ providers: "漢".repeat(2000), search: "coding" }), "encoded");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.ok(created.setup.directoryQuery.length <= 16_000);
  const restored = parseSavedSetups(serializeSavedSetups(created.setups));
  assert.equal(restored.length, 1);
  assert.equal(new URLSearchParams(restored[0].directoryQuery).get("search"), "coding");
});

test("saved workload filters preserve zero budgets and discard invalid flags and budgets", () => {
  assert.equal(sanitizeSavedSetupQuery("fitsWorkload=true&maxBudget=0").toString(), "fitsWorkload=true&maxBudget=0");
  for (const budget of ["-1", "NaN", "Infinity", "0x10", "1usd"]) {
    const sanitized = sanitizeSavedSetupQuery(`fitsWorkload=maybe&maxBudget=${budget}`);
    assert.equal(sanitized.get("fitsWorkload"), null);
    assert.equal(sanitized.get("maxBudget"), null);
  }
});

test("tiny scientific budget and price caps survive saved setup roundtrip", () => {
  const created = addSavedSetup([], "Tiny budget", DEFAULT_WORKLOAD, new URLSearchParams({ maxBudget: String(0.0000001), maxInputPrice: "2e-7", maxOutputPrice: ".0000003", minContext: "1e3" }), "tiny");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const [restored] = parseSavedSetups(serializeSavedSetups(created.setups));
  const query = new URLSearchParams(restored.directoryQuery);
  assert.equal(query.get("maxBudget"), "1e-7");
  assert.equal(query.get("maxInputPrice"), "2e-7");
  assert.equal(query.get("maxOutputPrice"), ".0000003");
  assert.equal(query.get("minContext"), "1e3");
});

test("saved view summaries show decimal money without losing tiny caps", () => {
  assert.equal(savedViewSummary("maxBudget=2e-7&maxInputPrice=3e-8&maxOutputPrice=4e-16"),
    "Input ≤ $0.00000003/1M tokens · Output ≤ $0.0000000000000004/1M tokens · Total budget ≤ $0.0000002");
  assert.equal(savedViewSummary("maxBudget=12345.6789012345&maxInputPrice=0"),
    "Input ≤ $0/1M tokens · Total budget ≤ $12,345.6789012345");
});

test("storage never writes an oversized payload which would be unreadable on the next visit", () => {
  let stored = "untouched";
  const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
  const created = addSavedSetup([], "Large", DEFAULT_WORKLOAD, "", "large");
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const result = writeSavedSetups(storage, [{ ...created.setup, directoryQuery: "x".repeat(200_001) }]);
  assert.equal(result.ok, false);
  assert.equal(stored, "untouched");
});
