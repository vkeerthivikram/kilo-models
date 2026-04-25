"use client";

import * as React from "react";
import { Model } from "@/lib/types";

const STORAGE_KEY = "kilo-models-favorites";

interface UseFavoritesResult {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  favoriteModels: (models: Model[]) => Model[];
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, []);

  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setFavorites(JSON.parse(e.newValue));
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