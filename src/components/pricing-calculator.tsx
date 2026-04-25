"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

function formatPrice(price: string | undefined): string {
  if (!price || price === "0") return "Free";
  const num = parseFloat(price);
  if (num < 0.00001) return `$${(num * 1000000).toFixed(2)}/M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/K`;
  return `$${num.toFixed(4)}/K`;
}

function formatCost(cost: number): string {
  if (cost < 0.00001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

interface Props {
  model: Model;
  className?: string;
}

export function PricingCalculator({ model, className }: Props) {
  const [inputTokens, setInputTokens] = React.useState(100000);
  const [outputTokens, setOutputTokens] = React.useState(50000);
  const [requests, setRequests] = React.useState(1000);
  const [open, setOpen] = React.useState(true);

  const p = model.pricing;
  const inputPrice = parseFloat(p?.prompt ?? "0") || 0;
  const outputPrice = parseFloat(p?.completion ?? "0") || 0;

  const inputCost = (inputTokens / 1000) * inputPrice;
  const outputCost = (outputTokens / 1000) * outputPrice;
  const totalPerRequest = inputCost + outputCost;
  const totalCost = totalPerRequest * requests;

  return (
    <Card className={`p-6 ${className ?? ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="font-heading text-lg">Cost Calculator</h2>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Input Tokens</label>
              <Input
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9"
              />
              <input
                type="range"
                min={0}
                max={1000000}
                step={1000}
                value={inputTokens}
                onChange={(e) => setInputTokens(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Output Tokens</label>
              <Input
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9"
              />
              <input
                type="range"
                min={0}
                max={500000}
                step={1000}
                value={outputTokens}
                onChange={(e) => setOutputTokens(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Requests</label>
              <Input
                type="number"
                value={requests}
                onChange={(e) => setRequests(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input cost</span>
              <span className="font-medium">{formatCost(inputCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Output cost</span>
              <span className="font-medium">{formatCost(outputCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Per request</span>
              <span className="font-semibold">{formatCost(totalPerRequest)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground font-medium">Total ({requests.toLocaleString()} req)</span>
              <span className="font-bold text-primary">{formatCost(totalCost)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
