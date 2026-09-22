"use client";

import * as React from "react";
import { Model } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { SafetyScoreBar, getSafetyRows } from "@/components/safety-score";

export function ModelSafetyCard({ model }: { model: Model }) {
  const e = model.enkrypt;
  if (!e || e.safety_score == null) return null;

  const rows = getSafetyRows(e);

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
            <SafetyScoreBar key={label} label={label} score={score as number} />
          ))}
      </div>
    </Card>
  );
}
