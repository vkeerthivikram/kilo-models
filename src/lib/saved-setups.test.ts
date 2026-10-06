import { strict as assert } from "node:assert";
import { test } from "node:test";
import { addSavedSetup, applySavedSetup, deleteSavedSetup, parseSavedSetups, readSavedSetups, sanitizeSavedSetupQuery, serializeSavedSetups, writeSavedSetups } from "./saved-setups";
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
