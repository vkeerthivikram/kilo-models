"use client";

import type { Model } from "@/lib/types";
import { PricingBarChart } from "@/components/pricing-bar-chart";
import { CapabilityRadarChart } from "@/components/capability-radar-chart";

export function ComparisonCharts({ models }: { models: Model[] }) {
  return (
    <div className="space-y-8 p-4 sm:p-6">
      <p className="text-xs leading-relaxed text-muted-foreground">The Overview table provides the same specifications and prices in text.</p>
      <section aria-labelledby="comparison-pricing-title">
        <h3 id="comparison-pricing-title" className="font-heading text-base mb-4">Pricing comparison</h3>
        <PricingBarChart models={models} />
      </section>
      <section aria-labelledby="comparison-profile-title" aria-describedby="comparison-profile-description">
        <h3 id="comparison-profile-title" className="font-heading text-base mb-4">Specification profile</h3>
        <CapabilityRadarChart models={models} />
      </section>
    </div>
  );
}
