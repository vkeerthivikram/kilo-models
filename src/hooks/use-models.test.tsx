import { strict as assert } from "node:assert";
import { test } from "node:test";
import * as React from "react";
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

test("aborting an in-flight refresh clears revalidating and allows subsequent refreshes", async () => {
  const internals = (React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
  }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previousH = internals.H;
  const originalFetch = globalThis.fetch;
  const states: unknown[] = [];
  const refs: { current: unknown }[] = [];
  let stateIndex = 0;
  let refIndex = 0;
  let mountEffect: (() => (() => void) | void) | undefined;
  let posts = 0;

  internals.H = {
    useState(initial: unknown) {
      const idx = stateIndex++;
      if (!(idx in states)) states[idx] = typeof initial === "function" ? (initial as () => unknown)() : initial;
      return [states[idx], (next: unknown) => {
        states[idx] = typeof next === "function" ? (next as (prev: unknown) => unknown)(states[idx]) : next;
      }];
    },
    useRef(initial: unknown) {
      const idx = refIndex++;
      if (!(idx in refs)) refs[idx] = { current: initial };
      return refs[idx];
    },
    useCallback(fn: unknown) {
      return fn;
    },
    useEffect(fn: () => (() => void) | void) {
      mountEffect = fn;
    },
  };

  const useModelsProbe = () => {
    stateIndex = 0;
    refIndex = 0;
    return useModels();
  };

  try {
    globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
      if (init?.method === "POST") {
        posts++;
        if (posts === 1) {
          return new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError")));
          });
        }
      }
      return Promise.resolve(Response.json({ data: [], fetchedAt: "2026-01-01T00:00:00Z" }));
    }) as typeof fetch;

    let hook = useModelsProbe();
    const cleanup = mountEffect?.();
    await Promise.resolve();
    const abortedRefresh = hook.refresh();
    hook = useModelsProbe();
    assert.equal(hook.revalidating, true);
    if (typeof cleanup === "function") cleanup();
    await abortedRefresh;
    hook = useModelsProbe();
    assert.equal(hook.revalidating, false);
    await hook.refresh();
    assert.equal(posts, 2);
    assert.equal(useModelsProbe().revalidating, false);
  } finally {
    internals.H = previousH;
    globalThis.fetch = originalFetch;
  }
});
