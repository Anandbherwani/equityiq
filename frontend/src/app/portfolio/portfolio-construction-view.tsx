"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { PortfolioConstructionResponse } from "@/lib/types";

const TIER_LABELS: { capital: number; label: string }[] = [
  { capital: 100000, label: "₹1L" },
  { capital: 500000, label: "₹5L" },
  { capital: 1000000, label: "₹10L" },
  { capital: 10000000, label: "₹1Cr" },
];

const BUCKET_STYLES: Record<string, string> = {
  core: "bg-primary/10 text-primary border-primary/40",
  growth: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  opportunistic: "bg-amber-500/15 text-amber-300 border-amber-500/40",
};

function formatInr(n: number | undefined): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function PortfolioConstructionView({
  data,
}: {
  data: PortfolioConstructionResponse | null;
}) {
  const defaultCap = data?.default_capital ?? 1000000;
  const [capital, setCapital] = useState(defaultCap);

  const model = useMemo(() => {
    if (!data?.tiers?.length) return null;
    const found = data.tiers.find((t) => t.capital_inr === capital && t.ok);
    if (found) return found;
    return data.tiers.find((t) => t.ok) ?? null;
  }, [data, capital]);

  if (!data || !("ok" in data) || !data.ok) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Portfolio models unavailable. Deploy{" "}
          <code className="text-xs">PortfolioConstructionEngine.gs</code>, rebuild Tab 10/11,
          then run{" "}
          <strong className="font-normal text-foreground">
            Build all capital models
          </strong>{" "}
          in Sheets or use{" "}
          <code className="text-xs">?action=portfolio</code>.
          {"error" in (data || {}) ? (
            <p className="mt-2 text-rose-400/90">{(data as { error?: string }).error}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (!model) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No model built for this tier yet. Run portfolio construction in Sheets.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TIER_LABELS.map((t) => (
          <button
            key={t.capital}
            type="button"
            onClick={() => setCapital(t.capital)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              capital === t.capital
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
        {data.as_of ? (
          <span className="text-xs text-muted-foreground self-center ml-auto">
            As of {data.as_of}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Portfolio conviction"
          value={`${model.portfolio_conviction_score ?? "—"}/100`}
        />
        <MetricCard
          label="Est. max drawdown"
          value={
            model.max_drawdown_estimate_pct != null
              ? `${model.max_drawdown_estimate_pct}%`
              : "—"
          }
          hint="Heuristic, not backtested"
        />
        <MetricCard label="Deployed" value={formatInr(model.deployed_inr)} />
        <MetricCard
          label="Cash"
          value={`${formatInr(model.cash_inr)} (${model.cash_pct ?? 0}%)`}
        />
      </div>

      {model.suggested_allocation ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Suggested allocation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AllocationBlock
              title="Core"
              target={model.suggested_allocation.core.target_pct}
              actual={model.suggested_allocation.core.actual_pct}
              amount={model.suggested_allocation.core.amount_inr}
            />
            <AllocationBlock
              title="Growth"
              target={model.suggested_allocation.growth.target_pct}
              actual={model.suggested_allocation.growth.actual_pct}
              amount={model.suggested_allocation.growth.amount_inr}
            />
            <AllocationBlock
              title="Opportunistic"
              target={model.suggested_allocation.opportunistic.target_pct}
              actual={model.suggested_allocation.opportunistic.actual_pct}
              amount={model.suggested_allocation.opportunistic.amount_inr}
            />
            <AllocationBlock
              title="Cash"
              target={model.suggested_allocation.cash.target_pct}
              actual={model.suggested_allocation.cash.actual_pct}
              amount={model.suggested_allocation.cash.amount_inr}
              muted
            />
          </CardContent>
        </Card>
      ) : null}

      {model.sector_exposure && model.sector_exposure.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sector exposure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model.sector_exposure.map((s) => (
              <div key={s.sector} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={s.over_limit ? "text-amber-400" : ""}>
                    {s.sector}
                    {s.over_limit ? " · over limit" : ""}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {s.weight_pct}% · {formatInr(s.amount_inr)}
                  </span>
                </div>
                <Progress value={Math.min(100, s.weight_pct * 2)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Position sizing</CardTitle>
          <span className="text-xs text-muted-foreground">
            {model.position_count ?? 0} names · pool {model.pool_size ?? "—"}
          </span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border/50">
                <th className="py-2 pr-2">Symbol</th>
                <th className="py-2 pr-2">Bucket</th>
                <th className="py-2 pr-2">Sector</th>
                <th className="py-2 pr-2 text-right">Amount</th>
                <th className="py-2 pr-2 text-right">Wt%</th>
                <th className="py-2 pr-2 text-right">Rank</th>
                <th className="py-2 text-right">Risk</th>
              </tr>
            </thead>
            <tbody>
              {(model.positions ?? []).map((p) => (
                <tr
                  key={p.symbol}
                  className="border-b border-border/30 last:border-0"
                >
                  <td className="py-2 pr-2">
                    <Link
                      href={`/stock/${p.symbol}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {p.symbol}
                    </Link>
                  </td>
                  <td className="py-2 pr-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] capitalize", BUCKET_STYLES[p.bucket])}
                    >
                      {p.bucket}
                    </Badge>
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground max-w-[120px] truncate">
                    {p.sector}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono">{formatInr(p.amount_inr)}</td>
                  <td className="py-2 pr-2 text-right font-mono">{p.weight_pct}%</td>
                  <td className="py-2 pr-2 text-right font-mono">{p.opportunity_rank}</td>
                  <td className="py-2 text-right font-mono">
                    {p.risk_grade || "—"} ({p.risk_score})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="text-[10px] text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function AllocationBlock({
  title,
  target,
  actual,
  amount,
  muted,
}: {
  title: string;
  target: number;
  actual: number;
  amount: number;
  muted?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-3", muted ? "border-border/40" : "border-border/60")}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{actual}%</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Target {target}% · {formatInr(amount)}
      </p>
      <Progress value={Math.min(100, actual)} className="h-1.5 mt-2" />
    </div>
  );
}
