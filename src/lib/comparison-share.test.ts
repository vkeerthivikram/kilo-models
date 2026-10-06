import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Model } from "./types";
import { buildComparisonUrl, comparisonCsv, csvCell, parseSharedComparison, resolveComparisonSelection } from "./comparison-share";

const model: Model = {
  id: "provider/model:free", name: "Example, model", description: 'Two lines\nwith "quotes"', created: 0,
  architecture: { input_modalities: ["text", "image"], output_modalities: ["text"], tokenizer: "test" },
  top_provider: { is_moderated: false, context_length: 1000, max_completion_tokens: 100 },
  pricing: { prompt: "0.000003", completion: "0.000015", request: "0.01" }, context_length: 1000,
  supported_parameters: ["tools"], opencode: {}, preferredIndex: 0, isFree: false,
};
const workload = { inputTokens: 100000, outputTokens: 50000, requests: 1000, period: "month" as const, cachePercent: 0 };

test("shared selection is distinct from absent selection, validates, deduplicates and caps IDs", () => {
  assert.equal(parseSharedComparison("?search=x"), null);
  assert.deepEqual(parseSharedComparison("?compare="), []);
  assert.deepEqual(parseSharedComparison("?compare=provider%2Fone%2Cprovider%2Fone%2Cprovider%2Ftwo"), ["provider/one", "provider/two"]);
  assert.deepEqual(parseSharedComparison("?compare=%E0%A4%2Chello%00%2Cprovider%2Fgood"), ["provider/good"]);
  assert.equal(parseSharedComparison(`?compare=${Array.from({ length: 12 }, (_, i) => `provider/${i}`).join(",")}`)?.length, 10);
});

test("real catalog IDs with a leading tilde or literal percent round trip through URL encoding", () => {
  const ids = ["~anthropic/claude-haiku-latest", "provider/model%variant"];
  const url = new URL(buildComparisonUrl("https://example.test/", ids, workload));
  assert.deepEqual(parseSharedComparison(url.search), ids);
  assert.deepEqual(resolveComparisonSelection(url.search, [], ids.map((id) => ({ ...model, id }))), ids);
});

test("URL selection overrides storage, including empty and unknown IDs", () => {
  const catalog = [model];
  assert.deepEqual(resolveComparisonSelection("?compare=missing%2Fmodel", [model.id], catalog), []);
  assert.deepEqual(resolveComparisonSelection("?compare=", [model.id], catalog), []);
  assert.deepEqual(resolveComparisonSelection("", [model.id, "missing/model"], catalog), [model.id]);
});

test("comparison URL round trips exact IDs and every workload field while preserving filters", () => {
  const url = new URL(buildComparisonUrl("https://example.test/?search=hello&compare=old", [model.id, model.id], workload));
  assert.deepEqual(parseSharedComparison(url.search), [model.id]);
  assert.equal(url.searchParams.get("search"), "hello");
  for (const [key, value] of Object.entries(workload)) assert.equal(url.searchParams.get(key), String(value));
  assert.deepEqual(parseSharedComparison(new URL(buildComparisonUrl(url.href, [], workload)).search), []);
});

test("CSV quotes commas, newlines and quotes, and neutralizes formula-like cells", () => {
  assert.equal(csvCell('Two, lines\nwith "quotes"'), '"Two, lines\nwith ""quotes"""');
  for (const value of ["=SUM(A1:A2)", "+cmd", "-cmd", "@cmd", " \t=cmd", "\rtext"]) {
    assert.equal(csvCell(value).startsWith('"\''), true);
  }
  assert.equal(csvCell("provider/model:free"), '"provider/model:free"');
});

test("export contains raw specifications and an independently worked monthly workload estimate", () => {
  const csv = comparisonCsv([model], workload);
  assert.equal(csv.includes('"Model ID"'), true);
  assert.equal(csv.includes('"provider/model:free"'), true);
  assert.equal(csv.includes('"0.000003"'), true);
  assert.equal(csv.includes('"Two lines\nwith ""quotes"""'), true);
  assert.equal(csv.includes('"1060"'), true);
  assert.equal(csv.includes('"month"'), true);
  assert.equal(csv.includes('"100000"'), true);
});

test("missing prices are exported as unavailable, and malicious model strings stay inert", () => {
  const csv = comparisonCsv([{ ...model, id: "=cmd", name: "@SUM(A1)", pricing: { prompt: "-1", completion: "0" } }], workload);
  assert.equal(csv.includes('"Unavailable"'), true);
  assert.equal(csv.includes('"\'=cmd"'), true);
  assert.equal(csv.includes('"\'@SUM(A1)"'), true);
});

test("cached workload exports its actual estimate and marks hypothetical requests above model limits", () => {
  const csv = comparisonCsv([{ ...model, pricing: { prompt: "0.000004", completion: "0.000008", input_cache_read: "0.000001", request: "0.01" } }],
    { inputTokens: 2000, outputTokens: 500, requests: 1000, period: "batch", cachePercent: 50 });
  assert.equal(csv.includes('"19"'), true);
  assert.equal(csv.includes('"Feasibility"'), true);
  assert.equal(csv.includes('"Hypothetical estimate"'), true);
  assert.equal(csv.includes("completion limit"), true);
  assert.equal(csv.includes("context limit"), true);
});
