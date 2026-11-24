"use client";

import * as React from "react";
import { parseAsString, useQueryState } from "nuqs";
import { COMPARE_LIMIT } from "@/lib/format-price";
import { COMPARISON_STORAGE_KEY, parseComparisonIds } from "@/lib/comparison-storage";
import { decodeComparisonIds, encodeComparisonIds } from "@/lib/comparison-share";
import { isLocalComparisonEntry, markLocalComparisonEntry } from "@/lib/comparison-history";

const SELECTION_EVENT = "kilo-comparison-change";
let pendingSelection: string | null = null;

function readStoredSelection(): string | null {
  if (pendingSelection !== null) return pendingSelection;
  try {
    return localStorage.getItem(COMPARISON_STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribeSelection(callback: () => void) {
  const syncSelection = (event: StorageEvent) => {
    if (event.key === COMPARISON_STORAGE_KEY || event.key === null) {
      if (pendingSelection !== null) {
        try {
          localStorage.getItem(COMPARISON_STORAGE_KEY);
          pendingSelection = null;
        } catch {
          // Keep pending selection while storage remains unreadable.
        }
      }
      callback();
    }
  };
  window.addEventListener("storage", syncSelection);
  window.addEventListener(SELECTION_EVENT, callback);
  return () => {
    window.removeEventListener("storage", syncSelection);
    window.removeEventListener(SELECTION_EVENT, callback);
  };
}
const serverSelection = () => null;

function persistSelection(value: string): boolean {
  const previousPending = pendingSelection;
  try {
    const previous = localStorage.getItem(COMPARISON_STORAGE_KEY);
    if (previous !== value) localStorage.setItem(COMPARISON_STORAGE_KEY, value);
    pendingSelection = null;
    if (previous !== value || previousPending !== null) window.dispatchEvent(new Event(SELECTION_EVENT));
    return true;
  } catch {
    pendingSelection = value;
    if (previousPending !== value) window.dispatchEvent(new Event(SELECTION_EVENT));
    return false;
  }
}

export function useComparison<T extends { id: string }>(models: T[], catalogState: "loading" | "partial" | "complete" = "complete") {
  const completeCatalog = catalogState === "complete";
  const stored = React.useSyncExternalStore(subscribeSelection, readStoredSelection, serverSelection);
  const savedIds = React.useMemo(() => parseComparisonIds(stored), [stored]);
  const [editedSelection, setEditedSelection] = React.useState(false);
  const [sharedIds, setSharedIds] = useQueryState("compare", parseAsString.withOptions({ clearOnDefault: false }));
  const catalog = React.useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);
  const sharedSelection = React.useMemo(() => sharedIds === null ? null
    : decodeComparisonIds(sharedIds), [sharedIds]);
  const selected = sharedSelection ?? savedIds;
  const ids = React.useMemo(() => completeCatalog ? selected.filter((id) => catalog.has(id)) : selected,
    [selected, completeCatalog, catalog]);
  const comparedModels = React.useMemo(() => ids.flatMap((id) => {
    const model = catalog.get(id);
    return model ? [model] : [];
  }), [ids, catalog]);

  React.useEffect(() => {
    const markArrival = () => setEditedSelection(isLocalComparisonEntry());
    markArrival();
    window.addEventListener("popstate", markArrival);
    return () => window.removeEventListener("popstate", markArrival);
  }, []);

  const rememberLocalComparison = React.useCallback(() => {
    // An optimistic nuqs value can precede the actual history write. Do not
    // stamp (or interrupt the write queue for) the previous selection.
    if (editedSelection && sharedIds && new URLSearchParams(window.location.search).get("compare") === sharedIds) markLocalComparisonEntry();
  }, [editedSelection, sharedIds]);

  const lastPersisted = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (sharedIds === null) {
      lastPersisted.current = null;
      // The source page may have had working URL state with a failed storage write.
      if (pendingSelection !== null) persistSelection(pendingSelection);
      return;
    }
    if (catalogState === "loading" && sharedIds !== "") return;
    const serialized = JSON.stringify(ids);
    if (serialized !== lastPersisted.current && persistSelection(serialized)) {
      lastPersisted.current = serialized;
    }
    const encoded = encodeComparisonIds(ids);
    if (sharedIds !== encoded) void setSharedIds(encoded);
  }, [ids, sharedIds, setSharedIds, catalogState]);

  const toggleCompare = (model: { id: string }) => {
    if (!catalog.has(model.id)) return;
    setEditedSelection(true);
    const path = window.location.pathname;
    void setSharedIds((previous) => {
      const before = previous === null ? ids : decodeComparisonIds(previous);
      const current = completeCatalog ? before.filter((id) => catalog.has(id)) : before;
      const next = current.includes(model.id) ? current.filter((id) => id !== model.id)
        : current.length < COMPARE_LIMIT ? [...current, model.id] : current;
      return encodeComparisonIds(next);
    }).then((updated) => {
      // Mark after nuqs writes the URL; do not mark an entry reached by a later navigation.
      if (window.location.pathname === path && new URLSearchParams(window.location.search).get("compare") === updated.get("compare")) markLocalComparisonEntry();
    });
  };

  return {
    comparedModels, selectedIds: ids, toggleCompare, rememberLocalComparison, clearComparison: () => { setEditedSelection(true); void setSharedIds(""); },
    hasSharedComparison: sharedIds !== null && !editedSelection && comparedModels.length > 0,
  };
}
