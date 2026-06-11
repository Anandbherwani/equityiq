"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchClientApi } from "@/lib/client-api";

type HistoryCall = {
  date: string;
  sym: string;
  entryPrice: number;
  exitPrice: number;
  return_pct: number;
  verdict: string;
  holdingDays: number;
  sector: string;
};

type HistoryResponse = {
  ok: boolean;
  total_calls?: number;
  success_rate?: number;
  avg_return_pct?: number;
  calls?: HistoryCall[];
};

export function HistoryReturnsChart() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetchClientApi<HistoryResponse>("history");
      if (res && "ok" in res && res.ok) setData(res);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="h-48 rounded-lg bg-muted/20 animate-pulse" />;
  if (!data?.calls?.length) return null;

  const chartData = data.calls.map((c) => ({
    name: c.sym,
    return: c.return_pct,
    verdict: c.verdict,
    entry: c.entryPrice,
    exit: c.exitPrice,
    days: c.holdingDays,
  }));

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: "Total calls",   value: String(data.total_calls ?? 0) },
          { label: "Success rate",  value: `${data.success_rate ?? 0}%`, color: "text-gain" },
          { label: "Avg return",    value: `+${data.avg_return_pct ?? 0}%`, color: "text-gain" },
          { label: "Best",          value: `+${Math.max(...(data.calls?.map(c => c.return_pct) ?? [0]))}%`, color: "text-gain" },
          { label: "Worst",         value: `${Math.min(...(data.calls?.map(c => c.return_pct) ?? [0]))}%`, color: "text-loss" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card/50 px-3 py-2.5 text-center">
            <p className={`font-mono text-lg font-bold tabular-nums ${s.color ?? "text-foreground"}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Returns chart */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-[12px] font-medium text-muted-foreground mb-3">Return % per call (Mar–Jun 2026)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v) => [`${Number(v) >= 0 ? "+" : ""}${v}%`, "Return"]}
            />
            <Bar dataKey="return" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.return >= 0 ? "var(--gain)" : "var(--loss)"} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calls table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-3 py-2 text-muted-foreground">Date</th>
              <th className="text-left px-3 py-2 text-muted-foreground">Symbol</th>
              <th className="text-right px-3 py-2 text-muted-foreground hidden sm:table-cell">Entry</th>
              <th className="text-right px-3 py-2 text-muted-foreground hidden sm:table-cell">Exit</th>
              <th className="text-right px-3 py-2 text-muted-foreground">Return</th>
              <th className="text-center px-3 py-2 text-muted-foreground">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.calls?.map((c, i) => (
              <tr key={i} className="hover:bg-muted/10">
                <td className="px-3 py-2 text-muted-foreground">{c.date}</td>
                <td className="px-3 py-2 font-mono font-bold">{c.sym}</td>
                <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">₹{c.entryPrice}</td>
                <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">₹{c.exitPrice}</td>
                <td className={`px-3 py-2 text-right font-mono font-bold ${c.return_pct >= 0 ? "text-gain" : "text-loss"}`}>
                  {c.return_pct >= 0 ? "+" : ""}{c.return_pct}%
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.verdict === "SUCCESS" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss"}`}>
                    {c.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
