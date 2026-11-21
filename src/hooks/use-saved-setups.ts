"use client";

import { useMemo, useSyncExternalStore } from "react";
import { StorageLockTimeoutError, withStorageLock } from "@/lib/storage-lock";
import type { CalculatorWorkload } from "@/lib/calculator-workload";
import {
  addSavedSetup, deleteSavedSetup, exportSavedSetupsBackup, importSavedSetupsBackup, inspectSavedSetups,
  renameSavedSetup, restoreDeletedSetup, updateSavedSetup, writeSavedSetups,
  SAVED_SETUPS_STORAGE_KEY, UNREADABLE_SETUP_STORAGE, type DeletedSavedSetup, type SavedSetup,
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
  const { setups, hasUnreadableStorage } = useMemo(() => inspectSavedSetups(stored), [stored]);

  async function mutate<T extends { ok: true; setups: SavedSetup[] }>(mutation: (current: SavedSetup[]) => T | { ok: false; error: string }): Promise<T | { ok: false; error: string }> {
    try {
      return await withStorageLock(SAVED_SETUPS_STORAGE_KEY, () => {
        const storage = window.localStorage;
        const current = inspectSavedSetups(storage.getItem(SAVED_SETUPS_STORAGE_KEY));
        if (current.hasUnreadableStorage) return { ok: false, error: UNREADABLE_SETUP_STORAGE } as const;
        const result = mutation(current.setups);
        if (!result.ok) return result;
        const persisted = writeSavedSetups(storage, result.setups);
        if (!persisted.ok) return persisted;
        window.dispatchEvent(new Event(CHANGE_EVENT));
        return result;
      });
    } catch (error) {
      return { ok: false, error: error instanceof StorageLockTimeoutError ? error.message : storageError };
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

  async function recoverSetups(expected: string) {
    try {
      return await withStorageLock(SAVED_SETUPS_STORAGE_KEY, () => {
        const storage = window.localStorage;
        const raw = storage.getItem(SAVED_SETUPS_STORAGE_KEY);
        if (raw !== expected) return { ok: false, error: "Saved setup data changed in another tab. Review recovery again." } as const;
        const current = inspectSavedSetups(raw);
        if (!current.hasUnreadableStorage) return { ok: false, error: "Saved setup data no longer needs recovery." } as const;
        const persisted = writeSavedSetups(storage, current.setups);
        if (!persisted.ok) return persisted;
        window.dispatchEvent(new Event(CHANGE_EVENT));
        return { ok: true, count: current.setups.length } as const;
      });
    } catch (error) {
      return { ok: false, error: error instanceof StorageLockTimeoutError ? error.message : storageError } as const;
    }
  }

  function exportBackup(mode: "structured" | "recovery" = "structured"): { ok: true; backup: string } | { ok: false; error: string } {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(SAVED_SETUPS_STORAGE_KEY);
    } catch {
      return { ok: false, error: "Could not read saved setups. Allow browser storage, then try again." };
    }
    if (mode === "recovery") return raw === null ? { ok: false, error: "There is no saved setup data to recover." } : { ok: true, backup: raw };
    const current = inspectSavedSetups(raw);
    if (current.hasUnreadableStorage) return { ok: false, error: UNREADABLE_SETUP_STORAGE };
    try {
      return { ok: true, backup: exportSavedSetupsBackup(current.setups) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not create the backup. Try exporting again." };
    }
  }

  return { setups, hasUnreadableStorage, recoverySource: hasUnreadableStorage ? stored : null, saveSetup, renameSetup, updateSetup, deleteSetup, restoreSetup, importBackup, exportBackup, recoverSetups };
}
