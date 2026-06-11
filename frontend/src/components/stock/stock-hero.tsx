"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  listBadgesFromName,
  resolveRecommendationAction,
} from "@/lib/recommendation-badges";
import type { SymbolResponse } from "@/lib/types";
import { formatPct, formatPrice, pctClass } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTION_STYLES = {
  BUY:   "bg-gain/15 text-gain border-gain/40",
  WATCH: "bg-warn/15 text-warn border-warn/40",
  AVOID: "bg-loss/15 text-loss border-loss/40",
} as const;

export function StockHero({ data }: { data: SymbolResponse }) {
  const listRows = (data.lists ?? []).filter(
    (l): l is NonNullable<SymbolResponse["lists"]>[number] =>
      typeof l === "object" && l !== null && "list_name" in l
  );
  const rec = data.recommendation || listRows[0];
  const s = data.scoring;
  const p = data.price;
  const listName = rec?.list_name || listRows[0]?.list_name || "";
  const conviction = rec?.conviction_total ?? s?.conviction_total ?? 0;
  const confidence =
    rec?.decision?.analyst_note?.confidence ?? s?.data_quality_pct ?? null;
  const action = resolveRecommendationAction(conviction, confidence);
  const target =
    p?.price && conviction
      ? Math.round(p.price * (1 + conviction / 200) * 100) / 100
      : null;
  const upside =
    p?.price && target
      ? Math.round(((target - p.price) / p.price) * 1000) / 10
      : null;
  const risk =
    rec?.bear_case?.slice(0, 120) ||
    (s?.risk_grade ? `Risk grade ${s.risk_grade}` : "See bear case below");

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        {/* Left — identity */}
        <div className="space-y-2.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {data.symbol}
            </h1>
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border",
                ACTION_STYLES[action]
              )}
            >
              {action}
            </span>
            {listBadgesFromName(listName).map((b) => (
              <Badge key={b.label} variant="outline" className="text-[10px]">
                {b.label}
              </Badge>
            ))}
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              {data.universe?.company_name || s?.company_name || "—"}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {data.universe?.sector || data.fundamentals?.sector_normalized || "—"}
            </p>
          </div>
          {listRows.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {listRows.map((l) => (
                <Link
                  key={`${l.list_name}-${l.rank}`}
                  href="/recommendations"
                  className="text-[10px] rounded border border-border px-2 py-0.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  #{l.rank} {l.list_name.replace("Top 10 ", "")}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right — KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2 shrink-0 w-full lg:w-auto lg:min-w-[280px]">
          <HeroStat
            label="Price"
            value={formatPrice(p?.price)}
            sub={formatPct(p?.chg_pct)}
            subClass={pctClass(p?.chg_pct)}
          />
          <HeroStat
            label="Conviction"
            value={String(conviction)}
            sub="/ 100"
          />
          <HeroStat
            label="Target"
            value={formatPrice(target)}
            sub={upside != null ? `${upside >= 0 ? "+" : ""}${upside}% upside` : "—"}
            subClass={pctClass(upside ?? 0)}
          />
          <HeroStat
            label="Confidence"
            value={confidence != null ? `${confidence}%` : "—"}
          />
          <HeroStat
            label="Risk"
            value={s?.risk_grade || "—"}
            sub={risk}
            subClass="text-loss/80"
            wide
          />
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
  subClass,
  wide,
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/20 border border-border px-3 py-2.5",
        wide && "col-span-2 sm:col-span-3 lg:col-span-1 xl:col-span-3"
      )}
    >
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums mt-0.5 leading-none">{value}</p>
      {sub && (
        <p className={cn("text-[11px] mt-1 leading-snug line-clamp-2", subClass || "text-muted-foreground")}>
          {sub}
        </p>
      )}
    </div>
  );
}
