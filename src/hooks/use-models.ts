"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { parseModelsResponse } from "@/lib/models-response";

interface UseModelsResult {
  models: Model[];
  loading: boolean;
  error: Error | null;
}

export function useModels(): UseModelsResult {
  const [models, setModels] = React.useState<Model[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    async function fetchModels() {
      try {
        const res = await fetch("/api/models", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!controller.signal.aborted) setModels(parseModelsResponse(data));
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchModels();
    return () => controller.abort();
  }, []);

  return { models, loading, error };
}
