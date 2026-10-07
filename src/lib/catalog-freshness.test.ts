import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createServer } from "node:http";
import { CatalogFetchError, fetchCatalog, resolveGatewayUrl } from "./catalog-freshness";
import { getCatalog } from "./get-models";
import { installCatalogTestCache } from "../test/catalog-cache";
import { GET, POST } from "../app/api/models/route";

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

test("consecutive manual refreshes reuse a recent snapshot and refresh at minimum age", async () => {
  const previousFetch = globalThis.fetch;
  const previousNow = Date.now;
  const cache = installCatalogTestCache();
  let upstreamReads = 0;
  let clock = previousNow();
  try {
    Date.now = () => clock;
    globalThis.fetch = (async () => {
      upstreamReads += 1;
      return Response.json({ data: [] });
    }) as typeof fetch;
    const first = await (await cache.request(GET)).json();
    clock = Date.parse(first.fetchedAt) + 59_999;
    assert.equal((await cache.request(POST)).status, 200);
    assert.equal((await cache.request(POST)).status, 200);
    assert.equal(upstreamReads, 1);
    clock += 1;
    const refreshed = await (await cache.request(POST)).json();
    assert.equal(upstreamReads, 2);
    clock = Date.parse(refreshed.fetchedAt);
    const repeated = await (await cache.request(POST)).json();
    assert.deepEqual(repeated, refreshed);
    assert.equal(upstreamReads, 2);
  } finally {
    cache.restore(); globalThis.fetch = previousFetch; Date.now = previousNow;
  }
});

test("cold and overlapping refreshes share one fetch, and failed refreshes can retry", async () => {
  const previousFetch = globalThis.fetch;
  const previousNow = Date.now;
  const previousError = console.error;
  const cache = installCatalogTestCache();
  let upstreamReads = 0;
  let fail = false;
  try {
    console.error = () => {};
    globalThis.fetch = (async () => {
      upstreamReads += 1;
      await Promise.resolve();
      return Response.json({ data: [] }, { status: fail ? 503 : 200 });
    }) as typeof fetch;
    const [one, two] = await Promise.all([cache.request(POST), cache.request(POST)]);
    assert.equal(upstreamReads, 1);
    const first = await one.json();
    assert.deepEqual(await two.json(), first);
    Date.now = () => Date.parse(first.fetchedAt) + 120_000;
    fail = true;
    assert.equal((await cache.request(POST)).status, 502);
    assert.equal(upstreamReads, 2);
    fail = false;
    // Date.now's age simulation does not advance new Date() in fetchCatalog.
    // Restore the real clock before retry so its new snapshot is actually fresh.
    Date.now = previousNow;
    const retryResponse = await cache.request(POST);
    assert.equal(retryResponse.status, 200);
    const retried = await retryResponse.json();
    assert.equal(upstreamReads, 3);
    const repeated = await (await cache.request(POST)).json();
    assert.deepEqual(repeated, retried);
    assert.equal(upstreamReads, 3);
  } finally {
    cache.restore(); globalThis.fetch = previousFetch; Date.now = previousNow; console.error = previousError;
  }
});

