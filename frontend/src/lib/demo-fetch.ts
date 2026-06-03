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
    return { ok: true, version: "demo", spreadsheetName: "Demo Mode", tab10Rows: 0, tab11Rows: 0, tab6Rows: 0 };
  }
  if (action === "morning_brief") return DEMO_MORNING_BRIEF;
  if (action === "portfolio") return DEMO_PORTFOLIO;
  return { ok: false, error: "Demo mode: action not mocked" };
}
