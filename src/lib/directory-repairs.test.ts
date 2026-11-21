import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateWorkloadCost } from "./cost-calculator";
import { DEFAULT_WORKLOAD, getBillingWarnings, getWorkloadSuitability } from "./calculator-workload";
import { getVisibleComparisonRows } from "./comparison";
import { getFilterCounts, matchesModelFilters, type ModelFilterCriteria } from "./model-filtering";
import { formatCost } from "./cost-calculator";
import { catalog } from "../../e2e/catalog";
import type { ModelPricing } from "./types";

const criteria: ModelFilterCriteria = {
  search: "", free: false, inputModalities: [], outputModalities: [], providers: [],
  reasoning: false, tools: false, fav: false, minContext: 1_000_000, maxInputPrice: null, maxOutputPrice: null,
};

test("directory context filtering and comparison use the same limit as the calculator", () => {
  const model = {
    ...catalog[0], context_length: 1_024_000,
    top_provider: { ...catalog[0].top_provider, context_length: 262_144 },
  };
  assert.equal(getWorkloadSuitability(model, { ...DEFAULT_WORKLOAD, inputTokens: 500_000 }), "exceeds");
  assert.equal(matchesModelFilters(model, criteria, []), false);
  assert.equal(matchesModelFilters(model, { ...criteria, minContext: 262_144 }, []), true);
  assert.equal(getVisibleComparisonRows([model]).find(({ key }) => key === "context")?.values[0], "262,144");
  assert.equal(matchesModelFilters({ ...model, context_length: 0 }, { ...criteria, minContext: 262_144 }, []), true);
  assert.equal(matchesModelFilters({ ...model, top_provider: { ...model.top_provider, context_length: 0 } }, criteria, []), true);
});

test("visible comparison prices and totals distinguish actual differences behind identical compact labels", () => {
  const first = { ...catalog[0], pricing: { prompt: "0.000003", completion: "0.000003" } };
  const second = { ...catalog[1], pricing: { prompt: "0.000003001", completion: "0.000003001" } };
  const rows = getVisibleComparisonRows([first, second]);
  for (const key of ["input-price", "output-price"]) {
    assert.deepEqual(rows.find((row) => row.key === key)?.values, ["$3/M", "$3.001/M"]);
  }
  const costWorkload = { ...DEFAULT_WORKLOAD, inputTokens: 100, outputTokens: 0, requests: 1000 };
  assert.equal(formatCost(calculateWorkloadCost(first.pricing, costWorkload).total), "$0.3000");
  assert.equal(formatCost(calculateWorkloadCost(second.pricing, costWorkload).total), "$0.3001");
  const close = { ...second, pricing: { ...second.pricing, prompt: "0.0000030001" } };
  assert.equal(formatCost(calculateWorkloadCost(close.pricing, costWorkload).total), "$0.3000");
  const cost = getVisibleComparisonRows([first, close], costWorkload).find(({ key }) => key === "workload-cost");
  assert.equal(cost?.different, true);
  assert.deepEqual(cost?.values, ["$0.3", "$0.30001"]);
});

test("100 percent cache excludes every input token from regular billing", () => {
  const workload = { ...DEFAULT_WORKLOAD, inputTokens: 9007199254740990, outputTokens: 0, requests: 1, cachePercent: 100 };
  const pricing = { input_cache_read: "0" } as ModelPricing;
  assert.equal(calculateWorkloadCost(pricing, workload).total, 0);
  assert.deepEqual(getBillingWarnings(pricing, workload), []);
  assert.equal(matchesModelFilters({ ...catalog[0], pricing }, { ...criteria, minContext: null, workload, maxBudget: 0 }, []), true);
});

test("canonical and legacy alias provider filters both include the same model IDs", () => {
  const model = { ...catalog[0], id: "~openai/sol-latest" };
  const exact = { ...catalog[1], id: "openai/sol" };
  const defaults = { ...criteria, minContext: null };
  for (const provider of ["openai", "~openai"]) {
    assert.equal(matchesModelFilters(model, { ...defaults, providers: [provider] }, []), true);
    assert.equal(matchesModelFilters(exact, { ...defaults, providers: [provider] }, []), true);
  }
  assert.deepEqual({ ...getFilterCounts([model, exact], defaults, []).providers }, { openai: 2 });
  const provider = getVisibleComparisonRows([model, exact]).find((row) => row.key === "provider");
  assert.deepEqual(provider?.values, ["openai", "openai"]);
});
