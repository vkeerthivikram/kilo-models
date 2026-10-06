"use client";

import * as React from "react";
import type { Model } from "@/lib/types";
import { COMPARE_LIMIT } from "@/lib/format-price";
import { COMPARISON_STORAGE_KEY, parseComparisonIds } from "@/lib/comparison-storage";

function readSelection(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseComparisonIds(localStorage.getItem(COMPARISON_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function useComparison(models: Model[]) {
  const [ids, setIds] = React.useState<string[]>(readSelection);
  const catalog = React.useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);
  const comparedModels = React.useMemo(() => ids.flatMap((id) => {
    const model = catalog.get(id);
    return model ? [model] : [];
  }), [ids, catalog]);

  React.useEffect(() => {
    try {
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Selection still works for this visit when browser storage is unavailable.
    }
  }, [ids]);

  React.useEffect(() => {
    const syncSelection = (event: StorageEvent) => {
      try {
        if (event.storageArea === localStorage && (event.key === COMPARISON_STORAGE_KEY || event.key === null)) {
          setIds(parseComparisonIds(event.newValue));
        }
      } catch {
        // Some browser privacy modes deny access to localStorage.
      }
    };
    window.addEventListener("storage", syncSelection);
    return () => window.removeEventListener("storage", syncSelection);
  }, []);

  const toggleCompare = (model: Model) => {
    setIds((previous) => {
      const current = previous.filter((id) => catalog.has(id));
      if (current.includes(model.id)) return current.filter((id) => id !== model.id);
      return current.length < COMPARE_LIMIT ? [...current, model.id] : current;
    });
  };

  return { comparedModels, toggleCompare, clearComparison: () => setIds([]) };
}
