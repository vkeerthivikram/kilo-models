"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { SafetyScoreBar, getDirectionForLabel, getSafetyRows } from "@/components/safety-score";

export function ModelSafetyCard({ model }: { model: Model }) {
  const e = model.enkrypt;
  const rows = e ? getSafetyRows(e) : [];
  if (!e || !rows.some(([, v]) => v != null)) return null;

  return (
    <Card data-agent-catalog="Safety report" data-model-id={model.id} className="p-6 space-y-4">
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
      <details>
        <DisclosureSummary className="min-h-11 cursor-pointer rounded py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">View safety metrics ({rows.filter(([, value]) => value != null).length})</DisclosureSummary>
        <p className="mb-3 max-w-prose text-xs leading-relaxed text-muted-foreground">These published measurements describe specific evaluations, not a guarantee of safety for your application.{rows.some(([label, score]) => score != null && getDirectionForLabel(label) === "unverified") && " Neutral bars indicate that the score direction is unverified."}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {rows
          .filter(([, v]) => v != null)
          .map(([label, score]) => (
            <SafetyScoreBar key={label} label={label} score={score as number} />
          ))}
      </div>
      </details>
    </Card>
  );
}
