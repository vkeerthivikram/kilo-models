import { AsyncLocalStorage } from "node:async_hooks";

// Next normally installs this global before loading its request/cache modules.
if (!("AsyncLocalStorage" in globalThis)) {
  Object.defineProperty(globalThis, "AsyncLocalStorage", { configurable: true, value: AsyncLocalStorage });
}
