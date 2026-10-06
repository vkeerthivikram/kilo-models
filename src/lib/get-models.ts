import { parseModelsResponse } from "./models-response";
import type { Model } from "./types";

export function findModel(models: Model[], id: string) {
  const exact = models.find((model) => model.id === id);
  if (exact) return exact;
  // Next can preserve escaped path delimiters in a single dynamic segment.
  try {
    const decoded = decodeURIComponent(id);
    return models.find((model) => model.id === decoded);
  } catch {
    return undefined;
  }
}

export async function getModels() {
  const response = await fetch("https://api.kilo.ai/api/gateway/models", { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Failed to load model catalog");
  return parseModelsResponse(await response.json());
}
