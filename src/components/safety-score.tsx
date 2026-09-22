"use client";

import { cn } from "@/lib/utils";
import type { EnkryptSafety } from "@/lib/types";

export function SafetyScoreBar({
  label,
  score,
  className,
}: {
  label: string;
  score: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
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

export function getSafetyRows(e: EnkryptSafety): Array<[string, number | null | undefined]> {
  return [
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
}
