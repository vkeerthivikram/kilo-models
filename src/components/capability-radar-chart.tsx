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
import { getCapabilityData, getSpecificationValue } from "@/lib/chart-data";

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

interface SpecificationPoint {
  x: number;
  y: number;
  value?: number | null;
}

export function SpecificationShape({ points = [], stroke, fill }: {
  points?: SpecificationPoint[];
  stroke?: string;
  fill?: string;
}) {
  const known = (point: SpecificationPoint) => point.value != null && Number.isFinite(point.value);
  if (points.length > 0 && points.every(known)) {
    return <polygon points={points.map(({ x, y }) => `${x},${y}`).join(" ")} stroke={stroke} fill={fill} fillOpacity={0.15} />;
  }
  // Recharts maps null radar values to the center. Draw only known adjacent
  // points so missing specifications cannot look like a confirmed zero.
  return <g>
    {points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      return known(point) && known(next) ? <line key={`line-${index}`} x1={point.x} y1={point.y} x2={next.x} y2={next.y} stroke={stroke} /> : null;
    })}
    {points.map((point, index) => known(point) ? <circle key={`point-${index}`} cx={point.x} cy={point.y} r={3} fill={stroke} /> : null)}
  </g>;
}

export function CapabilityRadarChart({ models }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = getCapabilityData(models);

  return (
    <div>
    <p id="comparison-profile-description" className="text-xs leading-relaxed text-muted-foreground mb-3">
      Relative specifications within this selection (0–100), not quality scores or benchmarks.
      Context and max output compare token counts; supported parameter count compares available controls.
      These three axes divide each value by the selection&apos;s largest value. Low input price places the cheapest at 100
      and the most expensive at 0; equal known prices share 100. Unknown values leave gaps.
      Hover the chart or focus it and use arrow keys for actual values.
    </p>
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data} outerRadius="55%" accessibilityLayer>
        <PolarGrid stroke={isDark ? "#374151" : "#e5e7eb"} />
        <PolarAngleAxis dataKey="capability" tick={{ fontSize: 11 }}
          tickFormatter={(value) => value === "Supported parameters" ? "Parameters" : value} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
        {models.map((model, i) => (
          <Radar
            key={model.id}
            name={model.name}
            dataKey={`model${i}`}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            connectNulls={false}
            activeDot={false}
            shape={SpecificationShape}
          />
        ))}
        <Tooltip content={({ active, label }) => active && typeof label === "string" ? (
          <div className="max-w-[min(22rem,80vw)] rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md">
            <p className="mb-2 font-medium">{label === "Low input price" ? "Input price" : label}</p>
            <ul className="space-y-2">
              {models.map((model, index) => (
                <li key={model.id} className="grid gap-0.5">
                  <span className="flex items-center gap-1.5 break-words">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {model.name}
                  </span>
                  <span className="pl-3.5 tabular-nums">{getSpecificationValue(model, label)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
    </div>
  );
}
