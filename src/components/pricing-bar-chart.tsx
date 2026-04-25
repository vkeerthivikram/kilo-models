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

interface Props {
  models: Model[];
}

export function PricingBarChart({ models }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = models.map((m) => ({
    name: m.name.split("/").pop() ?? m.name,
    prompt: parseFloat(m.pricing?.prompt ?? "0") || 0,
    completion: parseFloat(m.pricing?.completion ?? "0") || 0,
  }));

  const promptColor = isDark ? "#a78bfa" : "#7c3aed";
  const completionColor = isDark ? "#f472b6" : "#db2777";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(6)}`, ""]}
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
  );
}
