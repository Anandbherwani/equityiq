import type {
  AnalystNote,
  DecisionNarrative,
  RecommendationItem,
  ScoringRow,
} from "./types";

function listActionThesis(listName: string, conviction: number): string {
  const list = listName.toLowerCase();
  if (list.includes("immediate")) {
    return "Starter position on confirmed near-term catalyst; trim if news/events score fades.";
  }
  if (list.includes("3-month")) {
    return "Build toward a 3-month swing — add on dips while growth + valuation hold.";
  }
  if (list.includes("compounder")) {
    return "Accumulate for compounding — prioritize quality over timing.";
  }
  if (list.includes("monopoly")) {
    return "Core hold candidate — add on sector weakness if fundamentals stay strong.";
  }
  if (list.includes("government") || list.includes("beneficiar")) {
    return "Thematic allocation on policy tailwinds; rebalance after sector rank drops.";
  }
  if (list.includes("turnaround")) {
    return "Recovery play — scale in only after balance-sheet metrics improve.";
  }
  if (list.includes("theme")) {
    return "Thematic sleeve — size across theme leaders; avoid single-name concentration.";
  }
  if (conviction >= 55) return "Research overweight — size with conviction and data quality.";
  if (conviction >= 35) return "Watchlist with conditional buy — wait for catalyst refresh.";
  return "Monitor until conviction and data gate improve.";
}

function timelineLabel(horizon: string, listName: string): string {
  const h = horizon.toLowerCase();
  const list = listName.toLowerCase();
  if (h === "1w") return "1 week — event-driven horizon";
  if (h === "1m") return "1 month — near-term catalyst window";
  if (h === "3m") return "3 months — swing / earnings cycle";
  if (h.includes("12") || h === "6-12m") return "6–12 months — compounder horizon";
  if (list.includes("immediate")) return "1–4 weeks — immediate list";
  if (list.includes("compounder") || list.includes("monopoly")) return "6–12 months — quality hold";
  return "3 months — default research horizon";
}

function parseAnalystNoteFromEvidence(evidence?: string): AnalystNote | null {
  if (!evidence?.trim()) return null;
  try {
    const j = JSON.parse(evidence) as { analyst_note?: AnalystNote } & AnalystNote;
    if (j.analyst_note) return j.analyst_note;
    if (j.investment_thesis) return j as AnalystNote;
  } catch {
    /* legacy plain evidence */
  }
  return null;
}

function parseAnalystNoteFromBullCase(bull?: string): AnalystNote | null {
  if (!bull?.includes("INVESTMENT THESIS")) return null;
  const sections: Record<string, keyof AnalystNote> = {
    "INVESTMENT THESIS": "investment_thesis",
    "BULL CASE": "bull_case",
    "BEAR CASE": "bear_case",
    CATALYSTS: "catalysts",
    RISKS: "risks",
    VALUATION: "valuation",
    "VALUATION SUMMARY": "valuation_summary",
    "PEER COMPARISON": "peer_comparison",
    "THEME EXPOSURE": "theme_exposure",
    CONFIDENCE: "confidence",
    TIMELINE: "timeline",
  };
  const note: Partial<AnalystNote> = { confidence: 0, timeline: "" };
  let current: keyof AnalystNote | null = null;
  bull.split("\n").forEach((line) => {
    const header = line.trim().toUpperCase();
    if (sections[header]) {
      current = sections[header];
      if (current !== "confidence") (note as Record<string, string>)[current] = "";
      return;
    }
    if (current && current !== "confidence") {
      const prev = (note[current] as string) || "";
      const chunk = line.trim();
      if (!chunk) return;
      note[current] = prev ? `${prev}\n${chunk}` : chunk;
    }
    if (current === "confidence" && line.includes("/100")) {
      const m = line.match(/(\d+)\/100/);
      if (m) note.confidence = parseInt(m[1], 10);
      note.confidence_rationale = line.replace(/^\d+\/100\s*—?\s*/, "");
    }
  });
  if (note.valuation_summary && !note.valuation) note.valuation = note.valuation_summary;
  if (!note.investment_thesis || note.investment_thesis.length < 48) return null;
  return note as AnalystNote;
}

