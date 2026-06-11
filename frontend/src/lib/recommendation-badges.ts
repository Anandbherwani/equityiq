/** Visual action + list badges for recommendation cards (no new data APIs). */

import { getTier } from "./scoring/tiers";

export type { ScoreTier, TierAction } from "./scoring/tiers";
export { getTier } from "./scoring/tiers";

export type RecommendationAction = "BUY" | "WATCH" | "AVOID";

export function resolveRecommendationAction(
  conviction: number,
  confidence?: number | null
): RecommendationAction {
  // Primary: use tier system so action labels align with score badges
  const tierAction = getTier(conviction).action;
  if (tierAction === "BUY") return "BUY";
  if (tierAction === "AVOID") return "AVOID";
  // WATCH tier: confidence can push to BUY or keep as WATCH
  const conf = confidence ?? 50;
  if (conviction >= 50 && conf >= 55) return "BUY";
  return "WATCH";
}

export type ListBadge = {
  label: string;
  tone: "cyan" | "green" | "amber" | "violet" | "rose";
};

export function listBadgesFromName(listName: string): ListBadge[] {
  const badges: ListBadge[] = [];
  const n = listName.toLowerCase();

  if (n.includes("immediate") || n.includes("conviction")) {
    badges.push({ label: "High Conviction", tone: "green" });
  }
  if (n.includes("government") || n.includes("gov")) {
    badges.push({ label: "Government Theme", tone: "cyan" });
  }
  if (n.includes("sme")) {
    badges.push({ label: "SME Alpha", tone: "violet" });
  }
  if (n.includes("turnaround")) {
    badges.push({ label: "Turnaround", tone: "amber" });
  }
  if (n.includes("compound")) {
    badges.push({ label: "Compounder", tone: "green" });
  }
  if (n.includes("monopoly")) {
    badges.push({ label: "Monopoly", tone: "cyan" });
  }
  if (n.includes("theme")) {
    badges.push({ label: "Theme", tone: "cyan" });
  }
  if (n.includes("ipo")) {
    badges.push({ label: "IPO", tone: "amber" });
  }

  return badges;
}

export function thesisSummary(text: string, maxLen = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  // Strip Apps Script template text emitted when fundamentals tab is empty
  if (/sector TBD|quality 0\/100|Data gate incomplete|List sort key/i.test(t)) return "";
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + "…";
}
