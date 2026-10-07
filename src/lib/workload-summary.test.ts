import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_WORKLOAD } from "./calculator-workload";
import { advancedUsageSummary, workloadSummary, resetAdvancedUsage } from "./workload-summary";

test("batch summaries describe request count as a batch total", () => {
  assert.equal(workloadSummary(DEFAULT_WORKLOAD), "2,000 input · 500 output tokens/request · 1,000 requests (batch total)");
});

test("summaries describe exact advanced assumptions, omitting unused charges", () => {
  assert.equal(advancedUsageSummary(DEFAULT_WORKLOAD), "");
  const workload = { ...DEFAULT_WORKLOAD, period: "month" as const, cachePercent: 25.5, images: 2, searches: 1, cacheWriteTokens: 300 };
  assert.equal(advancedUsageSummary(workload), "Monthly · 25.5% cached · 2 images/request · 1 search/request · 300 cache-write tokens/request");
  assert.match(workloadSummary(workload), /2,000 input · 500 output tokens\/request · 1,000 requests\/month/);
  assert.match(workloadSummary(workload), /25.5% cached/);
});

test("clearing advanced usage preserves the three basic inputs", () => {
  assert.deepEqual(resetAdvancedUsage({ ...DEFAULT_WORKLOAD, inputTokens: 50, outputTokens: 10, requests: 7, period: "month", images: 2, cachePercent: 10 }), {
    ...DEFAULT_WORKLOAD, inputTokens: 50, outputTokens: 10, requests: 7,
  });
});
