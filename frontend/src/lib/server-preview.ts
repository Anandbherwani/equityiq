import { cookies } from "next/headers";
import {
  DEMO_BACKTEST,
  DEMO_DATA_COVERAGE,
  DEMO_HISTORY,
  DEMO_MORNING_BRIEF,
  DEMO_PORTFOLIO,
  DEMO_TOP10,
  DEMO_VALIDATION,
} from "./demo-data";
import {
  getBacktest,
  getDataCoverage,
  getMorningBrief,
  getPortfolioConstruction,
  getRecommendationHistory,
  getRecommendationValidation,
  getTop10,
  hasServerSheetsApi,
} from "./sheets-api";
import type {
  BacktestResponse,
  DataCoverageReport,
  MorningBriefResponse,
  PortfolioConstructionResponse,
  RecommendationHistoryResponse,
  RecommendationValidationResponse,
  Top10Response,
} from "./types";

export type DataSource = "live" | "preview";

export type LoadResult<T> = {
  source: DataSource;
  data: T | null;
  error?: string;
};

/** Server-side preview when API URL is missing or demo cookie is set. */
export async function isServerPreviewMode(): Promise<boolean> {
  if (!(await hasServerSheetsApi())) return true;
  const jar = await cookies();
  return jar.get("isi_demo_mode")?.value === "1";
}

export async function loadTop10(): Promise<LoadResult<Top10Response>> {
  if (await isServerPreviewMode()) {
    return { source: "preview", data: DEMO_TOP10 };
  }
  const res = await getTop10();
  if (res && "ok" in res && res.ok) return { source: "live", data: res };
  return {
    source: "live",
    data: null,
    error: res && "error" in res ? res.error : "Failed to load recommendations",
  };
}

export async function loadRecommendationHistory(params?: {
  category?: string;
  symbol?: string;
}): Promise<LoadResult<RecommendationHistoryResponse>> {
  if (await isServerPreviewMode()) {
    return { source: "preview", data: DEMO_HISTORY };
  }
  const res = await getRecommendationHistory(params);
  if (res && "ok" in res && res.ok) return { source: "live", data: res };
  return {
    source: "live",
    data: null,
    error: res && "error" in res ? res.error : "Failed to load history",
  };
}

export async function loadRecommendationValidation(): Promise<{
  validation: LoadResult<RecommendationValidationResponse>;
  coverage: LoadResult<DataCoverageReport>;
}> {
  if (await isServerPreviewMode()) {
    return {
      validation: { source: "preview", data: DEMO_VALIDATION },
      coverage: { source: "preview", data: DEMO_DATA_COVERAGE },
    };
  }
  const [validation, coverage] = await Promise.all([
    getRecommendationValidation(),
    getDataCoverage(),
  ]);
  return {
    validation:
      validation && "ok" in validation && validation.ok
        ? { source: "live", data: validation }
        : {
            source: "live",
            data: null,
            error:
              validation && "error" in validation
                ? validation.error
                : "Failed to load validation",
          },
    coverage:
      coverage && "ok" in coverage && coverage.ok
        ? { source: "live", data: coverage }
        : { source: "live", data: null },
  };
}

export async function loadBacktest(): Promise<LoadResult<BacktestResponse>> {
  if (await isServerPreviewMode()) {
    return { source: "preview", data: DEMO_BACKTEST };
  }
  const res = await getBacktest();
  if (res && "ok" in res && res.ok) return { source: "live", data: res };
  return {
    source: "live",
    data: null,
    error: res && "error" in res ? res.error : "Failed to load backtest",
  };
}

export async function loadMorningBrief(fresh?: boolean): Promise<LoadResult<MorningBriefResponse>> {
  if (await isServerPreviewMode()) {
    return { source: "preview", data: DEMO_MORNING_BRIEF };
  }
  const res = await getMorningBrief({ fresh });
  if (res && "ok" in res && res.ok) return { source: "live", data: res };
  return {
    source: "live",
    data: null,
    error: res && "error" in res ? res.error : "Brief unavailable",
  };
}

export async function loadPortfolio(
  capital?: number
): Promise<LoadResult<PortfolioConstructionResponse>> {
  if (await isServerPreviewMode()) {
    return { source: "preview", data: DEMO_PORTFOLIO };
  }
  const res = await getPortfolioConstruction(capital);
  if (res && "ok" in res && res.ok) return { source: "live", data: res };
  return {
    source: "live",
    data: null,
    error: res && "error" in res ? res.error : "Portfolio model unavailable",
  };
}
