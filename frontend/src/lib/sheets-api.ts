import { cookies } from "next/headers";
import type {
  ApiError,
  HealthResponse,
  MacroResponse,
  MorningBriefResponse,
  SymbolResponse,
  Top10Response,
} from "./types";
import {
  API_URL_COOKIE,
  getConfiguredSheetsApiUrl,
  normalizeApiUrl,
} from "./api-url";

const DEFAULT_REVALIDATE = 120;
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const TOP10_FETCH_TIMEOUT_MS = 180_000;

const ACTION_TIMEOUT_MS: Record<string, number> = {
  top10: TOP10_FETCH_TIMEOUT_MS,
};

async function parseSheetsResponse<T>(res: Response): Promise<T | ApiError> {
  if (!res.ok) {
    return { ok: false, error: `Research API returned HTTP ${res.status}` };
  }
  try {
    return (await res.json()) as T | ApiError;
  } catch {
    return { ok: false, error: "Research API returned invalid JSON" };
  }
}

function getBaseUrlFromEnvOrOverride(override?: string): string | null {
  if (override) return normalizeApiUrl(override);
  return getConfiguredSheetsApiUrl();
}

/** Resolve API base URL on the server: env var, then Settings cookie. */
export async function getServerApiUrl(override?: string): Promise<string | null> {
  const direct = getBaseUrlFromEnvOrOverride(override);
  if (direct) return direct;
  const jar = await cookies();
  const cookieUrl = jar.get(API_URL_COOKIE)?.value;
  if (!cookieUrl) return null;
  try {
    return normalizeApiUrl(decodeURIComponent(cookieUrl));
  } catch {
    return normalizeApiUrl(cookieUrl);
  }
}

export function hasSheetsApi(override?: string): boolean {
  return Boolean(getBaseUrlFromEnvOrOverride(override));
}

export async function hasServerSheetsApi(override?: string): Promise<boolean> {
  return Boolean(await getServerApiUrl(override));
}

function fetchTimeoutMs(action: string): number {
  return ACTION_TIMEOUT_MS[action] ?? DEFAULT_FETCH_TIMEOUT_MS;
}

export async function fetchSheets<T>(
  action: string,
  params: Record<string, string> = {},
  options?: { baseUrl?: string; revalidate?: number }
): Promise<T | ApiError> {
  const base = await getServerApiUrl(options?.baseUrl);
  if (!base) {
    return {
      ok: false,
      error:
        "Sheets Web App URL not configured. Set SHEETS_API_URL (server) or NEXT_PUBLIC_SHEETS_API_URL or Settings.",
    };
  }

  const qs = new URLSearchParams({ action, ...params });
  const url = `${base}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE },
      headers: { Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(fetchTimeoutMs(action)),
    });
    return parseSheetsResponse<T>(res);
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      const secs = Math.round(fetchTimeoutMs(action) / 1000);
      return {
        ok: false,
        error: `Research API request timed out after ${secs}s (top10 can take ~2 min on cold start)`,
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function getHealth(baseUrl?: string) {
  return fetchSheets<HealthResponse>("health", {}, { baseUrl });
}

export async function getTop10(baseUrl?: string) {
  return fetchSheets<Top10Response>("top10", {}, { baseUrl });
}

export async function getSymbol(symbol: string, baseUrl?: string) {
  return fetchSheets<SymbolResponse>("symbol", { symbol: symbol.toUpperCase() }, { baseUrl });
}

export async function getMacro(baseUrl?: string) {
  return fetchSheets<MacroResponse>("macro", {}, { baseUrl });
}

export async function getBacktest(baseUrl?: string) {
  return fetchSheets<import("./types").BacktestResponse>("backtest", {}, { baseUrl });
}

export async function getRecommendationHistory(
  params?: { category?: string; symbol?: string },
  baseUrl?: string
) {
  const qs: Record<string, string> = {};
  if (params?.category) qs.category = params.category;
  if (params?.symbol) qs.symbol = params.symbol;
  return fetchSheets<import("./types").RecommendationHistoryResponse>(
    "recommendation_history",
    qs,
    { baseUrl, revalidate: 60 }
  );
}

export async function getRecommendationValidation(baseUrl?: string) {
  return fetchSheets<import("./types").RecommendationValidationResponse>(
    "recommendation_validation",
    {},
    { baseUrl, revalidate: 60 }
  );
}

export async function getDataCoverage(baseUrl?: string) {
  return fetchSheets<import("./types").DataCoverageReport>("data_coverage", {}, {
    baseUrl,
    revalidate: 120,
  });
}

export async function getMorningBrief(options?: { fresh?: boolean; baseUrl?: string }) {
  const params: Record<string, string> = {};
  if (options?.fresh) params.fresh = "true";
  return fetchSheets<MorningBriefResponse>("morning_brief", params, {
    baseUrl: options?.baseUrl,
    revalidate: options?.fresh ? 0 : 300,
  });
}

export async function getPortfolioConstruction(
  capital?: number,
  baseUrl?: string
) {
  const params: Record<string, string> = {};
  if (capital != null) params.capital = String(capital);
  return fetchSheets<import("./types").PortfolioConstructionResponse>("portfolio", params, {
    baseUrl,
    revalidate: 300,
  });
}

export async function getIpoIntelligence(baseUrl?: string) {
  return fetchSheets<import("./types").IpoIntelligenceResponse>("ipo_intelligence", {}, {
    baseUrl,
    revalidate: 120,
  });
}

export async function getSmeAlpha(baseUrl?: string) {
  return fetchSheets<import("./types").SmeAlphaResponse>("sme_alpha", {}, {
    baseUrl,
    revalidate: 120,
  });
}

export async function getThemeIntelligence(baseUrl?: string) {
  return fetchSheets<import("./types").ThemeIntelligenceResponse>("theme_intelligence", {}, {
    baseUrl,
    revalidate: 120,
  });
}

export async function getSheetAudit(baseUrl?: string) {
  return fetchSheets<import("./types").SheetAuditResponse>("sheet_audit", {}, {
    baseUrl,
    revalidate: 60,
  });
}

export async function getSystemAudit(baseUrl?: string) {
  return fetchSheets<import("./types").SystemAuditResponse>("system_audit", {}, {
    baseUrl,
    revalidate: 60,
  });
}
