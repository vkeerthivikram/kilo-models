import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { parseFavorites, useFavorites } from "./use-favorites";
import { ThemeProvider } from "../components/theme-provider";

function Probe() {
  const { isFavorite } = useFavorites();
  return <span>{String(isFavorite("test/model"))}</span>;
}
test("a server render does not require favorites storage", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("Storage denied"); } });
    assert.equal(renderToStaticMarkup(<Probe />), "<span>false</span>");
    assert.doesNotThrow(() => renderToStaticMarkup(<ThemeProvider><span>Ready</span></ThemeProvider>));
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("favorites ignore malformed entries and retry a blocked write without losing changes from another tab", async () => {
  assert.deepEqual(parseFavorites("{broken"), []);
  assert.deepEqual(parseFavorites('[null,"provider/model",9,"provider/model",""]'), ["provider/model"]);
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const locksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
  let stored = '{broken';
  let unavailable = true;
  let favorites: ReturnType<typeof useFavorites> | undefined;
  function Actions({ capture }: { capture: (value: ReturnType<typeof useFavorites>) => void }) {
    capture(useFavorites());
    return null;
  }
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => {
      if (unavailable) throw new Error("Storage unavailable");
      stored = value;
    } } });
    Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: () => true } });
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request: (_key: string, _options: unknown, action: () => unknown) => action() } });
    renderToStaticMarkup(<Actions capture={(value) => { favorites = value; }} />);
    assert.ok(favorites);
    await assert.rejects(favorites.setFavorite("this-tab/model", true), /could not save/);
    assert.equal(stored, '{broken');
    unavailable = false;
    stored = '["other-tab/model"]';
    await favorites.setFavorite("next/model", true);
    assert.deepEqual(JSON.parse(stored), ["other-tab/model", "this-tab/model", "next/model"]);
  } finally {
    for (const [owner, key, descriptor] of [[globalThis, "localStorage", storageDescriptor], [globalThis, "window", windowDescriptor], [navigator, "locks", locksDescriptor]] as const) {
      if (descriptor) Object.defineProperty(owner, key, descriptor); else Reflect.deleteProperty(owner, key);
    }
  }
});

test("an earlier failed write finishing after a later flush clears pendingFavorites does not leave storageWarning set", async () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const locksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
  let stored = "[]";
  let lockCalls = 0;
  const firstLock = Promise.withResolvers<void>();
  let favorites: ReturnType<typeof useFavorites> | undefined;
  function Actions({ capture }: { capture: (value: ReturnType<typeof useFavorites>) => void }) {
    capture(useFavorites());
    return null;
  }
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } },
    });
    Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: () => true } });
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: (_key: string, _options: unknown, action: () => unknown) => {
          lockCalls++;
          if (lockCalls === 1) return firstLock.promise;
          return Promise.resolve().then(action);
        },
      },
    });
    renderToStaticMarkup(<Actions capture={(value) => { favorites = value; }} />);
    assert.ok(favorites);
    const first = favorites.setFavorite("first/model", true);
    await favorites.setFavorite("second/model", true);
    assert.deepEqual(JSON.parse(stored), ["first/model", "second/model"]);
    firstLock.reject(new Error("timed out"));
    await assert.rejects(first, /could not save/);
    renderToStaticMarkup(<Actions capture={(value) => { favorites = value; }} />);
    assert.equal(favorites.storageWarning, null);
  } finally {
    for (const [owner, key, descriptor] of [[globalThis, "localStorage", storageDescriptor], [globalThis, "window", windowDescriptor], [navigator, "locks", locksDescriptor]] as const) {
      if (descriptor) Object.defineProperty(owner, key, descriptor); else Reflect.deleteProperty(owner, key);
    }
  }
});
