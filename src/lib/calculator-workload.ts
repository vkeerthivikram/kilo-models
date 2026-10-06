import type { Model, ModelPricing } from "./types";
import { parsePrice } from "./format-price";

export interface CalculatorWorkload {
  inputTokens: number;
  outputTokens: number;
  requests: number;
  period: "batch" | "month";
  cachePercent: number;
  images: number;
  searches: number;
  cacheWriteTokens: number;
}

export const DEFAULT_WORKLOAD: CalculatorWorkload = {
  inputTokens: 2000, outputTokens: 500, requests: 1000, period: "batch", cachePercent: 0,
  images: 0, searches: 0, cacheWriteTokens: 0,
};

export const WORKLOAD_QUERY_KEYS = Object.keys(DEFAULT_WORKLOAD) as (keyof CalculatorWorkload)[];

export function buildWorkloadHref(href: string, workload: CalculatorWorkload): string {
  const url = new URL(href, "https://directory.local");
  for (const key of WORKLOAD_QUERY_KEYS) {
    if (workload[key] === DEFAULT_WORKLOAD[key]) url.searchParams.delete(key);
    else url.searchParams.set(key, String(workload[key]));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export const WORKLOAD_PRESETS = [
  { label: "Small request", inputTokens: 500, outputTokens: 150 },
  { label: "Chat", inputTokens: 2000, outputTokens: 500 },
  { label: "Long document", inputTokens: 50000, outputTokens: 2000 },
] as const;

export function parseCalculatorWorkload(search: string): CalculatorWorkload {
  const params = new URLSearchParams(search);
  const count = (key: "inputTokens" | "outputTokens" | "requests" | "images" | "searches" | "cacheWriteTokens", min: number) => {
    const raw = params.get(key);
    const value = raw === null || raw.trim() === "" ? NaN : Number(raw);
    return Number.isSafeInteger(value) && value >= min ? value : DEFAULT_WORKLOAD[key];
  };
  const cache = params.get("cachePercent");
  const cachePercent = cache === null || cache.trim() === "" ? NaN : Number(cache);
  return {
    inputTokens: count("inputTokens", 0), outputTokens: count("outputTokens", 0), requests: count("requests", 1),
    period: params.get("period") === "month" ? "month" : "batch",
    cachePercent: Number.isFinite(cachePercent) && cachePercent >= 0 && cachePercent <= 100 ? cachePercent : 0,
    images: count("images", 0), searches: count("searches", 0), cacheWriteTokens: count("cacheWriteTokens", 0),
  };
}

function getWorkloadLimits(model: Model) {
  const validLimit = (limit: unknown): limit is number => typeof limit === "number" && Number.isFinite(limit) && limit > 0;
  const completion = model.top_provider?.max_completion_tokens;
  const contexts = [model.context_length, model.top_provider?.context_length].filter(validLimit);
  return { outputLimit: validLimit(completion) ? completion : null, contextLimit: contexts.length ? Math.min(...contexts) : null };
}

export function getWorkloadSuitability(model: Model, workload: CalculatorWorkload): "fits" | "exceeds" | "unknown" {
  const { outputLimit, contextLimit } = getWorkloadLimits(model);
  if ((outputLimit !== null && workload.outputTokens > outputLimit) ||
      (contextLimit !== null && workload.inputTokens + workload.outputTokens > contextLimit)) return "exceeds";
  return outputLimit === null || contextLimit === null ? "unknown" : "fits";
}

export function getWorkloadWarnings(model: Model, workload: CalculatorWorkload): string[] {
  const warnings: string[] = [];
  const { outputLimit, contextLimit } = getWorkloadLimits(model);
  if (outputLimit !== null && workload.outputTokens > outputLimit) {
    warnings.push(`Output exceeds this model's ${outputLimit.toLocaleString("en-US")}-token completion limit.`);
  }
  if (contextLimit !== null && workload.inputTokens + workload.outputTokens > contextLimit) {
    warnings.push(`Combined input and output exceeds this model's ${contextLimit.toLocaleString("en-US")}-token context limit.`);
  }
  return warnings;
}

export function getBillingWarnings(pricing: ModelPricing | undefined, workload: CalculatorWorkload): string[] {
  const warnings: string[] = [];
  const reads = Math.round(workload.inputTokens * workload.cachePercent / 100);
  if (reads + workload.cacheWriteTokens > workload.inputTokens) warnings.push("Cache reads and writes exceed total input. Reduce cached input or cache-write tokens.");
  for (const [units, rate, label] of [
    [reads, pricing?.input_cache_read, "cache read"],
    [workload.cacheWriteTokens, pricing?.input_cache_write, "cache write"],
    [workload.images, pricing?.image, "image"],
    [workload.searches, pricing?.web_search, "search"],
  ] as const) {
    if (units > 0 && parsePrice(rate) === null) warnings.push(`No ${label} rate is listed. Set this usage to zero to estimate the remaining charges.`);
  }
  return warnings;
}
