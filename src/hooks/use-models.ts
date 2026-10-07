"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { createCatalogClient } from "@/lib/catalog-client";

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

  const load = React.useCallback(async (refresh = false) => {
    if (!client.current) client.current = createCatalogClient();
    try {
      const catalog = await client.current.load(refresh);
      if (!catalog) return;
      setModels(catalog.data);
      setFetchedAt(catalog.fetchedAt);
      setExcludedCount(catalog.excludedCount ?? 0);
      setLoading(false);
      setRevalidating(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unable to load model catalog"));
      setLoading(false);
      setRevalidating(false);
    }
  }, []);

  const refresh = React.useCallback(() => {
    setRevalidating(true);
    setError(null);
    return load(true);
  }, [load]);

  React.useEffect(() => {
    void load();
    return () => client.current?.cancel();
  }, [load]);

  return { models, loading, error, fetchedAt, excludedCount, revalidating, refresh };
}
