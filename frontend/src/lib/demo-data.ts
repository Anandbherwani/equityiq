import type {
  BacktestResponse,
  MacroResponse,
  MorningBriefResponse,
  PortfolioConstructionResponse,
  RecommendationHistoryResponse,
  RecommendationItem,
  DataCoverageReport,
  RecommendationValidationResponse,
  SymbolResponse,
  Top10Response,
  IpoIntelligenceResponse,
  SmeAlphaResponse,
  ThemeIntelligenceResponse,
  SheetAuditResponse,
} from "./types";

const DEMO_NOTE = {
  investment_thesis:
    "Investment view: Demo pick ranks highly on our opportunity score with balanced quality and valuation.",
  bull_case: "• Strong quality vs sector peers\n• Order momentum and positive sector rank",
  bear_case: "• Earnings miss could compress multiples\n• Macro rotation risk",
  catalysts: "• Near-term earnings\n• Order-book follow-through",
  risks: "• Monitor pledge and liquidity\n• Size for data completeness",
  valuation_summary: "• Trading near sector median P/E\n• Relative valuation score supportive",
  peer_comparison: "• ROE above sector median\n• Growth in line with leaders",
  theme_exposure: "• Aligned with capex and domestic demand themes",
  confidence: 72,
  confidence_rationale: "Model confidence blends opportunity rank with data quality.",
  timeline: "3-month research horizon — revisit after earnings.",
};

function demoItem(rank: number, symbol: string, name: string, sector: string, score: number): RecommendationItem {
  return {
    rank,
    symbol,
    company_name: name,
    sector,
    conviction_total: score,
    bull_case: "INVESTMENT THESIS\n" + DEMO_NOTE.investment_thesis,
    bear_case: DEMO_NOTE.bear_case,
    catalyst: DEMO_NOTE.catalysts,
    target_horizon: "3m",
    evidence: "",
    confidence: Math.min(95, score + 5),
    analyst_note: { ...DEMO_NOTE, confidence: Math.min(95, score + 5) },
  };
}

/** Tab-11-style list row for symbol API / stock detail (not string list names). */
function demoSymbolListEntry(
  item: RecommendationItem,
  listName: string
): SymbolResponse["lists"][number] {
  return {
    list_name: listName,
    rank: item.rank,
    conviction_total: item.conviction_total,
    bull_case: item.bull_case,
    bear_case: item.bear_case,
    catalyst: item.catalyst,
    target_horizon: item.target_horizon,
    evidence: item.evidence,
  };
}

export const DEMO_TOP10: Top10Response = {
  ok: true,
  updated: new Date().toISOString().slice(0, 10),
  listCount: 6,
  lists: [
    {
      name: "Top 10 Immediate Opportunities",
      items: [
        demoItem(1, "RELIANCE", "Reliance Industries", "Oil & Gas", 78),
        demoItem(2, "HAL", "Hindustan Aeronautics", "Defence", 74),
        demoItem(3, "BEL", "Bharat Electronics", "Defence", 71),
        demoItem(4, "LT", "Larsen & Toubro", "Industrials", 70),
        demoItem(5, "SBIN", "State Bank of India", "BFSI", 69),
        demoItem(6, "TITAN", "Titan Company", "Consumer", 68),
        demoItem(7, "MARUTI", "Maruti Suzuki", "Auto", 67),
        demoItem(8, "BHARTIARTL", "Bharti Airtel", "Telecom", 66),
        demoItem(9, "ITC", "ITC", "FMCG", 65),
        demoItem(10, "AXISBANK", "Axis Bank", "BFSI", 64),
      ],
    },
    {
      name: "Top 10 3-Month Opportunities",
      items: [
        demoItem(1, "TCS", "Tata Consultancy Services", "IT Services", 76),
        demoItem(2, "INFY", "Infosys", "IT Services", 73),
      ],
    },
    {
      name: "Top 10 12-Month Compounders",
      items: [demoItem(1, "HDFCBANK", "HDFC Bank", "BFSI", 75)],
    },
    {
      name: "Top 10 Monopoly Businesses",
      items: [demoItem(1, "ITC", "ITC", "FMCG", 72)],
    },
    {
      name: "Top 10 Government Beneficiaries",
      items: [demoItem(1, "BEL", "Bharat Electronics", "Defence", 73)],
    },
    {
      name: "Top 10 Turnarounds",
      items: [demoItem(1, "SBIN", "State Bank of India", "BFSI", 68)],
    },
  ],
};

