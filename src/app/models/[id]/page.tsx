import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Model } from "@/lib/types";
import { ModelSpecsCard } from "@/components/model-specs-card";
import { ModelPricingCard } from "@/components/model-pricing-card";
import { SimilarModels } from "@/components/similar-models";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  try {
    const res = await fetch("https://api.kilo.ai/api/gateway/models", {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return (data.data ?? []).map((m: Model) => ({ id: encodeURIComponent(m.id) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  try {
    const res = await fetch("https://api.kilo.ai/api/gateway/models", {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    const model = (data.data ?? []).find((m: Model) => m.id === decoded);
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
  const decoded = decodeURIComponent(id);

  let model: Model | null = null;
  let allModels: Model[] = [];

  try {
    const res = await fetch("https://api.kilo.ai/api/gateway/models", {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    allModels = data.data ?? [];
    model = allModels.find((m: Model) => m.id === decoded) ?? null;
  } catch {}

  if (!model) notFound();

  const similar = allModels
    .filter((m) => m.id !== model!.id)
    .filter((m) => {
      const sameProvider = m.id.split("/")[0] === model!.id.split("/")[0];
      const sameInput = (m.architecture?.input_modalities ?? []).some((mod) =>
        (model!.architecture?.input_modalities ?? []).includes(mod)
      );
      return sameProvider || sameInput;
    })
    .slice(0, 6);

  const provider = model.id.split("/")[0];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>

        <div>
          <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
            {provider}
          </span>
          <h1 className="font-heading text-4xl mt-1">{model.name}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{model.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelSpecsCard model={model} />
          <ModelPricingCard model={model} />
        </div>

        {/* PricingCalculator will be added in Task 5 */}

        <SimilarModels models={similar} />
      </div>
    </div>
  );
}