export type ApiError = { ok: false; error: string };

export type HealthResponse = {
  ok: true;
  version: string;
  spreadsheetName: string;
  tab10Rows: number;
  tab11Rows: number;
  tab6Rows: number;
};

export type AnalystNote = {
  investment_thesis: string;
  bull_case: string;
  bear_case: string;
  catalysts: string;
  risks: string;
  /** @deprecated use valuation_summary — kept for API backward compatibility */
  valuation?: string;
  valuation_summary?: string;
  peer_comparison: string;
  theme_exposure: string;
  confidence: number;
  confidence_rationale?: string;
  timeline: string;
};

export type DecisionNarrative = {
  why: string;
  what: string;
  risk: string;
  catalyst: string;
  timeline: string;
  /** Conviction Engine 3.0 */
  why_now?: string;
  why_stock?: string;
  why_peers?: string;
  /** Risk Engine — upside / reward-risk (Sheets narrative) */
  upside?: string;
  reward_risk?: string;
  /** Full structured analyst note when API provides it */
  analyst_note?: AnalystNote;
};

export type DataQualityInfo = {
  data_quality_pct: number;
  quality_score?: number;
  quality_grade?: string;
  tab11_eligible?: boolean;
  data_completeness_pct: number;
  source_reliability_pct: number;
  staleness_penalty: number;
  fundamentals_age_days: number;
  missing_data_flags: string[];
  stale_data_flags: string[];
  data_gate_flag: boolean;
};

export type RecommendationItem = {
  rank: number;
  symbol: string;
  company_name: string;
  sector: string;
  conviction_total: number;
  bull_case: string;
  bear_case: string;
  catalyst: string;
  target_horizon: string;
  evidence: string;
  last_updated?: string;
  data_quality_pct?: number | null;
  /** Acceptance aliases from Sheets API (WebAppApi enrichAcceptanceFields_) */
  score?: number;
  thesis?: string;
  risk?: string;
  target?: string;
  confidence?: number;
  target_price?: number | null;
  current_price?: number | null;
  why_ranked?: string;
  score_breakdown?: string;
  decision?: DecisionNarrative;
  analyst_note?: AnalystNote;
};

export type RecommendationList = {
  name: string;
  items: RecommendationItem[];
};

export type Top10Response = {
  ok: true;
  updated?: string;
  listCount?: number;
  lists: RecommendationList[];
};

export type UniverseRow = {
  symbol_nse: string;
  company_name: string;
  sector: string;
  theme_tags: string;
  market_cap_cr: number;
  cap_segment: string;
  market_cap_bucket: string;
  exchange: string;
  pledge_pct: number;
};

export type ScoringRow = {
  symbol: string;
  company_name: string;
  scoring_engine_version?: string;
  fundamentals: number;
  valuation: number;
  growth: number;
  financial_strength: number;
  sector_strength: number;
  news_events: number;
  technical_momentum: number;
  institutional_flow: number;
  conviction_total: number;
  action_label?: string;
  data_gate_flag: boolean;
  fundamentals_age_days: number | string;
  data_completeness_pct: number;
  staleness_penalty?: number;
  quality_rank: number;
  missing_data_flags?: string;
  stale_data_flags?: string;
  source_reliability_pct?: number;
  data_quality_pct?: number;
  quality_score?: number;
  quality_grade?: string;
  alpha_score?: number;
  alpha_classification?: string;
  valuation_score?: number;
  catalyst_score?: number;
  conviction_stage?: string;
  opportunity_rank?: number;
  relative_quality_score?: number;
  relative_valuation_score?: number;
  relative_growth_score?: number;
  relative_strength_score?: number;
  sector_median_pe?: number;
  sector_median_pb?: number;
  sector_median_roe?: number;
  sector_median_roce?: number;
  sector_median_growth?: number;
  peer_comparison?: {
    relative_quality_score?: number;
    relative_valuation_score?: number;
    relative_growth_score?: number;
  relative_strength_score?: number;
    sector_median_pe?: number;
    sector_median_pb?: number;
    sector_median_roce?: number;
    sector_median_growth?: number;
  };
  risk_score?: number;
  risk_grade?: string;
  risk_danger?: number | null;
  reward_risk_ratio?: number | null;
  data_quality?: DataQualityInfo;
};

