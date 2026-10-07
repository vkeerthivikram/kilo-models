import { ModelCatalogValidationError, parseModelsResponse } from "./models-response";
import type { Model } from "./types";

export const CATALOG_CACHE_SECONDS = 3600;
export const CATALOG_CACHE_TAG = "kilo-model-catalog";
export const CATALOG_TIMEOUT_MS = 10_000;
export const CATALOG_REFRESH_MIN_AGE_MS = 60_000;

export class CatalogFetchError extends Error {
  constructor(readonly kind: "http" | "network" | "invalid-json" | "timeout", readonly status?: number) {
    super(kind === "timeout" ? "Model catalog request timed out"
      : `Failed to load model catalog (${kind === "http" ? `upstream HTTP ${status}` : kind})`);
    this.name = "CatalogFetchError";
  }
}

/** Logs contain only generated diagnostics, never response bodies or raw errors. */
export function catalogErrorDiagnostic(error: unknown) {
  if (error instanceof ModelCatalogValidationError) {
    return { kind: "validation", index: error.index, modelId: error.modelId, field: error.field };
  }
  if (error instanceof CatalogFetchError) {
    return error.status === undefined ? { kind: error.kind } : { kind: error.kind, status: error.status };
  }
  return { kind: "unexpected" };
}

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
  const timer = setTimeout(() => controller.abort(new CatalogFetchError("timeout")), timeoutMs);
  try {
    const response = await fetcher(resolveGatewayUrl(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new CatalogFetchError("http", response.status);
    let payload: unknown;
    try { payload = await response.json(); }
    catch { throw new CatalogFetchError("invalid-json"); }
    const data = parseModelsResponse(payload);
    // This runs inside the cached function, only after a successful upstream fetch.
    return { data, fetchedAt: now().toISOString() };
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof ModelCatalogValidationError || error instanceof CatalogFetchError) throw error;
    throw new CatalogFetchError("network");
  } finally {
    clearTimeout(timer);
  }
}
