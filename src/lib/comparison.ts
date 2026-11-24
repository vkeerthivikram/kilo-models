import type { Model } from "./types";
import { formatPrice, parsePrice as price } from "./format-price";
import { getUsableContext, getWorkloadSuitability, type CalculatorWorkload } from "./calculator-workload";
import { calculateWorkloadCost, formatCost } from "./cost-calculator";
import { getModelProvider } from "./model-provider";

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
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T", 1)[0];
}

function priceLabels(values: (number | null)[], labels: string[], precise: (value: number) => string, rawLabel: (value: number) => string): string[] {
  const hasCollision = (formatted: string[]) => formatted.some((label, index) => formatted.some((other, j) => other === label && values[j] !== values[index]));
  if (!hasCollision(labels)) return labels;
  const format = (formatter: (value: number) => string) => values.map((value, index) => value === null || value === 0 ? labels[index] : formatter(value));
  const clean = format(precise);
  return hasCollision(clean) ? format(rawLabel) : clean;
}

// Drop binary arithmetic noise while keeping precision well above the compact display.
const displayDecimal = (value: number) => {
  const rounded = Number(value.toPrecision(15));
  return String(Number.isFinite(rounded) ? rounded : value);
};

function comparisonRows(models: Model[]): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  function add<T>(key: string, label: string, getValue: (model: Model) => T, format: (value: T) => string) {
    const raw = models.map(getValue);
    rows.push({ key, label, values: raw.map(format), different: raw.some((value) => value !== raw[0]) });
  }
  const formatTokens = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US");
  const formatModality = (value: string | null) => value === null ? "Unknown" : value || "None";
  const modalities = (values: string[] | undefined) => values ? [...new Set(values)].sort().join(", ") : null;

  add("provider", "Provider", (model) => getModelProvider(model.id), (value) => value);
  for (const [label, key] of [["Input", "prompt"], ["Output", "completion"]] as const) {
    const raw = models.map((model) => price(model.pricing?.[key]));
    const compact = raw.map((value) => formatPrice(value ?? undefined));
    const exact = (value: number) => {
      const perMillion = value * 1_000_000;
      return Number.isFinite(perMillion) ? `$${displayDecimal(perMillion)}/M` : `$${displayDecimal(value)}/token`;
    };
    rows.push({
      key: `${label.toLowerCase()}-price`, label: `${label} price / 1M tokens`,
      values: priceLabels(raw, compact, exact, (value) => `$${value}/token`),
      different: raw.some((value) => value !== raw[0]),
    });
  }
  add("context", "Context window (tokens)", (model) => getUsableContext(model) ?? null, formatTokens);
  add("max-output", "Max output (tokens)", (model) => tokens(model.top_provider?.max_completion_tokens), formatTokens);
  add("input-modalities", "Input types", (model) => modalities(model.architecture?.input_modalities), formatModality);
  add("output-modalities", "Output types", (model) => modalities(model.architecture?.output_modalities), formatModality);
  add("reasoning", "Reasoning", (model) => model.supported_parameters ? model.supported_parameters.some((value) => value === "reasoning" || value === "include_reasoning") : null, booleanLabel);
  add("tools", "Tool calling", (model) => model.supported_parameters ? model.supported_parameters.includes("tools") : null, booleanLabel);
  add("moderation", "Provider moderation", (model) => model.top_provider?.is_moderated ?? null, booleanLabel);
  add("prompt-training", "May train on prompts", (model) => model.mayTrainOnYourPrompts ?? null, booleanLabel);
  add("tokenizer", "Tokenizer", (model) => model.architecture?.tokenizer || null, (value) => value ?? "—");
  add("released", "Released (UTC)", (model) => releaseDate(model.created), (value) => value ?? "—");
  return rows;
}

export function getVisibleComparisonRows(models: Model[], workload?: CalculatorWorkload, fullSpecifications = true): ComparisonRow[] {
  const essential = ["provider", "input-price", "output-price", "context", "max-output", "input-modalities", "output-modalities", "reasoning", "tools"];
  const rows = comparisonRows(models).filter((row) => fullSpecifications || essential.includes(row.key));
  if (workload) {
    const totals = models.map((model) => calculateWorkloadCost(model.pricing, workload).total);
    rows.splice(3, 0, { key: "workload-cost", label: `Estimated ${workload.period === "month" ? "monthly" : "batch"} cost · USD${models.some((model) => (model.pricing?.discount ?? 0) > 0) ? " · pre-discount" : ""}`, values: priceLabels(totals, totals.map(formatCost), (value) => `$${displayDecimal(value)}`, (value) => `$${value}`), different: totals.some((value) => value !== totals[0]) });
    const fit = models.map((model) => getWorkloadSuitability(model, workload));
    rows.push({ key: "workload-fit", label: "Workload fit", values: fit.map((value) => value === "fits" ? "Fits published token limits" : value === "exceeds" ? "Exceeds limits · hypothetical cost" : "Limits unknown"), different: fit.some((value) => value !== fit[0]) });
  }
  return rows;
}
