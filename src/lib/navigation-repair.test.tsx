import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderApp } from "../test/render-app";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import ModelError from "../app/models/[id]/error";
import { ModelGrid } from "../components/model-grid-v2";
import { parseUpstreamModelsResponse } from "./models-response";

for (const viewMode of ["grid", "list"] as const) {
  test(`a malformed UTF-16 model ID cannot crash the ${viewMode} directory`, () => {
    const healthy = { id: "healthy/sibling", name: "Healthy sibling", description: "" };
    const parsed = parseUpstreamModelsResponse({
      data: [{ ...healthy, id: "malformed/\ud800" }, healthy],
    });
    const html = renderApp(<ModelGrid models={parsed.data} viewMode={viewMode} />);
    assert.equal(parsed.excludedCount, 1);
    assert.match(html, /href="\/models\/healthy%2Fsibling"/i);
    assert.match(html, /Healthy sibling/);
  });
}

test("the detail error publishes its failure and retains a workload-carrying return link", () => {
  const html = renderApp(
    <NuqsTestingAdapter searchParams="?requests=7">
      <ModelError error={new Error("internal failure")} retry={() => {}} />
    </NuqsTestingAdapter>
  );
  assert.match(html, /data-agent-catalog="Model detail unavailable"/);
  assert.match(html, /aria-label="Back to Directory"[^>]* href="\/\?requests=7"/);
  assert.match(html, /Try again/);
  assert.doesNotMatch(html, /internal failure/);
});
