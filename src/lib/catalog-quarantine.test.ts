import { strict as assert } from "node:assert";
import { test } from "node:test";
import { GET, POST } from "../app/api/models/route";
import { installCatalogTestCache } from "../test/catalog-cache";
import { createCatalogClient } from "./catalog-client";

test("partial upstream catalog survives route caching and reaches the client with its notice count", async () => {
  const previousFetch = globalThis.fetch;
  const previousWarn = console.warn;
  const cache = installCatalogTestCache();
  const model = { id: "test/valid", name: "Valid", description: "" };
  let upstreamReads = 0;
  try {
    console.warn = () => {};
    globalThis.fetch = async () => {
      upstreamReads += 1;
      return Response.json({ data: [{ ...model, expiration_date: "2026-10-07T00:00:00+99:99" }, model] });
    };
    const client = createCatalogClient(async (_url, options) => {
      const response = await cache.request(options?.method === "POST" ? POST : GET);
      assert.equal(response.status, 200);
      return response;
    });
    const loaded = await client.load();
    assert.deepEqual(loaded?.data, [model]);
    assert.equal(loaded?.excludedCount, 1);
    assert.ok(loaded?.fetchedAt);
    assert.deepEqual(await client.load(true), loaded);
    assert.equal(upstreamReads, 1);
  } finally {
    cache.restore();
    globalThis.fetch = previousFetch;
    console.warn = previousWarn;
  }
});
