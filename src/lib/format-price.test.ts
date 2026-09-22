import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatPrice, formatContext } from "./format-price";

test("formats token prices per million tokens", () => {
  assert.equal(formatPrice("0.000003"), "$3/M");
  assert.equal(formatPrice("0.000015"), "$15/M");
  assert.equal(formatPrice(0.0000125), "$12.50/M");
});

test("treats zero and missing as distinct values", () => {
  assert.equal(formatPrice("0"), "Free");
  assert.equal(formatPrice(undefined), "—");
  assert.equal(formatPrice("not-a-number"), "—");
});

test("keeps tiny prices readable", () => {
  assert.equal(formatPrice("0.0000000004"), "<$0.01/M");
  assert.equal(formatPrice("0.0000001"), "$0.10/M");
});

test("formats context lengths", () => {
  assert.equal(formatContext(131072), "131K");
  assert.equal(formatContext(1_048_576), "1M");
  assert.equal(formatContext(512), "512");
  assert.equal(formatContext(0), "—");
  assert.equal(formatContext(undefined), "—");
});
