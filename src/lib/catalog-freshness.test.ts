import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fetchCatalog } from "./catalog-freshness";
import { getCatalog } from "./get-models";
import { installCatalogTestCache } from "../test/catalog-cache";

test("catalog records the time of a successful upstream fetch", async () => {
  const calls: RequestInit[] = [];
  const catalog = await fetchCatalog(async (_url, options) => {
    calls.push(options ?? {});
    return Response.json({ data: [] });
  }, () => new Date("2026-10-06T06:30:00.000Z"));
  assert.deepEqual(catalog, { data: [], fetchedAt: "2026-10-06T06:30:00.000Z" });
  assert.equal(calls[0].cache, "no-store");
});

test("cached catalog keeps its fetchedAt until an expired read checks upstream", async () => {
  const previousFetch = globalThis.fetch;
  const cache = installCatalogTestCache();
  let upstreamReads = 0;
  try {
    globalThis.fetch = (async () => {
      upstreamReads += 1;
      return Response.json({ data: [] });
    }) as typeof fetch;
    const first = await getCatalog();
    cache.advance(3599_000);
    const cached = await getCatalog();
    assert.equal(cached.fetchedAt, first.fetchedAt);
    assert.equal(upstreamReads, 1);
    cache.advance(1000);
    await getCatalog();
    assert.equal(upstreamReads, 2);
  } finally {
    cache.restore();
    globalThis.fetch = previousFetch;
  }
});

test("concurrent catalog misses share one upstream snapshot", async () => {
  const previousFetch = globalThis.fetch;
  const cache = installCatalogTestCache();
  let upstreamReads = 0;
  try {
    globalThis.fetch = (async () => {
      upstreamReads += 1;
      return Response.json({ data: [] });
    }) as typeof fetch;
    const [first, second] = await Promise.all([getCatalog(), getCatalog()]);
    assert.equal(upstreamReads, 1);
    assert.equal(first.fetchedAt, second.fetchedAt);
  } finally {
    cache.restore();
    globalThis.fetch = previousFetch;
  }
});

test("failed or malformed upstream responses never receive a fresh timestamp", async () => {
  let timestampCalls = 0;
  const now = () => { timestampCalls += 1; return new Date(); };
  for (const response of [Response.json({}, { status: 503 }), Response.json({ data: {} })]) {
    await assert.rejects(fetchCatalog(async () => response, now));
  }
  assert.equal(timestampCalls, 0);
});
