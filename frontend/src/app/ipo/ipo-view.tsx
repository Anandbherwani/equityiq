"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchClientApi } from "@/lib/client-api";
import type { ApiError, IpoIntelligenceResponse, IpoIntelligenceRow } from "@/lib/types";
import { ApiErrorCard } from "@/components/shared/api-error-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === "open") return "bg-emerald-500/15 text-emerald-300";
  if (s === "upcoming") return "bg-blue-500/15 text-blue-300";
  if (s === "listed") return "bg-muted text-muted-foreground";
  return "bg-amber-500/15 text-amber-200";
}

function verdictStyle(v: string) {
  if (/strong subscribe|subscribe/i.test(v)) return "bg-emerald-500/15 text-emerald-300";
  if (/avoid/i.test(v)) return "bg-rose-500/15 text-rose-300";
  return "bg-amber-500/15 text-amber-200";
}

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-amber-300";
  return "text-rose-400";
}

function IpoCard({ row }: { row: IpoIntelligenceRow }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{row.company_name}</CardTitle>
            {row.symbol ? (
              <Link href={`/stock/${row.symbol}`} className="font-mono text-sm text-cyan-400 hover:underline">
                {row.symbol}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge className={cn("text-[10px] uppercase", statusStyle(row.status))}>{row.status}</Badge>
            <Badge className={cn("text-[10px]", verdictStyle(row.verdict))}>{row.verdict}</Badge>
          </div>
        </div>
        {row.sector ? (
          <Badge variant="outline" className="mt-1 text-[10px]">
            {row.sector}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between">
          <span className={cn("font-mono text-3xl font-semibold tabular-nums", scoreColor(row.score))}>
            {row.score}
          </span>
          <span className="text-xs text-muted-foreground">IPO score</span>
        </div>
        <p className="font-mono text-sm">
          Issue ₹{row.issue_price?.toLocaleString("en-IN")}{" "}
          <span className={row.gmp_pct >= 0 ? "text-emerald-400" : "text-rose-400"}>
            GMP {row.gmp_pct >= 0 ? "+" : ""}
            {row.gmp_pct}%
          </span>
        </p>
        {row.subscription_x > 0 ? (
          <p className="text-muted-foreground">{row.subscription_x.toFixed(1)}× subscribed</p>
        ) : null}
        {row.listing_date ? (
          <p className="text-xs text-muted-foreground">Listing {row.listing_date}</p>
        ) : null}
        <p className="text-muted-foreground line-clamp-2">{row.thesis}</p>
        <p className="text-rose-400/90 text-xs line-clamp-1">⚠ {row.risks}</p>
      </CardContent>
    </Card>
  );
}

export function IpoView() {
  const [data, setData] = useState<IpoIntelligenceResponse | ApiError | null>(null);

  const load = useCallback(async () => {
    setData(await fetchClientApi<IpoIntelligenceResponse>("ipo_intelligence"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading IPO pipeline…</p>;
  }
  if (!("ok" in data) || !data.ok) {
    return <ApiErrorCard message={data.error || "IPO intelligence unavailable"} onRetry={load} />;
  }

  const open = data.rows.filter((r) => r.status.toLowerCase() === "open").length;
  const upcoming = data.rows.filter((r) => r.status.toLowerCase() === "upcoming").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase text-muted-foreground">Active IPOs</p>
            <p className="font-mono text-2xl font-semibold">{data.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase text-muted-foreground">Open subscriptions</p>
            <p className="font-mono text-2xl font-semibold">{open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] uppercase text-muted-foreground">Upcoming</p>
            <p className="font-mono text-2xl font-semibold">{upcoming}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...data.rows].sort((a, b) => b.score - a.score).map((row) => (
          <IpoCard key={row.symbol || row.company_name} row={row} />
        ))}
      </div>
    </div>
  );
}
