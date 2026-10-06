import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateCost, tokenCount, formatCost } from "./cost-calculator";

test("charges tokens directly and includes request fees once per request", () => {
  const result = calculateCost({ prompt: "0.000003", completion: "0.000015", request: "0.01" }, 100000, 50000, 1000);
  assert.equal(result.inputCost, 0.3);
  assert.equal(result.outputCost, 0.75);
  assert.equal(result.perRequest, 1.06);
  assert.equal(result.total, 1060);
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
  assert.equal(tokenCount("1e3"), 1000);
  assert.equal(tokenCount("-2"), 0);
  assert.equal(tokenCount("Infinity", 1), 1);
  assert.equal(tokenCount("2.9"), 2);
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
