"use client";

import { isDemoMode } from "./storage";
import {
  DEMO_BACKTEST,
  DEMO_HISTORY,
  DEMO_MACRO,
  DEMO_TOP10,
  DEMO_DATA_COVERAGE,
  DEMO_MORNING_BRIEF,
  DEMO_PORTFOLIO,
  DEMO_VALIDATION,
  DEMO_IPO,
  DEMO_SME,
  DEMO_THEME,
  DEMO_SHEET_AUDIT,
  DEMO_WATCHLIST,
  demoSymbol,
} from "./demo-data";

export function getDemoPayload(
  action: string,
  params: Record<string, string>
): unknown | null {
  if (!isDemoMode()) return null;
  if (action === "top10") return DEMO_TOP10;
  if (action === "macro") return DEMO_MACRO;
  if (action === "backtest") return DEMO_BACKTEST;
  if (action === "recommendation_history") return DEMO_HISTORY;
  if (action === "recommendation_validation") return DEMO_VALIDATION;
  if (action === "recommendation_history_health") {
    return { ok: true, health: DEMO_VALIDATION.history_health };
  }
  if (action === "data_coverage") return DEMO_DATA_COVERAGE;
  if (action === "symbol" && params.symbol) return demoSymbol(params.symbol);
  if (action === "health") {
    return { ok: true, version: "demo", spreadsheetName: "Demo Mode — connect Sheets for live data", tab10Rows: 4847, tab11Rows: 60, tab6Rows: 3800 };
  }
  if (action === "watchlist") {
    return { ok: true, entries: DEMO_WATCHLIST };
  }
  if (action === "morning_brief") return DEMO_MORNING_BRIEF;
  if (action === "portfolio") return DEMO_PORTFOLIO;
  if (action === "ipo_intelligence") return DEMO_IPO;
  if (action === "sme_alpha") return DEMO_SME;
  if (action === "theme_intelligence") return DEMO_THEME;
  if (action === "sheet_audit") return DEMO_SHEET_AUDIT;
  if (action === "system_audit") {
    return { ok: true, audit: { overall: "demo", timestampIst: new Date().toISOString() } };
  }
  return { ok: false, error: "Demo mode: action not mocked" };
}
