import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogStatus } from "./catalog-status";

test("refresh failure names stale catalog and offers retry without hiding its update time", () => {
  const markup = renderToStaticMarkup(<CatalogStatus fetchedAt="2026-10-06T06:30:00.000Z" loading={false} revalidating={false} error={new Error("Offline")} onRefresh={() => {}} />);
  assert.match(markup, /Refresh failed\. Showing last loaded catalog\./);
  assert.match(markup, /datetime="2026-10-06T06:30:00.000Z"/i);
  assert.match(markup, /Retry refresh/);
  assert.match(markup, /Hourly cache/);
});
