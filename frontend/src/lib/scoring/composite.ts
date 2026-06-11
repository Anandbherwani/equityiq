import type { FundamentalsRow, PriceRow, ScoringRow, UniverseRow } from "@/lib/types";

export interface PillarScores {
  quality: number;    // 0-100
  growth: number;     // 0-100
  valuation: number;  // 0-100
  momentum: number;   // 0-100
  safety: number;     // 0-100
}

export interface CompositeScore {
  composite: number;
  pillars: PillarScores;
  confidence: number;
  targetPrice: number | null;
  upside: number | null;
  source: "computed" | "normalized" | "fallback";
}

// Normalization denominators for each ScoringRow sub-score field.
// These are the max possible points the backend engine awards per pillar.
// Confirmed from decision-narrative.ts references: fundamentals/25, growth/15, sector_strength/10.
const PILLAR_MAX = {
  fundamentals: 25,
  valuation: 15,
  growth: 15,
  financial_strength: 12,
  sector_strength: 10,
  news_events: 8,
  technical_momentum: 12,
  institutional_flow: 8,
} as const;

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Normalize a raw ScoringRow sub-score to 0–100. Returns null when no data. */
export function normalizePillar(
  field: keyof typeof PILLAR_MAX,
  scoring: ScoringRow | null
): number | null {
  const raw = scoring?.[field as keyof ScoringRow];
  if (raw == null || !isFinite(Number(raw))) return null;
  return clamp((Number(raw) / PILLAR_MAX[field]) * 100, 0, 100);
}

// ── Per-pillar computation from raw fundamentals/price ──────────────────────

function computeQuality(f: FundamentalsRow): number {
  let pts = 0;
  // ROE (max 25)
  const roe = safeNum(f.roe);
  if (roe > 20) pts += 25; else if (roe > 15) pts += 18; else if (roe > 10) pts += 10; else if (roe < 0) pts -= 8;
  // ROCE (max 25)
  const roce = safeNum(f.roce);
  if (roce > 18) pts += 25; else if (roce > 12) pts += 18; else if (roce > 8) pts += 10; else if (roce < 0) pts -= 8;
  // Debt/Equity (max 25)
  const de = safeNum(f.debt_equity, 999);
  if (de < 0.3) pts += 25; else if (de < 0.7) pts += 18; else if (de < 1.0) pts += 10; else if (de > 2.0) pts -= 10;
  // Promoter holding (max 25)
  const ph = safeNum(f.promoter_holding);
  if (ph > 60) pts += 25; else if (ph > 45) pts += 18; else if (ph > 30) pts += 10; else if (ph < 15) pts -= 5;
  return clamp(Math.max(0, pts), 0, 100);
}

function computeGrowth(f: FundamentalsRow): number {
  let pts = 0;
  // Revenue YoY (max 50)
  const rev = safeNum(f.rev_yoy);
  if (rev > 25) pts += 50; else if (rev > 15) pts += 35; else if (rev > 5) pts += 20; else if (rev > 0) pts += 10; else pts -= 15;
  // PAT YoY (max 50)
  const pat = safeNum(f.pat_yoy);
  if (pat > 25) pts += 50; else if (pat > 15) pts += 35; else if (pat > 5) pts += 20; else if (pat > 0) pts += 10; else pts -= 15;
  return clamp(Math.max(0, pts), 0, 100);
}

function computeValuation(f: FundamentalsRow, sectorPe: number): number {
  let pts = 0;
  const pe = safeNum(f.pe);
  const pb = safeNum(f.pb);
  // P/E vs sector (max 40)
  if (pe > 0 && sectorPe > 0) {
    const ratio = pe / sectorPe;
    if (ratio < 0.7) pts += 40; else if (ratio < 0.9) pts += 30; else if (ratio < 1.0) pts += 20; else if (ratio < 1.2) pts += 10;
  } else if (pe > 0 && pe < 15) pts += 30; else if (pe > 0 && pe < 25) pts += 15;
  // P/B (max 30)
  if (pb > 0) {
    if (pb < 1.5) pts += 30; else if (pb < 2.5) pts += 20; else if (pb < 4.0) pts += 10;
  }
  // PEG (max 30)
  const pat = safeNum(f.pat_yoy);
  if (pe > 0 && pat > 0) {
    const peg = pe / pat;
    if (peg < 1.0) pts += 30; else if (peg < 1.5) pts += 20; else if (peg < 2.5) pts += 10;
  }
  return clamp(Math.max(0, pts), 0, 100);
}

function computeMomentum(p: PriceRow): number {
  let pts = 0;
  // vs 200 DMA (max 50)
  const v200 = safeNum(p.vs_200dma);
  if (v200 > 10) pts += 50; else if (v200 > 3) pts += 35; else if (v200 > 0) pts += 20; else if (v200 < -10) pts -= 10;
  // RSI (max 50)
  const rsi = safeNum(p.rsi14, 50);
  if (rsi >= 40 && rsi <= 65) pts += 50; else if (rsi >= 30 && rsi < 40) pts += 30; else if (rsi > 65 && rsi < 75) pts += 30;
  return clamp(Math.max(0, pts), 0, 100);
}

function computeSafety(f: FundamentalsRow, u: UniverseRow | null): number {
  let score = 100;
  const de = safeNum(f.debt_equity, 0);
  if (de > 2.5) score -= 35; else if (de > 1.5) score -= 25; else if (de > 1.0) score -= 15;
  const pledge = safeNum(u?.pledge_pct, 0);
  if (pledge > 30) score -= 30; else if (pledge > 20) score -= 18; else if (pledge > 10) score -= 8;
  const rev = safeNum(f.rev_yoy);
  if (rev < -5) score -= 15; else if (rev < 0) score -= 8;
  const cr = safeNum(f.current_ratio, 1.5);
  if (cr < 1.0) score -= 12;
  return clamp(Math.max(0, score), 0, 100);
}

