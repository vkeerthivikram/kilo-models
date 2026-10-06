import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_WORKLOAD, parseCalculatorWorkload, getWorkloadWarnings, WORKLOAD_PRESETS, buildWorkloadHref } from "./calculator-workload";
import type { Model } from "./types";

test("shared workloads preserve monthly volume and cached input, with safe defaults", () => {
  assert.deepEqual(parseCalculatorWorkload("?inputTokens=5000&outputTokens=200&requests=3000&period=month&cachePercent=50"), {
    inputTokens: 5000, outputTokens: 200, requests: 3000, period: "month", cachePercent: 50, images: 0, searches: 0, cacheWriteTokens: 0,
  });
  assert.deepEqual(parseCalculatorWorkload("?inputTokens=abc&outputTokens=-3&requests=0&period=year&cachePercent=101"), DEFAULT_WORKLOAD);
  assert.equal(parseCalculatorWorkload("?inputTokens=0&outputTokens=0&cachePercent=0").inputTokens, 0);
});

test("navigation carries current workload without losing directory filters or hash", () => {
  const href = buildWorkloadHref("/?search=code&page=2&inputTokens=8000&images=4#directory", { ...DEFAULT_WORKLOAD, inputTokens: 50000, searches: 2 });
  const url = new URL(href, "https://example.test");
  assert.equal(url.searchParams.get("search"), "code");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.hash, "#directory");
  assert.deepEqual(parseCalculatorWorkload(url.search), { ...DEFAULT_WORKLOAD, inputTokens: 50000, searches: 2 });
  assert.equal(buildWorkloadHref("/", DEFAULT_WORKLOAD), "/");
});

test("additional usage round trips and malformed counts fall back to zero", () => {
  const result = parseCalculatorWorkload("?images=2&searches=3&cacheWriteTokens=500");
  assert.equal(result.images, 2);
  assert.equal(result.searches, 3);
  assert.equal(result.cacheWriteTokens, 500);
  for (const value of ["-1", "0.5", "NaN", "Infinity", "9007199254740992"]) {
    const invalid = parseCalculatorWorkload(`?images=${value}&searches=${value}&cacheWriteTokens=${value}`);
    assert.equal(invalid.images + invalid.searches + invalid.cacheWriteTokens, 0);
  }
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
