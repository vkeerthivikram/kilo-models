import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { useFavorites } from "./use-favorites";
import { ThemeProvider } from "../components/theme-provider";

function Probe() {
  const { isFavorite } = useFavorites();
  return <span>{String(isFavorite("test/model"))}</span>;
}
test("corrupt or blocked favorites storage cannot crash rendering", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    for (const stored of ["null", "{}", "42", '["test/model",4]', '[]']) {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => stored } });
      assert.doesNotThrow(() => renderToStaticMarkup(<Probe />));
    }
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("Storage denied"); } });
    assert.doesNotThrow(() => renderToStaticMarkup(<Probe />));
    assert.doesNotThrow(() => renderToStaticMarkup(<ThemeProvider><span>Ready</span></ThemeProvider>));
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
