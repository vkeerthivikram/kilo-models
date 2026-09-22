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

function inspect(searchParams: string, favorites: string[] = []) {
  let result: ReturnType<typeof useModelFilters> | undefined;
  function Probe() {
    result = useModelFilters(models, favorites);
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

test("empty favorites has no results", () => {
  assert.equal(inspect("?fav=true").sortedModels.length, 0);
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
