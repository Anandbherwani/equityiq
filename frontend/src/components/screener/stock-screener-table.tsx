"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchClientApi } from "@/lib/client-api";
import { loadWatchlist, saveWatchlist } from "@/lib/storage";
import type { WatchlistEntry } from "@/lib/types";
import { toast } from "sonner";

type ScreenerStock = {
  sym: string;
  name: string;
  sector: string;
  pe: number;
  roe: number;
  price: number;
  chg: number;
  signal: string;
  score: number;
};

type ScreenerResponse = {
  ok: boolean;
  stocks?: ScreenerStock[];
  total?: number;
  updated?: string;
};

const SIGNALS = ["All", "STRONG BUY", "BUY", "ACCUMULATE", "HOLD", "WATCH", "AVOID"];
const SECTORS = ["All", "Banking", "IT", "Metal", "Pharma", "Auto", "Energy", "Capital Goods", "Finance", "Utilities", "Cement", "Consumer", "Defence", "Conglomerate"];
const SORTS = ["Score ↓", "PE ↑", "ROE ↓", "Change% ↓"];

function signalColors(signal: string) {
  if (signal === "STRONG BUY") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  if (signal === "BUY")        return "bg-green-500/15 text-green-400 border-green-500/40";
  if (signal === "ACCUMULATE") return "bg-teal-500/15 text-teal-400 border-teal-500/40";
  if (signal === "HOLD")       return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  if (signal === "WATCH")      return "bg-orange-500/15 text-orange-400 border-orange-500/40";
  return "bg-red-500/15 text-red-400 border-red-500/40";
}

function scoreBarColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 65) return "bg-green-500";
  if (score >= 50) return "bg-teal-500";
  if (score >= 35) return "bg-amber-500";
  if (score >= 20) return "bg-orange-500";
  return "bg-red-500";
}

export function StockScreenerTable() {
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [signal, setSignal] = useState("All");
  const [sector, setSector] = useState("All");
  const [sort, setSort] = useState("Score ↓");

  useEffect(() => {
    void (async () => {
      const res = await fetchClientApi<ScreenerResponse>("screener");
      if (res && "ok" in res && res.ok && res.stocks) {
        setStocks(res.stocks);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let out = [...stocks];
    if (signal !== "All") out = out.filter((s) => s.signal === signal);
    if (sector !== "All") out = out.filter((s) => s.sector === sector);
    if (sort === "Score ↓") out.sort((a, b) => b.score - a.score);
    else if (sort === "PE ↑") out.sort((a, b) => a.pe - b.pe);
    else if (sort === "ROE ↓") out.sort((a, b) => b.roe - a.roe);
    else if (sort === "Change% ↓") out.sort((a, b) => b.chg - a.chg);
    return out;
  }, [stocks, signal, sector, sort]);

  const counts = useMemo(() => ({
    total: stocks.length,
    strongBuy: stocks.filter((s) => s.signal === "STRONG BUY").length,
    buy: stocks.filter((s) => s.signal === "BUY").length,
    avoid: stocks.filter((s) => s.signal === "AVOID").length,
  }), [stocks]);

  function addToWatchlist(sym: string) {
    const entries = loadWatchlist();
    if (entries.find((e) => e.symbol === sym)) {
      toast.info(`${sym} already in watchlist`);
      return;
    }
    const next: WatchlistEntry[] = [...entries, { symbol: sym, bucket: "potential_buys", addedAt: new Date().toISOString() }];
    saveWatchlist(next);
    toast.success(`${sym} added to watchlist`);
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      {!loading && stocks.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[12px]">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{counts.total}</span> stocks
          </span>
          <span className="text-emerald-400">
            <span className="font-semibold">{counts.strongBuy}</span> Strong Buy
          </span>
          <span className="text-green-400">
            <span className="font-semibold">{counts.buy}</span> Buy
          </span>
          <span className="text-red-400">
            <span className="font-semibold">{counts.avoid}</span> Avoid
          </span>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          {SIGNALS.slice(0, 6).map((s) => (
            <button
              key={s}
              onClick={() => setSignal(s)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-medium border transition-colors",
                signal === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="h-7 rounded border border-border bg-muted/30 px-2 text-[11px] text-foreground"
          >
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-7 rounded border border-border bg-muted/30 px-2 text-[11px] text-foreground"
          >
            {SORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No stocks match current filters</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSignal("All"); setSector("All"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Stock</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Sector</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Signal</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Score</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">PE</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">ROE</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Day%</th>
                <th className="px-3 py-2.5 hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.sym} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-3 py-2.5">
                    <Link href={`/stock/${s.sym}`} className="hover:text-primary transition-colors">
                      <span className="font-mono font-bold">{s.sym}</span>
                      <span className="block text-[10px] text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{s.sector}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap", signalColors(s.signal))}>
                      {s.signal}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/40 overflow-hidden hidden sm:block">
                        <div className={cn("h-full rounded-full", scoreBarColor(s.score))} style={{ width: `${s.score}%` }} />
                      </div>
                      <span className="font-mono font-bold tabular-nums">{s.score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell">{s.pe}x</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell">{s.roe}%</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums font-semibold", s.chg >= 0 ? "text-gain" : "text-loss")}>
                    {s.chg >= 0 ? "+" : ""}{s.chg}%
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => addToWatchlist(s.sym)}
                      title="Add to watchlist"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
