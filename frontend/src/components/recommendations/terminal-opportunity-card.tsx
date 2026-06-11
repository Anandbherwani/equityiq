"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  listBadgesFromName,
  resolveRecommendationAction,
  thesisSummary,
} from "@/lib/recommendation-badges";
import type { EnrichedRecommendation } from "@/lib/types";
import { formatPrice, pctClass } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTION_STYLES = {
  BUY:   "bg-gain/15 text-gain border-gain/40",
  WATCH: "bg-warn/15 text-warn border-warn/40",
  AVOID: "bg-loss/15 text-loss border-loss/40",
} as const;

const BADGE_TONE = {
  cyan:   "border-primary/30 text-primary bg-primary/10",
  green:  "border-gain/30 text-gain bg-gain/10",
  amber:  "border-warn/30 text-warn bg-warn/10",
  violet: "border-[#a371f7]/30 text-[#a371f7] bg-[#a371f7]/10",
  rose:   "border-loss/30 text-loss bg-loss/10",
} as const;

type Props = {
  item: EnrichedRecommendation;
  listName: string;
  rank?: number;
};

export function TerminalOpportunityCard({ item, listName, rank }: Props) {
  const action = resolveRecommendationAction(
    item.conviction_total ?? item.score ?? 0,
    item.confidence
  );
  const badges = listBadgesFromName(listName);
  // Prefer why_recommended (cleaned by enrichRecommendation) over raw thesis/analyst_note
  const thesis =
    item.why_recommended ||
    item.decision?.why ||
    item.thesis ||
    item.analyst_note?.investment_thesis ||
    item.bull_case ||
    "";
  // Prefer decision.risk (cleaned by buildDecisionFromAnalystNote) over raw analyst_note.risks
  const risk =
    item.decision?.risk ||
    item.bear_case ||
    item.risk_rating ||
    "Monitor sector rotation and liquidity risk.";

  const score = item.score ?? item.conviction_total;
  const scoreColor =
    score != null
      ? score >= 70
        ? "text-gain"
        : score >= 45
          ? "text-warn"
          : "text-loss"
      : "text-foreground";

  return (
    <Link
      href={`/stock/${item.symbol}`}
      className="group block h-full rounded-xl border border-border bg-card p-4 card-lift hover:border-primary/40 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {rank != null && (
              <span className="text-[10px] font-mono text-muted-foreground">#{rank}</span>
            )}
            <span className="font-mono text-base font-bold text-foreground group-hover:text-primary transition-colors">
              {item.symbol}
            </span>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                ACTION_STYLES[action]
              )}
            >
              {action}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.company_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("font-mono text-xl font-bold tabular-nums leading-none score-reveal", scoreColor)}>
            {score ?? "—"}
          </p>
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">Score</p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px] mb-2.5 font-mono tabular-nums">
        <div>
          <p className="text-muted-foreground text-[9px] uppercase">Target</p>
          <p className="text-foreground">{formatPrice(item.target_price)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[9px] uppercase">Conf</p>
          <p className="text-primary">{item.confidence ?? "—"}%</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[9px] uppercase">Upside</p>
          <p className={pctClass(item.upside_pct ?? 0)}>
            {item.upside_pct != null
              ? `${item.upside_pct >= 0 ? "+" : ""}${item.upside_pct}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Score breakdown */}
      {item.dim_breakdown && (
        <p className="text-[9px] font-mono text-muted-foreground/70 truncate mb-1.5 tracking-tight">
          {item.dim_breakdown}
        </p>
      )}

      {/* Risk line */}
      <p className="text-[11px] text-loss/80 line-clamp-1 mb-1.5">
        <span className="text-muted-foreground font-medium">Risk · </span>
        {thesisSummary(String(risk), 90)}
      </p>

      {/* Thesis */}
      <p className="text-[11px] text-foreground/80 leading-snug line-clamp-2 mb-2.5">
        {thesisSummary(thesis, 160)}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        {badges.map((b) => (
          <Badge
            key={b.label}
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 h-5 font-medium border", BADGE_TONE[b.tone])}
          >
            {b.label}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
