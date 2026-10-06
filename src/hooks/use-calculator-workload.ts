"use client";

import { createParser, parseAsStringLiteral, useQueryStates } from "nuqs";
import { DEFAULT_WORKLOAD, type CalculatorWorkload } from "@/lib/calculator-workload";

const countParser = (minimum: number, fallback: number) => createParser({
  parse: (value) => {
    const count = value.trim() === "" ? NaN : Number(value);
    return Number.isSafeInteger(count) && count >= minimum ? count : null;
  }, serialize: String,
}).withDefault(fallback);

const parsers = {
  inputTokens: countParser(0, DEFAULT_WORKLOAD.inputTokens),
  outputTokens: countParser(0, DEFAULT_WORKLOAD.outputTokens),
  requests: countParser(1, DEFAULT_WORKLOAD.requests),
  images: countParser(0, 0), searches: countParser(0, 0), cacheWriteTokens: countParser(0, 0),
  cachePercent: createParser({
    parse: (value) => {
      const percent = value.trim() === "" ? NaN : Number(value);
      return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : null;
    }, serialize: String,
  }).withDefault(0),
  period: parseAsStringLiteral(["batch", "month"] as const).withDefault("batch"),
};

export function useCalculatorWorkload() {
  // Shared URL state keeps directory, comparison, reloads and Back in agreement.
  const [workload, setParams] = useQueryStates(parsers, { shallow: true });
  const setWorkload = (value: CalculatorWorkload) => { void setParams(value); };
  return { workload, setWorkload };
}
