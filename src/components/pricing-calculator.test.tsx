import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PricingCalculator } from "./pricing-calculator";
import { CompareCostTable } from "./compare-cost-table";
import type { Model } from "../lib/types";

const model = { id: "test/paid", name: "Paid", pricing: { prompt: "0.000003", completion: "0.000015" } } as Model;

test("both calculators use per-token rates for the default workload", () => {
  for (const html of [renderToStaticMarkup(<PricingCalculator model={model} />), renderToStaticMarkup(<CompareCostTable models={[model]} />)]) {
    assert.match(html, /\$0\.3000/);
    assert.match(html, /\$0\.7500/);
    assert.match(html, /\$1050\.0000/);
    assert.match(html, /for="/);
  }
});

test("unavailable rates do not become free or negative estimates", () => {
  const unknown = { ...model, pricing: { prompt: "-1", completion: "-1" } };
  for (const html of [renderToStaticMarkup(<PricingCalculator model={unknown} />), renderToStaticMarkup(<CompareCostTable models={[unknown]} />)]) {
    assert.match(html, /Unavailable/);
    assert.doesNotMatch(html, /\$-/);
  }
});

test("known free models have a zero estimate", () => {
  const free = { ...model, pricing: { prompt: "0", completion: "0" } };
  assert.match(renderToStaticMarkup(<PricingCalculator model={free} />), /\$0\.00/);
});
