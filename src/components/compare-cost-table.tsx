"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";

function formatCost(cost: number): string {
  if (cost < 0.00001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

interface Props {
  models: Model[];
}

export function CompareCostTable({ models }: Props) {
  const [inputTokens, setInputTokens] = React.useState(100000);
  const [outputTokens, setOutputTokens] = React.useState(50000);
  const [requests, setRequests] = React.useState(1000);

  const rows = React.useMemo(() => {
    return models
      .map((m) => {
        const inputPrice = parseFloat(m.pricing?.prompt ?? "0") || 0;
        const outputPrice = parseFloat(m.pricing?.completion ?? "0") || 0;
        const inputCost = (inputTokens / 1000) * inputPrice;
        const outputCost = (outputTokens / 1000) * outputPrice;
        const total = (inputCost + outputCost) * requests;
        return { model: m, total, inputCost, outputCost };
      })
      .sort((a, b) => a.total - b.total);
  }, [models, inputTokens, outputTokens, requests]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Input Tokens</label>
          <Input
            type="number"
            value={inputTokens}
            onChange={(e) => setInputTokens(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Output Tokens</label>
          <Input
            type="number"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Requests</label>
          <Input
            type="number"
            value={requests}
            onChange={(e) => setRequests(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-9"
          />
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Model</th>
              <th className="text-right p-3 font-medium">Input</th>
              <th className="text-right p-3 font-medium">Output</th>
              <th className="text-right p-3 font-medium">Total ({requests.toLocaleString()})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, inputCost, outputCost, total }, i) => (
              <tr key={model.id} className={i === 0 ? "bg-primary/5" : ""}>
                <td className="p-3 font-medium">
                  {i === 0 && <ArrowUpDown className="inline h-3 w-3 mr-1.5 text-primary" />}
                  {model.name.split("/").pop()}
                </td>
                <td className="text-right p-3">{formatCost(inputCost)}</td>
                <td className="text-right p-3">{formatCost(outputCost)}</td>
                <td className="text-right p-3 font-semibold">{formatCost(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
