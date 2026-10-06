"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { COMPARE_LIMIT } from "@/lib/format-price";
import { COMPARISON_STORAGE_KEY, parseComparisonIds } from "@/lib/comparison-storage";
import { parseSharedComparison } from "@/lib/comparison-share";

const SELECTION_EVENT = "kilo-comparison-change";

function readStoredSelection(): string | null {
  try {
    return localStorage.getItem(COMPARISON_STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribeSelection(callback: () => void) {
  const syncSelection = (event: StorageEvent) => {
    if (event.key === COMPARISON_STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", syncSelection);
  window.addEventListener(SELECTION_EVENT, callback);
  return () => {
    window.removeEventListener("storage", syncSelection);
    window.removeEventListener(SELECTION_EVENT, callback);
  };
}
const serverSelection = () => null;

export function useComparison<T extends { id: string }>(models: T[]) {
  const stored = React.useSyncExternalStore(subscribeSelection, readStoredSelection, serverSelection);
  const savedIds = React.useMemo(() => parseComparisonIds(stored), [stored]);
  const [editedSelection, setEditedSelection] = React.useState(false);
  const [sharedIds, setSharedIds] = useQueryState("compare", parseAsString.withOptions({ clearOnDefault: false }));
  const catalog = React.useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);
  const sharedSelection = React.useMemo(() => sharedIds === null ? null
    : parseSharedComparison(new URLSearchParams({ compare: sharedIds }).toString()) ?? [], [sharedIds]);
  const selected = sharedSelection ?? savedIds;
  const ids = React.useMemo(() => models.length ? selected.filter((id) => catalog.has(id)) : selected,
    [selected, models.length, catalog]);
  const comparedModels = React.useMemo(() => ids.flatMap((id) => {
    const model = catalog.get(id);
    return model ? [model] : [];
  }), [ids, catalog]);

  React.useEffect(() => {
    const markArrival = () => setEditedSelection(false);
    window.addEventListener("popstate", markArrival);
    return () => window.removeEventListener("popstate", markArrival);
  }, []);

  React.useEffect(() => {
    // Wait for the catalog before removing unavailable IDs from a shared link.
    // A null server snapshot also means saved selection has not hydrated yet.
    // With no explicit URL selection there is nothing to persist at that point.
    if (models.length === 0 || (stored === null && sharedIds === null)) return;
    try {
      const serialized = JSON.stringify(ids);
      if (localStorage.getItem(COMPARISON_STORAGE_KEY) !== serialized) {
        localStorage.setItem(COMPARISON_STORAGE_KEY, serialized);
        window.dispatchEvent(new Event(SELECTION_EVENT));
      }
    } catch {
      // Selection still works for this visit when browser storage is unavailable.
    }
    if (sharedIds !== null && sharedIds !== ids.join(",")) void setSharedIds(ids.join(","));
  }, [ids, models.length, stored, sharedIds, setSharedIds]);

  const toggleCompare = (model: { id: string }) => {
    if (!catalog.has(model.id)) return;
    setEditedSelection(true);
    void setSharedIds((previous) => {
      const current = (previous === null ? ids : parseSharedComparison(new URLSearchParams({ compare: previous }).toString()) ?? [])
        .filter((id) => catalog.has(id));
      const next = current.includes(model.id) ? current.filter((id) => id !== model.id)
        : current.length < COMPARE_LIMIT ? [...current, model.id] : current;
      return next.join(",");
    });
  };

  return {
    comparedModels, toggleCompare, clearComparison: () => { setEditedSelection(true); void setSharedIds(""); },
    hasSharedComparison: sharedIds !== null && !editedSelection && comparedModels.length > 0,
  };
}