test("GET and POST log safe field, HTTP, and network diagnostics while returning generic errors", async () => {
  const previousFetch = globalThis.fetch;
  const previousError = console.error;
  const cache = installCatalogTestCache({ disabled: true });
  const logs: unknown[][] = [];
  try {
    console.error = (...args: unknown[]) => { logs.push(args); };
    globalThis.fetch = (async () => Response.json({ data: [{ id: "test/model", name: "Test", description: "secret payload", pricing: { prompt: {} } }] })) as typeof fetch;
    const get = await cache.request(GET);
    assert.equal(get.status, 502);
    assert.equal(get.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await get.json(), { error: "Unable to load model catalog" });
    assert.deepEqual(logs.pop(), ["Model catalog load failed", { kind: "validation", index: 0, modelId: "test/model", field: "pricing.prompt" }]);
    globalThis.fetch = (async () => Response.json({}, { status: 503 })) as typeof fetch;
    const post = await cache.request(POST);
    assert.equal(post.status, 502);
    assert.deepEqual(await post.json(), { error: "Unable to refresh model catalog" });
    assert.deepEqual(logs.pop(), ["Model catalog refresh failed", { kind: "http", status: 503 }]);
    globalThis.fetch = (async () => { throw new Error("network error with secret credential"); }) as typeof fetch;
    assert.equal((await cache.request(GET)).status, 502);
    assert.deepEqual(logs.pop(), ["Model catalog load failed", { kind: "network" }]);
  } finally {
    cache.restore(); globalThis.fetch = previousFetch; console.error = previousError;
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

test("catalog aborts a stalled upstream request without recording freshness", async () => {
  let timestampCalls = 0;
  let upstreamSignal: AbortSignal | null | undefined;
  const stalledFetch: typeof fetch = async (_url, options) => {
    upstreamSignal = options?.signal;
    assert.ok(upstreamSignal, "upstream fetch must receive an abort signal");
    return new Promise<Response>((_resolve, reject) => {
      upstreamSignal!.addEventListener("abort", () => reject(upstreamSignal!.reason), { once: true });
    });
  };

  await assert.rejects(fetchCatalog(stalledFetch, () => {
    timestampCalls += 1;
    return new Date();
  }, 10), /Model catalog request timed out/);
  assert.equal(upstreamSignal?.aborted, true);
  assert.equal(timestampCalls, 0);
});

test("gateway override works outside production and production keeps the real gateway", () => {
  const override = "http://127.0.0.1:3211/models";
  assert.equal(resolveGatewayUrl({ NODE_ENV: "development", KILO_MODELS_GATEWAY_URL: override }), override);
  assert.equal(resolveGatewayUrl({ NODE_ENV: "test", KILO_MODELS_GATEWAY_URL: override }), override);
  assert.equal(resolveGatewayUrl({ NODE_ENV: "production", KILO_MODELS_GATEWAY_URL: override }), "https://api.kilo.ai/api/gateway/models");
  assert.equal(resolveGatewayUrl({}), "https://api.kilo.ai/api/gateway/models");
});

test("catalog timeout also aborts a native fetch with a stalled response body", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write('{"data":');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  let receivedHeaders = false;
  let timestampCalls = 0;
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const localFetch: typeof fetch = async (_url, options) => {
      const response = await fetch(`http://127.0.0.1:${address.port}`, options);
      receivedHeaders = true;
      return response;
    };
    await assert.rejects(fetchCatalog(localFetch, () => {
      timestampCalls += 1;
      return new Date();
    }, 100), /Model catalog request timed out/);
    assert.equal(receivedHeaders, true);
    assert.equal(timestampCalls, 0);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});

test("settled catalog requests clear their abort timer on success and failure", async () => {
  const signals: AbortSignal[] = [];
  const networkError = new Error("upstream connection failed");
  const outcomes: Array<Response | Error> = [
    Response.json({ data: [] }),
    Response.json({}, { status: 503 }),
    Response.json({ data: {} }),
    new Response("invalid JSON"),
    networkError,
  ];
  for (const outcome of outcomes) {
    const result = fetchCatalog(async (_url, options) => {
      assert.ok(options?.signal);
      signals.push(options.signal);
      if (outcome instanceof Error) throw outcome;
      return outcome;
    }, () => new Date("2026-10-06T06:30:00.000Z"), 10);
    if (outcome === outcomes[0]) await result;
    else if (outcome === networkError) await assert.rejects(result, (error) => error instanceof CatalogFetchError && error.kind === "network");
    else await assert.rejects(result);
  }
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.ok(signals.every((signal) => !signal.aborted), "settled requests must not later abort");
});
