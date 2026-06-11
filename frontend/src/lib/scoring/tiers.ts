export type TierAction = "BUY" | "WATCH" | "AVOID";

export type ScoreTier = {
  score: number;
  label: "Strong Buy" | "Buy" | "Accumulate" | "Hold" | "Watch" | "Avoid";
  short: "STRONG BUY" | "BUY" | "ACCUMULATE" | "HOLD" | "WATCH" | "AVOID";
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
  if (s >= 70) return {
    score: s, label: "Buy", short: "BUY", action: "BUY",
    color: "#3fb950",
    badgeClass: "bg-gain/15 text-gain border-gain/40",
  };
  if (s >= 60) return {
    score: s, label: "Accumulate", short: "ACCUMULATE", action: "WATCH",
    color: "#20b2aa",
    badgeClass: "bg-teal-500/15 text-teal-400 border-teal-500/40",
  };
  if (s >= 45) return {
    score: s, label: "Hold", short: "HOLD", action: "WATCH",
    color: "#d29922",
    badgeClass: "bg-warn/15 text-warn border-warn/40",
  };
  if (s >= 30) return {
    score: s, label: "Watch", short: "WATCH", action: "WATCH",
    color: "#e06a1a",
    badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  };
  return {
    score: s, label: "Avoid", short: "AVOID", action: "AVOID",
    color: "#f85149",
    badgeClass: "bg-loss/15 text-loss border-loss/40",
  };
}