export type FundamentalsRow = {
  symbol: string;
  market_cap_cr: number;
  roce: number;
  roe: number;
  rev_yoy: number;
  pat_yoy: number;
  debt_equity: number;
  current_ratio: number;
  pe: number;
  pb: number;
  dividend_yield: number;
  promoter_holding: number;
  fii_holding: number;
  sector_normalized: string;
  last_updated: string;
  stale_flag: boolean;
};

export type PriceRow = {
  symbol: string;
  price: number;
  chg_pct: number;
  vol: number;
  dma20: number;
  dma50: number;
  dma200: number;
  rsi14: number;
  macd_signal: string;
  vs_50dma: number;
  vs_200dma: number;
  tech_setup: string;
  as_of_date: string;
};

export type NewsItem = {
  published_at: string;
  headline: string;
  summary: string;
  url: string;
  source_name: string;
  sentiment: string;
  materiality: string;
};

export type SymbolResponse = {
  ok: true;
  symbol: string;
  updated?: string;
  universe: UniverseRow | null;
  scoring: ScoringRow | null;
  fundamentals: FundamentalsRow | null;
  price: PriceRow | null;
  news: NewsItem[];
  lists: Array<{
    list_name: string;
    rank: number;
    conviction_total: number;
    bull_case: string;
    bear_case: string;
    catalyst: string;
    target_horizon: string;
    evidence: string;
    decision?: DecisionNarrative;
  }>;
  recommendation: SymbolResponse["lists"][0] | null;
  decision?: DecisionNarrative | null;
};

export type MacroMetric = {
  metric: string;
  value: unknown;
  trend: string;
  bias: string;
  as_of_date: string;
  notes: string;
};

export type MacroResponse = {
  ok: true;
  metrics: MacroMetric[];
  macro_verdict: MacroMetric | null;
};

export type MarketIndex = {
  id: string;
  name: string;
  level: number;
  daily: number;
  weekly: number;
  monthly: number;
};

export type MarketBreadth = {
  advancers: number;
  decliners: number;
  highs52w: number;
  lows52w: number;
  unchanged: number;
};

export type FearGreed = {
  score: number;
  label: "Bullish" | "Neutral" | "Bearish";
  drivers: { name: string; value: number; weight: number }[];
};

export type EnrichedRecommendation = RecommendationItem & {
  current_price: number | null;
  target_price: number | null;
  upside_pct: number | null;
  upside_score?: number | null;
  reward_risk_ratio?: number | null;
  risk_rating: "Low" | "Medium" | "High";
  confidence: number;
  why_recommended: string;
  data_quality_pct: number | null;
  analyst_note?: AnalystNote;
  decision: DecisionNarrative;
};

export type Holding = {
  symbol: string;
  quantity: number;
  avgPrice: number;
};

export type BacktestResultRow = {
  run_at: string;
  list_name?: string;
  horizon: string;
  benchmark: string;
  sample_count: number;
  hit_rate_pct: number;
  avg_return_pct: number;
  median_return_pct?: number;
  alpha_pct?: number | null;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  sortino_ratio?: number;
  total_return_pct: number;
  winners: number;
  losers: number;
  mode: string;
  notes: string;
};

export type BacktestComparison = {
  list_name?: string;
  horizon: string;
  alpha_avg_return_pct: number | null;
  alpha_median_return_pct?: number | null;
  alpha_hit_rate_pct: number | null;
  alpha_vs_sector_avg_pct?: number | null;
  recommendations: BacktestResultRow | null;
  nifty: BacktestResultRow | null;
  sector?: BacktestResultRow | null;
};

