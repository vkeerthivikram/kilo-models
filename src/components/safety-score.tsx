"use client";

import { cn } from "@/lib/utils";
import type { EnkryptSafety } from "@/lib/types";

export type SafetyDirection = "higherIsBetter" | "lowerIsBetter";

const LOWER_IS_BETTER = new Set([
  "Risk",
  "Bias",
  "CBRN",
  "Harmful",
  "Insecure Code",
  "Toxicity",
  "Jailbreak",
  "Evasion",
]);

export function getScoreColor(score: number, direction: SafetyDirection): string {
  if (direction === "lowerIsBetter") {
    return score >= 50 ? "bg-red-500/70" : score >= 25 ? "bg-amber-500/70" : "bg-emerald-500/70";
  }
  return score >= 75 ? "bg-emerald-500/70" : score >= 50 ? "bg-amber-500/70" : "bg-red-500/70";
}

export function getDirectionForLabel(label: string): SafetyDirection {
  return LOWER_IS_BETTER.has(label) ? "lowerIsBetter" : "higherIsBetter";
}

export function SafetyScoreBar({
  label,
  score,
  className,
  direction,
}: {
  label: string;
  score: number;
  className?: string;
  direction?: SafetyDirection;
}) {
  const dir = direction ?? getDirectionForLabel(label);
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", getScoreColor(score, dir))}
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
