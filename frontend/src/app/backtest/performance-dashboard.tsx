"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecommendationPerformanceDashboard } from "@/lib/types";

export function PerformanceDashboard({
  dashboard,
  snapshotRows,
}: {
  dashboard: RecommendationPerformanceDashboard;
  snapshotRows?: number;
}) {
  const snap = snapshotRows ?? dashboard.snapshot_rows_total;
  const ready = dashboard.lists_ready;
  const total = dashboard.lists_total;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className="font-mono text-primary/90">
          Snapshot-only v4
        </Badge>
        <Badge variant="secondary">
          Tab 22: {snap} rows · {ready}/{total} lists ready
        </Badge>
        {ready < total ? (
          <span className="text-xs text-amber-400/90">
            Need {dashboard.min_snapshots_required}+ snapshots per list (daily 8 AM snapshot)
          </span>
        ) : null}
      </div>

      {dashboard.overall_12m ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">12-month aggregate (all ready lists)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <Kpi label="Hit rate" value={`${dashboard.overall_12m.hit_rate_pct}%`} />
            <Kpi label="Avg return" value={`${dashboard.overall_12m.avg_return_pct}%`} />
            <Kpi
              label="α vs Nifty"
              value={fmtAlpha(dashboard.overall_12m.alpha_vs_nifty_pct)}
              accent
            />
            <Kpi
              label="α vs Sector"
              value={fmtAlpha(dashboard.overall_12m.alpha_vs_sector_pct)}
              accent
            />
            <Kpi label="Sharpe" value={String(dashboard.overall_12m.sharpe_ratio)} />
            <Kpi label="Sortino" value={String(dashboard.overall_12m.sortino_ratio)} />
            <Kpi
              label="Max drawdown"
              value={`${dashboard.overall_12m.max_drawdown_pct}%`}
              className="text-rose-400/90"
            />
            <Kpi
              label="Sample trades"
              value={String(dashboard.overall_12m.sample_trades)}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(dashboard.by_horizon || []).filter(Boolean).map((h) =>
          h ? (
            <Card key={h.horizon} className="border-border/60">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium">{h.horizon}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 font-mono">
                <p>Hit {h.hit_rate_pct}% · Ret {h.avg_return_pct}%</p>
                <p className="text-primary">
                  α Nifty {fmtAlpha(h.alpha_vs_nifty_pct)} · Sector {fmtAlpha(h.alpha_vs_sector_pct)}
                </p>
                <p className="text-muted-foreground">
                  Sharpe {h.sharpe_ratio} · Sortino {h.sortino_ratio} · DD {h.max_drawdown_pct}%
                </p>
              </CardContent>
            </Card>
          ) : null
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</p>
      <p
        className={`font-mono text-sm mt-0.5 ${accent ? "text-primary" : ""} ${className ?? ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function fmtAlpha(n: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n}%`;
}
