import { parseModelsResponse } from "./models-response";
import type { Model } from "./types";

export const CATALOG_CACHE_SECONDS = 3600;
export const CATALOG_CACHE_TAG = "kilo-model-catalog";

export interface CatalogEnvelope {
  data: Model[];
  fetchedAt: string;
}

export async function fetchCatalog(
  fetcher: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<CatalogEnvelope> {
  const response = await fetcher("https://api.kilo.ai/api/gateway/models", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load model catalog");
  const data = parseModelsResponse(await response.json());
  // This runs inside the cached function, only after a successful upstream fetch.
  return { data, fetchedAt: now().toISOString() };
}
