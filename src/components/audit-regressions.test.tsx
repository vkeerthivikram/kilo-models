import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SimilarModels } from "./similar-models";
import { ModelPricingCard } from "./model-pricing-card";
import { ModelSpecsCard } from "./model-specs-card";
import type { Model } from "../lib/types";

const model = { id: "test/paid", name: "Paid", pricing: { prompt: "0.000002", completion: "0.000003", request: "0.01", image: "0.02", web_search: "0.003" } } as Model;
test("similar models have only the card's own links and no inert actions", () => {
  const html = renderToStaticMarkup(<SimilarModels models={[model]} />);
  assert.equal((html.match(/<a /g) ?? []).length, 2);
  assert.doesNotMatch(html, /<button/);
});

test("specs show object-shaped default parameters without requiring context", () => {
  const html = renderToStaticMarkup(<ModelSpecsCard model={{ ...model, default_parameters: { temperature: 0.7 } } as unknown as Model} />);
  assert.match(html, /temperature: 0.7/);
});
test("non-token pricing retains its own billing units", () => {
  const html = renderToStaticMarkup(<ModelPricingCard model={model} />);
  assert.match(html, /\$0\.0100\/request/);
  assert.match(html, /\$0\.0200\/image/);
  assert.match(html, /\$0\.003000\/search/);
  assert.doesNotMatch(html, /\$10000\/M/);
});
