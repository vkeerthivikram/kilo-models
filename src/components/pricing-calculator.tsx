"use client";

import * as React from "react";
import type { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { CalculatorInputs } from "./calculator-inputs";
import { calculateCost, formatCost } from "@/lib/cost-calculator";
import { ChevronDown } from "lucide-react";

export function PricingCalculator({ model, className }: { model: Model; className?: string }) {
  const [inputTokens, setInputTokens] = React.useState(100000);
  const [outputTokens, setOutputTokens] = React.useState(50000);
  const [requests, setRequests] = React.useState(1000);
  const [open, setOpen] = React.useState(true);
  const id = React.useId();
  const costs = calculateCost(model.pricing, inputTokens, outputTokens, requests);
  const rows = [
    ["Input cost per request", costs.inputCost],
    ["Output cost per request", costs.outputCost],
    ...(model.pricing?.request !== undefined ? [["Request fee", costs.requestCost]] as const : []),
    ["Per request", costs.perRequest],
    [`Total (${requests.toLocaleString("en-US")} requests)`, costs.total],
  ] as const;

  return (
    <Card className={`p-6 ${className ?? ""}`}>
      <h2>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} className="w-full flex items-center justify-between font-heading text-lg rounded focus-visible:outline-2 focus-visible:outline-ring">
          Cost Calculator
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <div id={id} hidden={!open} className="space-y-6">
        <CalculatorInputs inputTokens={inputTokens} outputTokens={outputTokens} requests={requests} onInputTokens={setInputTokens} onOutputTokens={setOutputTokens} onRequests={setRequests} />
        <div className="border-t pt-4 space-y-3 text-sm" aria-live="polite" aria-atomic="true">
          {rows.map(([label, cost], index) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{label}</span>
              <span className={index === rows.length - 1 ? "font-bold text-primary" : "font-medium"}>{formatCost(cost)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Estimate uses listed token rates and any request fee. Cache, images, search, extra reasoning, and tiered pricing are excluded. Unavailable rates cannot be estimated.</p>
      </div>
    </Card>
  );
}
