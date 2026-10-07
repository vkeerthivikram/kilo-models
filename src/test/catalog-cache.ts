import { workAsyncStorage, type WorkStore } from "next/dist/server/app-render/work-async-storage.external";

interface CacheValue {
  kind: "FETCH";
  data: { body: string };
  revalidate: number;
}

/** Framework cache boundary for unit tests run outside a Next request. */
export function installCatalogTestCache({ disabled = false }: { disabled?: boolean } = {}) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "__incrementalCache");
  const entries = new Map<string, { value: CacheValue; storedAt: number }>();
  let clock = 0;
  const incrementalCache = {
    generateSimpleCacheKey: async (key: string) => key,
    async get(key: string, options?: { tags?: string[] }) {
      if (workAsyncStorage.getStore()?.pendingRevalidatedTags?.some(({ tag }) => options?.tags?.includes(tag))) {
        entries.delete(key);
        return null;
      }
      const entry = entries.get(key);
      if (disabled || !entry) return null;
      return { value: entry.value, isStale: clock - entry.storedAt >= entry.value.revalidate * 1000 };
    },
    async set(key: string, value: CacheValue) { entries.set(key, { value, storedAt: clock }); },
  };
  Object.defineProperty(globalThis, "__incrementalCache", { configurable: true, value: incrementalCache });
  return {
    async request<T>(handler: () => Promise<T>): Promise<T> {
      // Supply only fields used by unstable_cache/revalidateTag in a route request.
      const store = { page: "/api/models/route", route: "/api/models", isStaticGeneration: false,
        incrementalCache, cacheLifeProfiles: {}, nextFetchId: 1 } as unknown as WorkStore;
      return workAsyncStorage.run(store, async () => {
        try { return await handler(); }
        finally { await Promise.all(Object.values(store.pendingRevalidates ?? {})); }
      });
    },
    advance(milliseconds: number) { clock += milliseconds; },
    restore() {
      if (previous) Object.defineProperty(globalThis, "__incrementalCache", previous);
      else Reflect.deleteProperty(globalThis, "__incrementalCache");
    },
  };
}
