import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getDirectoryReturnHref, parseDirectoryReturn, prepareDirectoryReturn, rememberDirectoryPosition, restoreDirectoryPosition, safeDirectoryHref } from "./directory-navigation";

test("directory return preserves filters, page and scroll without accepting external routes", () => {
  assert.equal(safeDirectoryHref("/?search=claude&free=true&page=3#directory"), "/?search=claude&free=true&page=3#directory");
  for (const href of ["https://example.com/", "//example.com/", "/\\example.com/", "javascript:alert(1)", "/models/test", " /?page=3"]) {
    assert.equal(safeDirectoryHref(href), "/");
  }
  assert.deepEqual(parseDirectoryReturn(JSON.stringify({ href: "/?page=3&search=claude", scrollY: 840 })), { href: "/?page=3&search=claude", scrollY: 840 });
  assert.equal(parseDirectoryReturn("broken"), null);
  assert.equal(parseDirectoryReturn(JSON.stringify({ href: "//example.com/", scrollY: 100 })), null);
  assert.equal(parseDirectoryReturn(JSON.stringify({ href: "/", scrollY: -10 })), null);
});

test("returning from model details restores the actual directory scroll after rendering", () => {
  const previousWindow = globalThis.window;
  const storage = new Map<string, string>();
  const frames: FrameRequestCallback[] = [];
  const scrolls: ScrollToOptions[] = [];
  const browser = {
    location: { pathname: "/", search: "?search=claude&page=3&compare=test%2Fold", hash: "", href: "https://models.test/?search=claude&page=3&compare=test%2Fold" },
    scrollY: 840,
    sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; },
    cancelAnimationFrame: () => {},
    scrollTo: (options: ScrollToOptions) => scrolls.push(options),
  };
  try {
    globalThis.window = browser as unknown as Window & typeof globalThis;
    rememberDirectoryPosition();
    browser.location.pathname = "/models/test";
    browser.scrollY = 0;
    rememberDirectoryPosition();
    assert.equal(getDirectoryReturnHref(), "/?search=claude&page=3");
    prepareDirectoryReturn();
    browser.location.pathname = "/";
    browser.location.href = "https://models.test/?page=3&search=claude&compare=test%2Fa%2Ctest%2Fb&inputTokens=50000&images=2";
    restoreDirectoryPosition();
    assert.deepEqual(scrolls, []);
    frames.shift()!(0);
    frames.shift()!(0);
    assert.deepEqual(scrolls, [{ top: 840, behavior: "instant" }]);
    restoreDirectoryPosition();
    assert.equal(frames.length, 0);
  } finally {
    globalThis.window = previousWindow;
  }
});
