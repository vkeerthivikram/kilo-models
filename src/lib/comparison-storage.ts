import { COMPARE_LIMIT } from "./format-price";

export const COMPARISON_STORAGE_KEY = "kilo-models-comparison";

export function parseComparisonIds(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0))].slice(0, COMPARE_LIMIT);
  } catch {
    return [];
  }
}
