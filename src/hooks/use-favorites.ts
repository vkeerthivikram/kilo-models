"use client";

import * as React from "react";
import { Model } from "@/lib/types";

const STORAGE_KEY = "kilo-models-favorites";

export function parseFavorites(stored: string | null): string[] {
  try {
    const value: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))] : [];
  } catch {
    return [];
  }
}

function getInitialFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return parseFavorites(stored);
  } catch {
    return [];
  }
}

interface UseFavoritesResult {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  favoriteModels: (models: Model[]) => Model[];
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = React.useState<string[]>(getInitialFavorites);

  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        try {
          if (e.storageArea === localStorage) setFavorites(parseFavorites(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isFavorite = React.useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const toggleFavorite = React.useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const favoriteModels = React.useCallback(
    (models: Model[]) => models.filter((m) => favorites.includes(m.id)),
    [favorites]
  );

  return { favorites, isFavorite, toggleFavorite, favoriteModels };
}
