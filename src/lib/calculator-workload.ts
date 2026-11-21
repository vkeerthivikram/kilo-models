import type { Model, ModelPricing } from "./types";
import { formatDiscount, parsePrice } from "./format-price";

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

function parseUsageNumber(value: string | null) {
  const text = value?.trim() ?? "";
  if (/^-(?:0+(?:\.0*)?|\.0+)(?:e[+-]?\d+)?$/i.test(text)) return 0;
  return parsePrice(text) ?? NaN;
}

export function parseCount(value: string | null, minimum = 0): number | null {
  const count = parseUsageNumber(value);
  return Number.isSafeInteger(count) && count >= minimum ? count : null;
}

export function parsePercent(value: string | null): number | null {
  const percent = parseUsageNumber(value);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : null;
}

export function parseWorkloadPeriod(value: string | null): CalculatorWorkload["period"] | null {
  return value === "batch" || value === "month" ? value : null;
}

export function parseCalculatorWorkload(search: string): CalculatorWorkload {
  const params = new URLSearchParams(search);
  const count = (key: "inputTokens" | "outputTokens" | "requests" | "images" | "searches" | "cacheWriteTokens", min: number) => {
    return parseCount(params.get(key), min) ?? DEFAULT_WORKLOAD[key];
  };
  return {
    inputTokens: count("inputTokens", 0), outputTokens: count("outputTokens", 0), requests: count("requests", 1),
    period: parseWorkloadPeriod(params.get("period")) ?? DEFAULT_WORKLOAD.period,
    cachePercent: parsePercent(params.get("cachePercent")) ?? DEFAULT_WORKLOAD.cachePercent,
    images: count("images", 0), searches: count("searches", 0), cacheWriteTokens: count("cacheWriteTokens", 0),
  };
}

const validLimit = (limit: unknown): limit is number => typeof limit === "number" && Number.isFinite(limit) && limit > 0;

export function getUsableContext(model: Pick<Model, "context_length" | "top_provider">): number | undefined {
  const advertised = model.context_length;
  const provider = model.top_provider?.context_length;
  if (validLimit(provider)) return validLimit(advertised) ? Math.min(advertised, provider) : provider;
  return validLimit(advertised) ? advertised : undefined;
}

function getWorkloadLimits(model: Model) {
  const completion = model.top_provider?.max_completion_tokens;
  return { outputLimit: validLimit(completion) ? completion : null, contextLimit: getUsableContext(model) ?? null };
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
    warnings.push(`Output exceeds this model's ${outputLimit.toLocaleString("en-US")}-token completion limit. Reduce output tokens per request from ${workload.outputTokens.toLocaleString("en-US")} to ${outputLimit.toLocaleString("en-US")} or less.`);
  }
  if (contextLimit !== null && workload.inputTokens + workload.outputTokens > contextLimit) {
    warnings.push(`Combined input and output exceeds this model's ${contextLimit.toLocaleString("en-US")}-token context limit. Reduce their combined ${(workload.inputTokens + workload.outputTokens).toLocaleString("en-US")} tokens per request to ${contextLimit.toLocaleString("en-US")} or less.`);
  }
  return warnings;
}

export function countCachedInputTokens(inputTokens: number, cachePercent: number): number {
  return cachePercent === 100 ? inputTokens : Math.min(inputTokens, Math.round(inputTokens * cachePercent / 100));
}

export function getBillingWarnings(pricing: ModelPricing | undefined, workload: CalculatorWorkload): string[] {
  const warnings: string[] = [];
  const discount = pricing?.discount;
  const reads = countCachedInputTokens(workload.inputTokens, workload.cachePercent);
  if (workload.inputTokens - reads - workload.cacheWriteTokens > 0 && parsePrice(pricing?.prompt) === null) warnings.push("No valid input token rate is listed. Choose a model with a published input price or set input usage to zero.");
  if (workload.outputTokens > 0 && parsePrice(pricing?.completion) === null) warnings.push("No valid output token rate is listed. Choose a model with a published output price or set output usage to zero.");
  if (pricing?.request != null && parsePrice(pricing.request) === null) warnings.push("The listed request fee is invalid. Choose a model with a valid request fee to estimate the total.");
  if (workload.cacheWriteTokens > workload.inputTokens - reads) warnings.push("Cache reads and writes exceed total input. Reduce cached input or cache-write tokens.");
  if (workload.images > 0) warnings.push(parsePrice(pricing?.image) === null
    ? "No valid image rate is listed. Set image usage to zero to estimate the remaining charges."
    : "The reported image rate has an unverified billing unit. Set image usage to zero to estimate the remaining charges.");
  for (const [units, rate, label] of [
    [reads, pricing?.input_cache_read, "cache read"],
    [workload.cacheWriteTokens, pricing?.input_cache_write, "cache write"],
    [workload.searches, pricing?.web_search, "search"],
  ] as const) {
    if (units > 0 && parsePrice(rate) === null) warnings.push(`No ${label} rate is listed. Set this usage to zero to estimate the remaining charges.`);
  }
  if (discount != null && discount > 0) warnings.push(`Estimates are pre-discount. The listed ${formatDiscount(discount)} discount is not applied because its billing scope is unspecified.`);
  return warnings;
}
