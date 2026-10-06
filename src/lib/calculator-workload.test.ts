import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_WORKLOAD, parseCalculatorWorkload, getWorkloadWarnings, WORKLOAD_PRESETS } from "./calculator-workload";
import type { Model } from "./types";

test("shared workloads preserve monthly volume and cached input, with safe defaults", () => {
  assert.deepEqual(parseCalculatorWorkload("?inputTokens=5000&outputTokens=200&requests=3000&period=month&cachePercent=50"), {
    inputTokens: 5000, outputTokens: 200, requests: 3000, period: "month", cachePercent: 50,
  });
  assert.deepEqual(parseCalculatorWorkload("?inputTokens=abc&outputTokens=-3&requests=0&period=year&cachePercent=101"), DEFAULT_WORKLOAD);
  assert.equal(parseCalculatorWorkload("?inputTokens=0&outputTokens=0&cachePercent=0").inputTokens, 0);
});

test("workload warnings catch output and combined context limits, including provider caps", () => {
  const model = { context_length: 262144, top_provider: { context_length: 200000, max_completion_tokens: 32768 } } as Model;
  const warnings = getWorkloadWarnings(model, { ...DEFAULT_WORKLOAD, inputTokens: 180000, outputTokens: 50000 });
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /32,768/);
  assert.match(warnings[1], /200,000/);
  assert.equal(getWorkloadWarnings(model, { ...DEFAULT_WORKLOAD, inputTokens: 190000, outputTokens: 10000 }).length, 0);
  assert.equal(getWorkloadWarnings({} as Model, DEFAULT_WORKLOAD).length, 0);
  assert.ok(WORKLOAD_PRESETS.every((preset) => preset.outputTokens < 32768));
});
