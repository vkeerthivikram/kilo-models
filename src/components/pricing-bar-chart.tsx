"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Model } from "@/lib/types";
import { useTheme } from "next-themes";
import { getPricingData, formatPricingTooltip, pricingAxisLabel } from "@/lib/chart-data";

interface Props {
  models: Model[];
}

export function PricingBarChart({ models }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = getPricingData(models);

  const promptColor = isDark ? "#a78bfa" : "#7c3aed";
  const completionColor = isDark ? "#f472b6" : "#db2777";

  return (
    <div>
    <p className="text-xs text-muted-foreground mb-3">USD per 1M tokens. Unavailable prices are omitted.</p>
    <ResponsiveContainer width="100%" height={Math.max(300, models.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
        <YAxis type="category" dataKey="name" width={128} tick={{ fontSize: 12 }} tickFormatter={pricingAxisLabel} />
        <Tooltip
          formatter={(value, name) => [formatPricingTooltip(value), name]}
          contentStyle={{
            backgroundColor: isDark ? "#1e1e2e" : "#fff",
            border: "none",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey="prompt" name="Prompt" fill={promptColor} radius={[0, 4, 4, 0]} />
        <Bar dataKey="completion" name="Completion" fill={completionColor} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
