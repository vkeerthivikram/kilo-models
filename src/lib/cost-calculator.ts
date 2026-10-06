import type { ModelPricing } from "./types";
import { parsePrice } from "./format-price";

export function tokenCount(value: string | number, minimum = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(minimum, Math.floor(number))) : minimum;
}

export function calculateCost(pricing: ModelPricing | undefined, inputTokens: number, outputTokens: number, requests: number, cachePercent = 0) {
  const cost = (tokens: number, rate: unknown) => {
    if (!Number.isSafeInteger(tokens) || tokens < 0) return null;
    if (tokens === 0) return 0;
    const price = parsePrice(rate);
    const result = price === null ? null : tokens * price;
    return result !== null && Number.isFinite(result) ? result : null;
  };
  const validCache = Number.isFinite(cachePercent) && cachePercent >= 0 && cachePercent <= 100;
  const cachedTokens = validCache && Number.isSafeInteger(inputTokens) && inputTokens >= 0 ? Math.round(inputTokens * (cachePercent / 100)) : null;
  const uncachedCost = cachedTokens === null ? null : cost(inputTokens - cachedTokens, pricing?.prompt);
  const cacheReadCost = cachedTokens === null ? null : cost(cachedTokens, pricing?.input_cache_read);
  const inputCost = uncachedCost === null || cacheReadCost === null ? null : uncachedCost + cacheReadCost;
  const outputCost = cost(outputTokens, pricing?.completion);
  const requestCost = pricing?.request === undefined ? 0 : parsePrice(pricing.request);
  const sum = inputCost === null || outputCost === null || requestCost === null ? null : inputCost + outputCost + requestCost;
  const perRequest = sum !== null && Number.isFinite(sum) ? sum : null;
  const total = perRequest === null || !Number.isSafeInteger(requests) || requests < 1 ? null : perRequest * requests;
  return { inputCost, cacheReadCost, outputCost, requestCost, perRequest, total: total !== null && Number.isFinite(total) ? total : null };
}

export function formatCost(cost: number | null): string {
  if (cost === null || !Number.isFinite(cost) || cost < 0) return "Unavailable";
  if (cost === 0) return "$0.00";
  if (cost < 0.00001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}
