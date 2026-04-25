"use client";

import * as React from "react";
import { Model } from "@/lib/types";

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
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setModels(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  return { models, loading, error };
}