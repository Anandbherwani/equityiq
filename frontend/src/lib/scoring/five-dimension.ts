import type { ScoringRow } from "@/lib/types";

export interface FiveDimScore {
  value: number;     // 0-25
  quality: number;   // 0-25
  growth: number;    // 0-20
  momentum: number;  // 0-20
  safety: number;    // 0-10
  total: number;     // 0-100
  breakdown: string; // "Value: X/25 | Quality: X/25 | Growth: X/20 | Momentum: X/20 | Safety: X/10"
}

// Defaults used when a dimension's source data is absent
const DEF = { value: 12, quality: 12, growth: 10, momentum: 12, safety: 5 } as const;

// Parse "C8/15 D7/15 ..." into { C: {raw,max}, ... }
function parsePillars(s: string | null | undefined): Record<string, { raw: number; max: number }> {
  const out: Record<string, { raw: number; max: number }> = {};
  if (!s) return out;
  for (const m of s.matchAll(/([A-Z])(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g)) {
    out[m[1]] = { raw: parseFloat(m[2]), max: parseFloat(m[3]) };
  }
  return out;
}

function ratio(p: { raw: number; max: number } | undefined): number | null {
  return p && p.max > 0 ? p.raw / p.max : null;
}

/**
 * Computes a 100-point score across 5 weighted dimensions.
 * Uses ScoringRow pillar data as primary source, score_breakdown string (C/D/E/F/G/H/I/J/K)
 * as secondary, and user-specified defaults when both are absent.
 *
 * Dimension → ScoringRow field (max) → score_breakdown pillar
 * VALUE     → valuation (15)         → D (valuation proxy)
 * QUALITY   → fundamentals (25)      → F (fundamentals proxy)
 * GROWTH    → growth (15)            → G (growth) + E (earnings)
 * MOMENTUM  → technical_momentum (12) + news_events (8) → H + I + K
 * SAFETY    → financial_strength (12) → C (catalyst/credit proxy)
 */
export function computeFiveDimension(
  scoring: ScoringRow | null,
  scoreBreakdown: string | null | undefined
): FiveDimScore {
  const pb = parsePillars(scoreBreakdown);

  // VALUE (max 25)
  // ScoringRow.valuation max is 15 per PILLAR_MAX
  const valRatio =
    scoring?.valuation != null && scoring.valuation > 0
      ? scoring.valuation / 15
      : ratio(pb.D);
  const value = valRatio != null ? Math.round(Math.min(25, valRatio * 25)) : DEF.value;

  // QUALITY (max 25)
  // ScoringRow.fundamentals is already scored 0-25
  const quality =
    scoring?.fundamentals != null && scoring.fundamentals > 0
      ? Math.round(Math.min(25, scoring.fundamentals))
      : pb.F
        ? Math.round(Math.min(25, (ratio(pb.F) ?? 0) * 25))
        : DEF.quality;

  // GROWTH (max 20)
  // ScoringRow.growth max is 15 per PILLAR_MAX
  const growthRatio =
    scoring?.growth != null && scoring.growth > 0 ? scoring.growth / 15 : null;
  let growth: number;
  if (growthRatio != null) {
    growth = Math.round(Math.min(20, growthRatio * 20));
  } else if (pb.G || pb.E) {
    const g = ratio(pb.G) ?? 0.5;
    const e = ratio(pb.E) ?? 0.5;
    growth = Math.round(Math.min(20, (g + e) * 10));
  } else {
    growth = DEF.growth;
  }

  // MOMENTUM (max 20)
  // technical_momentum max 12 + news_events max 8 = 20 total
  let momentum: number;
  const hasScoringMomentum =
    scoring?.technical_momentum != null || scoring?.news_events != null;
  if (hasScoringMomentum) {
    const tm = (scoring?.technical_momentum ?? 0) / 12;
    const ne = (scoring?.news_events ?? 0) / 8;
    momentum = Math.round(Math.min(20, tm * 12 + ne * 8));
    // Fall back to pillar data if ScoringRow returns all-zero momentum
    if (momentum === 0 && (pb.H || pb.K || pb.I)) {
      const h = (ratio(pb.H) ?? 0) * 12;
      const i = (ratio(pb.I) ?? 0) * 4;
      const k = (ratio(pb.K) ?? 0) * 4;
      momentum = Math.round(Math.min(20, h + i + k));
    }
    if (momentum === 0) momentum = DEF.momentum;
  } else if (pb.H || pb.K || pb.I) {
    const h = (ratio(pb.H) ?? 0) * 12;
    const i = (ratio(pb.I) ?? 0) * 4;
    const k = (ratio(pb.K) ?? 0) * 4;
    momentum = Math.round(Math.min(20, h + i + k));
    if (momentum === 0) momentum = DEF.momentum;
  } else {
    momentum = DEF.momentum;
  }

  // SAFETY (max 10)
  // ScoringRow.financial_strength max 12
  const safetyRatio =
    scoring?.financial_strength != null && scoring.financial_strength > 0
      ? scoring.financial_strength / 12
      : ratio(pb.C);
  const safety = safetyRatio != null ? Math.round(Math.min(10, safetyRatio * 10)) : DEF.safety;

  const total = value + quality + growth + momentum + safety;
  const breakdown = `Value: ${value}/25 | Quality: ${quality}/25 | Growth: ${growth}/20 | Momentum: ${momentum}/20 | Safety: ${safety}/10`;

  return { value, quality, growth, momentum, safety, total, breakdown };
}
