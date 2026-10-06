import type { Model } from "./types";

export interface CalculatorWorkload {
  inputTokens: number;
  outputTokens: number;
  requests: number;
  period: "batch" | "month";
  cachePercent: number;
}

export const DEFAULT_WORKLOAD: CalculatorWorkload = {
  inputTokens: 2000, outputTokens: 500, requests: 1000, period: "batch", cachePercent: 0,
};

export const WORKLOAD_PRESETS = [
  { label: "Small request", inputTokens: 500, outputTokens: 150 },
  { label: "Chat", inputTokens: 2000, outputTokens: 500 },
  { label: "Long document", inputTokens: 50000, outputTokens: 2000 },
] as const;

export function parseCalculatorWorkload(search: string): CalculatorWorkload {
  const params = new URLSearchParams(search);
  const count = (key: "inputTokens" | "outputTokens" | "requests", min: number) => {
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
  };
}

export function getWorkloadWarnings(model: Model, workload: CalculatorWorkload): string[] {
  const warnings: string[] = [];
  const validLimit = (limit: unknown): limit is number => typeof limit === "number" && Number.isFinite(limit) && limit > 0;
  const outputLimit = model.top_provider?.max_completion_tokens;
  const contexts = [model.context_length, model.top_provider?.context_length].filter(validLimit);
  const contextLimit = contexts.length ? Math.min(...contexts) : null;
  if (validLimit(outputLimit) && workload.outputTokens > outputLimit) {
    warnings.push(`Output exceeds this model's ${outputLimit.toLocaleString("en-US")}-token completion limit.`);
  }
  if (contextLimit !== null && workload.inputTokens + workload.outputTokens > contextLimit) {
    warnings.push(`Combined input and output exceeds this model's ${contextLimit.toLocaleString("en-US")}-token context limit.`);
  }
  return warnings;
}
