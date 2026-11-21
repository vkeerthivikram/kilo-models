"use client";

import type { Model } from "@/lib/types";
import { PricingBarChart } from "@/components/pricing-bar-chart";
import { CapabilityRadarChart } from "@/components/capability-radar-chart";
import { formatPricingTooltip, getCapabilityData, getPricingData, getSpecificationValue } from "@/lib/chart-data";

export function ComparisonCharts({ models }: { models: Model[] }) {
  const prices = getPricingData(models);
  const profile = getCapabilityData(models);
  return (
    <div className="space-y-8 p-4 sm:p-6">
      <p data-agent-catalog="Charts guide" className="text-xs leading-relaxed text-muted-foreground">The Overview table provides a summary. Chart values below include the plotted prices and specification scores.</p>
      <section aria-labelledby="comparison-pricing-title">
        <h3 id="comparison-pricing-title" className="font-heading text-base mb-4">Pricing comparison</h3>
        <PricingBarChart models={models} />
      </section>
      <section aria-labelledby="comparison-profile-title" aria-describedby="comparison-profile-description">
        <h3 id="comparison-profile-title" className="font-heading text-base mb-4">Specification profile</h3>
        <CapabilityRadarChart models={models} />
      </section>
      <section aria-labelledby="comparison-chart-values">
        <h3 id="comparison-chart-values" className="mb-4 font-heading text-base">Chart values</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {models.map((model, index) => (
            <article key={model.id} data-agent-catalog="Chart values" data-model-id={model.id}
              className="min-w-0 break-words rounded-lg border p-3 text-sm">
              <h4 className="mb-2 font-medium">{model.name}</h4>
              <dl className="space-y-1 tabular-nums">
                <div><dt className="inline font-medium">Input price </dt><dd className="inline">{formatPricingTooltip(prices[index].prompt)}</dd></div>
                <div><dt className="inline font-medium">Output price </dt><dd className="inline">{formatPricingTooltip(prices[index].completion)}</dd></div>
                {profile.map(({ capability, ...scores }) => {
                  const score = scores["model" + index];
                  return <div key={capability}>
                    <dt className="inline font-medium">{capability} </dt>
                    <dd className="inline">{getSpecificationValue(model, capability)}{typeof score === "number" && " · " + score + "/100"}</dd>
                  </div>;
                })}
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
