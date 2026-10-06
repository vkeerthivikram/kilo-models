import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Model } from "./types";
import { getComparisonRows } from "./comparison";
import { parseComparisonIds } from "./comparison-storage";

export const firstModel: Model = {
  id: "test/first", name: "First model", description: "Test model", created: 0,
  architecture: { input_modalities: ["text", "image"], output_modalities: ["text"], tokenizer: "test" },
  top_provider: { is_moderated: false, context_length: 1000, max_completion_tokens: 100 },
  pricing: { prompt: "0", completion: "0.000003" }, context_length: 1000,
  supported_parameters: ["tools", "reasoning"], opencode: {}, preferredIndex: 0, isFree: false,
};

test("comparison keeps free and missing prices distinct and compares exact values", () => {
  const second = { ...firstModel, id: "test/second", pricing: { prompt: undefined, completion: "0.000003001" } } as unknown as Model;
  const rows = getComparisonRows([firstModel, second]);
  const input = rows.find((row) => row.key === "input-price");
  const output = rows.find((row) => row.key === "output-price");
  assert.deepEqual(input?.values, ["Free", "—"]);
  assert.equal(input?.different, true);
  assert.deepEqual(output?.values, ["$3/M", "$3/M"]);
  assert.equal(output?.different, true);
});

test("saved comparison accepts only unique IDs, respects the limit, and handles corrupt storage", () => {
  assert.deepEqual(parseComparisonIds('{broken'), []);
  assert.deepEqual(parseComparisonIds('{"id":"test/first"}'), []);
  assert.deepEqual(parseComparisonIds('[null, 12, "", "test/first", "test/first", "test/second"]'), ["test/first", "test/second"]);
  assert.deepEqual(parseComparisonIds(JSON.stringify(Array.from({ length: 12 }, (_, index) => `test/${index}`))),
    ["test/0", "test/1", "test/2", "test/3", "test/4", "test/5", "test/6", "test/7", "test/8", "test/9"]);
});

test("equivalent modalities and reasoning aliases do not create differences", () => {
  const second = { ...firstModel, id: "test/second", architecture: { ...firstModel.architecture, input_modalities: ["image", "text", "text"] }, supported_parameters: ["include_reasoning", "tools"] };
  assert.equal(getComparisonRows([firstModel, second]).filter((row) => row.different).length, 0);
  assert.equal(getComparisonRows([firstModel]).filter((row) => row.different).length, 0);
});

test("missing metadata stays unknown and invalid release dates do not break comparison", () => {
  const incomplete = { ...firstModel, created: Infinity, context_length: 0, top_provider: undefined, architecture: undefined, supported_parameters: undefined } as unknown as Model;
  const rows = getComparisonRows([incomplete]);
  assert.deepEqual(rows.find((row) => row.key === "released")?.values, ["—"]);
  assert.deepEqual(rows.find((row) => row.key === "context")?.values, ["—"]);
  assert.deepEqual(rows.find((row) => row.key === "moderation")?.values, ["Unknown"]);
  assert.deepEqual(rows.find((row) => row.key === "input-modalities")?.values, ["Unknown"]);
  assert.deepEqual(rows.find((row) => row.key === "reasoning")?.values, ["Unknown"]);
});
