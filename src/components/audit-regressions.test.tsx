import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { SimilarModels } from "./similar-models";
import { ModelPricingCard } from "./model-pricing-card";
import { ModelSpecsCard } from "./model-specs-card";
import type { Model } from "../lib/types";

const model: Model = {
  id: "test/paid", name: "Paid", description: "Test model", created: 0,
  architecture: { input_modalities: ["text"], output_modalities: ["text"], tokenizer: "test" },
  top_provider: { is_moderated: false, context_length: 1000, max_completion_tokens: 100 },
  pricing: { prompt: "0.000002", completion: "0.000003", request: "0.01", image: "0.02", web_search: "0.003" },
  context_length: 1000, supported_parameters: [], opencode: {}, preferredIndex: 0, isFree: false,
};
test("similar models have only the card's own links and no inert actions", () => {
  const html = renderToStaticMarkup(<NuqsTestingAdapter searchParams="?requests=7"><SimilarModels models={[model]} /></NuqsTestingAdapter>);
  assert.equal((html.match(/<a /g) ?? []).length, 2);
  assert.equal((html.match(/paid\?requests=7/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<button/);
});

test("specs show object-shaped default parameters without requiring context", () => {
  const html = renderToStaticMarkup(<ModelSpecsCard model={{ ...model, default_parameters: { temperature: 0.7 } }} />);
  assert.match(html, /temperature: 0.7/);
  const exactLimits = renderToStaticMarkup(<ModelSpecsCard model={{ ...model, context_length: 1536,
    top_provider: { ...model.top_provider, max_completion_tokens: 1536 } }} />);
  assert.equal((exactLimits.match(/>1,536</g) ?? []).length, 2);
});
test("pricing keeps confirmed non-token units and identifies the unverified image unit", () => {
  const html = renderToStaticMarkup(<ModelPricingCard model={model} />);
  assert.match(html, /\$0\.0100\/request/);
  assert.match(html, /Image rate \(unit unverified\)[\s\S]*\$0\.02/);
  assert.match(html, /\$0\.003000\/search/);
  assert.doesNotMatch(html, /\$10000\/M/);
});
