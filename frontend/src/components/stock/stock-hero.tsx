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
  BUY: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  WATCH: "bg-amber-500/15 text-amber-200 border-amber-500/35",
  AVOID: "bg-rose-500/15 text-rose-300 border-rose-500/40",
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
    <section className="rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-cyan-950/15 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl sm:text-3xl font-bold text-cyan-400">
              {data.symbol}
            </h1>
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border",
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
          <p className="text-lg text-foreground font-medium">
            {data.universe?.company_name || s?.company_name || "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.universe?.sector || data.fundamentals?.sector_normalized || "—"}
          </p>
          {listRows.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {listRows.map((l) => (
                <Link
                  key={`${l.list_name}-${l.rank}`}
                  href="/recommendations"
                  className="text-[11px] rounded-md border border-border/50 px-2 py-1 hover:border-cyan-500/40 text-muted-foreground hover:text-foreground"
                >
                  #{l.rank} {l.list_name.replace("Top 10 ", "")}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3 shrink-0 w-full lg:w-auto">
          <HeroStat label="Price" value={formatPrice(p?.price)} sub={formatPct(p?.chg_pct)} subClass={pctClass(p?.chg_pct)} />
          <HeroStat label="Conviction" value={String(conviction)} sub="/ 100" />
          <HeroStat label="Target" value={formatPrice(target)} sub={upside != null ? `${upside >= 0 ? "+" : ""}${upside}% upside` : "—"} subClass={pctClass(upside ?? 0)} />
          <HeroStat label="Confidence" value={confidence != null ? `${confidence}%` : "—"} />
          <HeroStat label="Risk" value={s?.risk_grade || "—"} sub={risk} subClass="text-rose-300/90" wide />
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
    <div className={cn("rounded-lg bg-muted/20 border border-border/40 px-3 py-2", wide && "col-span-2 sm:col-span-3 lg:col-span-1 xl:col-span-3")}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums mt-0.5">{value}</p>
      {sub ? <p className={cn("text-[11px] mt-1 line-clamp-2", subClass || "text-muted-foreground")}>{sub}</p> : null}
    </div>
  );
}
