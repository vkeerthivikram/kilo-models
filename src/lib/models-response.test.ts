import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseModelsResponse } from "./models-response";

test("malformed catalogs fail at the boundary instead of crashing rendering", () => {
  for (const value of [null, {}, { data: {} }, { data: [null] }, { data: [{ id: "x", name: 4 }] }, { data: [{ id: "x", name: "X", description: "", architecture: { input_modalities: {} } }] }]) assert.throws(() => parseModelsResponse(value));
  assert.deepEqual(parseModelsResponse({ data: [] }), []);
});

test("accepts object-shaped defaults used by the live catalog", () => {
  const model = { id: "test/model", name: "Test", description: "", default_parameters: { temperature: 0.7 } };
  assert.equal(parseModelsResponse({ data: [model] })[0].id, "test/model");
});

test("rejects unsafe optional metadata before it reaches formatters", () => {
  const base = { id: "test/model", name: "Test", description: "" };
  for (const extra of [
    { enkrypt: { risk_score: "12" } }, { enkrypt: { safety_score: Infinity } },
    { enkrypt: { bias_score: -1 } }, { enkrypt: { risk_score: 101 } },
    { enkrypt: { provider: {} } }, { terminalBench: { overallScore: 1.2 } },
    { terminalBench: { avgAttemptCostUsd: -1 } }, { top_provider: [] },
    { top_provider: { is_moderated: "true" } }, { architecture: { tokenizer: {} } },
    { opencode: { variants: { high: { reasoning: { effort: {} } } } } },
    { pricing: { prompt: {} } }, { context_length: NaN }, { created: 9e12 },
    { expiration_date: "2026-02-30" }, { created: "yesterday" },
    { enkrypt: { evaluatedAt: "not a date" } }, { isFree: "false" },
  ]) assert.throws(() => parseModelsResponse({ data: [{ ...base, ...extra }] }));
});

test("accepts null and missing optional metadata, zero scores, and unknown pricing sentinel", () => {
  const model = { id: "test/model", name: "Test", description: "", created: 0,
    expiration_date: "2026-10-31", pricing: { prompt: "-1", completion: "0", discount: 25 },
    enkrypt: { risk_score: 0, robustness_score: null, evaluatedAt: null },
    terminalBench: { overallScore: 0.5, avgAttemptCostUsd: 0 },
    opencode: { variants: { high: { reasoning: { enabled: true, effort: "high" } } } },
  };
  assert.equal(parseModelsResponse({ data: [model] })[0].id, model.id);
});
