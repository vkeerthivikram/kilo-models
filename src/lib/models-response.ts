import type { Model } from "./types";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function optionalStrings(value: unknown): boolean {
  return value == null || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}

export function parseModelsResponse(value: unknown): Model[] {
  if (!object(value) || !Array.isArray(value.data)) throw new Error("Invalid model catalog response");
  for (const model of value.data) {
    if (!object(model) || typeof model.id !== "string" || !model.id || typeof model.name !== "string" || typeof model.description !== "string"
      || !optionalStrings(model.supported_parameters) || (!optionalStrings(model.default_parameters) && !object(model.default_parameters))
      || (model.architecture != null && (!object(model.architecture) || !optionalStrings(model.architecture.input_modalities) || !optionalStrings(model.architecture.output_modalities)))
      || (model.autoRouting != null && (!object(model.autoRouting) || !optionalStrings(model.autoRouting.models)))) {
      throw new Error("Invalid model catalog entry");
    }
  }
  return value.data as Model[];
}
