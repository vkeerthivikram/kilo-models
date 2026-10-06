import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparisonTable } from "./comparison-table";
import type { Model } from "../lib/types";

const model: Model = {
  id: "test/first", name: "First model", description: "Test model", created: 0,
  architecture: { input_modalities: ["text"], output_modalities: ["text"], tokenizer: "test" },
  top_provider: { is_moderated: false, context_length: 1000, max_completion_tokens: 100 },
  pricing: { prompt: "0", completion: "0" }, context_length: 1000,
  supported_parameters: [], opencode: {}, preferredIndex: 0, isFree: true,
};

test("differences-only table removes shared specs while retaining model headers and differing prices", () => {
  const second = { ...model, id: "test/second", name: "Second model", pricing: { prompt: "0.000003", completion: "0" } };
  const html = renderToStaticMarkup(<ComparisonTable models={[model, second]} differencesOnly onRemove={() => {}} />);
  assert.match(html, /First model/);
  assert.match(html, /Second model/);
  assert.match(html, /Input price/);
  assert.match(html, /Free/);
  assert.match(html, /\$3\/M/);
  assert.doesNotMatch(html, /Context window/);
  assert.doesNotMatch(html, /Output price/);
  assert.match(html, /scope="col"/);
  assert.match(html, /scope="row"/);
});

test("matching models explain the empty differences view and keep removal available", () => {
  const second = { ...model, id: "test/second", name: "Second model" };
  const html = renderToStaticMarkup(<ComparisonTable models={[model, second]} differencesOnly onRemove={() => {}} />);
  assert.match(html, /No differences in these specifications/);
  assert.match(html, /Remove First model from comparison/);
  assert.match(html, /Remove Second model from comparison/);
});

test("single selection retains specs even if differences were enabled for a previous comparison", () => {
  const html = renderToStaticMarkup(<ComparisonTable models={[model]} differencesOnly onRemove={() => {}} />);
  assert.match(html, /Context window/);
  assert.doesNotMatch(html, /No differences/);
});
