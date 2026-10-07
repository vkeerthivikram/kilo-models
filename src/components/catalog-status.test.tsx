import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogStatus } from "./catalog-status";

test("partial catalog notices disclose excluded entries alongside refresh errors", () => {
  for (const [excludedCount, notice] of [
    [1, "1 catalog entry could not be verified and was hidden."],
    [2, "2 catalog entries could not be verified and were hidden."],
  ] as const) {
    const markup = renderToStaticMarkup(<CatalogStatus fetchedAt="2026-10-06T06:30:00.000Z" loading={false} revalidating={false} error={new Error("Offline")} excludedCount={excludedCount} onRefresh={() => {}} />);
    assert.ok(markup.includes(`Refresh failed. Showing last loaded catalog. ${notice}`));
    assert.equal((markup.match(/role="status"/g) ?? []).length, 1);
    assert.match(markup, /aria-live="polite"/);
  }
});

test("catalog keeps exactly one empty status before loading and after healthy refresh", () => {
  for (const fetchedAt of [null, "2026-10-06T06:30:00.000Z"]) {
    const markup = renderToStaticMarkup(<CatalogStatus fetchedAt={fetchedAt} loading={false} revalidating={false} error={null} excludedCount={0} onRefresh={() => {}} />);
    assert.equal((markup.match(/role="status"/g) ?? []).length, 1);
    assert.match(markup, /<p role="status" aria-live="polite" class="sr-only"><\/p>/);
    assert.doesNotMatch(markup, /could not be verified/);
  }
});

test("refresh failure names stale catalog and offers retry without hiding its update time", () => {
  const markup = renderToStaticMarkup(<CatalogStatus fetchedAt="2026-10-06T06:30:00.000Z" loading={false} revalidating={false} error={new Error("Offline")} onRefresh={() => {}} />);
  assert.match(markup, /Refresh failed\. Showing last loaded catalog\./);
  assert.match(markup, /datetime="2026-10-06T06:30:00.000Z"/i);
  assert.match(markup, /Retry refresh/);
  assert.match(markup, /Hourly cache/);
});