export const DEMO_MACRO: MacroResponse = {
  ok: true,
  metrics: [],
  macro_verdict: null,
};

export function demoSymbol(symbol: string): SymbolResponse {
  const sym = symbol.toUpperCase();
  const immediate = DEMO_TOP10.lists[0];
  const pick =
    immediate?.items.find((i) => i.symbol === sym) ??
    demoItem(1, sym, `${sym} Ltd (Demo)`, "Industrials", 68);
  const listName = immediate?.name ?? "Top 10 Immediate Opportunities";
  const listEntry = demoSymbolListEntry(pick, listName);
  return {
    ok: true,
    symbol: sym,
    universe: {
      symbol_nse: sym,
      company_name: pick.company_name,
      sector: pick.sector,
      theme_tags: "Capex, Defence",
      market_cap_cr: 45000,
      market_cap_bucket: "Large",
      cap_segment: "large",
      exchange: "NSE",
      pledge_pct: 0,
    },
    scoring: {
      symbol: sym,
      company_name: pick.company_name,
      conviction_total: 68,
      opportunity_rank: 72,
      quality_score: 65,
      valuation_score: 58,
      catalyst_score: 55,
      fundamentals: 12,
      valuation: 10,
      growth: 11,
      financial_strength: 8,
      sector_strength: 7,
      news_events: 6,
      technical_momentum: 7,
      institutional_flow: 6,
      data_quality_pct: 78,
      data_gate_flag: true,
      fundamentals_age_days: 14,
      data_completeness_pct: 78,
      quality_rank: 42,
      risk_score: 62,
      risk_grade: "B",
      relative_quality_score: 58,
      relative_valuation_score: 52,
      relative_growth_score: 55,
      sector_median_pe: 28,
      sector_median_pb: 3.5,
      sector_median_roe: 20,
      sector_median_roce: 18,
      action_label: "Research overweight",
    },
    fundamentals: {
      symbol: sym,
      market_cap_cr: 45000,
      pe: 24.5,
      pb: 4.2,
      roe: 22,
      roce: 19,
      rev_yoy: 14,
      pat_yoy: 18,
      debt_equity: 0.35,
      current_ratio: 1.4,
      dividend_yield: 0.8,
      promoter_holding: 52,
      fii_holding: 18,
      sector_normalized: "Industrials",
      last_updated: new Date().toISOString().slice(0, 10),
      stale_flag: false,
    },
    price: {
      symbol: sym,
      price: 2450.5,
      chg_pct: 1.2,
      vol: 1200000,
      dma20: 2400,
      dma50: 2350,
      dma200: 2200,
      rsi14: 58,
      vs_50dma: 4.2,
      vs_200dma: 11.4,
      as_of_date: new Date().toISOString().slice(0, 10),
      tech_setup: "Above 50 DMA",
      macd_signal: "Bullish",
    },
    news: [
      {
        published_at: "2026-06-01",
        headline: "Company wins major order (demo)",
        summary: "Demo headline for preview mode.",
        url: "",
        source_name: "Demo Wire",
        sentiment: "positive",
        materiality: "medium",
      },
    ],
    lists: [listEntry],
    recommendation: listEntry,
  };
}

