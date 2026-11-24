"use client";

import * as React from "react";
import { withStorageLock } from "@/lib/storage-lock";

const STORAGE_KEY = "kilo-models-favorites";
const CHANGE_EVENT = "kilo-models-favorites-change";

export function parseFavorites(stored: string | null): string[] {
  try {
    const value: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))] : [];
  } catch {
    return [];
  }
}

const pendingFavorites = new Map<string, boolean>();
let lastStoredFavorites: string | null = null;
let saveFailed = false;

const saveError = "Favorites changed for this visit. Browser storage could not save the change.";

function mergeFavorites(stored: string | null): string {
  const next = new Set(parseFavorites(stored));
  for (const [id, selected] of pendingFavorites) {
    if (selected) next.add(id);
    else next.delete(id);
  }
  return JSON.stringify([...next]);
}

function getSnapshot(): string | null {
  try {
    lastStoredFavorites = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Keep the last known durable list available during a storage interruption.
  }
  return pendingFavorites.size ? mergeFavorites(lastStoredFavorites) : lastStoredFavorites;
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

const getServerSnapshot = () => null;

interface UseFavoritesResult {
  favorites: string[];
  storageWarning: string | null;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
  setFavorite: (id: string, selected: boolean) => Promise<void>;
}

async function setFavorite(id: string, selected: boolean): Promise<void> {
  pendingFavorites.set(id, selected);
  window.dispatchEvent(new Event(CHANGE_EVENT));
  try {
    await withStorageLock(STORAGE_KEY, () => {
      if (!pendingFavorites.size) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      const next = mergeFavorites(stored);
      if (next !== stored) localStorage.setItem(STORAGE_KEY, next);
      lastStoredFavorites = next;
      pendingFavorites.clear();
      saveFailed = false;
      window.dispatchEvent(new Event(CHANGE_EVENT));
    });
  } catch {
    // Keep the session changes and retry them on the next edit.
    if (pendingFavorites.size > 0) {
      saveFailed = true;
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
    throw new Error(saveError);
  }
}

export function useFavorites(): UseFavoritesResult {
  const stored = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const storageWarning = React.useSyncExternalStore(subscribe, () => saveFailed ? saveError : null, getServerSnapshot);
  const favorites = React.useMemo(() => parseFavorites(stored), [stored]);

  const isFavorite = React.useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const toggleFavorite = React.useCallback((id: string) => setFavorite(id, !parseFavorites(getSnapshot()).includes(id)), []);

  return { favorites, storageWarning, isFavorite, toggleFavorite, setFavorite };
}
