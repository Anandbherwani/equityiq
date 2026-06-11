"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchClientApi } from "@/lib/client-api";
import type { ApiError, RecommendationItem, Top10Response } from "@/lib/types";
import { ApiErrorCard } from "@/components/shared/api-error-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Row = RecommendationItem & { lists: string[] };

function aggregateTop10(data: Top10Response): Row[] {
  const bySym = new Map<string, Row>();
  for (const list of data.lists) {
    for (const item of list.items) {
      const sym = item.symbol.toUpperCase();
      const existing = bySym.get(sym);
      if (!existing || (item.conviction_total ?? 0) > (existing.conviction_total ?? 0)) {
        bySym.set(sym, { ...item, lists: [list.name] });
      } else if (existing) {
        if (!existing.lists.includes(list.name)) existing.lists.push(list.name);
      }
    }
  }
  return Array.from(bySym.values());
}

export function ResearchPicksTable() {
  const [data, setData] = useState<Top10Response | ApiError | null>(null);
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState<"conviction" | "dq">("conviction");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    setData(await fetchClientApi<Top10Response>("top10"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (!data || !("ok" in data) || !data.ok) return [];
    let list = aggregateTop10(data);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.symbol.toLowerCase().includes(needle) ||
          (r.company_name || "").toLowerCase().includes(needle)
      );
    }
    if (sector) list = list.filter((r) => r.sector === sector);
    list.sort((a, b) => {
      if (sort === "dq") return (b.data_quality_pct ?? 0) - (a.data_quality_pct ?? 0);
      return (b.conviction_total ?? 0) - (a.conviction_total ?? 0);
    });
    return list;
  }, [data, q, sector, sort]);

  const sectors = useMemo(() => {
    if (!data || !("ok" in data) || !data.ok) return [];
    const s = new Set<string>();
    aggregateTop10(data).forEach((r) => {
      if (r.sector) s.add(r.sector);
    });
    return Array.from(s).sort();
  }, [data]);

  const slice = rows.slice(0, (page + 1) * pageSize);
  const avgConv =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + (r.conviction_total ?? 0), 0) / rows.length)
      : 0;
  const avgDq =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + (r.data_quality_pct ?? 0), 0) / rows.length)
      : 0;

  function exportCsv() {
    const header = "symbol,company,sector,conviction,dq,lists\n";
    const body = rows
      .map((r) =>
        [
          r.symbol,
          `"${(r.company_name || "").replace(/"/g, '""')}"`,
          r.sector,
          r.conviction_total,
          r.data_quality_pct ?? "",
          `"${r.lists.join("; ")}"`,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "equityiq-research-watchlist.csv";
    a.click();
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading research picks…</p>;
  }
  if (!("ok" in data) || !data.ok) {
    return <ApiErrorCard message={data.error || "Failed to load picks"} onRetry={load} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {rows.length} stocks across 6 lists · Avg conviction {avgConv} · Avg DQ {avgDq}%
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Search symbol or company"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          className="max-w-xs font-mono text-sm"
        />
        <select
          value={sector}
          onChange={(e) => {
            setSector(e.target.value);
            setPage(0);
          }}
          className="h-9 rounded-md border border-input bg-muted/30 px-3 text-sm"
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "conviction" | "dq")}
          className="h-9 rounded-md border border-input bg-muted/30 px-3 text-sm"
        >
          <option value="conviction">Conviction ↓</option>
          <option value="dq">Data quality ↓</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3">Symbol</th>
              <th className="p-3">Company</th>
              <th className="p-3">Sector</th>
              <th className="p-3 text-right">Conviction</th>
              <th className="p-3 text-right">DQ%</th>
              <th className="p-3">Lists</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.symbol} className="border-t border-border/40 hover:bg-muted/20">
                <td className="p-3">
                  <Link href={`/stock/${r.symbol}`} className="font-mono text-primary hover:underline">
                    {r.symbol}
                  </Link>
                </td>
                <td className="p-3">{r.company_name}</td>
                <td className="p-3 text-muted-foreground">{r.sector}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, r.conviction_total ?? 0)}%` }}
                      />
                    </div>
                    <span className="font-mono tabular-nums">{r.conviction_total}</span>
                  </div>
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {r.data_quality_pct ?? "—"}
                </td>
                <td className="p-3 text-xs text-muted-foreground" title={r.lists.join(", ")}>
                  {r.lists.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {slice.length < rows.length ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
