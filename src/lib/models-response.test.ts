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
