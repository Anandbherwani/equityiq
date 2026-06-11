"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataCoveragePanel } from "@/components/validation/data-coverage-panel";
import { HistoryHealthPanel } from "@/components/validation/history-health-panel";
import type {
  DataCoverageReport,
  RecommendationScorecard,
  RecommendationValidationResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export function ValidationDashboard({
  data,
  coverage,
}: {
  data: RecommendationValidationResponse;
  coverage?: DataCoverageReport | null;
}) {
  const avgAlphaNifty =
    data.scorecards.length > 0
      ? data.scorecards.reduce((s, c) => s + (c.average_alpha_vs_nifty_pct ?? 0), 0) /
        data.scorecards.filter((c) => c.average_alpha_vs_nifty_pct != null).length
      : null;
  const avgAlphaSector =
    data.scorecards.length > 0
      ? data.scorecards.reduce((s, c) => s + (c.average_alpha_vs_sector_pct ?? 0), 0) /
        data.scorecards.filter((c) => c.average_alpha_vs_sector_pct != null).length
      : null;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
          Evidence at a glance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EvidenceTile
            label="Hit rate"
            value={
              data.overall_hit_rate_pct != null ? `${data.overall_hit_rate_pct}%` : "—"
            }
            highlight
          />
          <EvidenceTile
            label="Alpha vs Nifty"
            value={avgAlphaNifty != null && !Number.isNaN(avgAlphaNifty) ? fmtPct(avgAlphaNifty) : "—"}
            positive={(avgAlphaNifty ?? 0) >= 0}
          />
          <EvidenceTile
            label="Alpha vs sector"
            value={avgAlphaSector != null && !Number.isNaN(avgAlphaSector) ? fmtPct(avgAlphaSector) : "—"}
            positive={(avgAlphaSector ?? 0) >= 0}
          />
          <EvidenceTile label="Logged picks" value={String(data.total_recommendations)} />
        </div>
      </section>

      {data.history_health ? <HistoryHealthPanel health={data.history_health} /> : null}
      {coverage && coverage.ok ? <DataCoveragePanel report={coverage} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="With live returns" value={String(data.total_with_returns)} />
        <SummaryTile
          label="History span"
          value={
            data.history_summary?.earliest
              ? `${data.history_summary.earliest} → ${data.history_summary.latest}`
              : "—"
          }
        />
      </div>

      {data.scorecards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Scorecards appear after Tab 37 accumulates daily snapshots.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.scorecards.map((card) => (
          <Scorecard key={card.recommendation_category} card={card} />
        ))}
      </div>
    </div>
  );
}

function EvidenceTile({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-border/50 p-4", highlight && "border-primary/30 bg-primary/5")}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums mt-1",
          positive === true && "text-emerald-400",
          positive === false && "text-rose-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-1 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Scorecard({ card }: { card: RecommendationScorecard }) {
  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium leading-snug">
          {card.category_label}
        </CardTitle>
        <p className="text-xs text-muted-foreground font-mono">{card.recommendation_category}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-muted/15 p-3 border border-border/40">
          <Metric
            label="Hit rate"
            value={card.hit_rate_pct != null ? `${card.hit_rate_pct}%` : "—"}
            emphasize
          />
          <Metric label="Avg return" value={fmtPct(card.average_return_pct)} />
          <Metric
            label="α vs Nifty"
            value={fmtPct(card.average_alpha_vs_nifty_pct)}
            emphasize
          />
          <Metric
            label="α vs sector"
            value={fmtPct(card.average_alpha_vs_sector_pct)}
            emphasize
          />
          <Metric label="Issued" value={String(card.recommendations_issued)} className="col-span-2" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm border-t border-border/50 pt-4">
          <PickBlock title="Best recommendation" pick={card.best_pick} positive />
          <PickBlock title="Worst recommendation" pick={card.worst_pick} positive={false} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  className,
  emphasize,
}: {
  label: string;
  value: string;
  className?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className={cn("font-semibold tabular-nums", emphasize ? "text-lg text-primary" : "font-medium")}>
        {value}
      </p>
    </div>
  );
}

function PickBlock({
  title,
  pick,
  positive,
}: {
  title: string;
  pick: RecommendationScorecard["best_pick"];
  positive: boolean;
}) {
  if (!pick) {
    return (
      <div>
        <p className="text-muted-foreground mb-1">{title}</p>
        <p>—</p>
      </div>
    );
  }
  const color = positive
    ? pick.return_pct >= 0
      ? "text-emerald-400"
      : "text-rose-400"
    : pick.return_pct >= 0
      ? "text-emerald-400"
      : "text-rose-400";

  return (
    <div>
      <p className="text-muted-foreground mb-1">{title}</p>
      <Link href={`/stock/${pick.symbol}`} className="font-medium text-primary hover:underline">
        {pick.symbol}
      </Link>
      <p className="text-muted-foreground truncate">{pick.company_name}</p>
      <p className={cn("tabular-nums mt-1", color)}>{fmtPct(pick.return_pct)}</p>
      <p className="text-muted-foreground tabular-nums">α {fmtPct(pick.alpha_vs_nifty_pct)}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">Entry {pick.entry_date}</p>
    </div>
  );
}
