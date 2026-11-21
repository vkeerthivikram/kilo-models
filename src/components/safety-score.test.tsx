import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelSafetyCard } from "./model-safety-card";
import { catalog } from "../../e2e/catalog";

test("unverified score directions are shown without favorable or unfavorable colors", () => {
  const markup = renderToStaticMarkup(<ModelSafetyCard model={{ ...catalog[0], enkrypt: {
    safety_score: 13.3, nist_score: 9, owasp_score: 11,
  } }} />);
  assert.match(markup, /Reported Safety Score[\s\S]*13\.3/);
  assert.match(markup, /direction is unverified/);
  assert.doesNotMatch(markup, /bg-(red|amber|emerald)-/);
});
