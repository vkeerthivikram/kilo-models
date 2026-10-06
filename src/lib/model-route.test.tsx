import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ModelPage, { generateMetadata } from "../app/models/[id]/page";
import { GET } from "../app/api/models/route";

test("detail lookup preserves decoded percent IDs and catalog failures are not 404s", async () => {
  const previousFetch = globalThis.fetch;
  const model = { id: "test/100%", name: "Percent Model", description: "Test", context_length: 1000, created: 0, pricing: { prompt: "0", completion: "0" } };
  try {
    globalThis.fetch = (() => Promise.resolve(Response.json({ data: [model] }))) as typeof fetch;
    const props = { params: Promise.resolve({ id: model.id }) };
    assert.equal((await generateMetadata(props)).title, "Percent Model — Kilo Models");
    assert.equal((await generateMetadata({ params: Promise.resolve({ id: encodeURIComponent(model.id) }) })).title, "Percent Model — Kilo Models");
    assert.deepEqual(await generateMetadata({ params: Promise.resolve({ id: "bad%" }) }), {});
    assert.match(renderToStaticMarkup(await ModelPage(props)), /Cost Calculator/);
    globalThis.fetch = (() => Promise.resolve(Response.json({ error: "Unavailable" }, { status: 503 }))) as typeof fetch;
    await assert.rejects(ModelPage(props), /Failed to load model catalog/);
    globalThis.fetch = (() => Promise.resolve(Response.json({ data: {} }))) as typeof fetch;
    assert.equal((await GET()).status, 502);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
