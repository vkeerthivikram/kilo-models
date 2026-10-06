import type { Model } from "./types";

export function defaultParameterLabels(value: Model["default_parameters"]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.entries(value).map(([key, setting]) => `${key}: ${typeof setting === "object" ? JSON.stringify(setting) : String(setting)}`);
}
