import { parseModelsResponse } from "./models-response";
import { CATALOG_CACHE_SECONDS, type CatalogEnvelope } from "./catalog-freshness";

const REQUEST_TIMEOUT_MS = 12_000;

export function isFreshCatalog(catalog: CatalogEnvelope, now = Date.now()): boolean {
  const age = now - Date.parse(catalog.fetchedAt);
  return age >= 0 && age < CATALOG_CACHE_SECONDS * 1000;
}

/** One directory's requests: abort superseded work and ignore late responses. */
export function createCatalogClient(fetcher: typeof fetch = fetch) {
  let controller: AbortController | null = null;
  return {
    async load(refresh = false): Promise<CatalogEnvelope | null> {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeoutError = new Error(refresh ? "Catalog refresh timed out. Try again." : "Catalog load timed out. Try again.");
      const timeout = setTimeout(() => current.abort(timeoutError), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetcher("/api/models", {
          method: refresh ? "POST" : "GET", cache: "no-store", signal: current.signal,
        });
        if (!response.ok) throw new Error("Unable to load model catalog");
        const payload: unknown = await response.json();
        current.signal.throwIfAborted();
        const data = parseModelsResponse(payload);
        const fetchedAt = (payload as Record<string, unknown>).fetchedAt;
        if (typeof fetchedAt !== "string" || !Number.isFinite(Date.parse(fetchedAt))) {
          throw new Error("Invalid catalog update time");
        }
        const excludedCount = (payload as Record<string, unknown>).excludedCount;
        if (excludedCount !== undefined && (typeof excludedCount !== "number" || !Number.isSafeInteger(excludedCount) || excludedCount < 0)) {
          throw new Error("Invalid catalog exclusion count");
        }
        return { data, fetchedAt, ...(excludedCount ? { excludedCount } : {}) };
      } catch (error) {
        if (current.signal.reason === timeoutError) throw timeoutError;
        if (current.signal.aborted) return null;
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
    cancel() { controller?.abort(); },
  };
}
