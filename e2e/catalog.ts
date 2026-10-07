import type { Model } from "../src/lib/types";

/** Synthetic data only: enough models to exercise pagination and comparison. */
export const catalog: Model[] = Array.from({ length: 60 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `fixture/model-${number}`,
    name: `Fixture Model ${number}`,
    description: "A synthetic model for deterministic directory browser tests.",
    created: 1_700_000_000 + index,
    architecture: { input_modalities: ["text", "image"], output_modalities: ["text"], tokenizer: "fixture" },
    top_provider: { is_moderated: false, context_length: 128_000, max_completion_tokens: 8_000 },
    pricing: {
      prompt: String((index + 1) / 1_000_000), completion: "0.000002",
      input_cache_read: "0.0000005", input_cache_write: "0.0000015",
      request: index === 0 ? "0.02" : "0", image: index === 0 ? "0.03" : "0.001",
      web_search: index === 0 ? "0.01" : "0.001", internal_reasoning: "0.000002",
    },
    context_length: 128_000,
    supported_parameters: ["tools", "reasoning"],
    opencode: {}, preferredIndex: index, isFree: false,
  };
});