const demoHistoryEntry = (
  date: string,
  category: string,
  listName: string,
  rank: number,
  symbol: string,
  name: string,
  ret: number,
  alpha: number
) => ({
  snapshot_date: date,
  recommendation_category: category,
  list_name: listName,
  rank,
  symbol,
  company_name: name,
  sector_key: "Industrials",
  entry_price: 1000,
  conviction: 72,
  thesis: DEMO_NOTE.investment_thesis,
  target: "3m",
  confidence: 68,
  risk: DEMO_NOTE.bear_case.slice(0, 200),
  risk_score: 62,
  data_quality_pct: 78,
  source: "demo",
  live: {
    entry_date: date,
    current_price: 1000 * (1 + ret / 100),
    current_return_pct: ret,
    nifty_return_pct: 4.2,
    sector_return_pct: 5.1,
    alpha_vs_nifty_pct: alpha,
    alpha_vs_sector_pct: ret - 5.1,
    hit: ret > 0,
  },
});

export const DEMO_HISTORY: RecommendationHistoryResponse = {
  ok: true,
  engine_version: "1.0",
  updated: new Date().toISOString(),
  total_rows: 5,
  date_range: { earliest: "2026-05-15", latest: "2026-06-01" },
  categories: ["immediate", "three_month", "compounders"],
  entries: [
    demoHistoryEntry("2026-05-15", "immediate", "Top 10 Immediate Opportunities", 1, "HAL", "Hindustan Aeronautics", 12.4, 8.2),
    demoHistoryEntry("2026-05-20", "immediate", "Top 10 Immediate Opportunities", 2, "BEL", "Bharat Electronics", 8.1, 3.9),
    demoHistoryEntry("2026-05-22", "three_month", "Top 10 3-Month Opportunities", 1, "TCS", "Tata Consultancy Services", 5.2, 1.0),
    demoHistoryEntry("2026-05-28", "compounders", "Top 10 12-Month Compounders", 1, "HDFCBANK", "HDFC Bank", -2.1, -6.3),
    demoHistoryEntry("2026-06-01", "immediate", "Top 10 Immediate Opportunities", 3, "RELIANCE", "Reliance Industries", 3.4, -0.8),
  ],
};

export const DEMO_VALIDATION: RecommendationValidationResponse = {
  ok: true,
  engine_version: "1.0",
  updated: new Date().toISOString(),
  total_recommendations: 5,
  total_with_returns: 5,
  overall_hit_rate_pct: 80,
  history_summary: { earliest: "2026-05-15", latest: "2026-06-01" },
  history_health: {
    status: "PASS",
    tab37_exists: true,
    snapshot_engine_deployed: true,
    last_snapshot_date: "2026-06-01",
    rows_added_today: 1,
    total_history_rows: 5,
    blank_category_rows: 0,
    last_8am_run_ok: true,
  },
  scorecards: [
    {
      recommendation_category: "immediate",
      category_label: "Top 10 Immediate Opportunities",
      recommendations_issued: 3,
      with_returns: 3,
      hit_rate_pct: 100,
      average_return_pct: 7.97,
      average_alpha_vs_nifty_pct: 3.77,
      average_alpha_vs_sector_pct: 2.87,
      best_pick: {
        symbol: "HAL",
        company_name: "Hindustan Aeronautics",
        list_name: "Top 10 Immediate Opportunities",
        entry_date: "2026-05-15",
        return_pct: 12.4,
        alpha_vs_nifty_pct: 8.2,
      },
      worst_pick: {
        symbol: "RELIANCE",
        company_name: "Reliance Industries",
        list_name: "Top 10 Immediate Opportunities",
        entry_date: "2026-06-01",
        return_pct: 3.4,
        alpha_vs_nifty_pct: -0.8,
      },
    },
    {
      recommendation_category: "three_month",
      category_label: "Top 10 3-Month Opportunities",
      recommendations_issued: 1,
      with_returns: 1,
      hit_rate_pct: 100,
      average_return_pct: 5.2,
      average_alpha_vs_nifty_pct: 1.0,
      average_alpha_vs_sector_pct: 0.1,
      best_pick: {
        symbol: "TCS",
        company_name: "Tata Consultancy Services",
        list_name: "Top 10 3-Month Opportunities",
        entry_date: "2026-05-22",
        return_pct: 5.2,
        alpha_vs_nifty_pct: 1.0,
      },
      worst_pick: {
        symbol: "TCS",
        company_name: "Tata Consultancy Services",
        list_name: "Top 10 3-Month Opportunities",
        entry_date: "2026-05-22",
        return_pct: 5.2,
        alpha_vs_nifty_pct: 1.0,
      },
    },
    {
      recommendation_category: "compounders",
      category_label: "Top 10 12-Month Compounders",
      recommendations_issued: 1,
      with_returns: 1,
      hit_rate_pct: 0,
      average_return_pct: -2.1,
      average_alpha_vs_nifty_pct: -6.3,
      average_alpha_vs_sector_pct: -7.2,
      best_pick: {
        symbol: "HDFCBANK",
        company_name: "HDFC Bank",
        list_name: "Top 10 12-Month Compounders",
        entry_date: "2026-05-28",
        return_pct: -2.1,
        alpha_vs_nifty_pct: -6.3,
      },
      worst_pick: {
        symbol: "HDFCBANK",
        company_name: "HDFC Bank",
        list_name: "Top 10 12-Month Compounders",
        entry_date: "2026-05-28",
        return_pct: -2.1,
        alpha_vs_nifty_pct: -6.3,
      },
    },
  ],
};

