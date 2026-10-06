import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { Model } from "../lib/types";
import { useModelFilters } from "./use-model-filters";

const models: Model[] = Array.from({ length: 30 }, (_, index) => ({
  id: `test/model-${index}`,
  name: `Model ${String(index).padStart(2, "0")}`,
  description: "A test model",
  created: index,
  architecture: { input_modalities: ["text"], output_modalities: ["text"], tokenizer: "test" },
  top_provider: { is_moderated: false, context_length: 1000, max_completion_tokens: 100 },
  pricing: { prompt: "0", completion: "0" },
  context_length: 1000,
  supported_parameters: [],
  opencode: {},
  preferredIndex: 0,
  isFree: true,
}));

function inspect(searchParams: string, favorites: string[] = [], catalog: Model[] = models) {
  let result: ReturnType<typeof useModelFilters> | undefined;
  function Probe() {
    result = useModelFilters(catalog, favorites);
    return null;
  }
  renderToStaticMarkup(<NuqsTestingAdapter searchParams={searchParams}><Probe /></NuqsTestingAdapter>);
  assert.ok(result);
  return result;
}

test("favorites filter runs before pagination", () => {
  const result = inspect("?fav=true&page=2", ["test/model-29"]);
  assert.equal(result.sortedModels.length, 1);
  assert.equal(result.page, 1);
  assert.equal(result.paginatedModels[0]?.id, "test/model-29");
});

test("unknown prices sort after known prices in either direction", () => {
  const catalog = ["-1", "0", "0.000003"].map((prompt, index) => ({ ...models[index], pricing: { prompt, completion: "0" } }));
  assert.deepEqual(inspect("?sort=price-asc", [], catalog).sortedModels.map((m) => m.pricing.prompt), ["0", "0.000003", "-1"]);
  assert.deepEqual(inspect("?sort=price-desc", [], catalog).sortedModels.map((m) => m.pricing.prompt), ["0.000003", "0", "-1"]);
});

test("empty favorites has no results", () => {
  assert.equal(inspect("?fav=true").sortedModels.length, 0);
});

test("favorites tab does not count as a removable model filter", () => {
  assert.equal(inspect("?fav=true").activeFilterCount, 0);
  assert.equal(inspect("?fav=true&free=true&reasoning=true").activeFilterCount, 2);
});

test("page stays within available results", () => {
  assert.equal(inspect("?page=-2").page, 1);
  assert.equal(inspect("?page=999").page, 2);
});

test("ordinary browsing preserves all models and URL view", () => {
  const result = inspect("?view=list");
  assert.equal(result.sortedModels.length, 30);
  assert.equal(result.paginatedModels.length, 24);
  assert.equal(result.view, "list");
});

test("retirement visibility is URL state and counts as a removable filter", () => {
  assert.equal(inspect("?hideRetired=true").hideRetired, true);
  assert.equal(inspect("?hideRetired=true").activeFilterCount, 1);
  assert.equal(inspect("").hideRetired, false);
  assert.equal(inspect("?hideRetired=garbage").hideRetired, false);
});

test("numeric filters use tokens and USD per million tokens with inclusive limits", () => {
  const catalog = [
    { ...models[0], context_length: 128000, pricing: { prompt: "0.000002", completion: "0.000008" } },
    { ...models[1], context_length: 64000, pricing: { prompt: "0", completion: "0" } },
    { ...models[2], context_length: 256000, pricing: { prompt: "0.000003", completion: "0.000010" } },
  ];
  assert.deepEqual(inspect("?minContext=128000&maxInputPrice=2&maxOutputPrice=8", [], catalog).sortedModels.map((model) => model.id), [models[0].id]);
});

test("zero price limits accept free rates and exclude unknown or paid rates", () => {
  const catalog = ["0", "-1", "", "NaN", "0.000001"].map((prompt, index) => ({ ...models[index], pricing: { prompt, completion: prompt } }));
  assert.deepEqual(inspect("?maxInputPrice=0&maxOutputPrice=0", [], catalog).sortedModels.map((model) => model.id), [models[0].id]);
  assert.equal(inspect("?maxInputPrice=0&maxOutputPrice=0", [], catalog).activeFilterCount, 2);
});

test("a decimal price cap includes the exact per-million rate", () => {
  const catalog = [{ ...models[0], pricing: { prompt: "0.00000097", completion: "0.00000097" } }];
  assert.equal(inspect("?maxInputPrice=0.97&maxOutputPrice=0.97", [], catalog).sortedModels.length, 1);
});

test("invalid numeric URL filters are ignored instead of hiding the catalog", () => {
  for (const invalid of ["-1", "NaN", "Infinity", "1e999", "garbage", "1usd", "0x10"]) {
    const result = inspect(`?minContext=${invalid}&maxInputPrice=${invalid}&maxOutputPrice=${invalid}`);
    assert.equal(result.sortedModels.length, models.length);
    assert.equal(result.activeFilterCount, 0);
  }
  assert.equal(inspect("?minContext=1.5").minContext, null);
});

test("facet counts respect other groups while retaining alternatives in the current group", () => {
  const catalog = [
    { ...models[0], id: "alpha/text", architecture: { ...models[0].architecture, input_modalities: ["text"] }, supported_parameters: ["reasoning"] },
    { ...models[1], id: "alpha/image", architecture: { ...models[0].architecture, input_modalities: ["image", "image"] }, supported_parameters: ["tools"] },
    { ...models[2], id: "beta/image", architecture: { ...models[0].architecture, input_modalities: ["image"] }, supported_parameters: ["tools", "reasoning"] },
  ];
  const result = inspect("?providers=alpha&inputModalities=image&tools=true", [], catalog);
  assert.equal(result.sortedModels.length, 1);
  assert.deepEqual(result.filterCounts.providers, { alpha: 1, beta: 1 });
  assert.deepEqual(result.filterCounts.inputModalities, { image: 1 });
  assert.equal(result.filterCounts.reasoning, 0);
  assert.equal(result.filterCounts.tools, 1);
  assert.deepEqual(inspect("?providers=alpha&inputModalities=image", [], catalog).filterCounts.inputModalities, { text: 1, image: 1 });
  assert.equal(inspect("?inputModalities=image,text", [], catalog).sortedModels.length, 3);
});
