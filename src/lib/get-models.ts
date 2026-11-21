import { AsyncLocalStorage } from "node:async_hooks";
import { revalidateTag, unstable_cache } from "next/cache";
import { CATALOG_CACHE_SECONDS, CATALOG_CACHE_TAG, CATALOG_REFRESH_MIN_AGE_MS, fetchCatalog, type CatalogEnvelope } from "./catalog-freshness";
import type { Model } from "./types";

export function findModel(models: Model[], id: string) {
  // Next can preserve escaped delimiters in a legacy path segment. Resolve
  // their decoded value first. IDs with literal escapes have an exact route.
  try {
    const decoded = decodeURIComponent(id);
    if (decoded !== id) {
      const legacy = models.find((model) => model.id === decoded);
      if (legacy) return legacy;
    }
  } catch {
    // A decoded ID can contain a literal percent sign.
  }
  return models.find((model) => model.id === id);
}

let pendingUpstream: Promise<CatalogEnvelope> | null = null;
function fetchCatalogOnce(): Promise<CatalogEnvelope> {
  if (!pendingUpstream) pendingUpstream = fetchCatalog().finally(() => { pendingUpstream = null; });
  return pendingUpstream;
}

// Expired entries use Next's stale-while-revalidate behavior: a normal read may
// return the previous snapshot while the next one is fetched in the background.
const refreshSnapshot = new AsyncLocalStorage<CatalogEnvelope>();

const readSnapshot = async () => refreshSnapshot.getStore() ?? fetchCatalogOnce();
const cacheKey = ["kilo-model-catalog-v2"];

export const getCatalog = unstable_cache(readSnapshot, cacheKey, { revalidate: CATALOG_CACHE_SECONDS });
// Tags are separate from the cache key. Force a miss in the refresh request
// through this tag while ordinary reads keep using the same cache entry.
const replaceCatalog = unstable_cache(readSnapshot, cacheKey, {
  revalidate: CATALOG_CACHE_SECONDS,
  tags: [CATALOG_CACHE_TAG],
});

let pendingRefresh: Promise<CatalogEnvelope> | null = null;

export function refreshCatalog(): Promise<CatalogEnvelope> {
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = (async () => {
    const current = await getCatalog();
    // Use persisted freshness so sequential requests (including other workers)
    // cannot force another upstream read immediately after a successful fetch.
    if (Date.now() - Date.parse(current.fetchedAt) < CATALOG_REFRESH_MIN_AGE_MS) return current;
    const snapshot = await fetchCatalogOnce();
    // Stage a validated snapshot before touching the shared cache. This request
    // repopulates the entry, while other requests may still use the old data.
    revalidateTag(CATALOG_CACHE_TAG, "max");
    return refreshSnapshot.run(snapshot, replaceCatalog);
  })().finally(() => { pendingRefresh = null; });
  return pendingRefresh;
}

export async function getModels(): Promise<Model[]> {
  return (await getCatalog()).data;
}
