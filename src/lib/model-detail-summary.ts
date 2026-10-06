import type { Model } from "./types";

export interface ModelDetailActionProps {
  model: Pick<Model, "id" | "name">;
  catalog: Pick<Model, "id">[];
}

export function getModelDetailActionProps(model: Model, models: Model[]): ModelDetailActionProps {
  return {
    model: { id: model.id, name: model.name },
    catalog: models.map(({ id }) => ({ id })),
  };
}
