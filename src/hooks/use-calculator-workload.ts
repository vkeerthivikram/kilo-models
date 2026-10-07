"use client";

import { createParser, useQueryStates } from "nuqs";
import { DEFAULT_WORKLOAD, parseCount, parsePercent, parseWorkloadPeriod, type CalculatorWorkload } from "@/lib/calculator-workload";

const countParser = (minimum: number, fallback: number) => createParser({
  parse: (value) => parseCount(value, minimum), serialize: String,
}).withDefault(fallback);

const parsers = {
  inputTokens: countParser(0, DEFAULT_WORKLOAD.inputTokens),
  outputTokens: countParser(0, DEFAULT_WORKLOAD.outputTokens),
  requests: countParser(1, DEFAULT_WORKLOAD.requests),
  images: countParser(0, 0), searches: countParser(0, 0), cacheWriteTokens: countParser(0, 0),
  cachePercent: createParser({
    parse: parsePercent, serialize: String,
  }).withDefault(0),
  period: createParser({ parse: parseWorkloadPeriod, serialize: String }).withDefault(DEFAULT_WORKLOAD.period),
};

export function useCalculatorWorkload() {
  // Shared URL state keeps directory, comparison, reloads and Back in agreement.
  const [workload, setParams] = useQueryStates(parsers, { shallow: true });
  const setWorkload = (value: CalculatorWorkload) => { void setParams(value); };
  return { workload, setWorkload };
}
