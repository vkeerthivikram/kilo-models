import { COMPARE_LIMIT } from "./format-price";

export const COMPARISON_STORAGE_KEY = "kilo-models-comparison";

export function normalizeComparisonIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0))].slice(0, COMPARE_LIMIT);
}

export function parseComparisonIds(raw: string | null): string[] {
  try {
    return normalizeComparisonIds(JSON.parse(raw ?? "[]"));
  } catch {
    return [];
  }
}
