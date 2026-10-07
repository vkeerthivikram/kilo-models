import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { DEFAULT_WORKLOAD } from "../lib/calculator-workload";
import { PricingCalculator } from "./pricing-calculator";
import { CompareCostTable } from "./compare-cost-table";
import type { Model } from "../lib/types";

const model = { id: "test/paid", name: "Paid", pricing: { prompt: "0.000003", completion: "0.000015" } } as Model;
const render = (element: ReactNode) => renderToStaticMarkup(<NuqsTestingAdapter>{element}</NuqsTestingAdapter>);

test("both calculators use per-token rates for the default workload", () => {
  for (const html of [render(<PricingCalculator model={model} />), render(<CompareCostTable models={[model]} />)]) {
    assert.match(html, /\$0\.006000/);
    assert.match(html, /\$0\.007500/);
    assert.match(html, /\$13\.5000/);
    assert.match(html, /for="/);
    assert.match(html, /Saved setups/);
  }
});

test("comparison estimates explain impossible workloads and cache pricing gaps", () => {
  const limited = { ...model, context_length: 1000, top_provider: { max_completion_tokens: 100 } } as Model;
  const html = render(<CompareCostTable models={[limited]} workload={{ ...DEFAULT_WORKLOAD, inputTokens: 2000, outputTokens: 500, requests: 10, period: "month", cachePercent: 50 }} />);
  assert.match(html, /exceeds/);
  assert.match(html, /monthly/i);
  assert.match(html, /cache read rate/i);
  assert.match(html, /Unavailable/);
});

test("unavailable rates do not become free or negative estimates", () => {
  const unknown = { ...model, pricing: { prompt: "-1", completion: "-1" } };
  for (const html of [render(<PricingCalculator model={unknown} />), render(<CompareCostTable models={[unknown]} />)]) {
    assert.match(html, /Unavailable/);
    assert.doesNotMatch(html, /\$-/);
  }
});

test("known free models have a zero estimate", () => {
  const free = { ...model, pricing: { prompt: "0", completion: "0" } };
  assert.match(render(<PricingCalculator model={free} />), /\$0\.00/);
});

test("detail calculator keeps totals visible before its optional full breakdown", () => {
  const html = render(<PricingCalculator model={model} />);
  assert.match(html, /<summary[^>]*>Full cost breakdown<\/summary>/);
  const totals = html.slice(0, html.indexOf("Full cost breakdown"));
  assert.match(totals, /Per request/);
  assert.match(totals, /\$13\.5000/);
});

test("comparison puts a compact model and total table before saved setups", () => {
  const html = render(<CompareCostTable models={[model]} />);
  const table = html.slice(html.indexOf("<table"), html.indexOf("</table>"));
  assert.equal((table.match(/scope="col"/g) ?? []).length, 2);
  assert.match(table, /Paid/);
  assert.match(table, /\$13\.5000/);
  assert.doesNotMatch(table, /Input \/ request|Output \/ request|min-w-\[600px\]/);
  assert.ok(html.indexOf("Cost estimates") < html.indexOf("Saved setups"));
  assert.match(html.slice(html.indexOf("Full cost breakdown")), /\$0\.006000/);
});

test("expanded comparison estimates identify missing extra rates and overlapping cache tokens", () => {
  const html = render(<CompareCostTable models={[model]} workload={{ ...DEFAULT_WORKLOAD, images: 1, searches: 1, cacheWriteTokens: 2001 }} />);
  assert.match(html, /image rate/i);
  assert.match(html, /search rate/i);
  assert.match(html, /cache.*input/i);
  assert.match(html, /Unavailable/);
});

test("calculators expose separate charge components without adding input subtotal twice", () => {
  const expanded = { ...model, pricing: { prompt: "0.004", completion: "0.008", input_cache_read: "0.001", input_cache_write: "0.005", image: "0.03", web_search: "0.02", request: "0.01" } };
  const workload = { ...DEFAULT_WORKLOAD, inputTokens: 100, outputTokens: 10, requests: 2, cachePercent: 50, cacheWriteTokens: 20, images: 2, searches: 3 };
  const detail = renderToStaticMarkup(<NuqsTestingAdapter searchParams="?inputTokens=100&outputTokens=10&requests=2&cachePercent=50&cacheWriteTokens=20&images=2&searches=3"><PricingCalculator model={expanded} /></NuqsTestingAdapter>);
  for (const html of [detail, render(<CompareCostTable models={[expanded]} workload={workload} />)]) {
    for (const label of ["Uncached input", "Cache reads", "Cache writes", "Images", "Searches", "Request fee"]) assert.match(html, new RegExp(label));
    assert.match(html, /\$0\.1200/);
    assert.match(html, /\$0\.0500/);
    assert.match(html, /\$0\.1000/);
    assert.match(html, /\$0\.4800/);
    assert.match(html, /\$0\.9600/);
  }
});