export const DEMO_DATA_COVERAGE: DataCoverageReport = {
  ok: true,
  target_pct: 80,
  average_coverage_pct: 82.4,
  meets_target_all_pillars: false,
  pillars: [
    { pillar: "fundamentals", label: "Fundamentals", coverage_pct: 78, stale_pct: 12, null_pct: 22, confidence_pct: 71, meets_target: false },
    { pillar: "valuation", label: "Valuation", coverage_pct: 85, stale_pct: 8, null_pct: 15, confidence_pct: 74, meets_target: true },
    { pillar: "growth", label: "Growth", coverage_pct: 81, stale_pct: 10, null_pct: 19, confidence_pct: 72, meets_target: true },
    { pillar: "financial_strength", label: "Financial Strength", coverage_pct: 80, stale_pct: 11, null_pct: 20, confidence_pct: 70, meets_target: true },
    { pillar: "sector_strength", label: "Sector Strength", coverage_pct: 88, stale_pct: 5, null_pct: 12, confidence_pct: 76, meets_target: true },
    { pillar: "news", label: "News", coverage_pct: 72, stale_pct: 15, null_pct: 28, confidence_pct: 65, meets_target: false },
    { pillar: "momentum", label: "Momentum", coverage_pct: 90, stale_pct: 4, null_pct: 10, confidence_pct: 78, meets_target: true },
    { pillar: "institutional_flow", label: "Institutional Flow", coverage_pct: 76, stale_pct: 14, null_pct: 24, confidence_pct: 68, meets_target: false },
    { pillar: "business_moat", label: "Business Moat", coverage_pct: 83, stale_pct: 9, null_pct: 17, confidence_pct: 75, meets_target: true },
  ],
};

const demoBriefDate = new Date().toISOString().slice(0, 10);

