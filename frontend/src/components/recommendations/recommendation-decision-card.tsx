"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataQualityBadge } from "@/components/shared/data-quality-badge";
import { usePersona } from "@/components/shared/persona-provider";
import { AnalystNoteSections } from "./analyst-note-sections";
import { DecisionExportLine, DecisionSections } from "./decision-sections";
import { hasCompleteAnalystNote } from "@/lib/decision-narrative";
import {
  listBadgesFromName,
  resolveRecommendationAction,
  thesisSummary,
} from "@/lib/recommendation-badges";
import type { EnrichedRecommendation } from "@/lib/types";
import { formatPct, formatPrice, pctClass } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTION_STYLES = {
  BUY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  WATCH: "bg-amber-500/15 text-amber-200 border-amber-500/35",
  AVOID: "bg-rose-500/15 text-rose-300 border-rose-500/40",
} as const;

type Props = {
  item: EnrichedRecommendation;
  listName?: string;
  variant?: "full" | "compact" | "dashboard";
};

export function RecommendationDecisionCard({ item, listName = "", variant = "full" }: Props) {
  const { persona } = usePersona();
  const decision = item.decision;
  const analystNote = item.analyst_note ?? decision.analyst_note;
  const showAnalystNote =
    analystNote &&
    (hasCompleteAnalystNote(item) ||
      String(analystNote.investment_thesis ?? "").trim().length >= 32);
  const isPm = persona === "portfolio_manager";
  const isBeginner = persona === "beginner";
  const showMetrics = persona === "professional" || variant === "full";
  const compact = variant === "dashboard" || isPm;
  const action = resolveRecommendationAction(
    item.conviction_total ?? item.score ?? 0,
    item.confidence
  );
  const badges = listBadgesFromName(listName);

  if (variant === "dashboard") {
    return (
      <Link href={`/stock/${item.symbol}`} className="block h-full">
        <Card className="hover:border-cyan-500/40 transition-colors h-full border-border/60">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="font-mono text-cyan-400 text-base">{item.symbol}</CardTitle>
              {!isBeginner ? (
                <div className="flex flex-col items-end gap-1">
                  <DataQualityBadge pct={item.data_quality_pct} />
                  <span className="font-mono text-sm text-amber-300">
                    {item.score ?? item.conviction_total}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Conf {item.confidence}%</span>
                </div>
              ) : (
                <DataQualityBadge pct={item.data_quality_pct} />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{item.company_name}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {showAnalystNote ? (
              <AnalystNoteSections note={analystNote!} compact />
            ) : (
              <DecisionSections decision={decision} persona={persona} compact />
            )}
            {isPm ? <DecisionExportLine symbol={item.symbol} decision={decision} /> : null}
          </CardContent>
        </Card>
      </Link>
    );
  }

  const thesisLine = thesisSummary(
    item.why_recommended ||
      analystNote?.investment_thesis ||
      decision.why ||
      "",
    200
  );

  return (
    <Card
      className={cn(
        "border-border/50 bg-gradient-to-br from-card via-card to-cyan-950/10 hover:border-cyan-500/35 transition-colors",
        compact && "shadow-sm"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/stock/${item.symbol}`}
              className="font-mono text-lg font-bold text-cyan-400 hover:underline"
            >
              {item.symbol}
            </Link>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                ACTION_STYLES[action]
              )}
            >
              {action}
            </span>
          </div>
          <CardTitle className="text-sm font-normal text-muted-foreground mt-0.5 truncate">
            {item.company_name || "—"}
          </CardTitle>
          <div className="flex flex-wrap gap-1 mt-2">
            {badges.map((b) => (
              <Badge key={b.label} variant="outline" className="text-[9px] h-5">
                {b.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-right space-y-1">
          <DataQualityBadge pct={item.data_quality_pct} />
          {!isBeginner ? (
            <>
              <p className="font-mono text-2xl font-bold text-amber-300 tabular-nums">
                {item.score ?? item.conviction_total}
              </p>
              <p className="text-[10px] uppercase text-muted-foreground">Score</p>
              <p className="text-[10px] text-muted-foreground font-mono">Conf {item.confidence}%</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground max-w-[8rem]">
              {item.conviction_total >= 55
                ? "Strong pick"
                : item.conviction_total >= 35
                  ? "Moderate pick"
                  : "Watch closely"}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-foreground/90 leading-relaxed border-l-2 border-cyan-500/40 pl-3">
          {thesisLine || "Open stock for full analyst note."}
        </p>
        {showAnalystNote && !compact ? (
          <AnalystNoteSections note={analystNote!} compact={compact} />
        ) : !compact ? (
          <DecisionSections decision={decision} persona={persona} compact={compact} />
        ) : null}

        {showMetrics ? (
          <details className="group rounded-md border border-border/50 bg-muted/10">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
              <span>View price & score details</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/40 px-3 py-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p>{formatPrice(item.current_price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target</p>
                  <p>{formatPrice(item.target_price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Upside (rank)</p>
                  <p>{item.upside_score ?? item.conviction_total ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price upside</p>
                  <p className={pctClass(item.upside_pct ?? 0)}>
                    {item.upside_pct != null ? formatPct(item.upside_pct) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reward/Risk</p>
                  <p>
                    {item.reward_risk_ratio != null
                      ? `${item.reward_risk_ratio}:1`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Confidence</p>
                  <p>{item.confidence}%</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{item.sector || "Sector N/A"}</Badge>
                <Badge variant="outline">Risk: {item.risk_rating}</Badge>
              </div>
            </div>
          </details>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{item.sector || "Sector N/A"}</Badge>
          </div>
        )}

        {isPm ? <DecisionExportLine symbol={item.symbol} decision={decision} /> : null}
      </CardContent>
    </Card>
  );
}
