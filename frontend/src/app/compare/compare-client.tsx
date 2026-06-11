"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiBanner } from "@/components/shared/api-banner";
import { DemoBanner } from "@/components/shared/demo-banner";
import { ErrorState } from "@/components/shared/error-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { ExportMenu } from "@/components/export/export-menu";
import { MAX_COMPARE_SYMBOLS } from "@/lib/constants";
import { fetchClientApi } from "@/lib/client-api";
import { symbolToText } from "@/lib/export-utils";
import { formatNum, formatPct, formatPrice } from "@/lib/format";
import { isDemoMode, pushRecentSearch } from "@/lib/storage";
import type { SymbolResponse } from "@/lib/types";

export function CompareClient() {
  const params = useSearchParams();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [addSym, setAddSym] = useState("");
  const [data, setData] = useState<(SymbolResponse | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (syms: string[]) => {
    if (!syms.length) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    const results = await Promise.all(
      syms.map(async (s) => {
        const r = await fetchClientApi<SymbolResponse>("symbol", { symbol: s });
        if (r && "ok" in r && r.ok) return r;
        return null;
      })
    );
    setData(results);
    setLoading(false);
    if (results.every((r) => !r) && !isDemoMode()) {
      setError("Could not load symbols — check API URL in Settings.");
    }
  }, []);

  useEffect(() => {
    const fromUrl = (params.get("symbols") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX_COMPARE_SYMBOLS);
    if (fromUrl.length) setSymbols(fromUrl);
  }, [params]);

  useEffect(() => {
    load(symbols);
  }, [symbols, load]);

  function add() {
    const s = addSym.trim().toUpperCase();
    if (!s || symbols.includes(s) || symbols.length >= MAX_COMPARE_SYMBOLS) return;
    pushRecentSearch(s);
    setSymbols([...symbols, s]);
    setAddSym("");
  }

  function remove(s: string) {
    setSymbols(symbols.filter((x) => x !== s));
  }

  const rows = [
    { label: "Price", fn: (d: SymbolResponse) => formatPrice(d.price?.price) },
    { label: "Change", fn: (d: SymbolResponse) => formatPct(d.price?.chg_pct) },
    { label: "Conviction", fn: (d: SymbolResponse) => `${d.scoring?.conviction_total ?? "—"}/100` },
    { label: "Opportunity", fn: (d: SymbolResponse) => `${d.scoring?.opportunity_rank ?? "—"}/100` },
    { label: "Quality", fn: (d: SymbolResponse) => `${d.scoring?.quality_score ?? "—"}/100` },
    { label: "Valuation", fn: (d: SymbolResponse) => `${d.scoring?.valuation_score ?? "—"}/100` },
    { label: "Risk grade", fn: (d: SymbolResponse) => String(d.scoring?.risk_grade ?? "—") },
    { label: "P/E", fn: (d: SymbolResponse) => formatNum(d.fundamentals?.pe, 1) },
    { label: "ROE %", fn: (d: SymbolResponse) => formatNum(d.fundamentals?.roe, 1) },
    { label: "Rel. quality", fn: (d: SymbolResponse) => `${d.scoring?.relative_quality_score ?? "—"}` },
    { label: "Rel. valuation", fn: (d: SymbolResponse) => `${d.scoring?.relative_valuation_score ?? "—"}` },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare stocks</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Side-by-side view for up to {MAX_COMPARE_SYMBOLS} symbols — all metrics from your research
          engine, not recalculated here.
        </p>
      </div>

      {isDemoMode() ? <DemoBanner /> : null}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          value={addSym}
          onChange={(e) => setAddSym(e.target.value)}
          placeholder="Add symbol"
          className="font-mono w-40"
          disabled={symbols.length >= MAX_COMPARE_SYMBOLS}
        />
        <Button type="submit" disabled={symbols.length >= MAX_COMPARE_SYMBOLS}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {symbols.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-sm text-primary"
          >
            <Link href={`/stock/${s}`}>{s}</Link>
            <button type="button" onClick={() => remove(s)} aria-label={`Remove ${s}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      {!symbols.length && !isDemoMode() ? <ApiBanner /> : null}
      {error ? <ErrorState message={error} retry={() => load(symbols)} /> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : symbols.length && data.some(Boolean) ? (
        <>
          <ExportMenu
            text={data.filter(Boolean).map((d) => symbolToText(d!)).join("\n\n---\n\n")}
            json={data.filter(Boolean)}
            filenameBase="compare"
          />
          <Card className="border-border/60 overflow-x-auto">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="text-left p-3 text-muted-foreground font-medium">Metric</th>
                    {data.map((d, i) =>
                      d ? (
                        <th key={symbols[i]} className="p-3 font-mono text-primary text-left">
                          {d.symbol}
                        </th>
                      ) : (
                        <th key={symbols[i]} className="p-3 text-muted-foreground">
                          {symbols[i]}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/40">
                      <td className="p-3 text-muted-foreground">{row.label}</td>
                      {data.map((d, i) => (
                        <td key={`${symbols[i]}-${row.label}`} className="p-3 font-mono">
                          {d ? row.fn(d) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