// ── Confidence (25–92%) ──────────────────────────────────────────────────────

function computeConfidence(
  f: FundamentalsRow | null,
  p: PriceRow | null,
  dqPct: number | null,
  pillars: PillarScores
): number {
  // Data completeness
  let total = 0, present = 0;
  const tally = (v: unknown) => { total++; if (v != null && Number(v) !== 0) present++; };
  if (f) { tally(f.roe); tally(f.roce); tally(f.rev_yoy); tally(f.pat_yoy); tally(f.debt_equity); tally(f.pe); }
  if (p) { tally(p.rsi14); tally(p.vs_200dma); tally(p.price); }
  const dataCoverage = total > 0 ? (present / total) * 100 : 50;
  const dataScore = dqPct != null ? (dqPct * 0.55 + dataCoverage * 0.45) : dataCoverage;

  // Signal consistency: fundamentals and momentum aligned?
  const fundBull = pillars.quality >= 55 && pillars.growth >= 50;
  const momBull = pillars.momentum >= 55;
  const aligned = (fundBull && momBull) || (!fundBull && !momBull);
  const consistency = aligned ? 85 : 50;

  const raw = dataScore * 0.55 + consistency * 0.45;
  return clamp(raw, 25, 92);
}

// ── Target price ─────────────────────────────────────────────────────────────

function computeTarget(
  price: number | null,
  composite: number,
  f: FundamentalsRow | null,
  sectorPe: number
): { targetPrice: number | null; upside: number | null } {
  if (!price || price <= 0) return { targetPrice: null, upside: null };
  const methods: Array<{ t: number; w: number }> = [];

  // Conviction-based: linear scale from 3% at score=35 to 30% at score=90+
  const upsidePct = composite <= 35 ? 3 : Math.min(30, (composite - 35) * 0.55 + 3);
  methods.push({ t: price * (1 + upsidePct / 100), w: 0.40 });

  // Sector P/E reversion (when stock trades below sector median)
  if (f && sectorPe > 0) {
    const pe = safeNum(f.pe);
    if (pe > 0 && pe < sectorPe) {
      const eps = price / pe;
      methods.push({ t: sectorPe * eps, w: 0.35 });
    }
  }

  // P/B reversion
  if (f) {
    const pb = safeNum(f.pb);
    const sectorPb = 3.0; // market-wide median fallback
    if (pb > 0 && pb < sectorPb) {
      const bv = price / pb;
      methods.push({ t: sectorPb * bv, w: 0.25 });
    }
  }

  const wSum = methods.reduce((s, m) => s + m.w, 0);
  const targetPrice = Math.round(methods.reduce((s, m) => s + m.t * (m.w / wSum), 0) * 100) / 100;
  const upside = Math.round(((targetPrice - price) / price) * 1000) / 10;
  if (Math.abs(upside) > 80) return { targetPrice: null, upside: null };
  return { targetPrice, upside };
}

// ── Main export ──────────────────────────────────────────────────────────────

export interface ComputeScoreInput {
  fundamentals: FundamentalsRow | null;
  price: PriceRow | null;
  universe: UniverseRow | null;
  scoring: ScoringRow | null;
}

/**
 * Single source of truth for all scoring UI — call this in components instead
 * of reading raw ScoringRow sub-scores directly.
 */
export function computeCompositeScore(input: ComputeScoreInput): CompositeScore {
  const { fundamentals: f, price: p, universe: u, scoring: s } = input;

  const sectorPe = safeNum(s?.sector_median_pe, 0);
  const backendConviction = safeNum(s?.conviction_total);
  const dqPct = s?.data_quality_pct ?? s?.data_completeness_pct ?? null;

  let pillars: PillarScores;
  let source: CompositeScore["source"];

  if (f != null && p != null) {
    pillars = {
      quality:   computeQuality(f),
      growth:    computeGrowth(f),
      valuation: computeValuation(f, sectorPe),
      momentum:  computeMomentum(p),
      safety:    computeSafety(f, u),
    };
    source = "computed";
  } else if (s != null) {
    pillars = {
      quality:   normalizePillar("fundamentals", s) ?? 50,
      growth:    normalizePillar("growth", s) ?? 50,
      valuation: normalizePillar("valuation", s) ?? 50,
      momentum:  normalizePillar("technical_momentum", s) ?? 50,
      safety:    normalizePillar("financial_strength", s) ?? 50,
    };
    source = "normalized";
  } else {
    pillars = { quality: 50, growth: 50, valuation: 50, momentum: 50, safety: 50 };
    source = "fallback";
  }

  // Composite: trust backend conviction when valid (>= 35), otherwise compute from pillars
  let composite: number;
  if (backendConviction >= 35) {
    if (source === "computed") {
      const pillarAvg = (pillars.quality * 0.25 + pillars.growth * 0.20 + pillars.valuation * 0.20 + pillars.momentum * 0.15 + pillars.safety * 0.20);
      composite = clamp(pillarAvg * 0.50 + backendConviction * 0.50, 0, 100);
    } else {
      composite = clamp(backendConviction, 0, 100);
    }
  } else {
    const pillarScore = pillars.quality * 0.25 + pillars.growth * 0.20 + pillars.valuation * 0.20 + pillars.momentum * 0.15 + pillars.safety * 0.20;
    composite = clamp(pillarScore, 0, 100);
  }

  const confidence = computeConfidence(f, p, dqPct ?? null, pillars);
  const { targetPrice, upside } = computeTarget(p?.price ?? null, composite, f, sectorPe);

  return { composite, pillars, confidence, targetPrice, upside, source };
}
