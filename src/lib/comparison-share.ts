import type { Model } from "./types";
import { getWorkloadWarnings, type CalculatorWorkload } from "./calculator-workload";
import { COMPARE_LIMIT, parsePrice } from "./format-price";
import { calculateWorkloadCost } from "./cost-calculator";

function validIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => /^[^\s,\u0000-\u001f\u007f\ufffd]{1,512}$/.test(id)))].slice(0, COMPARE_LIMIT);
}

/** null means no shared selection; an empty array deliberately overrides storage. */
export function parseSharedComparison(search: string): string[] | null {
  const params = new URLSearchParams(search);
  if (!params.has("compare")) return null;
  return validIds((params.get("compare") ?? "").split(","));
}

export function resolveComparisonSelection(search: string, savedIds: string[], models: Model[]): string[] {
  const catalogIds = new Set(models.map((model) => model.id));
  return (parseSharedComparison(search) ?? validIds(savedIds)).filter((id) => catalogIds.has(id));
}

export function buildComparisonUrl(baseUrl: string, ids: string[], workload: CalculatorWorkload): string {
  const url = new URL(baseUrl);
  // Keep an explicit empty value so clearing a shared comparison cannot restore storage.
  url.searchParams.set("compare", validIds(ids).join(","));
  for (const [key, value] of Object.entries(workload)) url.searchParams.set(key, String(value));
  return url.href;
}

export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value == null ? "Unavailable" : String(value);
  // Quote escaping alone does not stop spreadsheet programs evaluating formulas.
  if (/^[\t\r\n]/.test(text) || /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function comparisonCsv(models: Model[], workload: CalculatorWorkload): string {
  const headers = [
    "Model ID", "Model name", "Description", "Provider", "Context window (tokens)", "Maximum output (tokens)",
    "Input modalities", "Output modalities", "Tokenizer", "Supported parameters", "Provider moderated", "May train on prompts",
    "Input price (USD/token)", "Output price (USD/token)", "Cache read price (USD/token)", "Cache write price (USD/token)", "Request fee (USD)",
    "Input tokens/request", "Output tokens/request", "Requests", "Period", "Cached input (%)",
    "Images/request", "Searches/request", "Cache-write tokens/request", "Image price (USD/image)", "Search price (USD/search)",
    "Cache-write cost/request (USD)", "Image cost/request (USD)", "Search cost/request (USD)",
    "Input cost/request (USD)", "Output cost/request (USD)", "Request cost (USD)", "Total cost/request (USD)", "Workload cost (USD)", "Feasibility", "Limit warnings", "Discount treatment",
  ];
  const rows = models.map((model) => {
    const costs = calculateWorkloadCost(model.pricing, workload);
    const warnings = getWorkloadWarnings(model, workload);
    const cost = (value: number | null) => value === null ? null : Number(value.toPrecision(15));
    return [
      model.id, model.name, model.description, model.id.split("/")[0], model.context_length, model.top_provider?.max_completion_tokens,
      model.architecture?.input_modalities?.join(", "), model.architecture?.output_modalities?.join(", "), model.architecture?.tokenizer,
      model.supported_parameters?.join(", "), model.top_provider?.is_moderated, model.mayTrainOnYourPrompts,
      parsePrice(model.pricing?.prompt), parsePrice(model.pricing?.completion), parsePrice(model.pricing?.input_cache_read),
      parsePrice(model.pricing?.input_cache_write), costs.requestCost,
      workload.inputTokens, workload.outputTokens, workload.requests, workload.period, workload.cachePercent,
      workload.images, workload.searches, workload.cacheWriteTokens, parsePrice(model.pricing?.image), parsePrice(model.pricing?.web_search),
      cost(costs.cacheWriteCost), cost(costs.imageCost), cost(costs.searchCost),
      cost(costs.inputCost), cost(costs.outputCost), cost(costs.requestCost), cost(costs.perRequest), cost(costs.total),
      warnings.length ? "Hypothetical estimate" : "No reported limit exceeded", warnings.join(" "),
      (model.pricing?.discount ?? 0) > 0 ? "Pre-discount estimate; listed discount not applied" : "No listed discount",
    ];
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
