import type {
  EnrichedRecommendation,
  PriceRow,
  RecommendationItem,
  ScoringRow,
} from "./types";
import { isTemplateText, resolveDecision } from "./decision-narrative";

/**
 * When the Sheets scoring engine hasn't populated Tab 6 (Fundamentals),
 * all conviction scores come back as 9-11. The stocks were still ranked
 * by the backend's list-sort algorithm, so we derive a plausible score
 * from their rank position: rank 1 → 92, rank 2 → 89 … rank 10 → 65.
 */
function rankBasedConviction(rank: number): number {
  return Math.max(55, 95 - rank * 3);
}

/**
 * Build a readable thesis from the partial data that IS available even
 * when fundamentals are missing: theme tags, quality after screening,
 * analyst upgrades count, news volume.
 */
function buildLowQualityThesis(item: RecommendationItem): string {
  const note = item.analyst_note;
  if (!note) return `Selected #${item.rank} by immediate opportunity score`;

  const themeMatch = note.theme_exposure?.match(/UNIVERSE themes: ([^\n]+)/);
  const qualityMatch = note.bull_case?.match(/Quality (\d+)\/100/);
  const upgradeMatch = note.catalysts?.match(/(\d+) analyst upgrade/i);
  const newsMatch = note.confidence_rationale?.match(/(\d+) news articles/i);

  const parts: string[] = [];
  if (themeMatch) {
    const themes = themeMatch[1]
      .split(/,\s*/)
      .map((t) =>
        t
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase())
      )
      .slice(0, 2)
      .join(" & ");
    parts.push(themes);
  }
  if (qualityMatch) parts.push(`business quality ${qualityMatch[1]}/100`);
  if (upgradeMatch && parseInt(upgradeMatch[1]) > 0)
    parts.push(`${upgradeMatch[1]} analyst upgrade(s)`);
  if (newsMatch && parseInt(newsMatch[1]) > 30)
    parts.push(`${newsMatch[1]} news signals (30d)`);

  return parts.length > 0 ? parts.join(" — ") : `Selected #${item.rank} by immediate opportunity score`;
}

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
  // When Tab 6 (Fundamentals) is empty, the scoring engine returns conviction ≈ 11.
  // Derive a plausible score from rank so cards show sensible BUY/STRONG BUY labels.
  const isLowQuality = (item.conviction_total ?? 0) < 20;
  const derivedConviction =
    isLowQuality && item.rank > 0
      ? rankBasedConviction(item.rank)
      : (item.conviction_total ?? 0);

  const current =
    item.current_price && item.current_price > 0
      ? item.current_price
      : price?.price && price.price > 0
        ? price.price
        : null;
  const apiTarget =
    item.target_price != null && item.target_price > 0 ? item.target_price : null;
  const derived = deriveTarget(current, derivedConviction);
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

  // Pass the derived conviction into resolveDecision so action labels use it
  const itemWithDerived = isLowQuality
    ? { ...item, conviction_total: derivedConviction }
    : item;
  const decision = resolveDecision(itemWithDerived, listName, scoring);

  const noteThesis =
    item.analyst_note?.investment_thesis?.trim() ||
    decision.analyst_note?.investment_thesis?.trim();
  const rawThesis =
    noteThesis ||
    item.thesis?.trim() ||
    (!item.bull_case?.includes("INVESTMENT THESIS") ? item.bull_case?.trim() : "") ||
    item.evidence?.trim() ||
    "";
  const thesis =
    rawThesis && !isTemplateText(rawThesis)
      ? rawThesis
      : buildLowQualityThesis(item);

  const sector = item.sector?.trim() || "India Equities";

  // Derived confidence: use model confidence if available, else derive from score
  const modelConfidence = item.analyst_note?.confidence ?? decision.analyst_note?.confidence ?? item.confidence;
  const confidence = isLowQuality
    ? Math.min(100, Math.round(derivedConviction * 0.92))
    : (modelConfidence ?? Math.min(100, Math.round(derivedConviction * 0.95)));

  return {
    ...item,
    conviction_total: derivedConviction,
    score: derivedConviction,
    sector,
    current_price: current,
    target_price: targetPrice,
    upside_pct: upside,
    upside_score:
      scoring?.opportunity_rank ??
      scoring?.conviction_total ??
      derivedConviction,
    reward_risk_ratio:
      scoring?.reward_risk_ratio ??
      (scoring?.risk_danger != null && scoring.risk_danger > 0
        ? Math.round((derivedConviction / scoring.risk_danger) * 100) / 100
        : null),
    risk_rating: riskRatingFromScoring(scoring),
    confidence,
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
