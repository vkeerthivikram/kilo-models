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

function normalize(value: number, max: number): number {
  return Math.round((value / max) * 100);
}

const COLORS = [
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb923c",
];

interface Props {
  models: Model[];
}

export function CapabilityRadarChart({ models }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const maxContext = Math.max(...models.map((m) => m.context_length ?? 0), 1);
  const maxTokens = Math.max(...models.map((m) => m.top_provider?.max_completion_tokens ?? 0), 1);
  const maxParams = Math.max(...models.map((m) => (m.supported_parameters ?? []).length), 1);
  const avgPromptPrice = models.reduce((acc, m) => acc + parseFloat(m.pricing?.prompt ?? "0"), 0) / Math.max(models.length, 1);

  const data = models.map((m) => ({
    name: m.name.split("/").pop() ?? m.name,
    context: normalize(m.context_length ?? 0, maxContext),
    tokens: normalize(m.top_provider?.max_completion_tokens ?? 0, maxTokens),
    pricing: avgPromptPrice > 0 ? Math.round(((avgPromptPrice - parseFloat(m.pricing?.prompt ?? "0")) / avgPromptPrice) * 100) : 0,
    params: normalize((m.supported_parameters ?? []).length, maxParams),
  }));

  const axes = ["context", "tokens", "pricing", "params"] as const;
  const axisLabels: Record<string, string> = {
    context: "Context",
    tokens: "Max Tokens",
    pricing: "Low Price",
    params: "Parameters",
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke={isDark ? "#374151" : "#e5e7eb"} />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
        {axes.map((axis, i) => (
          <Radar
            key={axis}
            name={axisLabels[axis]}
            dataKey={axis}
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
  );
}
