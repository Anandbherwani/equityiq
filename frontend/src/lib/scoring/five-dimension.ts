import type { ScoringRow } from "@/lib/types";

// Backend pillar caps from CONVICTION_CAP in Code.gs
const PILLAR_CAP: Record<string, number> = {
  C: 15, // fundamentals quality
  K: 10, // business moat
  D: 15, // valuation
  E: 15, // growth / earnings
  F: 15, // financial strength
  G: 10, // sector strength
  H: 10, // news events
  I: 5,  // technical momentum
  J: 5,  // institutional flow
};

// Human label for "missing" display
const PILLAR_LABELS: Record<string, string> = {
  C: "Fundamentals", K: "Business Moat", D: "Valuation",
  E: "Earnings Growth", F: "Financial Strength", G: "Sector",
  H: "News Events", I: "Momentum", J: "Institutional",
};

// Conservative default fraction (0-1) per dimension when all contributing pillars are absent
const DEF_FRAC = {
  value:    12 / 25, // 0.48
  quality:  12 / 25, // 0.48
  growth:   10 / 20, // 0.50
  momentum: 12 / 20, // 0.60
  safety:    5 / 10, // 0.50
};

export interface FiveDimScore {
  value:    number; // 0-25
  quality:  number; // 0-25
  growth:   number; // 0-20
  momentum: number; // 0-20
  safety:   number; // 0-10
  total:    number; // 0-100
  available:        number;   // non-zero pillar count (out of 9)
  dataComplete:     boolean;  // true when ≥7/9 pillars have data
  missingDimensions: string[]; // dimensions where ALL contributing pillars are 0
  breakdown: string; // display line
}

// Parse "C8/15 D7/15 ..." → { C: {raw, max}, ... } — skips unknown letters and M
function parsePillars(
  s: string | null | undefined
): Record<string, { raw: number; max: number }> {
  const out: Record<string, { raw: number; max: number }> = {};
  if (!s) return out;
  for (const m of s.matchAll(/([A-Z])(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g)) {
    const key = m[1];
    if (!PILLAR_CAP[key]) continue; // skip M (output) and unknown letters
    out[key] = { raw: parseFloat(m[2]), max: parseFloat(m[3]) || PILLAR_CAP[key] };
  }
  return out;
}

// Merge ScoringRow fields into the pillar map as a fallback when score_breakdown is absent
function mergeScoringRowFallback(
  pillars: Record<string, { raw: number; max: number }>,
  scoring: ScoringRow | null
) {
  if (!scoring) return;
  const add = (key: string, val: number | undefined, max: number) => {
    if (!pillars[key] && val != null && val > 0) {
      pillars[key] = { raw: val, max };
    }
  };
  add("C", scoring.fundamentals,      15);
  add("D", scoring.valuation,         15);
  add("E", scoring.growth,            15);
  add("F", scoring.financial_strength,15);
  add("G", scoring.sector_strength,   10);
  add("H", scoring.news_events,       10);
  add("I", scoring.technical_momentum, 5);
  add("J", scoring.institutional_flow, 5);
}

/**
 * Compute one 5-dim output score.
 * Each pillar contributes `dimWeight` points if at its backend max.
 * Missing pillars (raw=0) contribute their default-fraction portion instead.
 * Returns score + whether ALL pillars in this dimension were missing.
 */
function dimScore(
  pillars: Record<string, { raw: number; max: number }>,
  contributions: Array<{ key: string; dimWeight: number }>,
  dimMax: number,
  defaultFrac: number
): { score: number; allMissing: boolean } {
  let pts = 0;
  let allMissing = true;
  for (const { key, dimWeight } of contributions) {
    const p = pillars[key];
    if (p && p.raw > 0) {
      pts += (p.raw / (PILLAR_CAP[key] ?? p.max)) * dimWeight;
      allMissing = false;
    } else {
      pts += defaultFrac * dimWeight;
    }
  }
  return { score: Math.round(Math.min(dimMax, Math.max(0, pts))), allMissing };
}

/**
 * Maps the 9 backend conviction pillars (C/D/E/F/G/H/I/J/K from score_breakdown)
 * onto the user-specified 5 dimensions.  ScoringRow fields are used as fallback
 * when score_breakdown is absent (e.g. stock detail page).
 *
 * Dimension ← pillar(s)           backend max → dim max
 * VALUE     ← D(valuation)        15 → 25
 * QUALITY   ← C(fundamentals)+K   15+10 → 25
 * GROWTH    ← E(earnings)+G       15+10 → 20  (E:12pts, G:8pts weight)
 * MOMENTUM  ← H(news)+I(tech)     10+5  → 20  (H:12pts, I:8pts weight)
 * SAFETY    ← F(fin.str)+J(inst)  15+5  → 10  (F:7pts, J:3pts weight)
 */
export function computeFiveDimension(
  scoring: ScoringRow | null,
  scoreBreakdown: string | null | undefined
): FiveDimScore {
  const pillars = parsePillars(scoreBreakdown);
  mergeScoringRowFallback(pillars, scoring);

  const MAIN = ["C", "K", "D", "E", "F", "G", "H", "I", "J"];
  const available = MAIN.filter((k) => {
    const p = pillars[k];
    return p && p.raw > 0;
  }).length;
  const dataComplete = available >= 7;

  const valR = dimScore(pillars, [{ key: "D", dimWeight: 25 }],                                25, DEF_FRAC.value);
  const quaR = dimScore(pillars, [{ key: "C", dimWeight: 15 }, { key: "K", dimWeight: 10 }],   25, DEF_FRAC.quality);
  const groR = dimScore(pillars, [{ key: "E", dimWeight: 12 }, { key: "G", dimWeight: 8 }],    20, DEF_FRAC.growth);
  const momR = dimScore(pillars, [{ key: "H", dimWeight: 12 }, { key: "I", dimWeight: 8 }],    20, DEF_FRAC.momentum);
  const safR = dimScore(pillars, [{ key: "F", dimWeight: 7  }, { key: "J", dimWeight: 3 }],    10, DEF_FRAC.safety);

  const value    = valR.score;
  const quality  = quaR.score;
  const growth   = groR.score;
  const momentum = momR.score;
  const safety   = safR.score;
  const total    = value + quality + growth + momentum + safety;

  // Flag dimension labels only when every contributing pillar returned zero
  const missingDimensions: string[] = [];
  if (valR.allMissing)                                       missingDimensions.push("Valuation");
  if (quaR.allMissing)                                       missingDimensions.push("Fundamentals");
  if (groR.allMissing)                                       missingDimensions.push("Earnings Growth");
  if (momR.allMissing)                                       missingDimensions.push("Momentum");
  if (safR.allMissing)                                       missingDimensions.push("Safety");

  const breakdown =
    `Value: ${value}/25 | Quality: ${quality}/25 | Growth: ${growth}/20 | Momentum: ${momentum}/20 | Safety: ${safety}/10`;

  return { value, quality, growth, momentum, safety, total, available, dataComplete, missingDimensions, breakdown };
}

// Re-export label map for use in card tooltips
export { PILLAR_LABELS };
