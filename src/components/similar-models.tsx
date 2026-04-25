"use client";

import * as React from "react";
import Link from "next/link";
import { Model } from "@/lib/types";
import { ModelCard } from "@/components/model-card-v2";

interface Props {
  models: Model[];
}

export function SimilarModels({ models }: Props) {
  if (models.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl">Similar Models</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Link key={model.id} href={`/models/${encodeURIComponent(model.id)}`}>
            <ModelCard
              model={model}
              onSelect={() => {}}
              isCompared={false}
              onToggleCompare={() => {}}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}