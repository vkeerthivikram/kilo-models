import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateCost, calculateWorkloadCost, formatCost } from "./cost-calculator";
import { DEFAULT_WORKLOAD, getBillingWarnings } from "./calculator-workload";
import { parseModelsResponse } from "./models-response";

test("nullable catalog request fees are absent and do not poison token estimates", () => {
  const [model] = parseModelsResponse({ data: [{ id: "test/null-fee", name: "Null fee", description: "", pricing: { prompt: "0.004", completion: "0.008", request: null } }] });
  const result = calculateCost(model.pricing, 100, 10, 2);
  assert.equal(result.requestCost, 0);
  assert.ok(Math.abs(result.total! - 0.96) < 1e-12);
});

test("expanded billing replaces cache-write input and adds search charges", () => {
  const result = calculateCost({ prompt: "0.004", completion: "0.008", input_cache_read: "0.001", input_cache_write: "0.005", image: "0.03", web_search: "0.02", request: "0.01" }, 100, 10, 2, 50, { cacheWriteTokens: 20, searches: 3 });
  // 30 regular + 50 cache-read + 20 cache-write input tokens.
  assert.ok(Math.abs(result.inputCost! - 0.27) < 1e-12);
  assert.equal(result.cacheWriteCost, 0.1);
  assert.equal(result.uncachedCost, 0.12);
  assert.equal(result.imageCost, 0);
  assert.equal(result.searchCost, 0.06);
  assert.ok(Math.abs(result.total! - 0.84) < 1e-12);
});

test("image usage cannot produce a total from a rate with an unverified unit", () => {
  const pricing = { prompt: "0.000003", completion: "0.000015", image: "0.0000015" };
  const imageWorkload = { ...DEFAULT_WORKLOAD, images: 5 };
  const result = calculateWorkloadCost(pricing, imageWorkload);
  assert.equal(result.imageCost, null);
  assert.equal(result.total, null);
  assert.match(getBillingWarnings(pricing, imageWorkload).join(" "), /image rate.*unverified billing unit/i);
  assert.ok(calculateWorkloadCost(pricing, DEFAULT_WORKLOAD).total! > 0);
});

test("large costs use grouped digits or compact exponential notation", () => {
  assert.equal(formatCost(2_001_000_000), "$2,001,000,000.0000");
  assert.equal(formatCost(2.433889152440001e26), "$2.43e+26");
});

test("extra billing requires a rate only for units actually used and rejects overlapping cache input", () => {
  const prices = { prompt: "0", completion: "0" };
  assert.equal(calculateCost(prices, 100, 0, 1, 0, { images: 0, searches: 0, cacheWriteTokens: 0 }).total, 0);
  for (const extras of [{ images: 1 }, { searches: 1 }, { cacheWriteTokens: 1 }, { images: -1 }, { searches: 0.5 }]) {
    assert.equal(calculateCost(prices, 100, 0, 1, 0, extras).total, null);
  }
  assert.equal(calculateCost({ ...prices, input_cache_read: "0", input_cache_write: "0" }, 100, 0, 1, 50, { cacheWriteTokens: 51 }).total, null);
});

test("charges tokens directly and includes request fees once per request", () => {
  const result = calculateCost({ prompt: "0.000003", completion: "0.000015", request: "0.01" }, 100000, 50000, 1000);
  assert.equal(result.inputCost, 0.3);
  assert.equal(result.outputCost, 0.75);
  assert.equal(result.perRequest, 1.06);
  assert.equal(result.total, 1060);
});
test("billing and cost agree when cached tokens round up at the overlap boundary", () => {
  const workload = { ...DEFAULT_WORKLOAD, inputTokens: 50, outputTokens: 0, requests: 1, cachePercent: 29, cacheWriteTokens: 36 };
  const pricing = { prompt: "1", completion: "0", input_cache_read: "1", input_cache_write: "1" };
  assert.equal(calculateWorkloadCost(pricing, workload).total, null);
  assert.match(getBillingWarnings(pricing, workload).join(" "), /Cache reads and writes exceed/);
  const fits = { ...workload, cacheWriteTokens: 35 };
  assert.equal(calculateWorkloadCost(pricing, fits).total, 50);
  assert.deepEqual(getBillingWarnings(pricing, fits), []);
});

test("unknown prices remain unavailable unless no tokens are used", () => {
  assert.equal(calculateCost(undefined, 1, 1, 10).total, null);
  assert.equal(calculateCost(undefined, 0, 0, 10).total, 0);
  assert.equal(calculateCost({ prompt: "0", completion: "-1" }, 1, 1, 10).total, null);
});
test("invalid workloads and arithmetic overflow never display NaN or Infinity", () => {
  assert.equal(calculateCost({ prompt: "1e308", completion: "0" }, 2, 0, 1).total, null);
  assert.equal(calculateCost({ prompt: "0", completion: "0" }, -1, 0, 1).total, null);
  assert.equal(calculateCost({ prompt: "0", completion: "0" }, 1, 0, Infinity).total, null);
  assert.equal(formatCost(Infinity), "Unavailable");
});

test("cached input replaces the regular input charge rather than adding to it", () => {
  const prices = { prompt: "0.000004", completion: "0.000008", input_cache_read: "0.000001", request: "0.01" };
  const result = calculateCost(prices, 2000, 500, 1000, 50);
  assert.equal(result.inputCost, 0.005);
  assert.equal(result.cacheReadCost, 0.001);
  assert.ok(Math.abs(result.perRequest! - 0.019) < 1e-12);
  assert.ok(Math.abs(result.total! - 19) < 1e-10);
  assert.equal(calculateCost({ prompt: "0.000004", completion: "0" }, 100, 0, 1, 50).total, null);
  assert.equal(calculateCost(prices, 100, 0, 1, 101).total, null);
  assert.equal(calculateCost(prices, 100, 0, 1, NaN).total, null);
});
