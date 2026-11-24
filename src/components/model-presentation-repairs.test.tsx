import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ModelSpecsCard } from "./model-specs-card";
import ModelPage, { generateMetadata } from "../app/models/[id]/page";
import { installCatalogTestCache } from "../test/catalog-cache";
import { renderApp } from "../test/render-app";
import { catalog } from "../../e2e/catalog";
import type { Model } from "../lib/types";

test("33 the detail heading and metadata fall back to the ID for empty and whitespace-only names", async () => {
  const previousFetch = globalThis.fetch;
  const cache = installCatalogTestCache({ disabled: true });
  try {
    const records = catalog.slice(0, 3).map((model, index) => index < 2 ? { ...model, name: index ? "   " : "" } : model);
    globalThis.fetch = (() => Promise.resolve(Response.json({ data: records }))) as typeof fetch;
    for (const model of records) {
      const display = model.name.trim() ? model.name : model.id;
      const props = { params: Promise.resolve({ id: model.id }) };
      const html = renderApp(<NuqsTestingAdapter>{await ModelPage(props)}</NuqsTestingAdapter>);
      assert.ok(html.includes(`>${display}</h1>`), `The detail heading identifies ${model.id}`);
      assert.equal((await generateMetadata(props)).title, `${display} — Kilo Models`);
    }
  } finally {
    cache.restore();
    globalThis.fetch = previousFetch;
  }
});

test("34 detail specifications distinguish omitted, empty and populated capabilities", () => {
  const model = catalog[0];
  const omitted = renderToStaticMarkup(<ModelSpecsCard model={{ ...model, architecture: undefined, supported_parameters: undefined } as unknown as Model} />);
  const empty = renderToStaticMarkup(<ModelSpecsCard model={{ ...model, architecture: { ...model.architecture, input_modalities: [], output_modalities: [] }, supported_parameters: [] }} />);
  const populated = renderToStaticMarkup(<ModelSpecsCard model={model} />);
  assert.match(omitted, /Input: Unknown · Output: Unknown/);
  assert.match(empty, /Input: None · Output: None/);
  assert.match(populated, /Input: text, image · Output: text/);
  for (const title of ["Input types", "Output types", "Supported Parameters"]) {
    assert.match(omitted, new RegExp(`${title}</span><div[^>]*>[^<]*(?:<span[^>]*>)?Unknown`));
    assert.match(empty, new RegExp(`${title}</span><div[^>]*>[^<]*(?:<span[^>]*>)?None`));
  }
  assert.match(populated, /Supported Parameters<\/span><div[^>]*><span[^>]*>tools<\/span><span[^>]*>reasoning/);
});

test("detail specifications deduplicate lists, render dash for blank tokenizer, and safely format hugging_face_id", () => {
  const base = catalog[0];
  const html = renderToStaticMarkup(
    <ModelSpecsCard
      model={{
        ...base,
        architecture: { ...base.architecture, input_modalities: ["text", "text"], output_modalities: ["text", "text"], tokenizer: "   " },
        supported_parameters: ["tools", "tools"],
        default_parameters: ["temp", "temp"],
        autoRouting: { models: ["m/1", "m/1"] },
        hugging_face_id: " org name/model?v=1 ",
      }}
    />,
  );
  assert.equal((html.match(/>tools<\/span>/g) ?? []).length, 1);
  assert.equal((html.match(/>temp<\/span>/g) ?? []).length, 1);
  assert.equal((html.match(/>m\/1<\/span>/g) ?? []).length, 1);
  assert.match(html, /Tokenizer<\/span><span[^>]*>—<\/span>/);
  assert.match(html, /href="https:\/\/huggingface\.co\/org%20name\/model%3Fv%3D1"/);

  const blankHf = renderToStaticMarkup(<ModelSpecsCard model={{ ...base, hugging_face_id: "   " }} />);
  assert.doesNotMatch(blankHf, /Hugging Face/);
});
