"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RECOMMENDATION_CATEGORY_LABELS } from "@/lib/constants";
import type { RecommendationHistoryEntry, RecommendationHistoryResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtPct(v: number | null | undefined, signed = true) {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v.toFixed(2);
  if (!signed) return `${s}%`;
  return `${v >= 0 ? "+" : ""}${s}%`;
}

function categoryLabel(cat: string) {
  return RECOMMENDATION_CATEGORY_LABELS[cat] || cat || "—";
}

export function HistoryExplorer({ data }: { data: RecommendationHistoryResponse }) {
  const [category, setCategory] = useState<string>("all");
  const [symbolQ, setSymbolQ] = useState("");

  const filtered = useMemo(() => {
    let rows = data.entries;
    if (category !== "all") {
      rows = rows.filter((e) => e.recommendation_category === category);
    }
    const q = symbolQ.trim().toUpperCase();
    if (q) rows = rows.filter((e) => e.symbol.toUpperCase().includes(q));
    return rows;
  }, [data.entries, category, symbolQ]);

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
              All ({data.total_rows})
            </FilterChip>
            {data.categories.map((cat) => (
              <FilterChip
                key={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
              >
                {categoryLabel(cat)}
              </FilterChip>
            ))}
          </div>
          <input
            type="search"
            placeholder="Symbol…"
            value={symbolQ}
            onChange={(e) => setSymbolQ(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm w-full sm:max-w-[180px]"
          />
        </CardContent>
      </Card>

      {data.date_range.earliest ? (
        <p className="text-xs text-muted-foreground">
          History span: {data.date_range.earliest} → {data.date_range.latest} · Updated{" "}
          {data.updated.slice(0, 16)}
        </p>
      ) : (
        <p className="text-sm text-amber-200/90 border border-amber-500/30 rounded-lg px-4 py-3 bg-amber-500/5">
          No history rows yet. Enable 8 AM automation or run{" "}
          <strong className="font-normal text-foreground">
            Snapshot history → Tab 37
          </strong>{" "}
          in Google Sheets after syncing Tab 11.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5">Entry</th>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5 text-right">Conv.</th>
              <th className="px-3 py-2.5 text-right">Return</th>
              <th className="px-3 py-2.5 text-right">Nifty</th>
              <th className="px-3 py-2.5 text-right">Sector</th>
              <th className="px-3 py-2.5 text-right">α Nifty</th>
              <th className="px-3 py-2.5 text-right">α Sector</th>
              <th className="px-3 py-2.5">Target</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <HistoryRow key={`${row.snapshot_date}-${row.symbol}-${row.list_name}`} row={row} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && data.total_rows > 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No rows match filters.</p>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-cyan-500/50 bg-cyan-500/10 text-foreground"
          : "border-border/60 text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function HistoryRow({ row }: { row: RecommendationHistoryEntry }) {
  const live = row.live;
  const ret = live?.current_return_pct;
  const retClass =
    ret == null ? "" : ret >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
        {live?.entry_date || row.snapshot_date}
      </td>
      <td className="px-3 py-2.5">
        <Link
          href={`/stock/${row.symbol}`}
          className="font-medium text-cyan-300 hover:underline"
        >
          {row.symbol}
        </Link>
        <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
          {row.company_name}
        </p>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[120px]">
        {categoryLabel(row.recommendation_category)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{row.conviction?.toFixed(0) ?? "—"}</td>
      <td className={cn("px-3 py-2.5 text-right tabular-nums", retClass)}>
        {fmtPct(ret)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {fmtPct(live?.nifty_return_pct)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {fmtPct(live?.sector_return_pct)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {fmtPct(live?.alpha_vs_nifty_pct)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {fmtPct(live?.alpha_vs_sector_pct)}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.target || "—"}</td>
    </tr>
  );
}
