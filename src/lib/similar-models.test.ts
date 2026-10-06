import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getSimilarModels } from "./similar-models";
import type { Model } from "./types";

const source = {
  id: "a/source", name: "Source", context_length: 128000,
  architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
  pricing: { prompt: "0.000001", completion: "0.000002" }, supported_parameters: ["tools", "reasoning"],
} as Model;

test("alternatives favor compatible capabilities, context and price over API order", () => {
  const unrelated = { ...source, id: "a/unrelated", name: "Unrelated", architecture: { ...source.architecture, output_modalities: ["image"] } };
  const poor = { ...source, id: "a/poor", name: "Poor", context_length: 4000, pricing: { prompt: "0", completion: "0" }, supported_parameters: [] };
  const close = { ...source, id: "b/close", name: "Close", supported_parameters: ["include_reasoning", "tools"] };
  assert.deepEqual(getSimilarModels([source, unrelated, poor, close], source).map((m) => m.id), [close.id, poor.id]);
  assert.deepEqual(getSimilarModels([close, poor, source, unrelated], source).map((m) => m.id), [close.id, poor.id]);
});

test("unknown rates and limits produce a stable bounded shortlist with no duplicates", () => {
  const models = Array.from({ length: 8 }, (_, i) => ({ ...source, id: `b/${i}`, name: `Model ${i}`, pricing: undefined, context_length: NaN }) as unknown as Model);
  assert.equal(getSimilarModels([...models, ...models], source).length, 6);
  assert.equal(new Set(getSimilarModels([...models, ...models], source).map((m) => m.id)).size, 6);
  assert.equal(getSimilarModels([], source).length, 0);
});
