import { NextRequest, NextResponse } from "next/server";
import { getServerApiUrl, fetchSheets } from "@/lib/sheets-api";
import type { ApiError } from "@/lib/types";

const ALLOWED_ACTIONS = new Set([
  "health",
  "top10",
  "watchlist",
  "symbol",
  "macro",
  "backtest",
  "theme_intelligence",
  "theme-intelligence",
  "morning_brief",
  "morning-brief",
  "portfolio",
  "portfolio_construction",
  "recommendation_history",
  "rec_history",
  "recommendation_validation",
  "rec_validation",
  "recommendation_history_health",
  "history_health",
  "data_coverage",
  "pillar_coverage",
  "sme_alpha",
  "ipo_intelligence",
  "system_audit",
  "sheet_audit",
  "live_sheet_audit",
  "stock",
  "market_summary",
]);

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action")?.trim() || "";
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { ok: false, error: "Invalid or missing action" } satisfies ApiError,
      { status: 400 }
    );
  }

  const base = await getServerApiUrl();
  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sheets Web App URL not configured on server. Set SHEETS_API_URL or NEXT_PUBLIC_SHEETS_API_URL.",
      } satisfies ApiError,
      { status: 503 }
    );
  }

  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "action") params[key] = value;
  });

  const fresh = request.nextUrl.searchParams.get("fresh") === "true";
  const result = await fetchSheets<unknown>(action, params, {
    baseUrl: base,
    revalidate: fresh ? 0 : undefined,
  });

  if (typeof result === "object" && result !== null && "ok" in result && result.ok === false) {
    const err = result as ApiError;
    const status = err.error?.includes("timed out") ? 504 : 502;
    return NextResponse.json(err, { status });
  }

  return NextResponse.json(result);
}