export type PerformanceHorizonSummary = {
  horizon: string;
  hit_rate_pct: number;
  avg_return_pct: number;
  alpha_vs_nifty_pct: number;
  alpha_vs_sector_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  sample_trades: number;
  lists_with_data: number;
};

export type RecommendationPerformanceDashboard = {
  snapshot_rows_total: number;
  snapshot_only: boolean;
  min_snapshots_required: number;
  lists_ready: number;
  lists_total: number;
  overall_12m: PerformanceHorizonSummary | null;
  by_horizon: (PerformanceHorizonSummary | null)[];
  comparison: BacktestComparison[];
  comparison_by_list: Record<string, BacktestComparison[]>;
};

export type BacktestValidationHorizon = {
  horizon: string;
  verdict: "PASS" | "PARTIAL" | "FAIL";
  trade_count: number;
  snapshot_rows: number;
  hit_rate_pct?: number;
  avg_return_pct?: number;
  alpha_vs_nifty_pct?: number | null;
  alpha_vs_sector_pct?: number | null;
  sharpe_ratio?: number;
  sortino_ratio?: number;
  max_drawdown_pct?: number;
  mode?: string;
  notes?: string;
};

export type BacktestValidationList = {
  list_name: string;
  verdict: "PASS" | "PARTIAL" | "FAIL";
  mode: string;
  snapshot_rows: number;
  min_snapshots_required: number;
  horizons: BacktestValidationHorizon[];
};

export type BacktestValidationReport = {
  report_version: string;
  run_at: string;
  overall_verdict: "PASS" | "PARTIAL" | "FAIL";
  snapshot_only: boolean;
  snapshot_rows_total: number;
  synthetic_rows_excluded: number;
  lists_ready: number;
  lists_total: number;
  horizons_pass: number;
  horizons_partial: number;
  horizons_fail: number;
  lists: BacktestValidationList[];
  summary_lines: string[];
};

export type BacktestResponse = {
  ok: true;
  engine_version?: string;
  updated?: string;
  snapshot_only?: boolean;
  min_snapshots_required?: number;
  snapshot_rows_total?: number;
  synthetic_excluded?: number;
  tracked_lists?: string[];
  lists?: {
    list_name: string;
    mode: string;
    cohort_size: number;
    snapshot_rows: number;
    ready?: boolean;
  }[];
  results: BacktestResultRow[];
  comparison: BacktestComparison[];
  comparison_by_list?: Record<string, BacktestComparison[]>;
  dashboard?: RecommendationPerformanceDashboard;
  validation?: BacktestValidationReport | null;
};

export type RecommendationHistoryLive = {
  entry_date: string;
  current_price: number | null;
  current_return_pct: number | null;
  nifty_return_pct: number | null;
  sector_return_pct: number | null;
  alpha_vs_nifty_pct: number | null;
  alpha_vs_sector_pct: number | null;
  hit: boolean | null;
};

export type RecommendationHistoryEntry = {
  snapshot_date: string;
  entry_date?: string;
  recommendation_category: string;
  list_name: string;
  rank: number;
  symbol: string;
  company_name: string;
  sector_key: string;
  entry_price: number;
  conviction: number;
  thesis: string;
  target: string;
  confidence: number | null;
  risk: string;
  risk_score: number | null;
  data_quality_pct: number | null;
  source: string;
  live: RecommendationHistoryLive;
};

export type RecommendationHistoryResponse = {
  ok: true;
  engine_version?: string;
  updated: string;
  total_rows: number;
  date_range: { earliest: string | null; latest: string | null };
  categories: string[];
  entries: RecommendationHistoryEntry[];
};

export type RecommendationScorecardPick = {
  symbol: string;
  company_name: string;
  list_name: string;
  entry_date: string;
  return_pct: number;
  alpha_vs_nifty_pct: number | null;
};

export type RecommendationScorecard = {
  recommendation_category: string;
  category_label: string;
  recommendations_issued: number;
  with_returns: number;
  hit_rate_pct: number | null;
  average_return_pct: number | null;
  average_alpha_vs_nifty_pct: number | null;
  average_alpha_vs_sector_pct: number | null;
  best_pick: RecommendationScorecardPick | null;
  worst_pick: RecommendationScorecardPick | null;
};

