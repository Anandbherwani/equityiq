"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BacktestValidationReport } from "@/lib/types";
import { cn } from "@/lib/utils";

const VERDICT_STYLES: Record<string, string> = {
  PASS: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  PARTIAL: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  FAIL: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export function ValidationReport({ report }: { report: BacktestValidationReport }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Validation report</CardTitle>
          <Badge
            className={cn(
              "font-mono uppercase",
              VERDICT_STYLES[report.overall_verdict] ?? VERDICT_STYLES.PARTIAL
            )}
          >
            {report.overall_verdict}
          </Badge>
          <Badge variant="outline" className="text-xs">
            v{report.report_version} · snapshot-only
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tab 22 snapshots: {report.snapshot_rows_total}
          {report.synthetic_rows_excluded > 0
            ? ` · ${report.synthetic_rows_excluded} synthetic rows excluded`
            : ""}
          {" · "}
          Lists ready {report.lists_ready}/{report.lists_total}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          {(report.summary_lines ?? []).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="space-y-3">
          {(report.lists ?? []).map((list) => (
            <div
              key={list.list_name}
              className="rounded-md border border-border/50 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-xs">
                  {list.list_name.replace("Top 10 ", "")}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", VERDICT_STYLES[list.verdict])}
                >
                  {list.verdict}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {list.snapshot_rows} snapshots · {list.mode}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(list.horizons ?? []).map((h) => (
                  <div
                    key={h.horizon}
                    className="rounded border border-border/40 px-2 py-1.5 text-[10px] font-mono"
                  >
                    <div className="flex justify-between gap-1 mb-1">
                      <span>{h.horizon}</span>
                      <span className={VERDICT_STYLES[h.verdict]?.split(" ").pop()}>
                        {h.verdict}
                      </span>
                    </div>
                    {h.trade_count > 0 ? (
                      <>
                        <p>
                          n={h.trade_count} · Hit {h.hit_rate_pct}% · Ret {h.avg_return_pct}%
                        </p>
                        <p className="text-primary/90">
                          α Nifty {fmt(h.alpha_vs_nifty_pct)} · Sector {fmt(h.alpha_vs_sector_pct)}
                        </p>
                        <p className="text-muted-foreground">
                          Sharpe {h.sharpe_ratio} · Sortino {h.sortino_ratio} · DD{" "}
                          {h.max_drawdown_pct}%
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">{h.notes || "No mature trades"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v > 0 ? "+" : ""}${v}%`;
}
