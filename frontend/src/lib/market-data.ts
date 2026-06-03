import type { FearGreed, MacroMetric, MacroResponse, MarketBreadth, MarketIndex } from "./types";

/** Demo indices until Web API exposes live index feed */
export const DEMO_INDICES: MarketIndex[] = [
  { id: "nifty", name: "Nifty 50", level: 24892.4, daily: 0.42, weekly: 1.18, monthly: 3.24 },
  { id: "sensex", name: "Sensex", level: 81876.3, daily: 0.38, weekly: 1.05, monthly: 3.11 },
  { id: "banknifty", name: "Bank Nifty", level: 52104.8, daily: -0.21, weekly: 0.64, monthly: 2.87 },
  { id: "midcap", name: "Nifty Midcap", level: 58234.1, daily: 0.55, weekly: 1.42, monthly: 4.02 },
  { id: "smallcap", name: "Nifty Smallcap", level: 19421.6, daily: 0.71, weekly: 1.89, monthly: 5.18 },
];

export const DEMO_BREADTH: MarketBreadth = {
  advancers: 1842,
  decliners: 1124,
  highs52w: 87,
  lows52w: 34,
  unchanged: 412,
};

function metricNum(metrics: MacroMetric[], keys: string[]): number | null {
  for (const key of keys) {
    const m = metrics.find((x) => String(x.metric).toUpperCase().includes(key));
    if (m != null && typeof m.value === "number" && !Number.isNaN(m.value)) return m.value;
    if (m != null && typeof m.value === "string") {
      const n = parseFloat(m.value);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

export function breadthFromMacro(macro: MacroResponse | null): MarketBreadth {
  if (!macro?.ok) return DEMO_BREADTH;
  const m = macro.metrics;
  return {
    advancers: metricNum(m, ["ADVANC", "ADV"]) ?? DEMO_BREADTH.advancers,
    decliners: metricNum(m, ["DECLIN", "DEC"]) ?? DEMO_BREADTH.decliners,
    highs52w: metricNum(m, ["52W_HIGH", "HIGH_52"]) ?? DEMO_BREADTH.highs52w,
    lows52w: metricNum(m, ["52W_LOW", "LOW_52"]) ?? DEMO_BREADTH.lows52w,
    unchanged: metricNum(m, ["UNCHANGED", "FLAT"]) ?? DEMO_BREADTH.unchanged,
  };
}

export function computeFearGreed(
  breadth: MarketBreadth,
  macro: MacroResponse | null
): FearGreed {
  const total = breadth.advancers + breadth.decliners + breadth.unchanged;
  const breadthRatio = total > 0 ? breadth.advancers / total : 0.5;

  let vixScore = 50;
  if (macro?.ok) {
    const vix = metricNum(macro.metrics, ["VIX", "INDIA VIX"]);
    if (vix != null) {
      vixScore = Math.max(0, Math.min(100, 100 - (vix - 12) * 4));
    }
  }

  let sentimentScore = 50;
  if (macro?.ok) {
    const sent = metricNum(macro.metrics, ["NEWS_SENT", "SENTIMENT"]);
    if (sent != null) sentimentScore = Math.max(0, Math.min(100, sent));
  }

  const breadthScore = Math.round(breadthRatio * 100);
  const score = Math.round(breadthScore * 0.45 + vixScore * 0.3 + sentimentScore * 0.25);

  let label: FearGreed["label"] = "Neutral";
  if (score >= 62) label = "Bullish";
  else if (score <= 38) label = "Bearish";

  return {
    score,
    label,
    drivers: [
      { name: "Market breadth", value: breadthScore, weight: 45 },
      { name: "VIX (inverse)", value: Math.round(vixScore), weight: 30 },
      { name: "News sentiment", value: Math.round(sentimentScore), weight: 25 },
    ],
  };
}