export const DEMO_MORNING_BRIEF: MorningBriefResponse = {
  ok: true,
  cached: true,
  brief: {
    version: "demo",
    date_ist: demoBriefDate,
    sections: {
      market_outlook: {
        headline: "Constructive bias (demo)",
        summary:
          "Preview brief — connect your research API for the live 8 AM institutional brief from Sheets.",
        breadth: { label: "Neutral-bullish", conviction_above_50_pct: 58 },
      },
      top10_opportunities: {
        immediate: DEMO_TOP10.lists[0]?.items ?? [],
        all_lists: DEMO_TOP10.lists,
      },
      sector_winners: {
        items: [{ sector: "Defence", rank: 1, momentum: "Strong", note: "Demo" }],
      },
      sector_losers: {
        items: [{ sector: "FMCG", rank: 12, momentum: "Soft", note: "Demo" }],
      },
      government_themes: {
        items: [{ theme: "Defence capex", bias: "Positive", symbols: ["HAL", "BEL"] }],
        top_picks: DEMO_TOP10.lists[4]?.items ?? [],
      },
      macro_themes: {
        headline: "Rates stable",
        items: [{ metric: "India VIX", value: 14.2, bias: "Neutral" }],
      },
      risk_alerts: {
        summary: "No critical flags in demo dataset.",
        scoring_flags: [],
        sheet_alerts: [],
      },
      watchlist_changes: { note: "Demo — no live diff" },
      portfolio_actions: {
        disclaimer: "Not investment advice. Demo preview only.",
        items: [
          { symbol: "HAL", action: "Hold / add on dips", rationale: "High conviction defence theme" },
        ],
      },
    },
  },
};

export const DEMO_PORTFOLIO: PortfolioConstructionResponse = {
  ok: true,
  engine_version: "demo",
  capital_tiers: [100000, 500000, 1000000, 10000000],
  default_capital: 500000,
  as_of: demoBriefDate,
  tiers: [
    {
      ok: true,
      capital_inr: 500000,
      as_of: demoBriefDate,
      position_count: 3,
      deployed_inr: 475000,
      cash_inr: 25000,
      cash_pct: 5,
      max_drawdown_estimate_pct: 12,
      portfolio_conviction_score: 71,
      suggested_allocation: {
        core: { target_pct: 50, actual_pct: 48, amount_inr: 240000 },
        growth: { target_pct: 35, actual_pct: 34, amount_inr: 170000 },
        opportunistic: { target_pct: 15, actual_pct: 13, amount_inr: 65000 },
        cash: { target_pct: 5, actual_pct: 5, amount_inr: 25000 },
        deployed_pct: 95,
      },
      sector_exposure: [
        { sector: "Defence", amount_inr: 175000, weight_pct: 35, over_limit: false },
        { sector: "Oil & Gas", amount_inr: 150000, weight_pct: 30, over_limit: false },
        { sector: "BFSI", amount_inr: 150000, weight_pct: 30, over_limit: false },
      ],
      positions: [
        {
          symbol: "HAL",
          company_name: "Hindustan Aeronautics",
          sector: "Defence",
          bucket: "core",
          amount_inr: 175000,
          weight_pct: 35,
          shares_estimate: 100,
          last_price: 1750,
          opportunity_rank: 74,
          risk_score: 38,
          risk_grade: "B",
          data_quality_pct: 78,
        },
        {
          symbol: "RELIANCE",
          company_name: "Reliance Industries",
          sector: "Oil & Gas",
          bucket: "core",
          amount_inr: 150000,
          weight_pct: 30,
          shares_estimate: 120,
          last_price: 1250,
          opportunity_rank: 78,
          risk_score: 42,
          risk_grade: "B",
          data_quality_pct: 82,
        },
        {
          symbol: "HDFCBANK",
          company_name: "HDFC Bank",
          sector: "BFSI",
          bucket: "growth",
          amount_inr: 150000,
          weight_pct: 30,
          shares_estimate: 200,
          last_price: 750,
          opportunity_rank: 75,
          risk_score: 35,
          risk_grade: "A",
          data_quality_pct: 80,
        },
      ],
      constraints: { max_positions: 12, max_single_pct: 15, max_sector_pct: 35 },
      pool_size: 24,
    },
  ],
};

