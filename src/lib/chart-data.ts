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
  const positive = (value: number | undefined) => value != null && Number.isFinite(value) && value >= 0 ? value : 0;
  const contexts = models.map((model) => positive(model.context_length));
  const outputs = models.map((model) => positive(model.top_provider?.max_completion_tokens));
  const params = models.map((model) => (model.supported_parameters ?? []).length);
  const prices = models.map((model) => parsePrice(model.pricing?.prompt));
  const known = prices.filter((price): price is number => price !== null);
  const minPrice = Math.min(...known);
  const maxPrice = Math.max(...known);
  const normalize = (value: number, values: number[]) => Math.round(value / Math.max(...values, 1) * 100);
  const axes = [
    { capability: "Context", values: contexts.map((value) => normalize(value, contexts)) },
    { capability: "Max output", values: outputs.map((value) => normalize(value, outputs)) },
    { capability: "Low input price", values: prices.map((price) => price === null ? null : maxPrice === minPrice ? 100 : Math.round((1 - price / maxPrice) / (1 - minPrice / maxPrice) * 100)) },
    { capability: "Parameters", values: params.map((value) => normalize(value, params)) },
  ];
  return axes.map(({ capability, values }) => ({ capability, ...Object.fromEntries(values.map((value, index) => [`model${index}`, value])) })) as Array<{ capability: string; [key: string]: string | number | null }>;
}
