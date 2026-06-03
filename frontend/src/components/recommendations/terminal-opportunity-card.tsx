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
  BUY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  WATCH: "bg-amber-500/15 text-amber-200 border-amber-500/35",
  AVOID: "bg-rose-500/15 text-rose-300 border-rose-500/40",
} as const;

const BADGE_TONE = {
  cyan: "border-cyan-500/30 text-cyan-300 bg-cyan-500/10",
  green: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
  amber: "border-amber-500/30 text-amber-200 bg-amber-500/10",
  violet: "border-violet-500/30 text-violet-300 bg-violet-500/10",
  rose: "border-rose-500/30 text-rose-300 bg-rose-500/10",
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
  const thesis =
    item.thesis ||
    item.analyst_note?.investment_thesis ||
    item.decision?.why ||
    item.bull_case ||
    "";
  const risk =
    item.analyst_note?.risks ||
    item.decision?.risk ||
    item.risk_rating ||
    item.bear_case ||
    "Review risk section";

  return (
    <Link
      href={`/stock/${item.symbol}`}
      className="group block h-full rounded-xl border border-border/50 bg-card/90 p-4 hover:border-cyan-500/45 hover:bg-card transition-all shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {rank != null ? (
              <span className="text-[10px] font-mono text-muted-foreground">#{rank}</span>
            ) : null}
            <span className="font-mono text-base font-semibold text-cyan-400 group-hover:text-cyan-300">
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
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.company_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-xl font-bold text-foreground tabular-nums leading-none">
            {item.score ?? item.conviction_total}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
            Conviction
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] mb-3 font-mono tabular-nums">
        <div>
          <p className="text-muted-foreground">Target</p>
          <p className="text-foreground">{formatPrice(item.target_price)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Conf</p>
          <p className="text-cyan-300/90">{item.confidence ?? "—"}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Upside</p>
          <p className={pctClass(item.upside_pct ?? 0)}>
            {item.upside_pct != null ? `${item.upside_pct >= 0 ? "+" : ""}${item.upside_pct}%` : "—"}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-rose-300/90 line-clamp-1 mb-2">
        <span className="text-muted-foreground font-medium">Risk · </span>
        {thesisSummary(String(risk), 90)}
      </p>

      <p className="text-xs text-foreground/90 leading-snug line-clamp-2 mb-3">
        {thesisSummary(thesis, 160)}
      </p>

      <div className="flex flex-wrap gap-1">
        {badges.map((b) => (
          <Badge
            key={b.label}
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 h-5 font-medium", BADGE_TONE[b.tone])}
          >
            {b.label}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
