import type { Model } from "./types";
import { parseRetirementDate } from "./model-retirement";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const optionalString = (value: unknown) => value == null || typeof value === "string";
const optionalBoolean = (value: unknown) => value == null || typeof value === "boolean";
const optionalNumber = (value: unknown, max = Infinity, integer = false) => value == null ||
  (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max && (!integer || Number.isSafeInteger(value)));
const optionalDate = (value: unknown) => value == null || parseRetirementDate(value) !== null;
const optionalStrings = (value: unknown) => value == null || (Array.isArray(value) && value.every((item) => typeof item === "string"));
function fields(value: unknown, validators: Record<string, (value: unknown) => boolean>): boolean {
  return value == null || (object(value) && Object.entries(validators).every(([key, validate]) => validate(value[key])));
}
const tokens = (value: unknown) => optionalNumber(value, Number.MAX_SAFE_INTEGER, true);
const strings = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, optionalString]));
const scores = ["risk_score", "bias_score", "cbrn_score", "harmful_score", "insecure_code_score", "toxicity_score", "robustness_score", "jailbreak_score", "evasion_score", "safety_score", "nist_score", "owasp_score"];

export function parseModelsResponse(value: unknown): Model[] {
  if (!object(value) || !Array.isArray(value.data)) throw new Error("Invalid model catalog response");
  const ids = new Set<string>();
  for (const model of value.data) {
    if (!object(model) || typeof model.id !== "string" || !model.id.trim() || ids.has(model.id) || typeof model.name !== "string" || typeof model.description !== "string"
      || !optionalStrings(model.supported_parameters) || (!optionalStrings(model.default_parameters) && !object(model.default_parameters))
      || !tokens(model.context_length) || !optionalNumber(model.created, 8_640_000_000_000, true)
      || !optionalBoolean(model.isFree) || !optionalBoolean(model.mayTrainOnYourPrompts)
      || !optionalString(model.canonical_slug) || !optionalString(model.hugging_face_id) || !optionalDate(model.expiration_date)
      || !fields(model.architecture, { input_modalities: optionalStrings, output_modalities: optionalStrings, ...strings(["tokenizer", "modality", "instruct_type"]) })
      || !fields(model.top_provider, { is_moderated: optionalBoolean, context_length: tokens, max_completion_tokens: tokens })
      || !fields(model.pricing, { ...strings(["prompt", "completion", "input_cache_read", "input_cache_write", "request", "image", "web_search", "internal_reasoning"]), discount: (v) => optionalNumber(v, 100) })
      || !fields(model.autoRouting, { models: optionalStrings })
      || !fields(model.terminalBench, { overallScore: (v) => optionalNumber(v, 1), avgAttemptCostUsd: (v) => optionalNumber(v) })
      || !fields(model.enkrypt, { ...strings(["model_name", "provider", "source", "freshness"]), ...Object.fromEntries(scores.map((key) => [key, (v: unknown) => optionalNumber(v, 100)])), ingestedAt: optionalDate, evaluatedAt: optionalDate, lastCheckedAt: optionalDate, staleAfter: optionalDate })
      || !fields(model.opencode, { ...strings(["family", "prompt", "ai_sdk_provider"]), variants: (v) => v == null || (object(v) && Object.values(v).every((variant) => object(variant) && fields(variant.reasoning, { enabled: optionalBoolean, effort: optionalString }))) })) {
      throw new Error("Invalid model catalog entry");
    }
    ids.add(model.id);
  }
  return value.data as Model[];
}
