"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BacktestComparison } from "@/lib/types";

function horizonKey(label: string): string {
  return label.replace(" Month", "M").replace(" ", "");
}

export function BacktestCharts({ comparison }: { comparison: BacktestComparison[] }) {
  const avgReturnData = comparison.map((c) => ({
    horizon: horizonKey(c.horizon),
    recommendations: c.recommendations?.avg_return_pct ?? 0,
    nifty: c.nifty?.avg_return_pct ?? 0,
    sector: c.sector?.avg_return_pct ?? 0,
    alphaNifty: c.alpha_avg_return_pct ?? 0,
  }));

  const hitRateData = comparison.map((c) => ({
    horizon: horizonKey(c.horizon),
    recommendations: c.recommendations?.hit_rate_pct ?? 0,
    nifty: c.nifty?.hit_rate_pct ?? 0,
    sector: c.sector?.hit_rate_pct ?? 0,
  }));

  const riskData = comparison.map((c) => ({
    horizon: horizonKey(c.horizon),
    sharpe: c.recommendations?.sharpe_ratio ?? 0,
    sortino: c.recommendations?.sortino_ratio ?? 0,
    maxDd: c.recommendations?.max_drawdown_pct ?? 0,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Average return %</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgReturnData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Bar dataKey="recommendations" fill="#22d3ee" name="Picks" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nifty" fill="#a78bfa" name="Nifty" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sector" fill="#fbbf24" name="Sector" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Hit rate %</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hitRateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Bar dataKey="recommendations" fill="#34d399" name="Picks" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nifty" fill="#a78bfa" name="Nifty" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sector" fill="#fbbf24" name="Sector" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Risk metrics (picks)</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Bar dataKey="sharpe" fill="#22d3ee" name="Sharpe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sortino" fill="#34d399" name="Sortino" radius={[4, 4, 0, 0]} />
              <Bar dataKey="maxDd" fill="#f87171" name="Max DD %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
