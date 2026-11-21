import { parseAsArrayOf, parseAsString } from "nuqs";
import { normalizeProvider } from "./model-provider";

const legacy = parseAsArrayOf(parseAsString);
const exactPrefix = "values ";

export function decodeFilterValues(value: string): string[] {
  if (!value.startsWith(exactPrefix + "[")) return legacy.parse(value) ?? [];
  try {
    const values: unknown = JSON.parse(value.slice(exactPrefix.length));
    return Array.isArray(values) ? values.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function encodeFilterValues(values: string[]): string {
  return values.some((value) => /,|%2c/i.test(value) || value.startsWith(exactPrefix + "["))
    ? exactPrefix + JSON.stringify(values)
    : legacy.serialize(values);
}

export function decodeProviderFilters(value: string): string[] {
  return [...new Set(decodeFilterValues(value).map(normalizeProvider))];
}
