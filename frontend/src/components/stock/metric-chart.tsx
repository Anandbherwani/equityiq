"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function MetricChart({
  data,
  dataKey,
  color = "#22d3ee",
}: {
  data: { label: string; value: number }[];
  dataKey?: string;
  color?: string;
}) {
  const key = dataKey || "value";
  if (!data.some((d) => d.value)) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No fundamental data in Tab 6</p>
    );
  }

  return (
    <div className="h-48 w-full min-h-[12rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