export type RecommendationHistoryHealth = {
  engine_version?: string;
  status: string;
  tab37_exists: boolean;
  snapshot_engine_deployed: boolean;
  last_snapshot_date: string | null;
  rows_added_today: number;
  total_history_rows: number;
  blank_category_rows?: number;
  last_8am_run_ok: boolean;
  last_8am_phase?: string;
  last_8am_ist?: string;
  checked_at?: string;
};

export type PillarCoverageRow = {
  pillar: string;
  label: string;
  coverage_pct: number;
  stale_pct: number;
  null_pct: number;
  confidence_pct: number;
  meets_target: boolean;
};

export type DataCoverageReport = {
  ok: boolean;
  error?: string;
  engine_version?: string;
  generated_at?: string;
  universe_rows?: number;
  target_pct: number;
  average_coverage_pct?: number;
  meets_target_all_pillars?: boolean;
  pillars: PillarCoverageRow[];
};

export type RecommendationValidationResponse = {
  ok: true;
  engine_version?: string;
  updated: string;
  total_recommendations: number;
  total_with_returns: number;
  overall_hit_rate_pct: number | null;
  scorecards: RecommendationScorecard[];
  history_summary: { earliest: string | null; latest: string | null };
  history_health?: RecommendationHistoryHealth;
};

export type PortfolioAllocationBucket = {
  target_pct: number;
  actual_pct: number;
  amount_inr: number;
};

export type PortfolioSuggestedAllocation = {
  core: PortfolioAllocationBucket;
  growth: PortfolioAllocationBucket;
  opportunistic: PortfolioAllocationBucket;
  cash: PortfolioAllocationBucket;
  deployed_pct: number;
};

export type PortfolioSectorExposure = {
  sector: string;
  amount_inr: number;
  weight_pct: number;
  over_limit: boolean;
};

export type PortfolioPosition = {
  symbol: string;
  company_name: string;
  sector: string;
  bucket: "core" | "growth" | "opportunistic";
  amount_inr: number;
  weight_pct: number;
  shares_estimate: number;
  last_price: number | null;
  opportunity_rank: number;
  risk_score: number;
  risk_grade: string;
  data_quality_pct: number;
  portfolio_pick_score?: number;
  reward_risk_ratio?: number | null;
};

export type PortfolioTierModel = {
  ok: boolean;
  error?: string;
  engine_version?: string;
  capital_inr: number;
  as_of?: string;
  suggested_allocation?: PortfolioSuggestedAllocation;
  sector_exposure?: PortfolioSectorExposure[];
  positions?: PortfolioPosition[];
  position_count?: number;
  deployed_inr?: number;
  cash_inr?: number;
  cash_pct?: number;
  max_drawdown_estimate_pct?: number;
  portfolio_conviction_score?: number;
  constraints?: {
    max_positions: number;
    max_single_pct: number;
    max_sector_pct: number;
  };
  pool_size?: number;
};

export type PortfolioConstructionResponse = {
  ok: boolean;
  error?: string;
  engine_version?: string;
  capital_tiers?: number[];
  tiers: PortfolioTierModel[];
  default_capital?: number;
  as_of?: string;
};

export type WatchlistEntry = {
  symbol: string;
  bucket: "potential_buys" | "high_conviction" | "pullback" | "earnings" | "gov_theme";
  note?: string;
  addedAt: string;
};

export type MorningBriefSectorItem = {
  sector: string;
  rank?: number;
  narrative?: number;
  macro?: number;
  flow?: number;
  momentum?: string;
  note?: string;
};

