import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createCatalogClient } from "./catalog-client";

test("a refresh supersedes a slower initial catalog request", async () => {
  const responses: ((response: Response) => void)[] = [];
  const signals: AbortSignal[] = [];
  const methods: (string | undefined)[] = [];
  const client = createCatalogClient(((_url, options) => {
    signals.push(options?.signal as AbortSignal);
    methods.push(options?.method);
    return new Promise<Response>((resolve) => responses.push(resolve));
  }) as typeof fetch);
  const initial = client.load();
  const refresh = client.load(true);
  assert.equal(signals[0].aborted, true);
  assert.deepEqual(methods, ["GET", "POST"]);
  responses[1](Response.json({ data: [], fetchedAt: "2026-10-06T07:00:00.000Z" }));
  assert.equal((await refresh)?.fetchedAt, "2026-10-06T07:00:00.000Z");
  responses[0](Response.json({ data: [], fetchedAt: "2026-10-06T06:00:00.000Z" }));
  assert.equal(await initial, null);
});

test("failed refresh can retry and never invents an update time", async () => {
  let attempt = 0;
  const client = createCatalogClient((async () => {
    attempt += 1;
    if (attempt === 1) return Response.json({}, { status: 503 });
    if (attempt === 2) return Response.json({ data: [] });
    return Response.json({ data: [], fetchedAt: "2026-10-06T08:00:00.000Z" });
  }) as typeof fetch);
  await assert.rejects(client.load(true), /Unable to load model catalog/);
  await assert.rejects(client.load(true), /Invalid catalog update time/);
  assert.equal((await client.load(true))?.fetchedAt, "2026-10-06T08:00:00.000Z");
});
