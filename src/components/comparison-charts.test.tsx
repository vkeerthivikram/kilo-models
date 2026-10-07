import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparisonCharts } from "./comparison-charts";

test("comparison charts explain specifications, normalization, unknowns and the table alternative", () => {
  const html = renderToStaticMarkup(<ComparisonCharts models={[]} />);
  assert.match(html, /Specification profile/);
  assert.match(html, /not quality scores or benchmarks/);
  assert.match(html, /Context and max output.*token counts/);
  assert.match(html, /supported parameter count/);
  assert.match(html, /Unknown values leave gaps/);
  assert.match(html, /Overview table/);
  assert.doesNotMatch(html, /Capability Radar/);
});
