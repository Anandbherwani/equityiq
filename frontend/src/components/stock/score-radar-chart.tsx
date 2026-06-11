"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface ScoreDimension {
  subject: string;
  score: number;
}

interface ScoreRadarChartProps {
  value: number | null | undefined;      // Valuation
  quality: number | null | undefined;    // Fundamentals
  growth: number | null | undefined;     // Growth
  safety: number | null | undefined;     // Financial strength
  momentum: number | null | undefined;   // Technical momentum
}

function clamp(v: number | null | undefined): number {
  if (v == null || !isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function scoreColor(avg: number): string {
  if (avg >= 65) return "#3fb950";
  if (avg >= 45) return "#d29922";
  return "#f85149";
}

export function ScoreRadarChart({
  value,
  quality,
  growth,
  safety,
  momentum,
}: ScoreRadarChartProps) {
  const data: ScoreDimension[] = [
    { subject: "Value",    score: clamp(value) },
    { subject: "Quality",  score: clamp(quality) },
    { subject: "Growth",   score: clamp(growth) },
    { subject: "Safety",   score: clamp(safety) },
    { subject: "Momentum", score: clamp(momentum) },
  ];

  const scores = data.map((d) => d.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const color = scoreColor(avg);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart
        cx="50%"
        cy="50%"
        outerRadius="72%"
        data={data}
        margin={{ top: 8, right: 20, bottom: 8, left: 20 }}
      >
        <PolarGrid
          stroke="var(--border)"
          strokeWidth={1}
          gridType="polygon"
        />
        <PolarAngleAxis
          dataKey="subject"
          tick={{
            fill: "var(--muted-foreground)" as string,
            fontSize: 10,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
          }}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke={color}
          fill={color}
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
          activeDot={{ fill: color, strokeWidth: 0, r: 4 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ScoreDimensionBar({
  label,
  score,
}: {
  label: string;
  score: number | null | undefined;
}) {
  const v = clamp(score);
  const color = scoreColor(v);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums" style={{ color }}>
          {v || "—"}
        </span>
      </div>
      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${v}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
