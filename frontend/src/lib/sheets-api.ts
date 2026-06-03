import type {
  ApiError,
  HealthResponse,
  MacroResponse,
  MorningBriefResponse,
  SymbolResponse,
  Top10Response,
} from "./types";

const DEFAULT_REVALIDATE = 120;
const FETCH_TIMEOUT_MS = 30_000;

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

function getBaseUrl(override?: string): string | null {
  const url = (override || process.env.NEXT_PUBLIC_SHEETS_API_URL || "").trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

export function hasSheetsApi(override?: string): boolean {
  return Boolean(getBaseUrl(override));
}

export async function fetchSheets<T>(
  action: string,
  params: Record<string, string> = {},
  options?: { baseUrl?: string; revalidate?: number }
): Promise<T | ApiError> {
  const base = getBaseUrl(options?.baseUrl);
  if (!base) {
    return { ok: false, error: "Sheets Web App URL not configured. Set NEXT_PUBLIC_SHEETS_API_URL or Settings." };
  }

  const qs = new URLSearchParams({ action, ...params });
  const url = `${base}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: options?.revalidate ?? DEFAULT_REVALIDATE },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return parseSheetsResponse<T>(res);
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { ok: false, error: "Research API request timed out" };
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
