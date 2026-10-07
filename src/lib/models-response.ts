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
type Validators = Record<string, (value: unknown) => boolean>;
function fields(value: unknown, validators: Validators, fail: (field: string) => never, path = ""): void {
  if (value == null) return;
  if (!object(value)) fail(path || "entry");
  for (const [key, validate] of Object.entries(validators)) {
    if (!validate(value[key])) fail(path ? `${path}.${key}` : key);
  }
}
const tokens = (value: unknown) => optionalNumber(value, Number.MAX_SAFE_INTEGER, true);
const strings = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, optionalString]));
const scores = ["risk_score", "bias_score", "cbrn_score", "harmful_score", "insecure_code_score", "toxicity_score", "robustness_score", "jailbreak_score", "evasion_score", "safety_score", "nist_score", "owasp_score"];

/** Only entry identity and field names cross the diagnostic boundary, never values. */
export class ModelCatalogValidationError extends Error {
  readonly modelId: string | null;
  constructor(readonly index: number | null, modelId: unknown, readonly field: string) {
    const safeId = typeof modelId === "string" ? modelId.replace(/[^a-zA-Z0-9_./:%+@-]/g, "?").slice(0, 120) : null;
    super(index === null ? `Invalid model catalog response: ${field}`
      : `Invalid model catalog entry ${index}${safeId ? ` (${safeId})` : ""}: ${field}`);
    this.name = "ModelCatalogValidationError";
    this.modelId = safeId;
  }
}

export const MAX_CATALOG_DIAGNOSTICS = 10;

interface ParsedUpstreamCatalog {
  data: Model[];
  excludedCount: number;
  diagnostics: ModelCatalogValidationError[];
}

function parseCatalog(value: unknown, quarantine: boolean): ParsedUpstreamCatalog {
  if (!object(value) || !Array.isArray(value.data)) throw new ModelCatalogValidationError(null, null, "data");
  const ids = new Set<string>();
  const data: Model[] = [];
  const diagnostics: ModelCatalogValidationError[] = [];
  let excludedCount = 0;
  for (const [index, model] of value.data.entries()) {
    try {
      const fail: (field: string) => never = (field) => { throw new ModelCatalogValidationError(index, object(model) ? model.id : null, field); };
      if (!object(model)) fail("entry");
      fields(model, {
        id: (v) => typeof v === "string" && !!v.trim() && !ids.has(v),
        name: (v) => typeof v === "string", description: (v) => typeof v === "string",
        supported_parameters: optionalStrings, default_parameters: (v) => optionalStrings(v) || object(v),
        context_length: tokens, created: (v) => optionalNumber(v, 8_640_000_000_000, true),
        isFree: optionalBoolean, mayTrainOnYourPrompts: optionalBoolean,
        canonical_slug: optionalString, hugging_face_id: optionalString, expiration_date: optionalDate,
      }, fail);
      fields(model.architecture, { input_modalities: optionalStrings, output_modalities: optionalStrings, ...strings(["tokenizer", "modality", "instruct_type"]) }, fail, "architecture");
      fields(model.top_provider, { is_moderated: optionalBoolean, context_length: tokens, max_completion_tokens: tokens }, fail, "top_provider");
      fields(model.pricing, { ...strings(["prompt", "completion", "input_cache_read", "input_cache_write", "request", "image", "web_search", "internal_reasoning"]), discount: (v) => optionalNumber(v, 100) }, fail, "pricing");
      fields(model.autoRouting, { models: optionalStrings }, fail, "autoRouting");
      fields(model.terminalBench, { overallScore: (v) => optionalNumber(v, 1), avgAttemptCostUsd: (v) => optionalNumber(v) }, fail, "terminalBench");
      fields(model.enkrypt, { ...strings(["model_name", "provider", "source", "freshness"]), ...Object.fromEntries(scores.map((key) => [key, (v: unknown) => optionalNumber(v, 100)])), ingestedAt: optionalDate, evaluatedAt: optionalDate, lastCheckedAt: optionalDate, staleAfter: optionalDate }, fail, "enkrypt");
      fields(model.opencode, { ...strings(["family", "prompt", "ai_sdk_provider"]), variants: (v) => v == null || object(v) }, fail, "opencode");
      if (object(model.opencode) && object(model.opencode.variants)) {
        for (const [key, variant] of Object.entries(model.opencode.variants)) {
          const path = `opencode.variants.${key.replace(/[^a-zA-Z0-9_-]/g, "?").slice(0, 80)}`;
          if (!object(variant)) fail(path);
          fields(variant.reasoning, { enabled: optionalBoolean, effort: optionalString }, fail, `${path}.reasoning`);
        }
      }
      ids.add(model.id as string);
      data.push(model as unknown as Model);
    } catch (error) {
      if (!quarantine || !(error instanceof ModelCatalogValidationError)) throw error;
      excludedCount += 1;
      if (diagnostics.length < MAX_CATALOG_DIAGNOSTICS) diagnostics.push(error);
    }
  }
  if (value.data.length > 0 && data.length === 0) throw diagnostics[0];
  return { data, excludedCount, diagnostics };
}

/** Client responses remain strict: quarantining only belongs at the upstream boundary. */
export function parseModelsResponse(value: unknown): Model[] {
  return parseCatalog(value, false).data;
}

/** One malformed entry must not hide otherwise valid upstream models. */
export function parseUpstreamModelsResponse(value: unknown): ParsedUpstreamCatalog {
  return parseCatalog(value, true);
}
