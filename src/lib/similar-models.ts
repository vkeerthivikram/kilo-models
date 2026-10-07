import type { Model } from "./types";
import { parsePrice } from "./format-price";

const overlap = (first: string[], second: string[]) => {
  if (!first.length || !second.length) return 0;
  const combined = new Set([...first, ...second]);
  return combined.size ? new Set(first.filter((item) => second.includes(item))).size / combined.size : 1;
};
const capabilities = (model: Model) => (model.supported_parameters ?? [])
  .filter((parameter) => ["tools", "reasoning", "include_reasoning", "response_format"].includes(parameter))
  .map((parameter) => parameter === "include_reasoning" ? "reasoning" : parameter);
const context = (model: Model) => Number.isFinite(model.context_length) && model.context_length > 0 ? model.context_length : null;
const price = (model: Model) => {
  const input = parsePrice(model.pricing?.prompt);
  const output = parsePrice(model.pricing?.completion);
  return input === null || output === null ? null : input + output;
};
const proximity = (first: number | null, second: number | null) => {
  if (first === null || second === null) return 0;
  return first === second ? 1 : Math.min(first, second) / Math.max(first, second);
};

export function getSimilarModels(models: Model[], source: Model, limit = 6): Model[] {
  const inputs = source.architecture?.input_modalities ?? [];
  const outputs = source.architecture?.output_modalities ?? [];
  const seen = new Set([source.id]);
  return models.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return (!outputs.length || outputs.some((item) => candidate.architecture?.output_modalities?.includes(item)))
      && (!inputs.length || inputs.some((item) => candidate.architecture?.input_modalities?.includes(item)));
  }).map((candidate) => ({
    model: candidate,
    score: 40 * overlap(outputs, candidate.architecture?.output_modalities ?? [])
      + 30 * overlap(inputs, candidate.architecture?.input_modalities ?? [])
      + 20 * overlap(capabilities(source), capabilities(candidate))
      + 20 * proximity(context(source), context(candidate))
      + 20 * proximity(price(source), price(candidate))
      + (source.id.split("/")[0] === candidate.id.split("/")[0] ? 5 : 0),
  })).sort((a, b) => b.score - a.score || a.model.name.localeCompare(b.model.name) || a.model.id.localeCompare(b.model.id))
    .slice(0, Math.max(0, Math.floor(limit))).map(({ model }) => model);
}
