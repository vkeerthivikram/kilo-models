import { workAsyncStorage, type WorkStore } from "next/dist/server/app-render/work-async-storage.external";
import { version as nextVersion } from "next/package.json";

// Written against Next 16.3.3's WorkStore pendingRevalidatedTags ({ tag }) and
// pendingRevalidates (promise bag). Recheck both contracts on any Next upgrade.
export function assertCatalogTestCompatibility(version: string, runtime: unknown): void {
  const storage = runtime as { run?: unknown; getStore?: unknown } | null;
  if (version !== "16.3.3" || typeof storage?.run !== "function" || typeof storage?.getStore !== "function") {
    throw new Error("Catalog-cache test helper incompatible with installed Next; recheck src/test/catalog-cache.ts");
  }
}

interface CacheValue {
  kind: "FETCH";
  data: { body: string };
  revalidate: number;
}

/** Framework cache boundary for unit tests run outside a Next request. */
export function installCatalogTestCache({ disabled = false }: { disabled?: boolean } = {}) {
  assertCatalogTestCompatibility(nextVersion, workAsyncStorage);
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
