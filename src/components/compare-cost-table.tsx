"use client";

import * as React from "react";
import type { Model } from "@/lib/types";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateCost, formatCost } from "@/lib/cost-calculator";

export function CompareCostTable({ models }: { models: Model[] }) {
  const [inputTokens, setInputTokens] = React.useState(100000);
  const [outputTokens, setOutputTokens] = React.useState(50000);
  const [requests, setRequests] = React.useState(1000);
  const rows = models.map((model) => ({ model, ...calculateCost(model.pricing, inputTokens, outputTokens, requests) }))
    .sort((a, b) => (a.total ?? Infinity) - (b.total ?? Infinity));
  const cheapest = rows.find((row) => row.total !== null)?.total;

  return (
    <div className="space-y-4">
      <CalculatorInputs inputTokens={inputTokens} outputTokens={outputTokens} requests={requests} onInputTokens={setInputTokens} onOutputTokens={setOutputTokens} onRequests={setRequests} />
      <p className="text-xs text-muted-foreground">Input and output costs are per request. Totals include any listed request fee; cache, images, search, extra reasoning, and tiered pricing are excluded.</p>
      <div role="region" aria-label="Cost estimates" tabIndex={0} className="rounded-lg border overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring">
        <table className="w-full min-w-[600px] text-sm">
          <caption className="sr-only">Estimated costs, lowest available total first</caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="text-left p-3 font-medium">Model</th>
              <th scope="col" className="text-right p-3 font-medium">Input / request</th>
              <th scope="col" className="text-right p-3 font-medium">Output / request</th>
              <th scope="col" className="text-right p-3 font-medium">Total ({requests.toLocaleString("en-US")} requests)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, inputCost, outputCost, total }) => (
              <tr key={model.id} className={total !== null && total === cheapest ? "bg-primary/5" : ""}>
                <th scope="row" className="text-left p-3 font-medium">{model.name}</th>
                <td className="text-right p-3 tabular-nums">{formatCost(inputCost)}</td>
                <td className="text-right p-3 tabular-nums">{formatCost(outputCost)}</td>
                <td className="text-right p-3 font-semibold tabular-nums">{formatCost(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
