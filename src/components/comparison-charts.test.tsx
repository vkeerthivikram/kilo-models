import { strict as assert } from "node:assert";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparisonCharts } from "./comparison-charts";
import { PricingBarChart } from "./pricing-bar-chart";
import type { Model } from "../lib/types";

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

test("pricing bar chart includes accessibilityLayer, theme popover styles, and safe tooltip labelFormatter", () => {
  let tree: React.ReactElement | undefined;
  const model = { id: "a/b", name: "Model A", pricing: { prompt: "0.000001", completion: "0.000002" } } as unknown as Model;
  function Probe() {
    tree = PricingBarChart({ models: [model] });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  const rootChildren = React.Children.toArray((tree!.props as { children: React.ReactNode }).children) as React.ReactElement[];
  const container = rootChildren[rootChildren.length - 1];
  const barChart = (container.props as { children: React.ReactElement }).children;
  const barChildren = React.Children.toArray((barChart.props as { children: React.ReactNode }).children) as React.ReactElement[];
  const tooltip = barChildren.find((element) => "labelFormatter" in (element.props as Record<string, unknown>));
  assert.ok(tooltip);
  const barProps = barChart.props as { accessibilityLayer?: boolean };
  const tooltipProps = tooltip.props as {
    contentStyle?: Record<string, string>;
    labelFormatter: (label: unknown, payload?: Array<{ payload?: { name?: string } }>) => unknown;
  };
  assert.equal(barProps.accessibilityLayer, true);
  assert.equal(tooltipProps.contentStyle?.backgroundColor, "var(--popover)");
  assert.equal(tooltipProps.contentStyle?.color, "var(--popover-foreground)");
  assert.equal(tooltipProps.labelFormatter("fallback", undefined), "fallback");
  assert.equal(tooltipProps.labelFormatter("fallback", [{ payload: { name: "Model A" } }]), "Model A");
});
