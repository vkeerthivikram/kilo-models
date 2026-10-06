import { revalidateTag, unstable_cache } from "next/cache";
import { CATALOG_CACHE_SECONDS, CATALOG_CACHE_TAG, fetchCatalog, type CatalogEnvelope } from "./catalog-freshness";
import type { Model } from "./types";

export function findModel(models: Model[], id: string) {
  const exact = models.find((model) => model.id === id);
  if (exact) return exact;
  // Next can preserve escaped path delimiters in a single dynamic segment.
  try {
    const decoded = decodeURIComponent(id);
    return models.find((model) => model.id === decoded);
  } catch {
    return undefined;
  }
}

let pendingUpstream: Promise<CatalogEnvelope> | null = null;
function fetchCatalogOnce(): Promise<CatalogEnvelope> {
  if (!pendingUpstream) pendingUpstream = fetchCatalog().finally(() => { pendingUpstream = null; });
  return pendingUpstream;
}

// Expired entries use Next's stale-while-revalidate behavior: a normal read may
// return the previous snapshot while the next one is fetched in the background.
export const getCatalog = unstable_cache(
  fetchCatalogOnce,
  ["kilo-model-catalog-v1"],
  { revalidate: CATALOG_CACHE_SECONDS, tags: [CATALOG_CACHE_TAG] },
);

let pendingRefresh: Promise<CatalogEnvelope> | null = null;

export function refreshCatalog(): Promise<CatalogEnvelope> {
  if (pendingRefresh) return pendingRefresh;
  // Immediate expiry makes the next read a blocking upstream fetch and writes
  // its envelope back to the same canonical cache used by normal reads.
  revalidateTag(CATALOG_CACHE_TAG, { expire: 0 });
  pendingRefresh = getCatalog().finally(() => { pendingRefresh = null; });
  return pendingRefresh;
}

export async function getModels(): Promise<Model[]> {
  return (await getCatalog()).data;
}
