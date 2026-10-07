import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelGrid } from "./model-grid-v2";
import { COMPARE_LIMIT } from "../lib/format-price";
import type { Model } from "../lib/types";

const models: Model[] = Array.from({ length: COMPARE_LIMIT + 1 }, (_, index) => ({
  id: `test/model-${index}`, name: `Model ${index}`, description: "Test model", created: 0,
  architecture: { input_modalities: ["text"], output_modalities: ["text"], tokenizer: "test" },
  top_provider: { is_moderated: false, context_length: 1000, max_completion_tokens: 100 },
  pricing: { prompt: "0", completion: "0" }, context_length: 1000,
  supported_parameters: [], opencode: {}, preferredIndex: 0, isFree: true,
}));

for (const viewMode of ["grid", "list"] as const) {
  test(`${viewMode} view summarizes provider and useful capabilities without technical clutter`, () => {
    const model = { ...models[0], id: "test/opaque-internal-model-id", architecture: {
      ...models[0].architecture, input_modalities: ["text", "image"], output_modalities: ["text"],
    }, supported_parameters: ["tools", "reasoning"], top_provider: { ...models[0].top_provider, is_moderated: true } };
    const html = renderToStaticMarkup(<ModelGrid models={[model]} viewMode={viewMode} />);
    assert.match(html, />test<\/p>/);
    assert.match(html, /Image input/i);
    assert.match(html, /Reasoning/);
    assert.match(html, /Tools/);
    assert.doesNotMatch(html, />test\/opaque-internal-model-id<\/p>/);
    assert.doesNotMatch(html, /Moderated/);
  });

  test(`${viewMode} view keeps favorite and comparison controls available`, () => {
    const html = renderToStaticMarkup(<ModelGrid models={[models[0]]} viewMode={viewMode}
      isComparedModels={[models[0]]} isFavoriteModel={() => true}
      onToggleCompare={() => {}} onToggleFavorite={() => {}} />);
    assert.match(html, /Remove Model 0 from comparison/);
    assert.match(html, /Remove Model 0 from favorites/);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 2);
  });

  test(`${viewMode} view caps additions while keeping selected models removable`, () => {
    const html = renderToStaticMarkup(<ModelGrid models={[models[0], models[COMPARE_LIMIT]]}
      viewMode={viewMode} isComparedModels={models.slice(0, COMPARE_LIMIT)}
      onToggleCompare={() => {}} onToggleFavorite={() => {}} />);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 1);
    assert.match(html, /Remove Model 0 from comparison/);
    assert.match(html, /Compare up to 10 models/);
  });
}
