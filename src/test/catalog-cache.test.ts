import { strict as assert } from "node:assert";
import { test } from "node:test";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";
import { version as nextVersion } from "next/package.json";
import { assertCatalogTestCompatibility } from "./catalog-cache";

test("catalog test cache fails loudly when its pinned Next internals change", () => {
  assert.doesNotThrow(() => assertCatalogTestCompatibility(nextVersion, workAsyncStorage));
  for (const runtime of [null, {}, { run() {} }, { getStore() {} }]) {
    assert.throws(() => assertCatalogTestCompatibility(nextVersion, runtime), /recheck src\/test\/catalog-cache\.ts/i);
  }
  assert.throws(() => assertCatalogTestCompatibility("16.4.0", workAsyncStorage), /recheck src\/test\/catalog-cache\.ts/i);
});
