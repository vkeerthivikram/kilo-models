import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ModelDetailActions } from "./model-detail-actions";
import { BackToDirectory } from "./back-to-directory";
import type { Model } from "../lib/types";

test("model details expose favorite, comparison, copy and a safe direct-load return", () => {
  const model = { id: "test/100%", name: "Percent Model" } as Model;
  const html = renderToStaticMarkup(<NuqsTestingAdapter><ModelDetailActions model={model} models={[model]} /></NuqsTestingAdapter>);
  assert.match(html, /Add Percent Model to favorites/);
  assert.match(html, /Add Percent Model to comparison/);
  assert.match(html, /Copy model ID/);
  assert.match(html, /test\/100%/);
  const back = renderToStaticMarkup(<BackToDirectory />);
  assert.match(back, /href="\/"/);
  assert.match(back, /Back to Directory/);
});
