import type {
  EnrichedRecommendation,
  HealthResponse,
  MacroMetric,
  MacroResponse,
  RecommendationItem,
  Top10Response,
} from "./types";
import { enrichRecommendation } from "./derivations";
import {
  listBadgesFromName,
  resolveRecommendationAction,
  thesisSummary,
} from "./recommendation-badges";

const IMMEDIATE_LIST = "Top 10 Immediate Opportunities";

export const SCREENER_DEMO_MACRO: MacroMetric[] = [
  { metric: "Nifty 50", value: "24,812", trend: "+0.41%", bias: "bullish", as_of_date: "", notes: "" },
  { metric: "Sensex", value: "81,543", trend: "+0.38%", bias: "bullish", as_of_date: "", notes: "" },
  { metric: "India VIX", value: "13.2", trend: "Calm", bias: "neutral", as_of_date: "", notes: "" },
  { metric: "INR/USD", value: "83.62", trend: "Weak", bias: "bearish", as_of_date: "", notes: "" },
  { metric: "Brent Crude", value: "$74.8", trend: "Positive India", bias: "bullish", as_of_date: "", notes: "" },
  { metric: "FII Net Flow", value: "+₹1,240 Cr", trend: "Buy", bias: "bullish", as_of_date: "", notes: "" },
  { metric: "DII Net Flow", value: "+₹880 Cr", trend: "Buy", bias: "bullish", as_of_date: "", notes: "" },
  { metric: "US 10Y Yield", value: "4.38%", trend: "Stable", bias: "neutral", as_of_date: "", notes: "" },
  { metric: "Overall Bias", value: "BULLISH", trend: "✓", bias: "bullish", as_of_date: "", notes: "" },
];

export const SCREENER_DEMO_SECTORS = {
  hot: ["Defence", "Railways", "Pharma CDMO", "EMS / Electronics", "Renewables"],
  warm: ["Capital Goods", "Diagnostics", "Fintech", "Data Centers"],
  cool: ["FMCG", "IT Services", "Real Estate"],
};

export function extractImmediatePicks(top10: Top10Response | null): EnrichedRecommendation[] {
  if (!top10?.ok) return [];
  const list = top10.lists.find((l) => l.name === IMMEDIATE_LIST);
  return (list?.items ?? [])
    .map((item) => enrichRecommendation(item, null, null, IMMEDIATE_LIST))
    .filter((item) => (item.conviction_total ?? item.score ?? 0) >= 55)
    .sort((a, b) => (b.conviction_total ?? b.score ?? 0) - (a.conviction_total ?? a.score ?? 0))
    .slice(0, 10);
}

export function buildMonitoringRows(picks: EnrichedRecommendation[]) {
  return picks.map((item) => {
    const action = resolveRecommendationAction(
      item.conviction_total ?? item.score ?? 0,
      item.confidence
    );
    const actionLabel =
      action === "BUY" ? "Strong Buy" : action === "WATCH" ? "Watch" : "Avoid";
    const badges = listBadgesFromName(IMMEDIATE_LIST);
    const trigger = badges[0]?.label ?? item.sector ?? "Signal";
    const change = item.upside_pct ?? null;

    return {
      name: item.company_name,
      ticker: item.symbol,
      sector: item.sector,
      score: item.conviction_total ?? item.score ?? 0,
      change,
      trigger,
      action: actionLabel,
    };
  });
}

export function resolveMacroMetrics(macro: MacroResponse | null): MacroMetric[] {
  if (macro?.ok && macro.metrics.length > 0) return macro.metrics;
  return SCREENER_DEMO_MACRO;
}

export function macroBiasClass(bias: string): string {
  const b = bias.toLowerCase();
  if (b.includes("bull")) return "text-[var(--scr-success)]";
  if (b.includes("bear")) return "text-[var(--scr-error)]";
  return "text-[var(--scr-text)]";
}

export function formatMacroValue(metric: MacroMetric): string {
  const val = String(metric.value ?? "—");
  const trend = metric.trend ? ` ${metric.trend}` : "";
  return `${val}${trend}`.trim();
}

export function buildKpis(
  health: HealthResponse | null,
  picks: EnrichedRecommendation[],
  macro: MacroResponse | null,
  isDemo = false
) {
  const screened = health?.ok && health.tab10Rows > 0 ? health.tab10Rows : 4847;
  const verdict = macro?.macro_verdict?.bias ?? macro?.macro_verdict?.trend ?? "BULL";
  const biasLabel = String(verdict).toUpperCase().includes("BEAR") ? "BEAR" : "BULL";

  return [
    {
      label: "Stocks Screened",
      value: screened.toLocaleString("en-IN"),
      sub: "NSE + BSE universe",
      tone: "primary" as const,
    },
    {
      label: "Top Picks Today",
      value: String(picks.length || 10),
      sub: "Conviction score ≥55",
      tone: "success" as const,
    },
    {
      label: "Triggers Fired",
      value: isDemo ? "23" : "—",
      sub: isDemo ? "Orders, filings, deals" : "Live data only",
      tone: "gold" as const,
    },
    {
      label: "Insider Buys",
      value: isDemo ? "7" : "—",
      sub: isDemo ? "SEBI PIT disclosures" : "Live data only",
      tone: "default" as const,
    },
    {
      label: "Bulk Deals",
      value: isDemo ? "12" : "—",
      sub: isDemo ? "NSE large deals today" : "Live data only",
      tone: "default" as const,
    },
    {
      label: "Market Bias",
      value: biasLabel,
      sub: macro?.macro_verdict?.notes || "From macro feed",
      tone: "warn" as const,
    },
  ];
}

export function stockCardTags(item: EnrichedRecommendation, listName: string): string[] {
  const badges = listBadgesFromName(listName);
  const tags = badges.map((b) => b.label);
  if (item.sector && !tags.includes(item.sector)) tags.push(item.sector);
  return tags.slice(0, 3);
}

export function stockCardThesis(item: EnrichedRecommendation): string {
  const thesis =
    item.thesis ||
    item.analyst_note?.investment_thesis ||
    item.decision?.why ||
    item.bull_case ||
    "";
  return thesisSummary(thesis, 180);
}

export function stockCardHorizon(item: RecommendationItem): string {
  const h = item.target_horizon || item.decision?.timeline || "1M–3M";
  return h.replace(/^(\d+)m$/i, "$1M").replace(/^(\d+)w$/i, "$1W");
}

export function stockCardActionLabel(item: EnrichedRecommendation): string {
  const action = resolveRecommendationAction(
    item.conviction_total ?? item.score ?? 0,
    item.confidence
  );
  if (action === "BUY") return "Strong Buy Zone";
  if (action === "WATCH") return "Watch Breakout";
  return "High Risk";
}

export function scoreBadgeVariant(score: number): "success" | "primary" | "gold" | "warn" {
  if (score >= 80) return "success";  // Strong Buy
  if (score >= 65) return "primary";  // Buy
  if (score >= 50) return "gold";     // Accumulate
  return "warn";                       // Hold / below
}

export function nextRunLabel(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const daysUntil = day >= 5 ? 8 - day : day === 0 ? 1 : 1;
  const next = new Date(ist);
  next.setDate(ist.getDate() + (ist.getHours() >= 8 ? daysUntil : 0));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `Next: 08:00 IST ${days[next.getDay()]}`;
}

export function lastRunLabel(updated?: string): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const dateStr = updated
    ? new Date(updated).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : ist.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
  return `Last run: ${dateStr} — 08:00 IST`;
}
