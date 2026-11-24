import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderApp } from "../test/render-app";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ModelDetailActions } from "./model-detail-actions";
import { BackToDirectory } from "./back-to-directory";

test("model details expose favorite, comparison, copy and a safe direct-load return", () => {
  const model = { id: "test/100%", name: "Percent Model" };
  const html = renderApp(<NuqsTestingAdapter><ModelDetailActions model={model} catalog={[{ id: model.id }]} /></NuqsTestingAdapter>);
  assert.match(html, /Add Percent Model to favorites/);
  assert.match(html, /Add Percent Model to comparison/);
  assert.match(html, /Copy model ID/);
  assert.match(html, /test\/100%/);
  const back = renderApp(<NuqsTestingAdapter><BackToDirectory /></NuqsTestingAdapter>);
  assert.match(back, /href="\/"/);
  assert.match(back, /Back to Directory/);
});

test("pre-hydration render does not show detail-compare-limit before ready is true", () => {
  const catalog = Array.from({ length: 11 }, (_, index) => ({ id: `test/${index}` }));
  const compareQuery = catalog.slice(0, 10).map((entry) => entry.id).join(",");
  const html = renderApp(
    <NuqsTestingAdapter searchParams={`?compare=${encodeURIComponent(compareQuery)}`}>
      <ModelDetailActions model={{ id: "test/10", name: "Eleventh Model" }} catalog={catalog} />
    </NuqsTestingAdapter>,
  );
  assert.doesNotMatch(html, /detail-compare-limit/);
});
