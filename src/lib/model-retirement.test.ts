import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getRetirementStatus, parseRetirementDate } from "./model-retirement";
import { matchesModelFilters, getFilterCounts } from "./model-filtering";
import type { Model } from "./types";

test("date-only retirement remains available through its UTC date", () => {
  assert.equal(getRetirementStatus("2026-10-31", Date.parse("2026-10-31T23:59:59Z"))?.retired, false);
  assert.equal(getRetirementStatus("2026-10-31", Date.parse("2026-11-01T00:00:00Z"))?.retired, true);
  assert.equal(getRetirementStatus("2026-10-31T12:00:00Z", Date.parse("2026-10-31T12:00:00Z"))?.retired, true);
});

test("zoned retirement timestamps accept RFC 3339 fractional seconds beyond milliseconds", () => {
  for (const value of ["2026-10-31T12:00:00.123456Z", "2026-10-31T14:00:00.123456789123+02:00"]) {
    assert.equal(parseRetirementDate(value)?.deadline, Date.parse("2026-10-31T12:00:00.123Z"));
    assert.equal(getRetirementStatus(value, Date.parse("2026-10-31T12:00:00.122Z"))?.retired, false);
    assert.equal(getRetirementStatus(value, Date.parse("2026-10-31T12:00:00.124Z"))?.retired, true);
  }
});

test("invalid or missing dates do not imply retirement and upcoming dates use 30 days", () => {
  for (const value of [null, undefined, "", "soon", "2026-02-30", "2026-13-01", "2026-10-31T12:00:00", "2026-02-30T12:00:00Z"])
    assert.equal(parseRetirementDate(value), null);
  const now = Date.parse("2026-10-06T00:00:00Z");
  assert.equal(getRetirementStatus("2026-10-31", now)?.soon, true);
  assert.equal(getRetirementStatus("2026-12-31", now)?.soon, false);
  assert.equal(getRetirementStatus("2026-01-01", 0), null);
});

test("hide retired filters results and facets while keeping unknown and upcoming models", () => {
  const models = [
    { id: "old/model", expiration_date: "2026-01-01" },
    { id: "new/model", expiration_date: "2026-10-31" },
    { id: "unknown/model", expiration_date: null },
  ].map((model) => ({ ...model, name: model.id, description: "", isFree: true })) as Model[];
  const filters = { search: "", free: false, inputModalities: [], outputModalities: [], providers: [],
    reasoning: false, tools: false, fav: false, minContext: null, maxInputPrice: null, maxOutputPrice: null,
    hideRetired: true, now: Date.parse("2026-10-06T00:00:00Z") };
  assert.deepEqual(models.filter((model) => matchesModelFilters(model, filters, [])).map((model) => model.id), ["new/model", "unknown/model"]);
  assert.deepEqual(getFilterCounts(models, filters, []).providers, { new: 1, unknown: 1 });
  assert.equal(models.filter((model) => matchesModelFilters(model, { ...filters, hideRetired: false }, [])).length, 3);
});
