import type { Model } from "./types";
import { parsePrice } from "./format-price";

export interface ModelFilterCriteria {
  search: string;
  free: boolean;
  inputModalities: string[];
  outputModalities: string[];
  providers: string[];
  reasoning: boolean;
  tools: boolean;
  fav: boolean;
  minContext: number | null;
  maxInputPrice: number | null;
  maxOutputPrice: number | null;
}

type FacetGroup = "providers" | "inputModalities" | "outputModalities" | "capabilities" | "free";

export function parseNumericFilter(value: unknown, integer = false): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isSafeInteger(number))) return null;
  return number;
}

export function matchesModelFilters(model: Model, filters: ModelFilterCriteria, favoriteIds: string[], ignored?: FacetGroup): boolean {
  if (filters.fav && !favoriteIds.includes(model.id)) return false;
  const search = filters.search.trim().toLowerCase();
  if (search && ![model.name, model.id, model.description].some((value) => value.toLowerCase().includes(search))) return false;
  if (ignored !== "free" && filters.free && !model.isFree) return false;
  if (filters.minContext !== null && (!Number.isFinite(model.context_length) || model.context_length < filters.minContext)) return false;
  for (const [max, price] of [[filters.maxInputPrice, model.pricing?.prompt], [filters.maxOutputPrice, model.pricing?.completion]] as const) {
    if (max !== null) {
      const parsed = parsePrice(price);
      if (parsed === null) return false;
      const perMillion = parsed * 1_000_000;
      // Converting a decimal token rate can round slightly above an equal cap.
      const roundingTolerance = Number.EPSILON * Math.max(perMillion, max) * 4;
      if (!Number.isFinite(perMillion) || perMillion - max > roundingTolerance) return false;
    }
  }
  if (ignored !== "inputModalities" && filters.inputModalities.length && !filters.inputModalities.some((value) => model.architecture?.input_modalities?.includes(value))) return false;
  if (ignored !== "outputModalities" && filters.outputModalities.length && !filters.outputModalities.some((value) => model.architecture?.output_modalities?.includes(value))) return false;
  if (ignored !== "providers" && filters.providers.length && !filters.providers.includes(model.id.split("/")[0])) return false;
  const parameters = model.supported_parameters ?? [];
  if (ignored !== "capabilities") {
    if (filters.reasoning && !parameters.includes("reasoning") && !parameters.includes("include_reasoning")) return false;
    if (filters.tools && !parameters.includes("tools")) return false;
  }
  return true;
}

export function getFilterCounts(models: Model[], filters: ModelFilterCriteria, favoriteIds: string[]) {
  const counts = {
    providers: {} as Record<string, number>,
    inputModalities: {} as Record<string, number>,
    outputModalities: {} as Record<string, number>,
    reasoning: 0,
    tools: 0,
    free: 0,
  };
  for (const model of models) {
    if (matchesModelFilters(model, filters, favoriteIds, "providers")) {
      const provider = model.id.split("/")[0];
      counts.providers[provider] = (counts.providers[provider] ?? 0) + 1;
    }
    for (const group of ["inputModalities", "outputModalities"] as const) {
      if (matchesModelFilters(model, filters, favoriteIds, group)) {
        const modalities = group === "inputModalities" ? model.architecture?.input_modalities : model.architecture?.output_modalities;
        for (const modality of new Set(modalities ?? [])) counts[group][modality] = (counts[group][modality] ?? 0) + 1;
      }
    }
    if (matchesModelFilters(model, filters, favoriteIds, "capabilities")) {
      const parameters = model.supported_parameters ?? [];
      if (parameters.includes("reasoning") || parameters.includes("include_reasoning")) counts.reasoning++;
      if (parameters.includes("tools")) counts.tools++;
    }
    if (model.isFree && matchesModelFilters(model, filters, favoriteIds, "free")) counts.free++;
  }
  return counts;
}
