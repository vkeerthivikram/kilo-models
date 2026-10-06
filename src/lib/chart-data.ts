import type { Model } from "./types";
import { parsePrice } from "./format-price";

export function getPricingData(models: Model[]) {
  const perMillion = (value: unknown) => {
    const rate = parsePrice(value);
    return rate !== null && Number.isFinite(rate * 1_000_000) ? rate * 1_000_000 : null;
  };
  return models.map((model) => ({ name: model.name, prompt: perMillion(model.pricing?.prompt), completion: perMillion(model.pricing?.completion) }));
}

export function getCapabilityData(models: Model[]) {
  const positive = (value: number | undefined) => value != null && Number.isFinite(value) && value >= 0 ? value : null;
  const contexts = models.map((model) => positive(model.context_length));
  const outputs = models.map((model) => positive(model.top_provider?.max_completion_tokens));
  const params = models.map((model) => Array.isArray(model.supported_parameters) ? model.supported_parameters.length : null);
  const prices = models.map((model) => parsePrice(model.pricing?.prompt));
  const known = prices.filter((price): price is number => price !== null);
  const minPrice = Math.min(...known);
  const maxPrice = Math.max(...known);
  const normalize = (value: number | null, values: (number | null)[]) => value === null ? null
    : Math.round(value / Math.max(...values.filter((item): item is number => item !== null), 1) * 100);
  const axes = [
    { capability: "Context", values: contexts.map((value) => normalize(value, contexts)) },
    { capability: "Max output", values: outputs.map((value) => normalize(value, outputs)) },
    { capability: "Low input price", values: prices.map((price) => price === null ? null : maxPrice === minPrice ? 100 : Math.round((maxPrice - price) / (maxPrice - minPrice) * 100)) },
    { capability: "Supported parameters", values: params.map((value) => normalize(value, params)) },
  ];
  return axes.map(({ capability, values }) => ({ capability, ...Object.fromEntries(values.map((value, index) => [`model${index}`, value])) })) as Array<{ capability: string; [key: string]: string | number | null }>;
}

export function getSpecificationValue(model: Model, axis: string): string {
  if (axis === "Low input price") {
    const rate = parsePrice(model.pricing?.prompt);
    const perMillion = rate === null ? null : rate * 1_000_000;
    return perMillion === null || !Number.isFinite(perMillion) ? "Unknown"
      : `$${perMillion.toLocaleString("en-US", { maximumSignificantDigits: 12 })} / 1M input tokens`;
  }
  if (axis === "Supported parameters") {
    return Array.isArray(model.supported_parameters) ? `${model.supported_parameters.length} parameters` : "Unknown";
  }
  const tokens = axis === "Context" ? model.context_length : axis === "Max output" ? model.top_provider?.max_completion_tokens : null;
  return tokens == null || !Number.isFinite(tokens) || tokens < 0 ? "Unknown" : `${tokens.toLocaleString("en-US")} tokens`;
}
