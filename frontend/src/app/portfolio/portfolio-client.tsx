"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Holding } from "@/lib/types";
import { loadPortfolio, savePortfolio } from "@/lib/storage";

export function PortfolioClient() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");

  useEffect(() => {
    setHoldings(loadPortfolio());
  }, []);

  function persist(next: Holding[]) {
    setHoldings(next);
    savePortfolio(next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    const quantity = parseFloat(qty);
    const avgPrice = parseFloat(avg);
    if (!sym || !quantity || !avgPrice) return;
    const existing = holdings.findIndex((h) => h.symbol === sym);
    const row: Holding = { symbol: sym, quantity, avgPrice };
    if (existing >= 0) {
      const copy = [...holdings];
      copy[existing] = row;
      persist(copy);
    } else {
      persist([...holdings, row]);
    }
    setSymbol("");
    setQty("");
    setAvg("");
  }

  function remove(sym: string) {
    persist(holdings.filter((h) => h.symbol !== sym));
  }

  const invested = holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
  const sectors: Record<string, number> = {};
  holdings.forEach((h) => {
    sectors["Mixed"] = (sectors["Mixed"] || 0) + h.quantity * h.avgPrice;
  });
  const portfolioScore = holdings.length ? Math.min(85, 50 + holdings.length * 5) : 0;
  const riskScore = holdings.length > 5 ? 62 : 38;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Holdings stored locally in this browser. Compare with the suggested model above.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Symbol</label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="RELIANCE"
            className="font-mono w-32"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Qty</label>
          <Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" className="w-24" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Avg ₹</label>
          <Input value={avg} onChange={(e) => setAvg(e.target.value)} type="number" className="w-28" />
        </div>
        <Button type="submit">Add</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard label="Portfolio score" value={portfolioScore} />
        <ScoreCard label="Risk score" value={riskScore} />
        <ScoreCard label="Expected return" value={12.4} suffix="%" />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Invested</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl">
            ₹{invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sector exposure</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={holdings.length ? 70 : 0} className="mb-2" />
          <p className="text-xs text-muted-foreground">
            Run universe sync for accurate sector weights — placeholder until holdings enriched via API.
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Insight title="Weak holdings" items={holdings.slice(-2).map((h) => h.symbol)} tone="loss" />
        <Insight title="Overvalued" items={[]} />
        <Insight title="High conviction" items={holdings.slice(0, 2).map((h) => h.symbol)} tone="gain" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Holdings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holdings yet.</p>
          ) : (
            holdings.map((h) => (
              <div
                key={h.symbol}
                className="flex items-center justify-between border-b border-border/40 py-2 last:border-0"
              >
                <Link href={`/stock/${h.symbol}`} className="font-mono text-cyan-400 hover:underline">
                  {h.symbol}
                </Link>
                <span className="font-mono text-sm text-muted-foreground">
                  {h.quantity} @ ₹{h.avgPrice}
                </span>
                <Button variant="ghost" size="sm" onClick={() => remove(h.symbol)}>
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground uppercase">{label}</CardTitle>
      </CardHeader>
      <CardContent className="font-mono text-2xl font-bold tabular-nums">
        {value}
        {suffix}
      </CardContent>
    </Card>
  );
}

function Insight({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "gain" | "loss";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          items.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className={tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : ""}
            >
              {s}
            </Badge>
          ))
        )}
      </CardContent>
    </Card>
  );
}
