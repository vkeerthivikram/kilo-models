import type { Model } from "../src/lib/types";

const routeIds = ["p/q", "p%2Fq", "p%252Fq", "p/100%", ".", "..", "fixture/model-59", "~fixture/model-60:free"];

/** Synthetic data only: enough models to exercise pagination and comparison. */
export const catalog: Model[] = Array.from({ length: 60 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: routeIds[index - 52] ?? `fixture/model-${number}`,
    name: `Fixture Model ${number}`,
    description: "A synthetic model for deterministic directory browser tests.",
    created: 1_700_000_000 + index,
    architecture: { input_modalities: ["text", "image"], output_modalities: ["text"], tokenizer: "fixture" },
    top_provider: { is_moderated: false, context_length: number === "60" ? 2048 : 128_000, max_completion_tokens: number === "60" ? 1000 : 8_000 },
    pricing: {
      prompt: number === "59" ? "-1" : number === "60" ? "0" : String((index + 1) / 1_000_000),
      completion: number === "59" ? "-1" : number === "60" ? "0" : "0.000002",
      input_cache_read: "0.0000005", input_cache_write: "0.0000015",
      request: index === 0 ? "0.02" : "0", image: "0.0000015",
      web_search: index === 0 ? "0.01" : "0.001", internal_reasoning: "0.000002",
    },
    context_length: 128_000,
    supported_parameters: ["tools", "reasoning"],
    ...(number === "59" ? { enkrypt: { safety_score: 19.9, nist_score: 13, owasp_score: 14 } } : {}),
    ...(index === 0 ? { mayTrainOnYourPrompts: false, terminalBench: { overallScore: 0.87 } } : {}),
    ...(number === "60" ? { mayTrainOnYourPrompts: true } : {}),
    opencode: {}, preferredIndex: index, isFree: number === "60",
  };
});
