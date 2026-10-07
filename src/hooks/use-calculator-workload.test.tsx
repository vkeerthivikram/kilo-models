import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { useCalculatorWorkload } from "./use-calculator-workload";
import { DEFAULT_WORKLOAD, parseCalculatorWorkload } from "../lib/calculator-workload";

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

test("directory and detail workloads agree on count and percentage boundaries", () => {
  const cases = [
    { search: "?inputTokens=0&outputTokens=0&requests=1&images=0&cachePercent=100", expected: { ...DEFAULT_WORKLOAD, inputTokens: 0, outputTokens: 0, requests: 1, cachePercent: 100 } },
    { search: "?inputTokens=9007199254740991&requests=1e3&cachePercent=0.5", expected: { ...DEFAULT_WORKLOAD, inputTokens: Number.MAX_SAFE_INTEGER, cachePercent: 0.5 } },
    { search: "?inputTokens=%20&outputTokens=Infinity&requests=-1&images=0.5&cachePercent=%20&period=year", expected: DEFAULT_WORKLOAD },
  ];
  for (const { search, expected } of cases) {
    let workload = DEFAULT_WORKLOAD;
    function Probe() { workload = useCalculatorWorkload().workload; return null; }
    renderToStaticMarkup(<NuqsTestingAdapter searchParams={search}><Probe /></NuqsTestingAdapter>);
    assert.deepEqual(workload, expected);
    assert.deepEqual(parseCalculatorWorkload(search), expected);
  }
});
