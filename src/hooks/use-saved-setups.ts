"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import {
  addSavedSetup, deleteSavedSetup, parseSavedSetups, readSavedSetups, writeSavedSetups,
  SAVED_SETUPS_STORAGE_KEY, type SaveSetupResult,
} from "@/lib/saved-setups";

const CHANGE_EVENT = "kilo-models-saved-setups-change";
const storageError = "Browser storage is unavailable or full. Allow storage or free space, then try again.";

function getSnapshot(): string | null {
  try { return window.localStorage.getItem(SAVED_SETUPS_STORAGE_KEY); } catch { return null; }
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SAVED_SETUPS_STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

const getServerSnapshot = () => null;

export function useSavedSetups() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setups = useMemo(() => parseSavedSetups(stored), [stored]);

  function saveSetup(name: string, workload: CalculatorWorkload, directoryQuery?: string | URLSearchParams): SaveSetupResult {
    try {
      const storage = window.localStorage;
      const result = addSavedSetup(readSavedSetups(storage), name, workload, directoryQuery, crypto.randomUUID());
      if (!result.ok) return result;
      const persisted = writeSavedSetups(storage, result.setups);
      if (!persisted.ok) return persisted;
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return result;
    } catch {
      return { ok: false, error: storageError };
    }
  }

  function deleteSetup(id: string): { ok: true } | { ok: false; error: string } {
    try {
      const storage = window.localStorage;
      const result = writeSavedSetups(storage, deleteSavedSetup(readSavedSetups(storage), id));
      if (result.ok) window.dispatchEvent(new Event(CHANGE_EVENT));
      return result;
    } catch {
      return { ok: false, error: storageError };
    }
  }

  return { setups, saveSetup, deleteSetup };
}
