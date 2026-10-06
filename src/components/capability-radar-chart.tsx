"use client";

import * as React from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Model } from "@/lib/types";
import { useTheme } from "next-themes";
import { getCapabilityData } from "@/lib/chart-data";

const COLORS = [
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb923c",
  "#22d3ee",
  "#f87171",
  "#a3e635",
  "#c084fc",
];

interface Props {
  models: Model[];
}

export function CapabilityRadarChart({ models }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = getCapabilityData(models);

  return (
    <div>
    <p className="text-xs text-muted-foreground mb-3">Relative scores within this selection (0–100). Unavailable prices have no score.</p>
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data}>
        <PolarGrid stroke={isDark ? "#374151" : "#e5e7eb"} />
        <PolarAngleAxis dataKey="capability" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
        {models.map((model, i) => (
          <Radar
            key={model.id}
            name={model.name}
            dataKey={`model${i}`}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
          />
        ))}
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? "#1e1e2e" : "#fff",
            border: "none",
            borderRadius: "8px",
          }}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
    </div>
  );
}
