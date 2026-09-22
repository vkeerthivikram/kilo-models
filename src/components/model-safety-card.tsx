"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            score >= 50 ? "bg-red-500/70" : score >= 25 ? "bg-amber-500/70" : "bg-emerald-500/70"
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

export function ModelSafetyCard({ model }: { model: Model }) {
  const e = model.enkrypt;
  if (!e || e.safety_score == null) return null;

  const rows: Array<[string, number | null | undefined]> = [
    ["Overall Safety", e.safety_score],
    ["Risk", e.risk_score],
    ["Bias", e.bias_score],
    ["CBRN", e.cbrn_score],
    ["Harmful", e.harmful_score],
    ["Insecure Code", e.insecure_code_score],
    ["Toxicity", e.toxicity_score],
    ["Jailbreak", e.jailbreak_score],
    ["Evasion", e.evasion_score],
    ["Robustness", e.robustness_score],
    ["NIST", e.nist_score],
    ["OWASP", e.owasp_score],
  ];

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-heading text-lg flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Safety Report
        </h2>
        {e.freshness && (
          <Badge variant="outline" className="text-[10px] capitalize">
            {e.freshness}
          </Badge>
        )}
        {e.provider && (
          <Badge variant="outline" className="text-[10px] font-mono">
            {e.provider}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {rows
          .filter(([, v]) => v != null)
          .map(([label, score]) => (
            <ScoreRow key={label} label={label} score={score as number} />
          ))}
      </div>
    </Card>
  );
}
