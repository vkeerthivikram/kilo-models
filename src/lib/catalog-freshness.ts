import { parseModelsResponse } from "./models-response";
import type { Model } from "./types";

export const CATALOG_CACHE_SECONDS = 3600;
export const CATALOG_CACHE_TAG = "kilo-model-catalog";
export const CATALOG_TIMEOUT_MS = 10_000;

export interface CatalogEnvelope {
  data: Model[];
  fetchedAt: string;
}

export function resolveGatewayUrl(environment: {
  NODE_ENV?: string;
  KILO_MODELS_GATEWAY_URL?: string;
} = process.env): string {
  if (environment.NODE_ENV !== "production" && environment.KILO_MODELS_GATEWAY_URL) {
    return environment.KILO_MODELS_GATEWAY_URL;
  }
  return "https://api.kilo.ai/api/gateway/models";
}

export async function fetchCatalog(
  fetcher: typeof fetch = fetch,
  now: () => Date = () => new Date(),
  timeoutMs = CATALOG_TIMEOUT_MS,
): Promise<CatalogEnvelope> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Model catalog request timed out")), timeoutMs);
  try {
    const response = await fetcher(resolveGatewayUrl(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Failed to load model catalog");
    const data = parseModelsResponse(await response.json());
    // This runs inside the cached function, only after a successful upstream fetch.
    return { data, fetchedAt: now().toISOString() };
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
