export type TierAction = "BUY" | "WATCH" | "AVOID";

export type ScoreTier = {
  score: number;
  label: "Strong Buy" | "Buy" | "Accumulate" | "Hold" | "Reduce" | "Avoid";
  short: "STRONG BUY" | "BUY" | "ACCUMULATE" | "HOLD" | "REDUCE" | "AVOID";
  action: TierAction;
  color: string;
  badgeClass: string;
};

export function getTier(score: number): ScoreTier {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 80) return {
    score: s, label: "Strong Buy", short: "STRONG BUY", action: "BUY",
    color: "#3fb950",
    badgeClass: "bg-gain/15 text-gain border-gain/40",
  };
  if (s >= 65) return {
    score: s, label: "Buy", short: "BUY", action: "BUY",
    color: "#58a6ff",
    badgeClass: "bg-primary/15 text-primary border-primary/40",
  };
  if (s >= 50) return {
    score: s, label: "Accumulate", short: "ACCUMULATE", action: "WATCH",
    color: "#d29922",
    badgeClass: "bg-warn/15 text-warn border-warn/40",
  };
  if (s >= 35) return {
    score: s, label: "Hold", short: "HOLD", action: "WATCH",
    color: "#d29922",
    badgeClass: "bg-warn/10 text-warn/80 border-warn/30",
  };
  if (s >= 20) return {
    score: s, label: "Reduce", short: "REDUCE", action: "AVOID",
    color: "#f85149",
    badgeClass: "bg-loss/10 text-loss/80 border-loss/30",
  };
  return {
    score: s, label: "Avoid", short: "AVOID", action: "AVOID",
    color: "#f85149",
    badgeClass: "bg-loss/15 text-loss border-loss/40",
  };
}
