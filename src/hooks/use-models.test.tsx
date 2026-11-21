import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { useModels } from "./use-models";

test("overlapping refresh calls share the same pending request", async () => {
  const original = globalThis.fetch;
  let refresh: (() => Promise<void>) | undefined;
  function Probe() { refresh = useModels().refresh; return null; }
  const response = Promise.withResolvers<Response>();
  let posts = 0;
  try {
    globalThis.fetch = async (_input, init) => {
      assert.equal(init?.method, "POST");
      posts++;
      return response.promise;
    };
    renderToStaticMarkup(<Probe />);
    assert.ok(refresh);
    const first = refresh();
    const second = refresh();
    response.resolve(Response.json({ data: [], fetchedAt: "2026-01-01T00:00:00Z" }));
    await Promise.all([first, second]);
    assert.equal(first, second);
    assert.equal(posts, 1);
  } finally {
    globalThis.fetch = original;
  }
});
