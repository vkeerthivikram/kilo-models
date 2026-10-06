import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { useCalculatorWorkload } from "./use-calculator-workload";
import { DEFAULT_WORKLOAD } from "../lib/calculator-workload";

test("calculator URL restores all usage fields consistently in multiple consumers", () => {
  const snapshots: ReturnType<typeof useCalculatorWorkload>["workload"][] = [];
  function Probe() { snapshots.push(useCalculatorWorkload().workload); return null; }
  renderToStaticMarkup(<NuqsTestingAdapter searchParams="?inputTokens=4000&outputTokens=100&requests=3&period=month&cachePercent=12.5&images=2&searches=1&cacheWriteTokens=500"><Probe /><Probe /></NuqsTestingAdapter>);
  assert.deepEqual(snapshots[0], { inputTokens: 4000, outputTokens: 100, requests: 3, period: "month", cachePercent: 12.5, images: 2, searches: 1, cacheWriteTokens: 500 });
  assert.deepEqual(snapshots[1], snapshots[0]);
});

test("calculator URL rejects invalid integer counts, unsafe values and percentages", () => {
  let workload = DEFAULT_WORKLOAD;
  function Probe() { workload = useCalculatorWorkload().workload; return null; }
  renderToStaticMarkup(<NuqsTestingAdapter searchParams="?inputTokens=1.5&outputTokens=-2&requests=0&period=year&cachePercent=101&images=9007199254740992&searches=Infinity&cacheWriteTokens="><Probe /></NuqsTestingAdapter>);
  assert.deepEqual(workload, DEFAULT_WORKLOAD);
});
