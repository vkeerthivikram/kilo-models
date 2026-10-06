import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_WORKLOAD } from "../lib/calculator-workload";
import { SavedSetups } from "./saved-setups";
import { useSavedSetups } from "../hooks/use-saved-setups";
import { parseSavedSetups, SAVED_SETUPS_STORAGE_KEY } from "../lib/saved-setups";

test("saved setups expose named saving and a clear empty state with accessible feedback", () => {
  const html = renderToStaticMarkup(<SavedSetups workload={DEFAULT_WORKLOAD} onWorkloadChange={() => {}} directoryQuery="tools=true" onApplyDirectoryQuery={() => {}} />);
  assert.match(html, /Saved setups/);
  assert.match(html, /Setup name/);
  assert.match(html, /for="/);
  assert.match(html, /maxLength="60"/);
  assert.match(html, /Save setup/);
  assert.match(html, /No saved setups yet/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Saved in this browser/);
  assert.match(html, /Export backup/);
  assert.match(html, /Import backup/);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="\.json,application\/json"/);
  assert.match(html, /keeps existing setups/);
});

test("saved setup actions persist create and delete and report blocked storage", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>();
  let actions: ReturnType<typeof useSavedSetups> | undefined;
  function Probe() { actions = useSavedSetups(); return null; }
  try {
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage, dispatchEvent: () => true } });
    renderToStaticMarkup(<Probe />);
    assert.ok(actions);
    const created = actions.saveSetup("Cheap coding models", DEFAULT_WORKLOAD, "tools=true&compare=one,two");
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const stored = parseSavedSetups(values.get(SAVED_SETUPS_STORAGE_KEY) ?? null);
    assert.equal(stored[0].name, "Cheap coding models");
    assert.equal(stored[0].directoryQuery, "tools=true");
    assert.equal(actions.saveSetup("cheap coding models", DEFAULT_WORKLOAD, "").ok, false);
    assert.equal(actions.deleteSetup(created.setup.id).ok, true);
    assert.deepEqual(parseSavedSetups(values.get(SAVED_SETUPS_STORAGE_KEY) ?? null), []);
    Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("denied"); } } });
    assert.equal(actions.saveSetup("Blocked", DEFAULT_WORKLOAD, "").ok, false);
    assert.equal(actions.deleteSetup("missing").ok, false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("server rendering is safe when browser storage is blocked", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, get: () => { throw new Error("Storage blocked"); } });
    assert.doesNotThrow(() => renderToStaticMarkup(<SavedSetups workload={DEFAULT_WORKLOAD} onWorkloadChange={() => {}} />));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
