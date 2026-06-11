"use client";

import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Legend, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { fetchClientApi } from "@/lib/client-api";

type MonthlyReturn = { month: string; portfolio_pct: number; nifty_pct: number };
type PerformancePortfolio = {
  inception_date: string;
  start_value: number;
  current_value: number;
  total_return_pct: number;
  nifty_return_pct: number;
  alpha_pct: number;
  monthly_returns: MonthlyReturn[];
  best_call: { sym: string; return_pct: number; period: string };
  worst_call: { sym: string; return_pct: number; period: string };
  total_calls: number;
  success_rate_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
};
type PerformanceResponse = { ok: boolean; portfolio?: PerformancePortfolio };

function buildCumulative(monthly: MonthlyReturn[]) {
  let portCum = 100;
  let niftyCum = 100;
  return monthly.map((m) => {
    portCum = portCum * (1 + m.portfolio_pct / 100);
    niftyCum = niftyCum * (1 + m.nifty_pct / 100);
    return {
      month: m.month.replace(" 2026", ""),
      portfolio: Math.round(portCum * 10) / 10,
      nifty: Math.round(niftyCum * 10) / 10,
      port_monthly: m.portfolio_pct,
      nifty_monthly: m.nifty_pct,
    };
  });
}

export function PortfolioPerformanceChart() {
  const [data, setData] = useState<PerformancePortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetchClientApi<PerformanceResponse>("performance");
      if (res && "ok" in res && res.ok && res.portfolio) setData(res.portfolio);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="h-64 rounded-lg bg-muted/20 animate-pulse" />;
  if (!data) return null;

  const cumData = buildCumulative(data.monthly_returns);

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: "Total return",  value: `+${data.total_return_pct}%`, color: "text-gain"      },
          { label: "Nifty return",  value: `+${data.nifty_return_pct}%`, color: "text-muted-foreground" },
          { label: "Alpha",         value: `+${data.alpha_pct}%`,         color: "text-primary"   },
          { label: "Sharpe ratio",  value: String(data.sharpe_ratio),     color: "text-foreground" },
          { label: "Success rate",  value: `${data.success_rate_pct}%`,   color: "text-gain"      },
          { label: "Max drawdown",  value: `${data.max_drawdown_pct}%`,   color: "text-loss"      },
          { label: "Total calls",   value: String(data.total_calls),      color: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card/50 px-3 py-2.5 text-center">
            <p className={`font-mono text-base font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cumulative return chart */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-[12px] font-medium text-muted-foreground mb-3">
          Model portfolio vs Nifty 50 — Jan to Jun 2026 (indexed to 100)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cumData}>
            <defs>
              <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--muted-foreground)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v, n) => [`${v}`, String(n) === "portfolio" ? "Model Portfolio" : "Nifty 50"]}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Area type="monotone" dataKey="portfolio" name="Model Portfolio" stroke="var(--primary)" fill="url(#portGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="nifty" name="Nifty 50" stroke="var(--muted-foreground)" fill="url(#niftyGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly returns bar chart */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-[12px] font-medium text-muted-foreground mb-3">Monthly returns — Portfolio vs Nifty</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={cumData} barGap={2} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v, n) => { const num = Number(v); return [`${num >= 0 ? "+" : ""}${num}%`, String(n) === "port_monthly" ? "Portfolio" : "Nifty"]; }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="port_monthly" name="Portfolio" fill="var(--primary)" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
            <Bar dataKey="nifty_monthly" name="Nifty" fill="var(--muted-foreground)" fillOpacity={0.5} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