export type MorningBriefSections = {
  market_outlook: {
    headline?: string;
    summary?: string;
    metrics?: { metric: string; value: unknown; bias?: string }[];
    breadth?: { label?: string; conviction_above_50_pct?: number };
  };
  top10_opportunities: {
    immediate?: RecommendationItem[];
    all_lists?: { name: string; items: RecommendationItem[] }[];
  };
  sector_winners: { items?: MorningBriefSectorItem[] };
  sector_losers: { items?: MorningBriefSectorItem[] };
  government_themes: {
    items?: { theme: string; bias?: string; symbols?: string[]; beneficiaries?: string }[];
    top_picks?: RecommendationItem[];
  };
  investment_themes?: {
    title?: string;
    summary?: string;
    status?: string;
    items?: {
      id: string;
      label: string;
      symbol_count?: number;
      example_symbols?: string[];
      top_symbols?: {
        symbol: string;
        company_name?: string;
        opportunity_rank?: number;
        quality_score?: number;
      }[];
    }[];
  };
  macro_themes: { headline?: string; items?: { metric: string; value: unknown; bias?: string }[] };
  risk_alerts: {
    summary?: string;
    sheet_alerts?: { symbol: string; trigger_type: string; detail: string }[];
    scoring_flags?: { symbol: string; flag: string; detail: string }[];
  };
  watchlist_changes: {
    added?: string[];
    removed?: string[];
    rank_moves?: { symbol: string; from_rank: number; to_rank: number }[];
    note?: string;
  };
  portfolio_actions: {
    items?: { symbol: string; action: string; rationale: string }[];
    disclaimer?: string;
  };
};

export type MorningBriefPayload = {
  version?: string;
  date_ist: string;
  spreadsheet_url?: string;
  sections: MorningBriefSections;
};

export type MorningBriefResponse = {
  ok: true;
  cached?: boolean;
  brief: MorningBriefPayload;
};

export type IpoIntelligenceRow = {
  symbol: string;
  company_name: string;
  status: string;
  issue_price: number;
  gmp_pct: number;
  subscription_x: number;
  listing_date: string;
  sector: string;
  verdict: string;
  score: number;
  thesis: string;
  risks: string;
};

export type IpoIntelligenceResponse = {
  ok: true;
  engine_version?: string;
  total: number;
  by_verdict: Record<string, number>;
  rows: IpoIntelligenceRow[];
};

export type SmeAlphaItem = {
  rank: number;
  symbol: string;
  sme_alpha_score: number;
  sme_track: string;
};

export type SmeAlphaResponse = {
  ok: true;
  engine_version?: string;
  list_name: string;
  items: SmeAlphaItem[];
};

export type ThemeIntelItem = {
  rank?: number;
  theme_id: string;
  theme_label: string;
  theme_strength: number;
  theme_momentum: number;
  government_support: number;
  capex_cycle: number;
  order_momentum: number;
  theme_conviction_score: number;
  symbol_count?: number;
};

export type ThemeIntelligencePayload = {
  version?: string;
  as_of?: string;
  top_themes?: ThemeIntelItem[];
  top10_themes?: ThemeIntelItem[];
  themes?: ThemeIntelItem[];
};

export type ThemeIntelligenceResponse = {
  ok: true;
  intelligence: ThemeIntelligencePayload;
};

export type SheetAuditDiagnosis = {
  severity?: string;
  message?: string;
  timestamp?: string;
};

export type SheetAuditResponse = {
  ok: true;
  timestampIst?: string;
  spreadsheetName?: string;
  tab1_row_count?: number;
  tab6_row_count?: number;
  tab10_row_count?: number;
  tab11_row_count?: number;
  non_zero_conviction_scores?: number;
  recommendations_generated?: number;
  sector_coverage_pct?: number;
  market_cap_coverage_pct?: number;
  theme_coverage_pct?: number;
  universe_symbols_loaded?: number;
  conviction_distribution?: {
    tab10_rows?: number;
    count_gt_10?: number;
    count_gt_20?: number;
    max_conviction?: number;
  };
  diagnosis?: SheetAuditDiagnosis[] | string[];
};

export type SystemAuditResponse = {
  ok: true;
  audit: { diagnosis?: SheetAuditDiagnosis[]; overall?: string; timestampIst?: string } | null;
};
