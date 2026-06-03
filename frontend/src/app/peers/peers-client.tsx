"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiBanner } from "@/components/shared/api-banner";
import { ErrorState } from "@/components/shared/error-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { fetchClientApi } from "@/lib/client-api";
import { formatNum } from "@/lib/format";
import { pushRecentSearch, isDemoMode } from "@/lib/storage";
import type { SymbolResponse } from "@/lib/types";

export function PeersClient() {
  const params = useSearchParams();
  const [symbol, setSymbol] = useState("");
  const [data, setData] = useState<SymbolResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = params.get("symbol");
    if (s) setSymbol(s.toUpperCase());
  }, [params]);

  useEffect(() => {
    const sym = symbol.trim().toUpperCase();
    if (!sym || sym.length < 2) return;
    void (async () => {
      setLoading(true);
      const r = await fetchClientApi<SymbolResponse>("symbol", { symbol: sym });
      setLoading(false);
      if (r && "ok" in r && r.ok) setData(r);
    })();
  }, [symbol]);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    pushRecentSearch(sym);
    setLoading(true);
    setError(null);
    const r = await fetchClientApi<SymbolResponse>("symbol", { symbol: sym });
    setLoading(false);
    if (r && "ok" in r && r.ok) setData(r);
    else setError(("error" in r ? r.error : null) || "Symbol not found");
  }

  const s = data?.scoring;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Peer comparison</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          See how a stock scores versus its sector on quality, valuation, and growth — sourced from
          your research engine peer module.
        </p>
      </div>

      <form onSubmit={analyze} className="flex flex-wrap gap-2 max-w-md">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. TCS"
            className="pl-9 font-mono"
          />
        </div>
        <Button type="submit">Analyze</Button>
      </form>

      {!data && !loading && !isDemoMode() ? <ApiBanner /> : null}
      {error ? <ErrorState message={error} /> : null}
      {loading ? <CardSkeleton /> : null}

      {s && data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <Link href={`/stock/${data.symbol}`} className="font-mono text-cyan-400 hover:underline">
                  {data.symbol}
                </Link>
                <span className="text-muted-foreground font-normal">{data.universe?.sector}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ScoreBar label="Relative quality" value={s.relative_quality_score} />
              <ScoreBar label="Relative valuation" value={s.relative_valuation_score} />
              <ScoreBar label="Relative growth" value={s.relative_growth_score} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sector medians</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm font-mono">
              <Stat label="Median P/E" value={formatNum(s.sector_median_pe, 1)} />
              <Stat label="Median P/B" value={formatNum(s.sector_median_pb, 2)} />
              <Stat label="Median ROE" value={formatNum(s.sector_median_roe, 1)} />
              <Stat label="Median ROCE" value={formatNum(s.sector_median_roce, 1)} />
            </CardContent>
          </Card>

          {data.fundamentals ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Company vs sector (fundamentals)</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4 text-sm font-mono">
                <CompareCell
                  label="P/E"
                  company={data.fundamentals.pe}
                  median={s.sector_median_pe}
                />
                <CompareCell label="ROE %" company={data.fundamentals.roe} median={s.sector_median_roe} />
                <CompareCell
                  label="ROCE %"
                  company={data.fundamentals.roce}
                  median={s.sector_median_roce}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value?: number }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span>{v > 0 ? `${v}/100` : "—"}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full bg-cyan-500/70 rounded-full transition-all"
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg">{value}</p>
    </div>
  );
}

function CompareCell({
  label,
  company,
  median,
}: {
  label: string;
  company?: number;
  median?: number;
}) {
  const prem =
    company && median && median > 0 ? Math.round(((company - median) / median) * 100) : null;
  return (
    <div className="rounded-md border border-border/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg">{company != null ? company : "—"}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Sector {median ?? "—"}
        {prem != null ? (
          <span className={prem > 0 ? " text-amber-400" : " text-emerald-400"}>
            {" "}
            ({prem > 0 ? "+" : ""}
            {prem}% vs median)
          </span>
        ) : null}
      </p>
    </div>
  );
}
