"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BacktestComparison, BacktestResponse } from "@/lib/types";
import { BacktestCharts } from "./backtest-charts";
import { PerformanceDashboard } from "./performance-dashboard";
import { ValidationReport } from "./validation-report";

export function BacktestView({ data }: { data: BacktestResponse }) {
  const listNames = useMemo(() => {
    const fromTracked = data.tracked_lists ?? [];
    if (fromTracked.length) return fromTracked;
    const set = new Set<string>();
    data.comparison.forEach((c) => {
      if (c.list_name) set.add(c.list_name);
    });
    return Array.from(set);
  }, [data]);

  const [activeList, setActiveList] = useState(listNames[0] ?? "");

  const filtered: BacktestComparison[] = useMemo(
    () => data.comparison.filter((c) => c.list_name === activeList),
    [data.comparison, activeList]
  );

  const listMeta = data.lists?.find((l) => l.list_name === activeList);

  return (
    <div className="space-y-8">
      {data.validation ? (
        <ValidationReport report={data.validation} />
      ) : null}

      {data.dashboard ? (
        <section>
          <h2 className="text-lg font-medium mb-3">Recommendation performance dashboard</h2>
          <PerformanceDashboard
            dashboard={data.dashboard}
            snapshotRows={data.snapshot_rows_total}
          />
        </section>
      ) : null}

      {listNames.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {listNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveList(name)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                activeList === name
                  ? "border-primary/30 bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {name.replace("Top 10 ", "")}
            </button>
          ))}
        </div>
      ) : null}

      {listMeta ? (
        <p className="text-sm text-muted-foreground">
          Mode: <span className="font-mono text-primary">{listMeta.mode}</span>
          {listMeta.ready === false ? (
            <span className="text-amber-400/90"> · insufficient Tab 22 history</span>
          ) : null}
          {" · "}snapshots {listMeta.snapshot_rows}
          {listMeta.cohort_size > 0 ? ` · ${listMeta.cohort_size} trades in cohort` : ""}
        </p>
      ) : null}

      <BacktestCharts comparison={filtered} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((c) => (
          <HorizonCard key={c.horizon} comparison={c} />
        ))}
      </div>
    </div>
  );
}

function HorizonCard({ comparison: c }: { comparison: BacktestComparison }) {
  const rec = c.recommendations;
  if (!rec || rec.sample_count < 1) {
    return (
      <Card className="border-dashed border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{c.horizon}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {rec?.notes || "Awaiting Tab 22 snapshot history for this horizon."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{c.horizon}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs font-mono">
        <MetricRow label="Hit rate" picks={rec.hit_rate_pct} nif={c.nifty?.hit_rate_pct} sec={c.sector?.hit_rate_pct} suffix="%" />
        <MetricRow label="Avg return" picks={rec.avg_return_pct} nif={c.nifty?.avg_return_pct} sec={c.sector?.avg_return_pct} suffix="%" />
        <MetricRow label="Sharpe" picks={rec.sharpe_ratio} nif={c.nifty?.sharpe_ratio} sec={c.sector?.sharpe_ratio} />
        <MetricRow label="Sortino" picks={rec.sortino_ratio ?? 0} nif={c.nifty?.sortino_ratio} sec={c.sector?.sortino_ratio} />
        <MetricRow label="Max DD" picks={rec.max_drawdown_pct} nif={c.nifty?.max_drawdown_pct} sec={c.sector?.max_drawdown_pct} suffix="%" />
        {c.alpha_avg_return_pct != null ? (
          <p className="text-primary pt-1">
            α vs Nifty {c.alpha_avg_return_pct > 0 ? "+" : ""}
            {c.alpha_avg_return_pct}%
            {c.alpha_vs_sector_avg_pct != null ? (
              <> · vs Sector {c.alpha_vs_sector_avg_pct > 0 ? "+" : ""}{c.alpha_vs_sector_avg_pct}%</>
            ) : null}
          </p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">n={rec.sample_count} trades</p>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  picks,
  nif,
  sec,
  suffix = "",
}: {
  label: string;
  picks: number;
  nif?: number;
  sec?: number;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase">{label}</p>
      <p>
        {picks}
        {suffix}{" "}
        <span className="text-muted-foreground">
          vs Nifty {nif ?? "—"}
          {suffix} · Sector {sec ?? "—"}
          {suffix}
        </span>
      </p>
    </div>
  );
}
