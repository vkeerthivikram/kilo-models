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
  Object.defineProperty(globalThis, "__incrementalCache", { configurable: true, value: {
    generateSimpleCacheKey: async (key: string) => key,
    async get(key: string) {
      const entry = entries.get(key);
      if (disabled || !entry) return null;
      return { value: entry.value, isStale: clock - entry.storedAt >= entry.value.revalidate * 1000 };
    },
    async set(key: string, value: CacheValue) { entries.set(key, { value, storedAt: clock }); },
  } });
  return {
    advance(milliseconds: number) { clock += milliseconds; },
    restore() {
      if (previous) Object.defineProperty(globalThis, "__incrementalCache", previous);
      else Reflect.deleteProperty(globalThis, "__incrementalCache");
    },
  };
}
