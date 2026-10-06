import * as React from "react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ModelSpecsCard } from "@/components/model-specs-card";
import { ModelPricingCard } from "@/components/model-pricing-card";
import { ModelSafetyCard } from "@/components/model-safety-card";
import { SimilarModels } from "@/components/similar-models";
import { PricingCalculator } from "@/components/pricing-calculator";
import { findModel, getModels } from "@/lib/get-models";
import { getSimilarModels } from "@/lib/similar-models";
import { BackToDirectory } from "@/components/back-to-directory";
import { ModelDetailActions } from "@/components/model-detail-actions";
import { getModelDetailActionProps } from "@/lib/model-detail-summary";
import { ModelDescription } from "@/components/model-description";
import { RetirementBadge } from "@/components/retirement-badge";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const model = findModel(await getModels(), id);
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

export default async function ModelPage({ params }: Props) {
  const { id } = await params;

  const allModels = await getModels();
  const model = findModel(allModels, id);

  if (!model) notFound();

  const similar = getSimilarModels(allModels, model);

  const provider = model.id.split("/")[0];

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <BackToDirectory />

        <div>
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
          {model.created > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Added {new Date(model.created * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
          <React.Suspense fallback={<p className="mt-5 text-sm text-muted-foreground">Loading model actions...</p>}>
            <ModelDetailActions {...getModelDetailActionProps(model, allModels)} />
          </React.Suspense>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelSpecsCard model={model} />
          <ModelPricingCard model={model} />
        </div>

        <ModelSafetyCard model={model} />

        <React.Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Loading cost calculator...</p>}>
          <PricingCalculator model={model} />
        </React.Suspense>

        <SimilarModels models={similar} />
      </div>
    </main>
  );
}