export function buildDecisionFromAnalystNote(
  note: AnalystNote,
  item: Pick<RecommendationItem, "conviction_total" | "target_horizon">,
  listName = ""
): DecisionNarrative {
  const val = note.valuation_summary ?? note.valuation ?? "";
  return {
    why: note.investment_thesis,
    what: listActionThesis(listName, item.conviction_total),
    risk: note.risks,
    catalyst: note.catalysts,
    timeline: note.timeline || timelineLabel(item.target_horizon || "", listName),
    why_now: note.catalysts,
    why_stock: note.bull_case,
    why_peers: note.peer_comparison,
    upside: note.bull_case ? note.bull_case.split("\n")[0].slice(0, 120) : undefined,
    reward_risk:
      note.confidence > 0 ? `Confidence ${note.confidence}/100` : undefined,
    analyst_note: { ...note, valuation_summary: val || note.valuation_summary },
  };
}

/** Client fallback when API decision block is absent (older Web App deploy). */
export function buildDecisionFallback(
  item: Pick<
    RecommendationItem,
    | "conviction_total"
    | "bull_case"
    | "bear_case"
    | "catalyst"
    | "target_horizon"
    | "evidence"
    | "analyst_note"
  >,
  listName = "",
  scoring?: ScoringRow | null
): DecisionNarrative {
  const fromApi = item.analyst_note;
  const fromJson = parseAnalystNoteFromEvidence(item.evidence);
  const fromBull = parseAnalystNoteFromBullCase(item.bull_case);
  const note = fromApi || fromJson || fromBull;
  if (note) return buildDecisionFromAnalystNote(note, item, listName);

  const conviction = item.conviction_total;
  const pillars: string[] = [];
  if (scoring) {
    if (scoring.fundamentals >= 15) pillars.push(`fundamentals ${scoring.fundamentals}/25`);
    if (scoring.growth >= 10) pillars.push(`growth ${scoring.growth}/15`);
    if (scoring.sector_strength >= 6) pillars.push(`sector ${scoring.sector_strength}/10`);
  }

  const whyParts = [
    conviction >= 30
      ? `Opportunity rank ${conviction}/100 (Conviction Engine 3.0)`
      : `Watchlist-tier opportunity ${conviction}/100`,
  ];
  if (scoring?.quality_score) {
    whyParts.push(
      `Quality ${scoring.quality_score}, valuation ${scoring.valuation_score ?? "—"}, catalyst ${scoring.catalyst_score ?? "—"}`
    );
  }
  if (pillars.length) whyParts.push(`Led by ${pillars.slice(0, 2).join(", ")}`);
  if (scoring?.data_quality_pct) whyParts.push(`Data quality ${Math.round(scoring.data_quality_pct)}%`);
  if (item.evidence?.trim() && !item.evidence.trim().startsWith("{")) {
    whyParts.push(item.evidence.trim());
  } else if (item.bull_case?.trim() && !item.bull_case.includes("INVESTMENT THESIS")) {
    whyParts.push(item.bull_case.trim());
  }

  return {
    why: `${whyParts.join(". ")}.`,
    what: listActionThesis(listName, conviction),
    risk:
      item.bear_case?.trim() ||
      "Sector rotation, earnings miss, or liquidity could invalidate the thesis.",
    catalyst: item.catalyst?.trim() || "Monitor news and event pipeline for the next trigger.",
    timeline: timelineLabel(item.target_horizon || "", listName),
  };
}

export function resolveDecision(
  item: RecommendationItem & { decision?: DecisionNarrative },
  listName = "",
  scoring?: ScoringRow | null
): DecisionNarrative {
  const note = item.analyst_note ?? item.decision?.analyst_note;
  if (note) return buildDecisionFromAnalystNote(note, item, listName);
  if (item.decision?.why && item.decision.why.length >= 32) return item.decision;
  return buildDecisionFallback(item, listName, scoring);
}

export function hasCompleteAnalystNote(
  item: Pick<RecommendationItem, "analyst_note" | "bull_case" | "evidence">
): boolean {
  const note =
    item.analyst_note ||
    parseAnalystNoteFromEvidence(item.evidence) ||
    parseAnalystNoteFromBullCase(item.bull_case);
  if (!note) return false;
  const required: (keyof AnalystNote)[] = [
    "investment_thesis",
    "bull_case",
    "bear_case",
    "catalysts",
    "risks",
    "peer_comparison",
    "theme_exposure",
    "timeline",
  ];
  const val = String(note.valuation_summary ?? note.valuation ?? "").trim();
  return (
    required.every((k) => String(note[k] ?? "").trim().length >= 48) &&
    val.length >= 48 &&
    note.confidence > 0
  );
}
