import type { Model } from "./types";
import { formatPrice, parsePrice as price } from "./format-price";

export interface ComparisonRow {
  key: string;
  label: string;
  values: string[];
  different: boolean;
}

function tokens(value: number | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function booleanLabel(value: boolean | null): string {
  return value === null ? "Unknown" : value ? "Yes" : "No";
}

function releaseDate(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function getComparisonRows(models: Model[]): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  function add<T>(key: string, label: string, getValue: (model: Model) => T, format: (value: T) => string) {
    const raw = models.map(getValue);
    rows.push({ key, label, values: raw.map(format), different: raw.some((value) => value !== raw[0]) });
  }
  const formatTokens = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US");
  const formatModality = (value: string | null) => value === null ? "Unknown" : value || "None";
  const modalities = (values: string[] | undefined) => values ? [...new Set(values)].sort().join(", ") : null;

  add("provider", "Provider", (model) => model.id.split("/")[0], (value) => value);
  add("input-price", "Input price / 1M tokens", (model) => price(model.pricing?.prompt), (value) => formatPrice(value ?? undefined));
  add("output-price", "Output price / 1M tokens", (model) => price(model.pricing?.completion), (value) => formatPrice(value ?? undefined));
  add("context", "Context window (tokens)", (model) => tokens(model.context_length), formatTokens);
  add("max-output", "Max output (tokens)", (model) => tokens(model.top_provider?.max_completion_tokens), formatTokens);
  add("input-modalities", "Input modalities", (model) => modalities(model.architecture?.input_modalities), formatModality);
  add("output-modalities", "Output modalities", (model) => modalities(model.architecture?.output_modalities), formatModality);
  add("reasoning", "Reasoning", (model) => model.supported_parameters ? model.supported_parameters.some((value) => value === "reasoning" || value === "include_reasoning") : null, booleanLabel);
  add("tools", "Tool calling", (model) => model.supported_parameters ? model.supported_parameters.includes("tools") : null, booleanLabel);
  add("moderation", "Provider moderation", (model) => model.top_provider?.is_moderated ?? null, booleanLabel);
  add("prompt-training", "May train on prompts", (model) => model.mayTrainOnYourPrompts ?? null, booleanLabel);
  add("tokenizer", "Tokenizer", (model) => model.architecture?.tokenizer || null, (value) => value ?? "—");
  add("released", "Released (UTC)", (model) => releaseDate(model.created), (value) => value ?? "—");
  return rows;
}
