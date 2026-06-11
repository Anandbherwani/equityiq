import type {
  EnrichedRecommendation,
  PriceRow,
  RecommendationItem,
  ScoringRow,
} from "./types";
import { resolveDecision } from "./decision-narrative";

export function riskFromConviction(conviction: number): "Low" | "Medium" | "High" {
  if (conviction >= 70) return "Low";
  if (conviction >= 45) return "Medium";
  return "High";
}

export function riskRatingFromScoring(
  scoring?: ScoringRow | null
): "Low" | "Medium" | "High" {
  const grade = (scoring?.risk_grade || "").toUpperCase();
  if (grade === "A" || grade === "B") return "Low";
  if (grade === "C") return "Medium";
  if (grade) return "High";
  const safety = scoring?.risk_score;
  if (safety != null && safety >= 68) return "Low";
  if (safety != null && safety >= 54) return "Medium";
  return riskFromConviction(scoring?.opportunity_rank ?? scoring?.conviction_total ?? 0);
}

export function deriveTarget(price: number | null, conviction: number): {
  target: number | null;
  upside: number | null;
} {
  if (!price || price <= 0) return { target: null, upside: null };
  // Linear scale: 3% upside at conviction=35, 30% at conviction=90+
  const upsidePct = conviction <= 35 ? 3 : Math.min(30, (conviction - 35) * 0.55 + 3);
  const mult = 1 + upsidePct / 100;
  const target = Math.round(price * mult * 100) / 100;
  return { target, upside: Math.round(upsidePct * 10) / 10 };
}

export function enrichRecommendation(
  item: RecommendationItem,
  price: PriceRow | null,
  scoring?: ScoringRow | null,
  listName = ""
): EnrichedRecommendation {
  const current =
    item.current_price && item.current_price > 0
      ? item.current_price
      : price?.price && price.price > 0
        ? price.price
        : null;
  const apiTarget =
    item.target_price != null && item.target_price > 0 ? item.target_price : null;
  const derived = deriveTarget(current, item.conviction_total);
  const targetPrice = apiTarget ?? derived.target;
  const upside =
    current && targetPrice
      ? Math.round(((targetPrice - current) / current) * 1000) / 10
      : derived.upside;
  const dataQualityPct =
    scoring?.data_quality_pct ??
    scoring?.data_quality?.data_quality_pct ??
    item.data_quality_pct ??
    null;

  const decision = resolveDecision(item, listName, scoring);
  const noteThesis =
    item.analyst_note?.investment_thesis?.trim() ||
    decision.analyst_note?.investment_thesis?.trim();
  const thesis =
    noteThesis ||
    item.thesis?.trim() ||
    item.bull_case?.trim() ||
    item.evidence?.trim() ||
    `Rank #${item.rank} on conviction ${item.conviction_total}/100.`;

  return {
    ...item,
    current_price: current,
    target_price: targetPrice,
    upside_pct: upside,
    upside_score:
      scoring?.opportunity_rank ??
      scoring?.conviction_total ??
      item.conviction_total,
    reward_risk_ratio:
      scoring?.reward_risk_ratio ??
      (scoring?.risk_danger != null && scoring.risk_danger > 0
        ? Math.round(
            ((scoring.opportunity_rank ?? item.conviction_total) / scoring.risk_danger) * 100
          ) / 100
        : null),
    risk_rating: riskRatingFromScoring(scoring),
    confidence:
      item.analyst_note?.confidence ??
      decision.analyst_note?.confidence ??
      item.confidence ??
      Math.min(100, Math.round(item.conviction_total * 0.95)),
    why_recommended: thesis,
    data_quality_pct: dataQualityPct,
    analyst_note: item.analyst_note ?? decision.analyst_note,
    decision,
  };
}

export function trendFromPrice(price: PriceRow | null): string {
  if (!price) return "Unknown";
  if (price.vs_200dma > 2 && price.rsi14 > 55) return "Uptrend";
  if (price.vs_200dma < -2 && price.rsi14 < 45) return "Downtrend";
  return "Range / Mixed";
}
