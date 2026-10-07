import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelPricingCard } from "./model-pricing-card";
import { parseModelsResponse } from "../lib/models-response";

function pricingCard(pricing: Record<string, unknown>) {
  const [model] = parseModelsResponse({ data: [{ id: "test/pricing", name: "Pricing", description: "", pricing: { prompt: "0", completion: "0", ...pricing } }] });
  return renderToStaticMarkup(<ModelPricingCard model={model} />);
}

test("absent request fees are omitted while invalid listed fees explain unavailable estimates", () => {
  assert.doesNotMatch(pricingCard({ request: null }), /Request fee:/);
  assert.match(pricingCard({ request: "bad" }), /Request fee: Unavailable\/request/);
  assert.match(pricingCard({ request: "bad" }), /total estimate unavailable/);
});

test("other rates keep invalid listed values visible and preserve free prices", () => {
  const invalid = pricingCard({ input_cache_read: "", input_cache_write: "", image: "", web_search: "", internal_reasoning: "" });
  assert.match(invalid, /Cache Read/);
  assert.match(invalid, /Cache Write/);
  assert.match(invalid, /Internal Reasoning/);
  assert.match(invalid, /Unavailable\/image/);
  assert.match(invalid, /Unavailable\/search/);
  assert.doesNotMatch(invalid, /<details[^>]*hidden/);
  assert.match(pricingCard({ image: "0" }), /\$0\.00\/image/);
  assert.match(pricingCard({ image: null, web_search: null }), /<details[^>]*hidden/);
});

test("discount disclosures say that estimates are pre-discount", () => {
  assert.match(pricingCard({ discount: 20 }), /Estimates are pre-discount/);
  assert.match(pricingCard({ discount: 20 }), /20%/);
  assert.doesNotMatch(pricingCard({ discount: 0 }), /Estimates are pre-discount/);
});
