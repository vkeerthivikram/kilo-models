import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ModelPage, { generateMetadata } from "../app/models/[id]/page";
import { GET } from "../app/api/models/route";
import { installCatalogTestCache } from "../test/catalog-cache";

test("detail lookup preserves decoded percent IDs and catalog failures are not 404s", async () => {
  const previousFetch = globalThis.fetch;
  const cache = installCatalogTestCache({ disabled: true });
  const model = { id: "test/100%", name: "Percent Model", description: "**Warning** Preview only.", context_length: 1000, created: 0, pricing: { prompt: "0", completion: "0" } };
  try {
    globalThis.fetch = (() => Promise.resolve(Response.json({ data: [model] }))) as typeof fetch;
    const props = { params: Promise.resolve({ id: model.id }) };
    assert.equal((await generateMetadata(props)).title, "Percent Model — Kilo Models");
    assert.equal((await generateMetadata({ params: Promise.resolve({ id: encodeURIComponent(model.id) }) })).title, "Percent Model — Kilo Models");
    assert.deepEqual(await generateMetadata({ params: Promise.resolve({ id: "bad%" }) }), {});
    const html = renderToStaticMarkup(await ModelPage(props));
    assert.match(html, /Cost Calculator/);
    assert.match(html, /<strong>Warning<\/strong>/);
    assert.doesNotMatch(html, /<\/div>0</, "an unknown creation date must not print a stray zero");
    globalThis.fetch = (() => Promise.resolve(Response.json({ error: "Unavailable" }, { status: 503 }))) as typeof fetch;
    await assert.rejects(ModelPage(props), /Failed to load model catalog/);
    globalThis.fetch = (() => Promise.resolve(Response.json({ data: {} }))) as typeof fetch;
    assert.equal((await GET()).status, 502);
  } finally {
    cache.restore();
    globalThis.fetch = previousFetch;
  }
});
