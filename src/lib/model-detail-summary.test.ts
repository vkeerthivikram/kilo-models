import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getModelDetailActionProps } from "./model-detail-summary";
import type { Model } from "./types";

test("detail actions serialize only the selected identity and catalog IDs", () => {
  const selected = { id: "provider/selected", name: "Selected model", description: "Long description", pricing: { prompt: "0.01" }, opencode: { variants: { huge: { effort: "high" } } } } as unknown as Model;
  const other = { ...selected, id: "provider/other", name: "Other model" };
  assert.deepEqual(getModelDetailActionProps(selected, [selected, other]), {
    model: { id: "provider/selected", name: "Selected model" },
    catalog: [{ id: "provider/selected" }, { id: "provider/other" }],
  });
});
