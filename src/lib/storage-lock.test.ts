import { strict as assert } from "node:assert";
import { test } from "node:test";
import { withStorageLock } from "./storage-lock";

type MockDbConfig = {
  hasStore?: boolean;
  onCreateStore?: () => void;
  onTransaction: (db: { onclose?: () => void }) => unknown;
};

function createMockIndexedDb(openConfigs: MockDbConfig[]) {
  let index = 0;
  return {
    open() {
      const config = openConfigs[index++] ?? openConfigs[openConfigs.length - 1];
      const db = {
        objectStoreNames: { contains: () => Boolean(config.hasStore) },
        createObjectStore: () => { config.onCreateStore?.(); },
        close() { db.onclose?.(); },
        onclose: undefined as (() => void) | undefined,
        onversionchange: undefined as (() => void) | undefined,
        transaction() {
          return config.onTransaction(db);
        },
      };
      const request = {
        result: db,
        error: null,
        transaction: { abort() {} },
        onupgradeneeded: undefined as (() => void) | undefined,
        onsuccess: undefined as (() => void) | undefined,
        onerror: undefined as (() => void) | undefined,
        onblocked: undefined as (() => void) | undefined,
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}

test("IndexedDB fallback skips existing object store and recovers from InvalidStateError", async () => {
  const locksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
  const idbDescriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  let createdStore = 0;
  let openCalls = 0;
  let activeDb: { onclose?: () => void } | undefined;

  try {
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: createMockIndexedDb([
        {
          hasStore: true,
          onCreateStore: () => { createdStore++; },
          onTransaction: (db) => {
            activeDb = db;
            openCalls++;
            if (openCalls === 1) {
              const error = new Error("Database connection is closing");
              error.name = "InvalidStateError";
              throw error;
            }
            const turn = { onsuccess: undefined as (() => void) | undefined, onerror: undefined as (() => void) | undefined, error: null };
            const tx = {
              error: null,
              onabort: undefined as (() => void) | undefined,
              onerror: undefined as (() => void) | undefined,
              abort() {},
              objectStore: () => ({ get: () => turn }),
            };
            queueMicrotask(() => turn.onsuccess?.());
            return tx;
          },
        },
        {
          hasStore: true,
          onCreateStore: () => { createdStore++; },
          onTransaction: (db) => {
            activeDb = db;
            openCalls++;
            const turn = { onsuccess: undefined as (() => void) | undefined, onerror: undefined as (() => void) | undefined, error: null };
            const tx = {
              error: null,
              onabort: undefined as (() => void) | undefined,
              onerror: undefined as (() => void) | undefined,
              abort() {},
              objectStore: () => ({ get: () => turn }),
            };
            queueMicrotask(() => turn.onsuccess?.());
            return tx;
          },
        },
      ]),
    });

    const result = await withStorageLock("test-lock", () => "ok");
    assert.equal(result, "ok");
    assert.equal(createdStore, 0);
    assert.equal(openCalls, 2);
  } finally {
    activeDb?.onclose?.();
    if (locksDescriptor) Object.defineProperty(navigator, "locks", locksDescriptor);
    else Reflect.deleteProperty(navigator, "locks");
    if (idbDescriptor) Object.defineProperty(globalThis, "indexedDB", idbDescriptor);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
});

test("IndexedDB fallback rejects immediately on request/transaction errors and null abort error", async () => {
  const locksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
  const idbDescriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  let activeDb: { onclose?: () => void } | undefined;
  let mode: "turn-error" | "tx-error" | "null-abort" = "turn-error";

  try {
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: createMockIndexedDb([
        {
          hasStore: false,
          onTransaction: (db) => {
            activeDb = db;
            const turn = {
              onsuccess: undefined as (() => void) | undefined,
              onerror: undefined as (() => void) | undefined,
              error: mode === "turn-error" ? new Error("request failed") : null,
            };
            const tx = {
              error: mode === "tx-error" ? new Error("transaction failed") : null,
              onabort: undefined as (() => void) | undefined,
              onerror: undefined as (() => void) | undefined,
              abort() {},
              objectStore: () => ({ get: () => turn }),
            };
            queueMicrotask(() => {
              if (mode === "turn-error") turn.onerror?.();
              else if (mode === "tx-error") tx.onerror?.();
              else tx.onabort?.();
            });
            return tx;
          },
        },
      ]),
    });

    mode = "turn-error";
    await assert.rejects(withStorageLock("test-lock", () => "nope"), /request failed/);
    mode = "tx-error";
    await assert.rejects(withStorageLock("test-lock", () => "nope"), /transaction failed/);
    mode = "null-abort";
    await assert.rejects(withStorageLock("test-lock", () => "nope"), /transaction aborted/i);
  } finally {
    activeDb?.onclose?.();
    if (locksDescriptor) Object.defineProperty(navigator, "locks", locksDescriptor);
    else Reflect.deleteProperty(navigator, "locks");
    if (idbDescriptor) Object.defineProperty(globalThis, "indexedDB", idbDescriptor);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  }
});
