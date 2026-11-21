import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatPrice, formatContext } from "./format-price";
import { calculateCost } from "./cost-calculator";

test("underflowed decimal rates never display or calculate as zero", () => {
  for (const rate of ["1e-400", ".01e-400", "1e999"]) {
    assert.equal(formatPrice(rate), "—");
    assert.equal(calculateCost({ prompt: rate, completion: "0" }, 10, 0, 1).total, null);
  }
  assert.equal(formatPrice("0.0e-400"), "Free");
  assert.equal(calculateCost({ prompt: "0e-400", completion: "0" }, 10, 0, 1).total, 0);
  assert.equal(formatPrice("1e-6"), "$1/M");
});

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
  assert.equal(formatPrice("0.0000000004"), "<$0.001/M");
  assert.equal(formatPrice("0.0000001"), "$0.10/M");
  assert.equal(formatPrice("0.000000035"), "$0.035/M");
  assert.equal(formatPrice("0.000000195"), "$0.195/M");
});

test("formats context lengths", () => {
  assert.equal(formatContext(131072), "131K");
  assert.equal(formatContext(1_048_576), "1M");
  assert.equal(formatContext(1_500_000), "1.5M");
  assert.equal(formatContext(999_999), "999K");
  assert.equal(formatContext(512), "512");
  assert.equal(formatContext(0), "—");
  assert.equal(formatContext(undefined), "—");
});

test("rejects unknown sentinel, non-finite, empty and malformed prices", () => {
  for (const value of ["-1", "", " ", "0.1oops", "0x10", "0b10", "0o10", "Infinity", Infinity, -1]) {
    assert.equal(formatPrice(value), "—");
  }
  assert.equal(formatContext(Infinity), "—");
});
