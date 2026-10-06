import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getCapabilityData, getPricingData } from "./chart-data";
import type { Model } from "./types";

const models = ["0.000002", "0.000006", "-1"].map((prompt, index) => ({ id: `test/${index}`, name: `Model ${index}`, context_length: 1000, pricing: { prompt, completion: prompt }, supported_parameters: [] } as unknown as Model));
test("price charts use per-million units and preserve unavailable rates", () => {
  assert.deepEqual(getPricingData(models).map((row) => row.prompt), [2, 6, null]);
});
test("radar has capability axes and bounded scores for one or many models", () => {
  const rows = getCapabilityData(models);
  assert.deepEqual(rows.map((row) => row.capability), ["Context", "Max output", "Low input price", "Parameters"]);
  assert.equal(rows[2].model0, 100);
  assert.equal(rows[2].model1, 0);
  assert.equal(rows[2].model2, null);
  assert.equal(getCapabilityData([models[0]])[2].model0, 100);
  assert.equal(getCapabilityData([{ ...models[0], pricing: { prompt: "0", completion: "0" } }])[2].model0, 100);
  for (const row of rows) for (const [key, value] of Object.entries(row)) if (key !== "capability" && value !== null) assert.ok(typeof value === "number" && value >= 0 && value <= 100);
});