export const DEMO_BACKTEST: BacktestResponse = {
  ok: true,
  engine_version: "4.0",
  snapshot_only: true,
  snapshot_rows_total: 0,
  results: [],
  comparison: [],
  dashboard: {
    snapshot_rows_total: 0,
    snapshot_only: true,
    min_snapshots_required: 5,
    lists_ready: 0,
    lists_total: 6,
    overall_12m: null,
    by_horizon: [],
    comparison: [],
    comparison_by_list: {},
  },
};

export const DEMO_IPO: IpoIntelligenceResponse = {
  ok: true,
  engine_version: "demo",
  total: 2,
  by_verdict: { Subscribe: 1, Watch: 1 },
  rows: [
    {
      symbol: "DEMO_IPO1",
      company_name: "Demo IPO Alpha",
      status: "open",
      issue_price: 450,
      gmp_pct: 18,
      subscription_x: 4.2,
      listing_date: "2026-06-15",
      sector: "Industrials",
      verdict: "Subscribe",
      score: 72,
      thesis: "Strong GMP with institutional interest (preview).",
      risks: "Valuation stretch vs listed peers.",
    },
    {
      symbol: "DEMO_IPO2",
      company_name: "Demo IPO Beta",
      status: "upcoming",
      issue_price: 320,
      gmp_pct: 0,
      subscription_x: 0,
      listing_date: "",
      sector: "IT Services",
      verdict: "Watch",
      score: 48,
      thesis: "Await subscription book build-up.",
      risks: "Market timing and liquidity at listing.",
    },
  ],
};

export const DEMO_SME: SmeAlphaResponse = {
  ok: true,
  engine_version: "demo",
  list_name: "SME Alpha",
  items: [
    { rank: 1, symbol: "DEMO_SME1", sme_alpha_score: 78, sme_track: "sme_compounder" },
    { rank: 2, symbol: "DEMO_SME2", sme_alpha_score: 71, sme_track: "sme_export" },
    { rank: 3, symbol: "DEMO_SME3", sme_alpha_score: 65, sme_track: "sme_gov" },
  ],
};

export const DEMO_THEME: ThemeIntelligenceResponse = {
  ok: true,
  intelligence: {
    version: "demo",
    as_of: new Date().toISOString().slice(0, 10),
    top_themes: [
      {
        theme_id: "defence",
        theme_label: "Defence & aerospace",
        theme_strength: 82,
        theme_momentum: 74,
        government_support: 88,
        capex_cycle: 80,
        order_momentum: 76,
        theme_conviction_score: 81,
        symbol_count: 12,
        rank: 1,
      },
      {
        theme_id: "renewables",
        theme_label: "Renewables & grid",
        theme_strength: 76,
        theme_momentum: 70,
        government_support: 72,
        capex_cycle: 78,
        order_momentum: 68,
        theme_conviction_score: 74,
        symbol_count: 18,
        rank: 2,
      },
      {
        theme_id: "banks",
        theme_label: "Private banks",
        theme_strength: 68,
        theme_momentum: 62,
        government_support: 55,
        capex_cycle: 50,
        order_momentum: 58,
        theme_conviction_score: 61,
        symbol_count: 22,
        rank: 3,
      },
    ],
  },
};

export const DEMO_SHEET_AUDIT: SheetAuditResponse = {
  ok: true,
  timestampIst: new Date().toISOString(),
  spreadsheetName: "Demo Mode",
  tab1_row_count: 4200,
  tab6_row_count: 3800,
  tab10_row_count: 4100,
  tab11_row_count: 60,
  non_zero_conviction_scores: 3900,
  recommendations_generated: 60,
  sector_coverage_pct: 94.2,
  market_cap_coverage_pct: 91.5,
  theme_coverage_pct: 78.3,
  universe_symbols_loaded: 4200,
  conviction_distribution: {
    tab10_rows: 4100,
    count_gt_10: 3500,
    count_gt_20: 2800,
    max_conviction: 92,
  },
  diagnosis: [
    { severity: "info", message: "Preview audit — connect live API for sheet diagnosis." },
  ],
};
