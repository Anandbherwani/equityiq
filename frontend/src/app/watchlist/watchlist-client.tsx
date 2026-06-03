"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { WatchlistEntry } from "@/lib/types";
import { loadWatchlist, saveWatchlist } from "@/lib/storage";

const BUCKETS: { id: WatchlistEntry["bucket"]; label: string }[] = [
  { id: "potential_buys", label: "Potential Buys" },
  { id: "high_conviction", label: "High Conviction" },
  { id: "pullback", label: "Waiting For Pullback" },
  { id: "earnings", label: "Earnings Watch" },
  { id: "gov_theme", label: "Government Theme Watch" },
];

export function WatchlistClient() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [symbol, setSymbol] = useState("");
  const [bucket, setBucket] = useState<WatchlistEntry["bucket"]>("potential_buys");

  useEffect(() => {
    setEntries(loadWatchlist());
  }, []);

  function persist(next: WatchlistEntry[]) {
    setEntries(next);
    saveWatchlist(next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    persist([
      ...entries.filter((x) => x.symbol !== sym),
      { symbol: sym, bucket, addedAt: new Date().toISOString() },
    ]);
    setSymbol("");
  }

  function remove(sym: string) {
    persist(entries.filter((e) => e.symbol !== sym));
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Watchlist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize symbols you are tracking. Open any name for live conviction and analyst notes
          from Recommendations.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end">
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="NSE symbol"
          className="font-mono w-full sm:w-36"
        />
        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value as WatchlistEntry["bucket"])}
          className="h-9 w-full sm:w-auto rounded-md border border-input bg-muted/30 px-3 text-sm"
        >
          {BUCKETS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <Button type="submit">Add</Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BUCKETS.map((b) => {
          const items = entries.filter((e) => e.bucket === b.id);
          return (
            <Card key={b.id} className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm">{b.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{items.length} symbols</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Empty</p>
                ) : (
                  items.map((e) => (
                    <div key={e.symbol} className="flex justify-between items-center text-sm">
                      <Link
                        href={`/stock/${e.symbol}`}
                        className="font-mono text-cyan-400 hover:underline"
                      >
                        {e.symbol}
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => remove(e.symbol)}>
                        ×
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
