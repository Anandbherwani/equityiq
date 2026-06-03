"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { FearGreed } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL_STYLES: Record<FearGreed["label"], string> = {
  Bullish: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Neutral: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Bearish: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function FearGreedGauge({ data }: { data: FearGreed }) {
  const chartData = [
    { name: "score", value: data.score },
    { name: "rest", value: 100 - data.score },
  ];
  const color =
    data.label === "Bullish"
      ? "#34d399"
      : data.label === "Bearish"
        ? "#fb7185"
        : "#fbbf24";

  return (
    <Card className="border-border/60 bg-card/80 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Fear & Greed</CardTitle>
        <Badge variant="outline" className={cn("text-xs", LABEL_STYLES[data.label])}>
          {data.label}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="relative h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                innerRadius={52}
                outerRadius={68}
                startAngle={180}
                endAngle={0}
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="var(--muted)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
            <span className="font-mono text-3xl font-bold tabular-nums">{data.score}</span>
            <span className="text-[10px] uppercase text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {data.drivers.map((d) => (
            <div key={d.name}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{d.name}</span>
                <span className="font-mono">{d.value}</span>
              </div>
              <Progress value={d.value} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
