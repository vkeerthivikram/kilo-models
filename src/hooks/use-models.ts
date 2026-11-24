"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { createCatalogClient, isFreshCatalog } from "@/lib/catalog-client";
import type { CatalogEnvelope } from "@/lib/catalog-freshness";

// In-memory only: shared across route remounts in this tab, not across reloads or users.
let lastCatalog: CatalogEnvelope | null = null;

interface UseModelsResult {
  models: Model[];
  loading: boolean;
  error: Error | null;
  fetchedAt: string | null;
  excludedCount: number;
  revalidating: boolean;
  refresh: () => Promise<void>;
}

export function useModels(): UseModelsResult {
  const [models, setModels] = React.useState<Model[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [fetchedAt, setFetchedAt] = React.useState<string | null>(null);
  const [excludedCount, setExcludedCount] = React.useState(0);
  const [revalidating, setRevalidating] = React.useState(false);
  const client = React.useRef<ReturnType<typeof createCatalogClient> | null>(null);
  const pendingRefresh = React.useRef<Promise<void> | null>(null);
  const refreshId = React.useRef(0);

  const showCatalog = React.useCallback((catalog: CatalogEnvelope) => {
    setModels(catalog.data);
    setFetchedAt(catalog.fetchedAt);
    setExcludedCount(catalog.excludedCount ?? 0);
    setLoading(false);
  }, []);

  const load = React.useCallback((refresh = false, id?: number) => {
    if (!client.current) client.current = createCatalogClient();
    const request = !refresh && lastCatalog && isFreshCatalog(lastCatalog)
      ? Promise.resolve(lastCatalog) : client.current.load(refresh);
    return request.then((catalog) => {
      if (!catalog) {
        if (refresh && id === refreshId.current) setRevalidating(false);
        return;
      }
      lastCatalog = catalog;
      setError(null);
      showCatalog(catalog);
      setRevalidating(false);
    }, (err: unknown) => {
      const failure = err instanceof Error ? err : new Error("Unable to load model catalog");
      setError(failure);
      setLoading(false);
      if (!refresh || id === refreshId.current) setRevalidating(false);
      if (refresh) throw failure;
    });
  }, [showCatalog]);

  const refresh = React.useCallback(() => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const id = ++refreshId.current;
    setRevalidating(true);
    pendingRefresh.current = load(true, id).finally(() => {
      if (refreshId.current === id) pendingRefresh.current = null;
    });
    return pendingRefresh.current;
  }, [load]);

  React.useEffect(() => {
    void load();
    return () => client.current?.cancel();
  }, [load]);

  return { models, loading, error, fetchedAt, excludedCount, revalidating, refresh };
}
