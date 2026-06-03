/** Visual action + list badges for recommendation cards (no new data APIs). */

export type RecommendationAction = "BUY" | "WATCH" | "AVOID";

export function resolveRecommendationAction(
  conviction: number,
  confidence?: number | null
): RecommendationAction {
  const conf = confidence ?? conviction;
  if (conviction >= 62 && conf >= 55) return "BUY";
  if (conviction >= 38 || conf >= 45) return "WATCH";
  return "AVOID";
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
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + "…";
}
