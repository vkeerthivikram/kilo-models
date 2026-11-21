"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { ModelCard } from "@/components/model-card-v2";
import { RelatedModelResults } from "@/components/ui/catalog-results";
import { useCalculatorWorkload } from "@/hooks/use-calculator-workload";

interface Props {
  models: Model[];
}

export function SimilarModels({ models }: Props) {
  const { workload } = useCalculatorWorkload();
  if (models.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl">Similar Models</h2>
      <p className="text-sm text-muted-foreground">Alternatives ranked by modality and capability overlap, then context and price similarity. This is a specification match, not a quality benchmark.</p>
      <RelatedModelResults aria-label="Similar models" items={models.map(({ id, name }) => ({ value: id, label: name }))}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} workload={workload} showEstimate={false} />
        ))}
      </RelatedModelResults>
    </div>
  );
}
