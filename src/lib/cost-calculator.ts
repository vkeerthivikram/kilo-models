import type { ModelPricing } from "./types";
import { parsePrice } from "./format-price";
import type { CalculatorWorkload } from "./calculator-workload";

export function calculateCost(pricing: ModelPricing | undefined, inputTokens: number, outputTokens: number, requests: number, cachePercent = 0,
  extras: Partial<Pick<CalculatorWorkload, "images" | "searches" | "cacheWriteTokens">> = {}) {
  const cost = (tokens: number, rate: unknown) => {
    if (!Number.isSafeInteger(tokens) || tokens < 0) return null;
    if (tokens === 0) return 0;
    const price = parsePrice(rate);
    const result = price === null ? null : tokens * price;
    return result !== null && Number.isFinite(result) ? result : null;
  };
  const validCache = Number.isFinite(cachePercent) && cachePercent >= 0 && cachePercent <= 100;
  const cachedTokens = validCache && Number.isSafeInteger(inputTokens) && inputTokens >= 0 ? Math.round(inputTokens * (cachePercent / 100)) : null;
  const writes = extras.cacheWriteTokens ?? 0;
  const validWrites = Number.isSafeInteger(writes) && writes >= 0 && cachedTokens !== null && writes <= inputTokens - cachedTokens;
  const uncachedCost = !validWrites ? null : cost(inputTokens - cachedTokens! - writes, pricing?.prompt);
  const cacheReadCost = cachedTokens === null ? null : cost(cachedTokens, pricing?.input_cache_read);
  const cacheWriteCost = validWrites ? cost(writes, pricing?.input_cache_write) : null;
  const inputCost = uncachedCost === null || cacheReadCost === null || cacheWriteCost === null ? null : uncachedCost + cacheReadCost + cacheWriteCost;
  const outputCost = cost(outputTokens, pricing?.completion);
  const imageCost = cost(extras.images ?? 0, pricing?.image);
  const searchCost = cost(extras.searches ?? 0, pricing?.web_search);
  const requestCost = pricing?.request == null ? 0 : parsePrice(pricing.request);
  const sum = inputCost === null || outputCost === null || requestCost === null || imageCost === null || searchCost === null ? null : inputCost + outputCost + requestCost + imageCost + searchCost;
  const perRequest = sum !== null && Number.isFinite(sum) ? sum : null;
  const total = perRequest === null || !Number.isSafeInteger(requests) || requests < 1 ? null : perRequest * requests;
  return { inputCost, uncachedCost, cacheReadCost, cacheWriteCost, outputCost, imageCost, searchCost, requestCost, perRequest, total: total !== null && Number.isFinite(total) ? total : null };
}

export function calculateWorkloadCost(pricing: ModelPricing | undefined, workload: CalculatorWorkload) {
  return calculateCost(pricing, workload.inputTokens, workload.outputTokens, workload.requests, workload.cachePercent, workload);
}

export function formatCost(cost: number | null): string {
  if (cost === null || !Number.isFinite(cost) || cost < 0) return "Unavailable";
  if (cost === 0) return "$0.00";
  if (cost < 0.00001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}
