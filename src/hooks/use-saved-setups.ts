"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import {
  addSavedSetup, deleteSavedSetup, exportSavedSetupsBackup, importSavedSetupsBackup, parseSavedSetups,
  renameSavedSetup, restoreDeletedSetup, updateSavedSetup, writeSavedSetups,
  SAVED_SETUPS_STORAGE_KEY, type DeletedSavedSetup, type SavedSetup,
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

  function mutate<T extends { ok: true; setups: SavedSetup[] }>(mutation: (current: SavedSetup[]) => T | { ok: false; error: string }): T | { ok: false; error: string } {
    try {
      const storage = window.localStorage;
      const result = mutation(parseSavedSetups(storage.getItem(SAVED_SETUPS_STORAGE_KEY)));
      if (!result.ok) return result;
      const persisted = writeSavedSetups(storage, result.setups);
      if (!persisted.ok) return persisted;
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return result;
    } catch {
      return { ok: false, error: storageError };
    }
  }

  function saveSetup(name: string, workload: CalculatorWorkload, directoryQuery?: string | URLSearchParams) {
    return mutate((current) => addSavedSetup(current, name, workload, directoryQuery,
      globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`));
  }

  function renameSetup(id: string, name: string) {
    return mutate((current) => renameSavedSetup(current, id, name));
  }

  function updateSetup(id: string, workload: CalculatorWorkload, directoryQuery?: string | URLSearchParams) {
    return mutate((current) => updateSavedSetup(current, id, workload, directoryQuery));
  }

  function deleteSetup(id: string) {
    return mutate<{ ok: true; setups: SavedSetup[]; deleted: DeletedSavedSetup }>((current) => {
      const index = current.findIndex((setup) => setup.id === id);
      if (index < 0) return { ok: false as const, error: "This setup is no longer saved. Choose another setup." };
      return { ok: true as const, setups: deleteSavedSetup(current, id), deleted: { setup: current[index], index } };
    });
  }

  function restoreSetup(deleted: DeletedSavedSetup) {
    return mutate((current) => restoreDeletedSetup(current, deleted));
  }

  function importBackup(backup: string) {
    return mutate((current) => importSavedSetupsBackup(current, backup));
  }

  function exportBackup(): { ok: true; backup: string } | { ok: false; error: string } {
    let current: SavedSetup[];
    try {
      current = parseSavedSetups(window.localStorage.getItem(SAVED_SETUPS_STORAGE_KEY));
    } catch {
      return { ok: false, error: "Could not read saved setups. Allow browser storage, then try again." };
    }
    try {
      return { ok: true, backup: exportSavedSetupsBackup(current) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not create the backup. Try exporting again." };
    }
  }

  return { setups, saveSetup, renameSetup, updateSetup, deleteSetup, restoreSetup, importBackup, exportBackup };
}
