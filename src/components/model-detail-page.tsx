import * as React from "react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ModelSpecsCard } from "@/components/model-specs-card";
import { ModelPricingCard } from "@/components/model-pricing-card";
import { ModelSafetyCard } from "@/components/model-safety-card";
import { SimilarModels } from "@/components/similar-models";
import { PricingCalculator } from "@/components/pricing-calculator";
import { findModel, getCatalog } from "@/lib/get-models";
import type { Model } from "@/lib/types";
import { getSimilarModels } from "@/lib/similar-models";
import { getModelProvider } from "@/lib/model-provider";
import { BackToDirectory } from "@/components/back-to-directory";
import { ModelDetailActions } from "@/components/model-detail-actions";
import { getModelDetailActionProps } from "@/lib/model-detail-summary";
import { ModelDescription } from "@/components/model-description";
import { RetirementBadge } from "@/components/retirement-badge";

function resolveModel(models: Model[], id: string, exact: boolean) {
  return exact ? models.find((model) => model.id === id) : findModel(models, id);
}

export async function modelDetailMetadata(id: string, exact = false) {
  try {
    const model = resolveModel((await getCatalog()).data, id, exact);
    if (!model) return {};
    return {
      title: `${model.name} — Kilo Models`,
      description: model.description,
      openGraph: {
        title: model.name,
        description: model.description,
        type: "website",
      },
    };
  } catch {
    return {};
  }
}

export async function renderModelDetail(id: string, exact = false) {
  const { data: allModels, excludedCount = 0 } = await getCatalog();
  const model = resolveModel(allModels, id, exact);

  if (!model) notFound();

  const similar = getSimilarModels(allModels, model);

  const provider = getModelProvider(model.id);
  const createdDate = Number.isFinite(model.created) && model.created > 0 ? new Date(model.created * 1000) : null;

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <BackToDirectory />

        <div>
          <div data-agent-catalog="Model description" data-model-id={model.id}>
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              {provider}
            </span>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <h1 className="font-heading text-4xl">{model.name}</h1>
              {model.isFree && (
                <Badge variant="secondary" className="text-xs">Free</Badge>
              )}
              <RetirementBadge expirationDate={model.expiration_date} />
            </div>
            <div className="mt-3"><ModelDescription description={model.description} /></div>
            {createdDate && !Number.isNaN(createdDate.getTime()) && (
              <p className="text-xs text-muted-foreground mt-1">
                Added {createdDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}
              </p>
            )}
          </div>
          <React.Suspense fallback={<p role="status" className="mt-5 text-sm text-muted-foreground">Loading model actions...</p>}>
            <ModelDetailActions {...getModelDetailActionProps(model, allModels)} catalogComplete={excludedCount === 0} />
          </React.Suspense>
        </div>

        <div data-agent-catalog="Model specifications and pricing" data-model-id={model.id} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelSpecsCard model={model} />
          <ModelPricingCard model={model} />
        </div>

        <React.Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Loading cost calculator...</p>}>
          <PricingCalculator model={model} />
        </React.Suspense>

        <ModelSafetyCard model={model} />

        <React.Suspense>
          <SimilarModels models={similar} />
        </React.Suspense>
      </div>
    </main>
  );
}
