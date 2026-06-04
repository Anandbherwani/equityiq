/**
 * Indian Stock Intelligence Tracker — Apps Script
 * Sync NEWS_SOURCES with backend/config/news-sources.json when editing feeds.
 */

/** Primary NSE symbol list URLs (NSE moved many files to nsearchives.nseindia.com). */
var NSE_EQUITY_CSV_URLS = [
  'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv',
  'https://archives.nseindia.com/content/equities/EQUITY_L.csv'
];
var NSE_EQUITY_CSV_URL = NSE_EQUITY_CSV_URLS[0];
var NSE_SME_CSV_URLS = [
  'https://nsearchives.nseindia.com/content/sme/EQUITY_L.csv',
  'https://archives.nseindia.com/content/sme/EQUITY_L.csv'
];
var NSE_SME_CSV_URL = NSE_SME_CSV_URLS[0];
var NSE_MANUAL_CSV_HELP_URL =
  'https://www.nseindia.com/static/market-data/securities-available-for-trading';
var FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/csv,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/'
};
var RSS_DELAY_MS = 1500;
var RSS_MAX_ITEMS_PER_RUN = 200;
var CAP_LARGE_MIN_CR = 20000;
var CAP_MID_MIN_CR = 5000;
var CAP_SMALL_MIN_CR = 500;

/** UNIVERSE → Tab 10 eligibility (edit thresholds here) */
var MIN_MARKET_CAP_CR = 500;
var MAX_PLEDGE_PCT = 30;
var HIGH_LIQUIDITY_MCAP_CR = 5000;
var WATCHLIST_TOP_N = 50;
var PRICE_REFRESH_MAX_SYMBOLS = 200;
var ANALYSIS_OUTPUT_TOP_N = 10;
/** When true, helper counts suggest capped sub-scores on C–J (Perplexity can override later). */
var APPLY_AUTO_SUB_SCORES = true;
/** When true, optional Perplexity moat enrichment runs (costly; off by default). */
var APPLY_PERPLEXITY_SCORES = false;
/** Perplexity news → events pipeline (see docs/NEWS_TO_SCORING.md). */
var PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
var PERPLEXITY_MODEL = 'sonar-pro';
var PERPLEXITY_NEWS_MAX_HEADLINES = 30;
var PERPLEXITY_NEWS_HOURS_LOOKBACK = 48;
var LAST_NEWS_PIPELINE_SUMMARY_PROP = 'LAST_NEWS_PIPELINE_SUMMARY';
/**
 * When true, symbols without market_cap_cr (common after NSE CSV-only import) still sync to Tab 10
 * if they pass pledge/NCLT/auditor checks. Set false after merging Screener caps.
 */
var ALLOW_UNIVERSE_WITHOUT_MCAP = true;

var SCORING_NUM_COLS = 67;
/** Price row older than this (days) is flagged stale for data quality. */
var PRICE_STALE_WARN_DAYS = 7;
var PRICE_STALE_ZERO_DAYS = 30;
var FUNDAMENTALS_NUM_COLS = 25;
var FUNDAMENTALS_STALE_IMPORT_DAYS = 60;
var FUNDAMENTALS_STALE_SCORE_DAYS = 90;
var FUNDAMENTALS_STALE_ZERO_DAYS = 180;
var SCREENER_API_DELAY_MS = 2000;
var SCREENER_API_MAX_PER_RUN = 100;

/** Scoring Engine 2.1 — see shared/scoring/CONVICTION_SCORE.md + QUALITY_PILLARS.md */
var SCORING_ENGINE_VERSION = typeof CONVICTION_ENGINE_VERSION_ !== 'undefined' ?
  CONVICTION_ENGINE_VERSION_ : '3.0';

/** Conviction component caps (sum = 100). Tab 10 C–J + K business_moat. */
var CONVICTION_CAP = {
  fundamentals: 15,
  business_moat: 10,
  valuation: 15,
  growth: 15,
  financial_strength: 15,
  sector_strength: 10,
  news_events: 10,
  technical_momentum: 5,
  institutional_flow: 5
};

/** Canonical sectors for Tab 1 / Tab 19 / Perplexity Section 12. */
var SECTOR_TAXONOMY_ = [
  'BFSI', 'IT SERVICES', 'PHARMACEUTICALS', 'CONSUMER', 'AUTOMOBILES', 'INDUSTRIALS',
  'OIL & GAS', 'POWER', 'METALS & MINING', 'REAL ESTATE', 'TELECOM', 'MEDIA',
  'CHEMICALS', 'AGRICULTURE', 'DEFENCE', 'INFRASTRUCTURE', 'LOGISTICS',
  'HOSPITALITY', 'TEXTILES', 'RETAIL', 'INSURANCE', 'NBFC', 'CEMENT',
  'ELECTRICALS', 'MISCELLANEOUS'
];

/** @type {Array<Object>} Mirror of config/news-sources.json */
var NEWS_SOURCES = [
  { source_id: 'et-markets', name: 'Economic Times Markets', tier: 'T2', channel_type: 'web', geography: 'india',
    rss_url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    web_domain: 'economictimes.indiatimes.com', enabled: true, refresh_cadence: '2x_daily', notes: '' },
  { source_id: 'mint-top', name: 'Mint Top News', tier: 'T2', channel_type: 'newspaper', geography: 'india',
    rss_url: 'https://www.livemint.com/rss/news', web_domain: 'livemint.com', enabled: true,
    refresh_cadence: '2x_daily', notes: '' },
  { source_id: 'moneycontrol-latest', name: 'Moneycontrol Latest', tier: 'T3', channel_type: 'web', geography: 'india',
    rss_url: 'https://www.moneycontrol.com/rss/latestnews.xml', web_domain: 'moneycontrol.com', enabled: true,
    refresh_cadence: '2x_daily', notes: '' },
  { source_id: 'bs-markets', name: 'Business Standard Markets', tier: 'T2', channel_type: 'newspaper', geography: 'india',
    rss_url: 'https://www.business-standard.com/rss/markets-106.rss', web_domain: 'business-standard.com',
    enabled: true, refresh_cadence: '2x_daily', notes: '' },
  { source_id: 'fe-industry', name: 'Financial Express', tier: 'T2', channel_type: 'newspaper', geography: 'india',
    rss_url: 'https://www.financialexpress.com/feed/', web_domain: 'financialexpress.com', enabled: true,
    refresh_cadence: 'daily', notes: '' },
  { source_id: 'reuters-business', name: 'Reuters Business', tier: 'T2', channel_type: 'wire', geography: 'global',
    rss_url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
    web_domain: 'reuters.com', enabled: true, refresh_cadence: '2x_daily', notes: '' },
  { source_id: 'bbc-business', name: 'BBC Business', tier: 'T2', channel_type: 'wire', geography: 'global',
    rss_url: 'https://feeds.bbci.co.uk/news/business/rss.xml', web_domain: 'bbc.com', enabled: true,
    refresh_cadence: '2x_daily', notes: '' },
  { source_id: 'cnbc-top', name: 'CNBC Top News', tier: 'T2', channel_type: 'tv', geography: 'global',
    rss_url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
    web_domain: 'cnbc.com', enabled: true, refresh_cadence: '2x_daily', notes: '' },
  { source_id: 'marketwatch-top', name: 'MarketWatch', tier: 'T2', channel_type: 'web', geography: 'global',
    rss_url: 'https://feeds.marketwatch.com/marketwatch/topstories/', web_domain: 'marketwatch.com',
    enabled: true, refresh_cadence: 'daily', notes: '' },
  { source_id: 'pib-all', name: 'PIB Press Releases', tier: 'T1', channel_type: 'government', geography: 'india',
    rss_url: 'https://pib.gov.in/WriteReadData/rss/english/rss.xml', web_domain: 'pib.gov.in', enabled: true,
    refresh_cadence: 'daily', notes: '' },
  { source_id: 'capitalmind', name: 'Capitalmind', tier: 'T4', channel_type: 'blog', geography: 'india',
    rss_url: 'https://www.capitalmind.in/feed', web_domain: 'capitalmind.in', enabled: true,
    refresh_cadence: 'weekly', notes: '' },
  { source_id: 'zerodha-blog', name: 'Zerodha Blog', tier: 'T4', channel_type: 'blog', geography: 'india',
    rss_url: 'https://zerodha.com/blog/feed/', web_domain: 'zerodha.com', enabled: true,
    refresh_cadence: 'weekly', notes: '' },
  { source_id: 'x-curated', name: 'X Allowlist (Perplexity only)', tier: 'T5', channel_type: 'twitter', geography: 'both',
    rss_url: '', web_domain: 'x.com', enabled: true, refresh_cadence: '2x_daily',
    notes: 'x:@RBI x:@SEBI_India x:@ETMarkets x:@livemint x:@federalreserve x:@ecb' }
];

var SHEET_DEFS = [
  { name: '1. UNIVERSE', headers: [
    'symbol_nse', 'symbol_bse', 'company_name', 'sector', 'theme_tags', 'market_cap_cr',
    'cap_segment', 'market_cap_bucket', 'is_sme', 'listing_segment', 'exchange', 'isin',
    'liquidity_flag', 'auditor_flag', 'nclt_flag', 'pledge_pct', 'last_import_date', 'stale_flag'
  ]},
  { name: '2. PRICE & TECHNICALS', headers: [
    'symbol', 'price', 'chg_pct', 'vol', 'dma20', 'dma50', 'dma200', 'rsi14', 'macd_signal',
    'delivery_pct', 'vs_50dma', 'vs_200dma', 'high_52w', 'vol_avg_20d', 'tech_setup', 'as_of_date'
  ]},
  { name: '3. NSE/BSE ANNOUNCEMENTS', headers: [
    'symbol', 'date', 'headline', 'category', 'source_url', 'confirmed_flag', 'notes'
  ]},
  { name: '4. BULK & LARGE DEALS', headers: [
    'date', 'symbol', 'client_name', 'buy_sell', 'qty', 'price', 'pct_traded',
    'deal_type', 'investor_category', 'value_cr', 'source_url'
  ]},
  { name: '5. INSIDER/PROMOTER', headers: [
    'symbol', 'date', 'insider', 'transaction', 'qty', 'value', 'pledge_pct', 'pledge_trend'
  ]},
  { name: '6. FUNDAMENTALS', headers: [
    'symbol', 'market_cap_cr', 'roce', 'roe', 'rev_yoy', 'pat_yoy', 'debt_equity', 'current_ratio',
    'pe', 'pb', 'dividend_yield', 'promoter_holding', 'fii_holding', 'sector_raw', 'sector_normalized',
    'ebitda_yoy', 'ebitda_margin', 'fcf_trend', 'earnings_quality_note', 'ev_ebitda', 'pe_vs_3y',
    'valuation_tag', 'quarter_end', 'last_updated', 'stale_flag'
  ]},
  { name: '7. NEWS FLOW', headers: [
    'published_at', 'ingested_at', 'headline', 'summary', 'url', 'source_name', 'source_tier',
    'channel_type', 'geography', 'language', 'symbol', 'sector_tags', 'theme_tags',
    'india_relevance', 'materiality', 'sentiment', 'sentiment_score', 'event_type',
    'confirmed_flag', 'duplicate_of', 'run_id'
  ]},
  { name: '8. MACRO DASHBOARD', headers: ['metric', 'value', 'trend', 'bias', 'as_of_date', 'notes'] },
  { name: '9. GEOPOLITICS FLAGS', headers: [
    'event', 'status', 'sectors_helped', 'sectors_hurt', 'last_updated', 'notes'
  ]},
  { name: '10. SCORING MODEL', headers: [
    'symbol', 'company_name', 'fundamentals', 'valuation', 'growth', 'financial_strength',
    'sector_strength', 'news_events', 'technical_momentum', 'institutional_flow',
    'business_moat', 'moat_confidence_pct', 'conviction_total', 'filings_signal_count_30d',
    'orderbook_signal_count_90d', 'promoter_buy_flag_90d', 'revision_upgrade_count_60d',
    'sector_strength_rank', 'positive_signal_count', 'horizon_1w', 'horizon_1m', 'horizon_3m',
    'horizon_6_12m', 'action_label', 'pledge_gt_50', 'pump_flag_40pct_30d', 'sebi_investigation',
    'cfo_pat_divergence', 'mgmt_exits', 'exclude_from_watchlist', 'news_boost_trigger',
    'news_boost_sector', 'last_scored_date', 'data_gate_flag', 'fundamentals_age_days',
    'data_completeness_pct', 'staleness_penalty', 'quality_rank', 'missing_data_flags',
    'stale_data_flags', 'source_reliability_pct', 'data_quality_pct', 'quality_grade',
    'alpha_score', 'alpha_classification',
    'quality_score', 'valuation_score', 'catalyst_score', 'conviction_stage', 'opportunity_rank',
    'relative_quality_score', 'relative_valuation_score', 'relative_growth_score',
    'sector_median_pe', 'sector_median_pb', 'sector_median_roce', 'sector_median_growth',
    'sector_median_roe', 'sector_median_ebitda_margin',
    'theme_conviction_score', 'primary_theme_id',
    'risk_score', 'risk_grade',
    'theme_exposure', 'theme_strength', 'theme_momentum',
    'reward_risk_ratio'
  ]},
  { name: '28. STOCK THEME SCORES', headers: [
    'symbol', 'theme_id', 'theme_label', 'theme_exposure', 'theme_strength', 'theme_momentum',
    'stock_theme_conviction', 'theme_conviction_score', 'opportunity_rank', 'as_of_date'
  ]},
  { name: '29. RISK BREAKDOWN', headers: [
    'symbol', 'risk_score', 'risk_grade', 'risk_danger',
    'debt_risk', 'governance_risk', 'pledge_risk', 'valuation_risk',
    'cyclicality_risk', 'liquidity_risk', 'reward_risk_ratio', 'flags', 'as_of_date'
  ]},
  { name: '30. PORTFOLIO MODELS', headers: [
    'capital_inr', 'bucket', 'symbol', 'company_name', 'sector',
    'amount_inr', 'weight_pct', 'shares_estimate', 'opportunity_rank',
    'risk_score', 'risk_grade', 'portfolio_conviction', 'max_dd_pct', 'as_of_date'
  ]},
  { name: '25. SECTOR PEER BENCHMARKS', headers: [
    'sector_key', 'symbol_count', 'median_pe', 'median_pb', 'median_roe', 'median_roce',
    'median_growth_pct', 'median_ebitda_margin_pct', 'as_of_date', 'sample_symbols', 'notes'
  ]},
  { name: '35. PEER STOCK COMPARISON', headers: [
    'symbol', 'sector_key', 'pe', 'pb', 'roe_pct', 'roce_pct', 'growth_pct', 'ebitda_margin_pct',
    'median_pe', 'median_pb', 'median_roe', 'median_roce', 'median_growth', 'median_margin',
    'pe_vs_median', 'pb_vs_median', 'roe_vs_median', 'roce_vs_median', 'growth_vs_median', 'margin_vs_median',
    'relative_quality_score', 'relative_valuation_score', 'relative_growth_score', 'as_of_date'
  ]},
  { name: '26. INVESTMENT THEMES', headers: [
    'theme_id', 'theme_label', 'rank', 'symbol', 'opportunity_rank', 'quality_score',
    'sector', 'as_of_date', 'notes'
  ]},
  { name: '27. THEME INTELLIGENCE', headers: [
    'rank', 'theme_id', 'theme_label', 'theme_strength', 'theme_momentum',
    'government_support', 'capex_cycle', 'order_momentum', 'theme_conviction_score',
    'symbol_count', 'as_of_date'
  ]},
  { name: '11. RANKED WATCHLIST', headers: [
    'list_name', 'rank', 'symbol', 'company_name', 'sector', 'conviction_total', 'bull_case', 'bear_case',
    'catalyst', 'target_horizon', 'confidence', 'evidence', 'last_updated'
  ]},
  { name: '32. RECOMMENDATION AUDIT', headers: [
    'audited_at', 'list_name', 'rank', 'symbol', 'conviction', 'opportunity_rank',
    'data_quality_pct', 'core_pillars', 'news_H', 'orderbook_90d', 'news_articles_30d',
    'legacy_pass', 'v2_pass', 'low_quality', 'weak_conviction', 'news_only',
    'single_news', 'single_order', 'stale', 'reject_reasons', 'last_updated'
  ]},
  { name: '12. ALERTS LOG', headers: ['timestamp', 'symbol', 'trigger_type', 'detail', 'source_tab'] },
  { name: '13. NEWS SOURCES', headers: [
    'source_id', 'name', 'tier', 'channel_type', 'geography', 'rss_url', 'web_domain',
    'enabled', 'refresh_cadence', 'last_fetch', 'notes'
  ]},
  { name: '14. INDIA IMPACT LOG', headers: [
    'date', 'global_headline', 'source', 'global_theme', 'india_transmission',
    'sectors_helped', 'sectors_hurt', 'watchlist_symbols', 'confidence', 'action_note'
  ]},
  { name: '15. FILINGS', headers: [
    'date', 'symbol', 'filing_type', 'sub_type', 'headline', 'materiality', 'source_url',
    'confirmed_flag', 'impact_window', 'catalyst_type', 'ai_interpretation'
  ]},
  { name: '16. ORDER BOOK TRACKER', headers: [
    'symbol', 'date', 'order_value_cr', 'customer_type', 'project_type', 'sector',
    'domestic_export', 'execution_period', 'order_book_est_cr', 'ttm_revenue_cr',
    'orderbook_revenue_ratio', 'source_url', 'confidence', 'notes'
  ]},
  { name: '17. ANALYST REVISIONS', headers: [
    'symbol', 'date', 'broker', 'rating_old', 'rating_new', 'target_old', 'target_new',
    'eps_fy1_old', 'eps_fy1_new', 'margin_change', 'confidence', 'source_url'
  ]},
  { name: '18. PROMOTER ACTIVITY', headers: [
    'symbol', 'date', 'entity_name', 'entity_type', 'promoter_group_flag', 'transaction_type',
    'qty', 'value', 'post_holding', 'pledge_pct', 'pledge_trend', 'trust_holding_flag', 'source_url'
  ]},
  { name: '19. SECTOR STRENGTH', headers: [
    'week_ending', 'sector', 'narrative_score', 'macro_score', 'flow_score', 'composite_rank',
    'momentum_vs_prior_week', 'sectors_helped_note'
  ]},
  { name: '20. MACRO BENEFICIARIES', headers: [
    'metric', 'value', 'trend', 'bias', 'beneficiaries', 'losers', 'as_of_date', 'notes'
  ]},
  { name: '21. ANALYSIS_OUTPUT', headers: [
    'section', 'table_id', 'rank', 'symbol', 'company_name', 'sector', 'field_1', 'field_2',
    'field_3', 'conviction', 'action', 'run_date', 'notes'
  ]},
  { name: '22. BACKTEST LOG', headers: [
    'snapshot_date', 'list_name', 'rank', 'symbol', 'company_name', 'sector_key',
    'entry_price', 'conviction_total', 'data_quality_pct', 'source'
  ]},
  { name: '23. BACKTEST RESULTS', headers: [
    'run_at', 'list_name', 'horizon', 'benchmark', 'sample_count', 'hit_rate_pct', 'avg_return_pct',
    'median_return_pct', 'alpha_pct', 'sharpe_ratio', 'sortino_ratio', 'max_drawdown_pct',
    'total_return_pct', 'winners', 'losers', 'mode', 'notes'
  ]},
  { name: '31. RECOMMENDATION PERFORMANCE', headers: [
    'run_at', 'list_name', 'horizon', 'metric', 'recommendations', 'nifty', 'sector',
    'alpha_vs_nifty', 'alpha_vs_sector', 'mode', 'snapshot_rows'
  ]},
  { name: '36. BACKTEST VALIDATION', headers: [
    'run_at', 'scope', 'list_name', 'horizon', 'verdict', 'snapshot_rows', 'trade_count',
    'hit_rate_pct', 'avg_return_pct', 'alpha_vs_nifty_pct', 'alpha_vs_sector_pct',
    'sharpe_ratio', 'sortino_ratio', 'max_drawdown_pct', 'mode', 'notes'
  ]},
  { name: '24. SHAREHOLDING PATTERN', headers: [
    'symbol', 'as_of_date', 'fii_pct', 'dii_pct', 'mf_pct', 'promoter_pct', 'public_pct', 'source', 'notes'
  ]},
  { name: '33. INGESTION COVERAGE', headers: [
    'generated_at', 'symbol', 'fundamentals', 'quarterly', 'shareholding', 'fii', 'dii', 'mf',
    'bulk_block', 'corp_actions', 'symbol_coverage_pct', 'notes'
  ]},
  { name: '34. INGESTION HISTORY', headers: [
    'run_at', 'dataset', 'symbol', 'dq_score', 'payload_hash', 'payload_json', 'source'
  ]},
  { name: '37. RECOMMENDATION HISTORY', headers: [
    'snapshot_date', 'recommendation_category', 'list_name', 'rank', 'symbol', 'company_name',
    'sector_key', 'entry_price', 'conviction', 'thesis', 'target', 'confidence', 'risk',
    'risk_score', 'data_quality_pct', 'source'
  ]},
  { name: '38. IPO INTELLIGENCE', headers: [
    'symbol', 'company_name', 'status', 'issue_price', 'gmp_pct', 'subscription_x',
    'listing_date', 'sector', 'verdict', 'score', 'thesis', 'risks', 'last_updated'
  ]}
];

/** Single Tab 11 conviction engine — six recommendation lists (no Tab 11b). */
var RECOMMENDATION_LIST_DEFS = [
  { name: 'Top 10 Immediate Opportunities', filter: 'immediate' },
  { name: 'Top 10 3-Month Opportunities', filter: 'three_month' },
  { name: 'Top 10 12-Month Compounders', filter: 'compounders' },
  { name: 'Top 10 Monopoly Businesses', filter: 'monopoly' },
  { name: 'Top 10 Government Beneficiaries', filter: 'gov_beneficiary' },
  { name: 'Top 10 Turnarounds', filter: 'turnaround' }
];

var ANNOUNCEMENT_KEYWORDS_ORDER = ['order', 'contract', 'loa', 'work order', 'letter of award', 'bagged'];
var ANNOUNCEMENT_KEYWORDS_DEALS = ['bulk deal', 'block deal', 'shareholding pattern', 'share holding pattern',
  'disclosure under regulation 29', 'disclosure under regulation 7'];
var ANNOUNCEMENT_KEYWORDS_FILING = ['board meeting', 'financial result', 'outcome of board', 'acquisition',
  'demerger', 'fund raise', 'rights issue', 'buyback', 'investor presentation'];

var SAMPLE_UNIVERSE = [
  ['RELIANCE', '500325', 'Reliance Industries Ltd', 'Energy', 'Refining|Retail', 1800000,
    'large', 'Large-cap', false, 'EQ', 'NSE', 'INE002A01018', 'high', 'ok', 'no', 5],
  ['TCS', '532540', 'Tata Consultancy Services', 'IT Services', 'IT|Export', 1400000,
    'large', 'Large-cap', false, 'EQ', 'NSE', 'INE467B01029', 'high', 'ok', 'no', 0],
  ['INFY', '500209', 'Infosys Ltd', 'IT Services', 'IT|Export', 700000,
    'large', 'Large-cap', false, 'EQ', 'NSE', 'INE009A01021', 'high', 'ok', 'no', 0]
];

// --- EquityIQ Web App entry (required for Deploy → Web app) ---

/**
 * Google Apps Script Web App entry point. Must exist in the deployed project.
 * Router: WebAppApi.gs → handleEquityIQApiGet_(e)
 * @param {Object} e
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  if (typeof handleEquityIQApiGet_ === 'function') {
    return handleEquityIQApiGet_(e);
  }
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    error: 'EquityIQ API router missing. Paste WebAppApi.gs into this Apps Script project, Save, then create a new Web App deployment.',
    missing_file: 'WebAppApi.gs',
    missing_function: 'handleEquityIQApiGet_',
    deployed_actions_after_fix: [
      'health', 'top10', 'symbol', 'stock', 'macro', 'market_summary',
      'recommendation_history', 'recommendation_validation', 'backtest'
    ]
  })).setMimeType(ContentService.MimeType.JSON);
}

// --- Menu ---

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Stock Tracker')
    .addItem('Run full pipeline (all steps in order)', 'runStockTrackerFullPipelineMenu')
    .addSeparator()
    .addItem('Setup all sheet tabs', 'setupAllSheets')
    .addSeparator()
    .addItem('Import full NSE universe (EQ)', 'importNseSymbolList')
    .addItem('Import NSE EQUITY_L.csv from file…', 'importNseEquityCsvFromFileMenu')
    .addItem('Import NSE SME / Emerge list', 'importNseSmeSymbolList')
    .addItem('Classify cap segments', 'classifyCapSegments')
    .addItem('Import sample universe (3 stocks)', 'importSampleUniverse')
    .addItem('Import Screener CSV to Tab 6', 'importScreenerCsvToFundamentals')
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Data ingestion (NSE)')
        .addItem('Run ingestion v2 (full pipeline)', 'runDataIngestionV2Now')
        .addItem('Run ingestion now (routed v1/v2)', 'runDataIngestionNow')
        .addItem('View ingestion coverage %', 'viewIngestionCoverageReport')
        .addItem('Backfill bulk/block deals 30 days', 'backfillBulkBlockDeals30Days')
        .addItem('View last ingestion log', 'viewLastDataIngestionLog')
        .addItem('View last ingestion v2 log', 'viewLastDataIngestionV2Log')
    )
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Investment themes')
        .addItem('Apply theme tags to UNIVERSE', 'applyInvestmentThemeTagsMenu')
        .addItem('Preview themes (top names)', 'previewInvestmentThemes')
        .addItem('Seed Tab 20 THEME:* rows', 'seedInvestmentThemesTab20')
    )
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Theme intelligence')
        .addItem('Run Theme Intelligence Engine', 'runThemeIntelligenceEngineMenu')
        .addItem('Preview Top Themes / Winners / Conviction', 'previewThemeIntelligence')
    )
    .addSeparator()
    .addItem('Sync news sources to Tab 13', 'syncNewsSourcesToSheet')
    .addItem('Fetch RSS news', 'fetchNewsRss')
    .addItem('Tag news symbols', 'tagNewsSymbols')
    .addItem('Run news intelligence pipeline (Perplexity)', 'runNewsIntelligencePipeline')
    .addItem('View last news pipeline log', 'viewLastNewsPipelineLog')
    .addSeparator()
    .addItem('Rebuild scoring pipeline from UNIVERSE', 'rebuildScoringPipeline')
    .addItem('Sync Tab 10 from UNIVERSE only', 'syncScoringFromUniverse')
    .addSeparator()
    .addItem('Refresh watchlist prices', 'refreshWatchlistPrices')
    .addSeparator()
    .addItem('Open NSE filings helper', 'openNseFilingsHelper')
    .addItem('Compute scoring helpers', 'computeScoringHelpers')
    .addItem('Sync recommendations (Tab 11)', 'syncRankedWatchlist')
    .addItem('Audit Tab 11 recommendations', 'auditTab11Recommendations')
    .addItem('Audit last 100 recommendations (v2 filters)', 'auditLast100Recommendations')
    .addItem('Fix Tab 11 headers (keep data)', 'fixRankedWatchlistHeaders')
    .addItem('Parse announcement keywords', 'parseAnnouncementKeywords')
    .addSeparator()
    .addItem('Log test alert', 'logTestAlert')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Daily automation (Phase 6)')
        .addItem('Install triggers — 6 AM + 8 AM IST', 'installDailyAutomationTriggers')
        .addItem('Automation setup help', 'showAutomationSetupHelp')
        .addSeparator()
        .addItem('Run 6 AM refresh now', 'run6amRefreshNow')
        .addItem('Run 8 AM briefing now', 'run8amBriefingNow')
        .addItem('Preview briefing text', 'previewMorningBriefing')
        .addItem('Preview briefing JSON', 'previewMorningBriefJson')
        .addItem('Run daily maintenance (6 AM alias)', 'dailyMaintenance')
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Backtest (Phase 7)')
        .addItem('Run backtest engine', 'runBacktestEngine')
        .addItem('Snapshot all lists to Tab 22', 'snapshotAllBacktestLists')
        .addItem('Generate BACKTEST_V4 status (markdown)', 'generateBacktestV4StatusReport')
    )
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Recommendation history')
        .addItem('Snapshot history → Tab 37 (today)', 'snapshotRecommendationHistoryMenu')
        .addItem('Preview history JSON', 'previewRecommendationHistoryJson')
    )
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('Portfolio construction')
        .addItem('Build all capital models (Tab 30)', 'runPortfolioConstructionMenu')
        .addItem('Preview ₹10L model', 'previewPortfolioConstruction')
    )
    .addSeparator()
    .addItem('Preview institutional flow scores', 'previewInstitutionalFlowScores')
    .addItem('Preview technical momentum scores', 'previewTechnicalMomentumScores')
    .addItem('Preview data quality scores', 'previewDataQualityScores')
    .addSeparator()
    .addItem('Audit sector mapping', 'auditSectorMapping')
    .addItem('Repair sector mapping (Tab 1/19/20)', 'repairSectorMapping')
    .addItem('Preview alpha scores', 'previewAlphaScores')
    .addItem('Preview tiered conviction (Engine 3.1)', 'previewConvictionEngine3')
    .addItem('Run Peer Comparison Engine v2', 'runPeerComparisonEngineMenu')
    .addItem('Preview peer comparison', 'previewPeerComparison')
    .addItem('Run Risk Engine v2', 'runRiskEngineMenu')
    .addItem('Preview Risk Engine', 'previewRiskEngine')
    .addItem('Preview Analyst Note v2', 'previewAnalystNoteEngine')
    .addItem('Run Scoring Engine 2.1 validation', 'runScoringEngineForensicValidation')
    .addItem('Run full system audit', 'runFullSystemAudit')
    .addSeparator()
    .addItem('Show EquityIQ Web App URL', 'showEquityIQWebAppHelp')
    .addToUi();
}

// --- Setup ---

function setupAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  migrateLegacyAnalysisOutput_(ss);
  migrateRankedWatchlistHeaders_(ss);
  if (typeof ensureBacktestSheets_ === 'function') {
    ensureBacktestSheets_();
  }
  SHEET_DEFS.forEach(function(def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    } else {
      var existing = sheet.getRange(1, 1, 1, def.headers.length).getValues()[0];
      var mismatch = def.headers.some(function(h, i) {
        return String(existing[i] || '').trim() !== h;
      });
      if (mismatch) {
        sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      }
    }
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold');
  });
  seedMacroDashboard_(ss);
  seedMacroBeneficiaries_(ss);
  appendAlert('', 'setup', 'All sheet tabs initialized', 'system');
  SpreadsheetApp.getUi().alert('Setup complete', 'Tabs and headers are ready.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function seedMacroDashboard_(ss) {
  var sheet = ss.getSheetByName('8. MACRO DASHBOARD');
  if (!sheet || sheet.getLastRow() > 1) return;
  var rows = [
    ['USDINR', '=GOOGLEFINANCE("CURRENCY:USDINR")', '', '', '', ''],
    ['BRENT', '', '', '', '', 'Manual or Perplexity'],
    ['US10Y', '', '', '', '', ''],
    ['INDIA_VIX', '', '', '', '', ''],
    ['FII_NET', '', '', '', '', 'Manual NSE'],
    ['DII_NET', '', '', '', '', 'Manual NSE'],
    ['MACRO_VERDICT', '', '', '', '', 'Paste Section 1 output here']
  ];
  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
}

function seedMacroBeneficiaries_(ss) {
  var sheet = ss.getSheetByName('20. MACRO BENEFICIARIES');
  if (!sheet || sheet.getLastRow() > 1) return;
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var rows = [
    ['USDINR', '', '', '', 'IT|Pharma export', 'Importers|Oil marketing', today, 'Fill from Tab 8 + Section 12'],
    ['BRENT', '', '', '', 'OMCs|Aviation hurt', 'E&P|Gas utilities', today, ''],
    ['FII_FLOW', '', '', '', 'Financials|Large cap', 'Mid cap high beta', today, 'Manual NSE']
  ];
  sheet.getRange(2, 1, rows.length, 8).setValues(rows);
}

/**
 * Renames legacy ANALYSIS_OUTPUT tab to 21. ANALYSIS_OUTPUT.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function migrateLegacyAnalysisOutput_(ss) {
  var legacy = ss.getSheetByName('ANALYSIS_OUTPUT');
  var target = ss.getSheetByName('21. ANALYSIS_OUTPUT');
  if (legacy && !target) {
    legacy.setName('21. ANALYSIS_OUTPUT');
  }
}

/**
 * Rewrites row 1 on Tab 11 to match SHEET_DEFS without clearing data rows.
 * If columns were misaligned under legacy headers, run Sync recommendations (Tab 11) after fixing.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet=} ss
 */
function migrateRankedWatchlistHeaders_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sheet) return false;
  var headers = getSheetHeaders_('11. RANKED WATCHLIST');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  return true;
}

/** Menu: Fix Tab 11 headers (keep data) */
function fixRankedWatchlistHeaders() {
  var ok = migrateRankedWatchlistHeaders_(SpreadsheetApp.getActiveSpreadsheet());
  if (!ok) {
    SpreadsheetApp.getUi().alert('Tab 11 not found. Run Setup all sheet tabs first.');
    return;
  }
  SpreadsheetApp.getUi().alert(
    'Tab 11 headers updated',
    'Row 1 now matches list_name, rank, symbol, …\n\n' +
      'If data looked wrong before, run **Sync recommendations (Tab 11)** to rebuild rows.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// --- NSE import (full market) ---

function importNseSymbolList() {
  importNseEquityCsv_(NSE_EQUITY_CSV_URLS, false);
}

function importNseSmeSymbolList() {
  importNseEquityCsv_(NSE_SME_CSV_URLS, true);
}

/** Menu — upload EQUITY_L.csv when UrlFetch is blocked (HTTP 403/404). */
function importNseEquityCsvFromFileMenu() {
  showNseCsvUploadDialog_(false);
}

/** Menu — upload SME EQUITY_L.csv when available. */
function importNseSmeCsvFromFileMenu() {
  showNseCsvUploadDialog_(true);
}

/**
 * @param {boolean} forceSme
 */
function showNseCsvUploadDialog_(forceSme) {
  var html = HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><base target="_top"><style>body{font:13px Arial,sans-serif;padding:12px}' +
    'button{margin-top:10px;padding:8px 14px}</style></head><body>' +
    '<p><b>Import EQUITY_L.csv</b></p>' +
    '<p>Download from NSE → Securities available for trading (.csv), then choose the file here.</p>' +
    '<input type="file" id="f" accept=".csv,text/csv,text/plain">' +
    '<br><button onclick="go()">Import to UNIVERSE</button>' +
    '<p id="st" style="color:#666"></p>' +
    '<script>var SME=' + (forceSme ? 'true' : 'false') + ';' +
    'function go(){var f=document.getElementById("f").files[0];if(!f){alert("Choose EQUITY_L.csv");return;}' +
    'document.getElementById("st").textContent="Uploading…";var r=new FileReader();' +
    'r.onload=function(e){google.script.run.withSuccessHandler(function(n){document.getElementById("st").textContent=' +
    '"Done: "+n+" symbols. Close dialog and check UNIVERSE.";}).withFailureHandler(function(err){' +
    'document.getElementById("st").textContent="Error: "+err.message;}).importNseEquityFromUploadedCsv_(e.target.result,SME);};' +
    'r.readAsText(f);}</script></body></html>'
  ).setWidth(440).setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, forceSme ? 'Import NSE SME CSV' : 'Import NSE EQUITY_L.csv');
}

/**
 * Called from HTML file upload dialog.
 * @param {string} csvText
 * @param {boolean} forceSme
 * @return {number}
 */
function importNseEquityFromUploadedCsv_(csvText, forceSme) {
  return importNseEquityFromCsvText_(csvText, forceSme, 'file_upload');
}

/**
 * @param {string|Array<string>} urls
 * @param {boolean} forceSme
 */
function importNseEquityCsv_(urls, forceSme) {
  var ui = SpreadsheetApp.getUi();
  var csvText;
  try {
    csvText = fetchNseEquityCsvText_(urls);
  } catch (e) {
    appendAlert('', 'nse_import_failed', String(e.message), '1. UNIVERSE');
    ui.alert(
      'NSE import failed',
      'NSE blocked or moved the download URL (common from Google servers).\n\n' +
        '1. Open: ' + NSE_MANUAL_CSV_HELP_URL + '\n' +
        '2. Download **Securities available for Equity segment (.csv)**\n' +
        '3. Stock Tracker → **Import NSE EQUITY_L.csv from file…**\n' +
        '4. Then **Classify cap segments** (auto-runs after successful import)\n\n' +
        String(e.message),
      ui.ButtonSet.OK
    );
    return;
  }

  importNseEquityFromCsvText_(csvText, forceSme, 'url_fetch');
}

/**
 * @param {string|Array<string>} urls
 * @return {string}
 */
function fetchNseEquityCsvText_(urls) {
  var list = Array.isArray(urls) ? urls : [urls];
  var errors = [];
  Utilities.sleep(1500);
  for (var i = 0; i < list.length; i++) {
    var url = list[i];
    try {
      var resp = UrlFetchApp.fetch(url, {
        headers: FETCH_HEADERS,
        muteHttpExceptions: true,
        followRedirects: true
      });
      var code = resp.getResponseCode();
      if (code !== 200) {
        errors.push(url + ' → HTTP ' + code);
        continue;
      }
      var text = resp.getContentText('UTF-8');
      if (text && text.indexOf('SYMBOL') >= 0) {
        return text;
      }
      errors.push(url + ' → not a valid EQUITY_L CSV');
    } catch (fetchErr) {
      errors.push(url + ' → ' + String(fetchErr.message || fetchErr));
    }
    Utilities.sleep(1200);
  }
  throw new Error(errors.join('\n'));
}

/**
 * @param {string} csvText
 * @param {boolean} forceSme
 * @param {string=} source
 * @return {number}
 */
function importNseEquityFromCsvText_(csvText, forceSme, source) {
  var ui = SpreadsheetApp.getUi();
  var parsed = parseNseEquityCsv_(csvText, forceSme);
  if (parsed.length === 0) {
    ui.alert('No rows imported', 'Check CSV format or SERIES filter.', ui.ButtonSet.OK);
    return 0;
  }

  writeUniverseRows_(parsed, true);
  classifyCapSegments();
  appendAlert('', 'nse_import', 'Imported ' + parsed.length + ' symbols (' + (source || 'csv') + ')', '1. UNIVERSE');
  ui.alert(
    'Import complete',
    parsed.length + ' symbols written to UNIVERSE.\n\nRun **Rebuild scoring pipeline from UNIVERSE** to refresh Tab 10–11.',
    ui.ButtonSet.OK
  );
  return parsed.length;
}

/**
 * @param {string} csvText
 * @param {boolean} defaultSme
 * @return {Array<Array>}
 */
function parseNseEquityCsv_(csvText, defaultSme) {
  var lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  var headerLine = lines[0];
  var headers = parseCsvLine_(headerLine).map(function(h) {
    return String(h).replace(/^\uFEFF/, '').trim().toUpperCase();
  });

  var symIdx = headers.indexOf('SYMBOL');
  var nameIdx = headers.indexOf('NAME OF COMPANY');
  if (nameIdx < 0) nameIdx = headers.indexOf('NAME');
  var seriesIdx = headers.indexOf('SERIES');
  var isinIdx = headers.indexOf('ISIN NUMBER');
  if (isinIdx < 0) isinIdx = headers.indexOf('ISIN');

  if (symIdx < 0) return [];

  var equitySeries = { EQ: true, BE: true, BZ: true, SM: true, ST: true, IV: true, EQ1: true };
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var rows = [];
  var seen = {};

  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var cols = parseCsvLine_(line);
    if (cols.length <= symIdx) continue;

    var symbol = String(cols[symIdx] || '').trim();
    if (!symbol || seen[symbol]) continue;

    var series = seriesIdx >= 0 ? String(cols[seriesIdx] || '').trim().toUpperCase() : 'EQ';
    if (!defaultSme && !equitySeries[series]) continue;
    if (!defaultSme && series !== 'EQ' && series !== 'BE' && series !== 'BZ') {
      if (series !== 'SM' && series !== 'ST') continue;
    }

    var companyName = nameIdx >= 0 ? String(cols[nameIdx] || '').trim() : symbol;
    var isin = isinIdx >= 0 ? String(cols[isinIdx] || '').trim() : '';
    var isSme = defaultSme || detectSme_(series, companyName, symbol);

    seen[symbol] = true;
    rows.push(buildUniverseRow_(symbol, companyName, isin, series, isSme, today));
  }
  return rows;
}

/**
 * @param {string} symbol
 * @param {string} companyName
 * @param {string} isin
 * @param {string} series
 * @param {boolean} isSme
 * @param {string} today
 * @return {Array}
 */
function buildUniverseRow_(symbol, companyName, isin, series, isSme, today) {
  return [
    symbol, '', companyName, '', '', '',
    'unknown', 'Unclassified', isSme, series, 'NSE', isin,
    '', '', '', '', today, false
  ];
}

/**
 * @param {string} series
 * @param {string} companyName
 * @param {string} symbol
 * @return {boolean}
 */
function detectSme_(series, companyName, symbol) {
  var s = String(series || '').toUpperCase();
  var n = String(companyName || '').toUpperCase();
  if (s === 'SM' || s === 'ST' || s === 'SME' || s === 'EMERGE') return true;
  if (n.indexOf('(SME)') >= 0 || n.indexOf('SME PLATFORM') >= 0) return true;
  if (n.indexOf('EMERGE') >= 0) return true;
  return false;
}

/**
 * @param {Array<Array>} rows
 * @param {boolean} replace
 */
function writeUniverseRows_(rows, replace) {
  var sheet = getOrCreateSheet_('1. UNIVERSE');
  var headers = SHEET_DEFS[0].headers;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var startRow = 2;
  if (!replace && sheet.getLastRow() > 1) {
    startRow = sheet.getLastRow() + 1;
  } else if (replace) {
    clearDataBelowHeader_(sheet, headers.length);
    startRow = 2;
  }

  if (rows.length > 0) {
    sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
  }
}

function importSampleUniverse() {
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var rows = SAMPLE_UNIVERSE.map(function(r) {
    var row = r.slice();
    row.push(today, false);
    return row;
  });
  writeUniverseRows_(rows, true);
  classifyCapSegments();
  rebuildScoringPipeline(true);
  SpreadsheetApp.getUi().alert(
    'Sample universe imported (RELIANCE, TCS, INFY). Scoring pipeline applied to Tab 10–11.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// --- Cap classification ---

function classifyCapSegments() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('1. UNIVERSE');
  if (!sheet || sheet.getLastRow() < 2) return;

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(2, 1, lastRow, 18).getValues();
  var updated = 0;

  for (var i = 0; i < data.length; i++) {
    var mcapRaw = data[i][5];
    var mcap = parseFloat(String(mcapRaw).replace(/,/g, ''));
    var series = String(data[i][9] || '').trim();
    var companyName = String(data[i][2] || '');
    var isSme = data[i][8] === true || data[i][8] === 'TRUE' || data[i][8] === 'true';

    if (detectSme_(series, companyName, data[i][0])) {
      isSme = true;
      data[i][8] = true;
      if (!series || series === 'EQ') data[i][9] = 'SME';
    }

    var seg = 'unknown';
    var bucket = 'Unclassified';
    if (!isNaN(mcap) && mcap > 0) {
      if (mcap >= CAP_LARGE_MIN_CR) {
        seg = 'large';
        bucket = 'Large-cap';
      } else if (mcap >= CAP_MID_MIN_CR) {
        seg = 'mid';
        bucket = 'Mid-cap';
      } else if (mcap >= CAP_SMALL_MIN_CR) {
        seg = 'small';
        bucket = 'Small-cap';
      } else {
        seg = 'micro';
        bucket = 'Micro-cap';
      }
    } else if (isSme) {
      bucket = 'SME / Emerge';
    }

    data[i][6] = seg;
    data[i][7] = bucket;
    data[i][8] = isSme;
    updated++;
  }

  sheet.getRange(2, 1, data.length, 18).setValues(data);
  appendAlert('', 'classify_caps', 'Classified ' + updated + ' universe rows', '1. UNIVERSE');
}

// --- News sources & RSS ---

function syncNewsSourcesToSheet() {
  var sheet = getOrCreateSheet_('13. NEWS SOURCES');
  var headers = getSheetHeaders_('13. NEWS SOURCES');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var rows = NEWS_SOURCES.map(function(s) {
    return [
      s.source_id, s.name, s.tier, s.channel_type, s.geography, s.rss_url || '',
      s.web_domain || '', s.enabled !== false, s.refresh_cadence || '', '', s.notes || ''
    ];
  });
  clearDataBelowHeader_(sheet, headers.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function fetchNewsRss() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName('13. NEWS SOURCES');
  var newsSheet = getOrCreateSheet_('7. NEWS FLOW');
  if (!sourceSheet) {
    syncNewsSourcesToSheet();
    sourceSheet = ss.getSheetByName('13. NEWS SOURCES');
  }

  var existingUrls = loadExistingNewsUrls_(newsSheet);
  var itemsAdded = 0;
  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) return;

  var sources = sourceSheet.getRange(2, 1, lastRow, 11).getValues();
  var now = new Date();
  var ingested = Utilities.formatDate(now, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");

  for (var s = 0; s < sources.length && itemsAdded < RSS_MAX_ITEMS_PER_RUN; s++) {
    var enabled = sources[s][7];
    if (enabled === false || enabled === 'FALSE' || enabled === 'false') continue;
    var rssUrl = String(sources[s][5] || '').trim();
    if (!rssUrl) continue;

    var sourceName = sources[s][1];
    var tier = sources[s][2];
    var channelType = sources[s][3];
    var geography = sources[s][4];
    var sourceId = sources[s][0];

    try {
      var resp = UrlFetchApp.fetch(rssUrl, { headers: FETCH_HEADERS, muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) {
        appendAlert('', 'rss_error', sourceId + ': HTTP ' + resp.getResponseCode(), '13. NEWS SOURCES');
        Utilities.sleep(RSS_DELAY_MS);
        continue;
      }
      var items = parseRssFeed_(resp.getContentText());
      for (var j = 0; j < items.length && itemsAdded < RSS_MAX_ITEMS_PER_RUN; j++) {
        var item = items[j];
        if (!item.url || existingUrls[item.url]) continue;
        existingUrls[item.url] = true;
        var row = [
          item.published || ingested, ingested, item.title || '', item.summary || '', item.url,
          sourceName, tier, channelType, geography, 'en', '', '', '',
          geography === 'india' ? 'direct' : 'indirect', 'medium', 'neutral', '', 'macro',
          false, '', 'rss_' + Utilities.formatDate(now, 'Asia/Kolkata', 'yyyyMMdd')
        ];
        newsSheet.appendRow(row);
        itemsAdded++;
      }
      sourceSheet.getRange(s + 2, 10).setValue(ingested);
    } catch (err) {
      appendAlert('', 'rss_error', sourceId + ': ' + err.message, '13. NEWS SOURCES');
    }
    Utilities.sleep(RSS_DELAY_MS);
  }

  appendAlert('', 'rss_fetch', 'Added ' + itemsAdded + ' news items', '7. NEWS FLOW');
  checkHighMaterialityNewsAlerts();
}

/**
 * @param {string} xml
 * @return {Array<{title:string,url:string,summary:string,published:string}>}
 */
function parseRssFeed_(xml) {
  var items = [];
  try {
    var doc = XmlService.parse(xml);
    var root = doc.getRootElement();
    var channel = root.getChild('channel');
    if (channel) {
      channel.getChildren('item').forEach(function(item) {
        items.push(extractRssItem_(item));
      });
      return items;
    }
    var atomNs = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    root.getChildren('entry', atomNs).forEach(function(entry) {
      items.push(extractAtomEntry_(entry, atomNs));
    });
  } catch (e) {
    return items;
  }
  return items;
}

function extractRssItem_(item) {
  var title = childText_(item, 'title');
  var link = childText_(item, 'link');
  if (!link) {
    var linkEl = item.getChild('link');
    if (linkEl && linkEl.getAttribute('href')) link = linkEl.getAttribute('href').getValue();
  }
  return {
    title: title,
    url: link,
    summary: childText_(item, 'description') || childText_(item, 'summary'),
    published: childText_(item, 'pubDate') || childText_(item, 'published')
  };
}

function extractAtomEntry_(entry, atomNs) {
  var title = childTextNs_(entry, 'title', atomNs);
  var summary = childTextNs_(entry, 'summary', atomNs) || childTextNs_(entry, 'content', atomNs);
  var link = '';
  var links = entry.getChildren('link', atomNs);
  for (var i = 0; i < links.length; i++) {
    var rel = links[i].getAttribute('rel');
    if (!rel || rel.getValue() === 'alternate') {
      link = links[i].getAttribute('href').getValue();
      break;
    }
  }
  return {
    title: title,
    url: link,
    summary: summary ? String(summary).substring(0, 500) : '',
    published: childTextNs_(entry, 'updated', atomNs) || childTextNs_(entry, 'published', atomNs)
  };
}

function childText_(parent, name) {
  var el = parent.getChild(name);
  return el ? el.getText() : '';
}

function childTextNs_(parent, name, ns) {
  var el = parent.getChild(name, ns);
  return el ? el.getText() : '';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} newsSheet
 * @return {Object}
 */
function loadExistingNewsUrls_(newsSheet) {
  var urls = {};
  if (!newsSheet || newsSheet.getLastRow() < 2) return urls;
  var urlCol = 5;
  var vals = newsSheet.getRange(2, urlCol, newsSheet.getLastRow(), urlCol).getValues();
  vals.forEach(function(r) {
    if (r[0]) urls[String(r[0])] = true;
  });
  return urls;
}

function tagNewsSymbols() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var newsSheet = ss.getSheetByName('7. NEWS FLOW');
  var uniSheet = ss.getSheetByName('1. UNIVERSE');
  if (!newsSheet || !uniSheet || newsSheet.getLastRow() < 2 || uniSheet.getLastRow() < 2) return;

  var universe = uniSheet.getRange(2, 1, uniSheet.getLastRow(), 3).getValues();
  var newsData = newsSheet.getRange(2, 1, newsSheet.getLastRow(), 21).getValues();
  var tagged = 0;

  for (var i = 0; i < newsData.length; i++) {
    if (newsData[i][10]) continue;
    var headline = String(newsData[i][2] || '') + ' ' + String(newsData[i][3] || '');
    var upper = headline.toUpperCase();
    for (var u = 0; u < universe.length; u++) {
      var sym = String(universe[u][0] || '').trim();
      var name = String(universe[u][2] || '').trim();
      if (!sym && !name) continue;
      if (name.length > 4 && upper.indexOf(name.toUpperCase()) >= 0) {
        newsData[i][10] = sym;
        tagged++;
        break;
      }
      if (sym && upper.indexOf(sym.toUpperCase()) >= 0) {
        newsData[i][10] = sym;
        tagged++;
        break;
      }
    }
  }

  newsSheet.getRange(2, 1, newsData.length, 21).setValues(newsData);
  appendAlert('', 'tag_news', 'Tagged ' + tagged + ' headlines with symbols', '7. NEWS FLOW');
}

// --- Prices ---

function refreshWatchlistPrices() {
  var n = refreshWatchlistPricesSilent_();
  if (n === 0) {
    SpreadsheetApp.getUi().alert(
      'No symbols to refresh. Run Rebuild scoring pipeline from UNIVERSE or import UNIVERSE first.'
    );
    return;
  }
  appendAlert('', 'price_refresh', 'Refreshed ' + n + ' symbols', '2. PRICE & TECHNICALS');
}

/**
 * Writes Tab 2 GOOGLEFINANCE rows for top eligible / watchlist symbols (cap 100).
 * @return {number}
 */
function refreshWatchlistPricesSilent_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var symbols = collectWatchlistSymbols_(ss);
  if (symbols.length === 0) return 0;

  var priceSheet = getOrCreateSheet_('2. PRICE & TECHNICALS');
  var headers = SHEET_DEFS[1].headers;
  priceSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  clearDataBelowHeader_(priceSheet, headers.length);

  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var rows = symbols.map(function(sym, idx) {
    var rn = idx + 2;
    var q = 'NSE:' + sym;
    var formulaPrice = '=IFERROR(GOOGLEFINANCE("' + q + '","price"),"")';
    var formulaChg = '=IFERROR(GOOGLEFINANCE("' + q + '","changepct"),"")';
    var formulaVol = '=IFERROR(GOOGLEFINANCE("' + q + '","volume"),"")';
    var formula50 = '=IFERROR(GOOGLEFINANCE("' + q + '","price",TODAY()-55,TODAY()-5),"")';
    var formula200 = '=IFERROR(GOOGLEFINANCE("' + q + '","price",TODAY()-210,TODAY()-5),"")';
    var vs50 = '=IFERROR(IF(AND(B' + rn + '>0,F' + rn + '>0),(B' + rn + '/INDEX(F' + rn + ',1,2)-1)*100,""),"")';
    var vs200 = '=IFERROR(IF(AND(B' + rn + '>0,G' + rn + '>0),(B' + rn + '/INDEX(G' + rn + ',1,2)-1)*100,""),"")';
    var formula52 = '=IFERROR(GOOGLEFINANCE("' + q + '","high52"),"")';
    var formulaVolAvg = '=IFERROR(AVERAGE(GOOGLEFINANCE("' + q + '","volume",TODAY()-25,TODAY())),"")';
    var formulaRsi = '=IFERROR(IF(AND(B' + rn + '>0,L' + rn + '<>""),MIN(100,MAX(0,50+(K' + rn + '*0.8)+(L' + rn + '*0.4)+(C' + rn + '*4))),"")';
    return [sym, formulaPrice, formulaChg, formulaVol, '', formula50, formula200, formulaRsi, '', '',
      vs50, vs200, formula52, formulaVolAvg, '', today];
  });

  priceSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return symbols.length;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<string>}
 */
function collectWatchlistSymbols_(ss) {
  var seen = {};
  var out = [];

  var score = ss.getSheetByName('10. SCORING MODEL');
  if (score && score.getLastRow() >= 2) {
    var svals = score.getRange(2, 1, score.getLastRow() - 1, 1).getValues();
    svals.forEach(function(r) {
      var sym = String(r[0] || '').trim();
      if (sym && !seen[sym]) {
        seen[sym] = true;
        out.push(sym);
      }
    });
    if (out.length >= PRICE_REFRESH_MAX_SYMBOLS) {
      return out.slice(0, PRICE_REFRESH_MAX_SYMBOLS);
    }
  }

  var watch = ss.getSheetByName('11. RANKED WATCHLIST');
  if (watch && watch.getLastRow() >= 2) {
    var wvals = watch.getRange(2, 3, watch.getLastRow() - 1, 1).getValues();
    wvals.forEach(function(r) {
      var sym = String(r[0] || '').trim();
      if (sym && !seen[sym]) {
        seen[sym] = true;
        out.push(sym);
      }
    });
  }

  if (out.length > 0) {
    return out.slice(0, PRICE_REFRESH_MAX_SYMBOLS);
  }

  var top = getTopScoringSymbols_(ss, PRICE_REFRESH_MAX_SYMBOLS, false);
  if (top.length > 0) return top;

  getEligibleUniverseRows_(ss).slice(0, PRICE_REFRESH_MAX_SYMBOLS).forEach(function(u) {
    if (u.symbol && !seen[u.symbol]) {
      seen[u.symbol] = true;
      out.push(u.symbol);
    }
  });
  return out.slice(0, PRICE_REFRESH_MAX_SYMBOLS);
}

// --- Alerts & maintenance ---

function appendAlert(symbol, triggerType, detail, sourceTab) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('12. ALERTS LOG');
  if (!sheet) return;
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 5).setValues([['timestamp', 'symbol', 'trigger_type', 'detail', 'source_tab']]);
  }
  var ts = Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  sheet.appendRow([ts, symbol || '', triggerType || '', detail || '', sourceTab || '']);
}

function logTestAlert() {
  appendAlert('TEST', 'system_test', 'Manual test alert from Stock Tracker menu', '12. ALERTS LOG');
  SpreadsheetApp.getUi().alert('Test alert logged on Tab 12.');
}

function checkHighMaterialityNewsAlerts() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('7. NEWS FLOW');
  if (!sheet || sheet.getLastRow() < 2) return;

  var data = sheet.getRange(2, 1, sheet.getLastRow(), 21).getValues();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1);

  for (var i = 0; i < data.length; i++) {
    var mat = String(data[i][14] || '').toLowerCase();
    var rel = String(data[i][13] || '').toLowerCase();
    if (mat !== 'high' && rel !== 'direct') continue;
    var sym = data[i][10] || '';
    var headline = data[i][2] || '';
    appendAlert(sym, 'high_materiality_news', String(headline).substring(0, 200), '7. NEWS FLOW');
  }
}

// Phase 6: dailyMaintenance, installDailyTriggers → DailyAutomation.gs

// --- Helpers ---

/**
 * Clears cells below the frozen header (row 1) without deleteRows.
 * Avoids: "Sorry, it is not possible to delete all non-frozen rows."
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number=} numCols
 */
function clearDataBelowHeader_(sheet, numCols) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var cols = numCols || sheet.getLastColumn();
  if (cols < 1) cols = 1;
  sheet.getRange(2, 1, lastRow, cols).clearContent();
}

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    var def = SHEET_DEFS.filter(function(d) { return d.name === name; })[0];
    sheet = ss.insertSheet(name);
    if (def) {
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * @param {string} line
 * @return {Array<string>}
 */
function parseCsvLine_(line) {
  var result = [];
  var cur = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line.charAt(i);
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// --- Scoring pipeline (UNIVERSE-driven) ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function getEligibleUniverseRows_(ss) {
  var uni = ss.getSheetByName('1. UNIVERSE');
  if (!uni || uni.getLastRow() < 2) return [];

  var lastRow = uni.getLastRow();
  var data = uni.getRange(2, 1, lastRow, 18).getValues();
  var out = [];
  data.forEach(function(r) {
    var row = universeRowToObject_(r);
    if (isUniverseEligible_(row)) out.push(row);
  });
  return out;
}

/**
 * @param {Array} r
 * @return {Object}
 */
function universeRowToObject_(r) {
  return {
    symbol: String(r[0] || '').trim(),
    symbolBse: String(r[1] || '').trim(),
    companyName: String(r[2] || '').trim(),
    sector: String(r[3] || '').trim(),
    themeTags: String(r[4] || '').trim(),
    marketCapCr: parseFloat(String(r[5] || '').replace(/,/g, '')),
    capSegment: String(r[6] || '').trim().toLowerCase(),
    isSme: r[8] === true || r[8] === 'TRUE' || String(r[8]).toLowerCase() === 'true',
    liquidityFlag: String(r[12] || '').trim().toLowerCase(),
    auditorFlag: String(r[13] || '').trim().toLowerCase(),
    ncltFlag: String(r[14] || '').trim().toLowerCase(),
    pledgePct: parseFloat(String(r[15] || '').replace(/,/g, ''))
  };
}

/**
 * @param {Object} row
 * @return {boolean}
 */
function isUniverseEligible_(row) {
  if (!row.symbol) return false;

  if (row.ncltFlag === 'yes' || row.ncltFlag === 'y' || row.ncltFlag === 'true') return false;
  if (row.auditorFlag === 'qualified' || row.auditorFlag === 'bad' || row.auditorFlag === 'adverse') {
    return false;
  }

  if (!isNaN(row.pledgePct) && row.pledgePct >= MAX_PLEDGE_PCT) return false;

  var mcapOk = !isNaN(row.marketCapCr) && row.marketCapCr >= MIN_MARKET_CAP_CR;
  var capSeg = row.capSegment;
  var liquidityOk = row.liquidityFlag === 'high';
  var largeMid = capSeg === 'large' || capSeg === 'mid';
  var highMcap = !isNaN(row.marketCapCr) && row.marketCapCr >= HIGH_LIQUIDITY_MCAP_CR;

  if (capSeg === 'micro') {
    if (isNaN(row.marketCapCr) || row.marketCapCr < MIN_MARKET_CAP_CR) return false;
    if (row.isSme) return false;
  }

  if (mcapOk) return true;
  if (liquidityOk || largeMid || highMcap) return true;

  if (isNaN(row.marketCapCr) || row.marketCapCr === 0) {
    if (liquidityOk || largeMid) return true;
    if (ALLOW_UNIVERSE_WITHOUT_MCAP && !row.isSme) return true;
    return false;
  }

  return false;
}

/**
 * @param {Object} row
 * @return {Object}
 */
function universeHardFlags_(row) {
  var pledgeGt50 = !isNaN(row.pledgePct) && row.pledgePct > 50;
  return {
    pledgeGt50: pledgeGt50,
    pumpFlag: false,
    sebiInvestigation: false,
    cfoPatDivergence: false,
    mgmtExits: false,
    exclude: pledgeGt50
  };
}

/**
 * Preserves existing Tab 10 sub-scores (cols C–L) when symbol already scored.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} scoreSheet
 * @return {Object}
 */
function loadExistingScoringBySymbol_(scoreSheet) {
  var map = {};
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return map;
  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    map[sym] = r.slice();
  });
  return map;
}

/**
 * @param {Object} u
 * @param {Object} flags
 * @param {Array|null} existing
 * @param {string} today
 * @return {Array}
 */
function buildScoringRowFromUniverse_(u, flags, existing, today) {
  var row = existing ? existing.slice() : new Array(SCORING_NUM_COLS);

  row[0] = u.symbol;
  row[1] = u.companyName;

  if (!existing) {
    for (var c = 2; c <= 11; c++) row[c] = 0; // C–J components + K–L reserved
    row[12] = 0;
    row[13] = 0;
    row[14] = 0;
    row[15] = false;
    row[16] = 0;
    row[17] = '';
    row[18] = 0;
    row[19] = false;
    row[20] = false;
    row[21] = false;
    row[22] = false;
    row[23] = '';
    row[30] = 0;
    row[31] = 0;
    row[33] = false;
    row[34] = '';
    row[35] = 0;
    row[36] = 0;
    row[37] = 0;
    row[38] = '';
    row[39] = '';
    row[40] = 0;
    row[41] = 0;
  }

  row[24] = flags.pledgeGt50;
  row[25] = flags.pumpFlag;
  row[26] = flags.sebiInvestigation;
  row[27] = flags.cfoPatDivergence;
  row[28] = flags.mgmtExits;
  row[29] = flags.exclude;
  row[32] = today;
  reconcileConvictionColumn_(row);

  return row;
}

/**
 * Clears stale conviction_total when C–J sum to 0 but column M still holds an old number.
 * @param {Array} row
 */
function reconcileConvictionColumn_(row) {
  if (!row || row.length < 13) return;
  if (typeof USE_CONVICTION_ENGINE_3_ !== 'undefined' && USE_CONVICTION_ENGINE_3_ &&
    typeof getConvictionEngine3Opportunity_ === 'function') {
    var opp = getConvictionEngine3Opportunity_(row);
    if (opp !== null) {
      if (typeof row[12] !== 'string' || String(row[12]).indexOf('=') !== 0) {
        row[12] = opp;
      }
      return;
    }
  }
  var computed = calculateConvictionFromRow_(row);
  var stored = num_(row[12]);
  if (computed === 0 && stored > 0) {
    row[12] = 0;
  } else if (typeof row[12] !== 'string' || String(row[12]).indexOf('=') !== 0) {
    row[12] = computed;
  }
}

function syncScoringFromUniverse() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var eligible = getEligibleUniverseRows_(ss);
  if (eligible.length === 0) {
    SpreadsheetApp.getUi().alert(
      'No eligible symbols',
      'Check UNIVERSE: need rows with market_cap_cr >= ' + MIN_MARKET_CAP_CR +
        ' (merge Screener) or set ALLOW_UNIVERSE_WITHOUT_MCAP=true for provisional sync.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return 0;
  }

  var scoreSheet = getOrCreateSheet_('10. SCORING MODEL');
  var headers = getSheetHeaders_('10. SCORING MODEL');
  scoreSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var existingMap = loadExistingScoringBySymbol_(scoreSheet);
  clearDataBelowHeader_(scoreSheet, headers.length);

  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var rows = eligible.map(function(u) {
    var flags = universeHardFlags_(u);
    return buildScoringRowFromUniverse_(u, flags, existingMap[normalizeSymbolKey_(u.symbol)] || null, today);
  });

  if (rows.length) {
    scoreSheet.getRange(2, 1, rows.length, SCORING_NUM_COLS).setValues(rows);
    applyConvictionFormulas_(scoreSheet, rows.length);
  }

  appendAlert('', 'sync_scoring', eligible.length + ' rows from UNIVERSE on Tab 10', '10. SCORING MODEL');
  return rows.length;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} numRows
 */
function applyConvictionFormulas_(sheet, numRows) {
  if (numRows < 1) return;
  if (typeof USE_CONVICTION_ENGINE_3_ !== 'undefined' && USE_CONVICTION_ENGINE_3_) {
    return;
  }
  var c = CONVICTION_CAP;
  var formulas = [];
  for (var i = 0; i < numRows; i++) {
    var r = i + 2;
    formulas.push([
      '=ROUND(MIN(C' + r + ',' + c.fundamentals + ')+MIN(D' + r + ',' + c.valuation +
      ')+MIN(E' + r + ',' + c.growth + ')+MIN(F' + r + ',' + c.financial_strength +
      ')+MIN(G' + r + ',' + c.sector_strength + ')+MIN(H' + r + ',' + c.news_events +
      ')+MIN(I' + r + ',' + c.technical_momentum + ')+MIN(J' + r + ',' + c.institutional_flow + '),0)'
    ]);
  }
  sheet.getRange(2, 13, numRows, 1).setFormulas(formulas);
}

/**
 * @param {Array<Array>} data
 */
function applyConvictionTotalsInScript_(data) {
  if (typeof USE_CONVICTION_ENGINE_3_ !== 'undefined' && USE_CONVICTION_ENGINE_3_) {
    return;
  }
  for (var i = 0; i < data.length; i++) {
    data[i][12] = calculateConvictionFromRow_(data[i]);
  }
}

/**
 * @param {Array} r
 * @return {number}
 */
function calculateConvictionFromRow_(r) {
  if (typeof getConvictionEngine3Opportunity_ === 'function') {
    var opp = getConvictionEngine3Opportunity_(r);
    if (opp !== null) return opp;
  }
  var c = CONVICTION_CAP;
  var total = Math.min(num_(r[2]), c.fundamentals) + Math.min(num_(r[10]), c.business_moat) +
    Math.min(num_(r[3]), c.valuation) +
    Math.min(num_(r[4]), c.growth) + Math.min(num_(r[5]), c.financial_strength) +
    Math.min(num_(r[6]), c.sector_strength) + Math.min(num_(r[7]), c.news_events) +
    Math.min(num_(r[8]), c.technical_momentum) + Math.min(num_(r[9]), c.institutional_flow);
  return Math.round(total);
}

/**
 * Auto-suggested sub-scores from helper columns (capped). Perplexity/manual edits preserved if higher.
 * @param {Array<Array>} data
 * @param {Object=} sectorLookup
 * @param {Object=} universeBySym
 */
function applyAutoSubScores_(data, sectorLookup, universeBySym, eventAgeBySym) {
  if (!APPLY_AUTO_SUB_SCORES) return;
  sectorLookup = sectorLookup || {};
  universeBySym = universeBySym || {};
  eventAgeBySym = eventAgeBySym || {};

  var c = CONVICTION_CAP;
  var logSamples = [];
  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;

    var filingsN = num_(data[i][13]);
    var orderN = num_(data[i][14]);
    var promoterBuy = data[i][15] === true || data[i][15] === 'TRUE';
    var revN = num_(data[i][16]);
    var sectorRank = num_(data[i][17]);
    var sectorInfo = resolveSectorStrengthForSymbol_(sym, universeBySym, sectorLookup);
    if ((!sectorRank || sectorRank <= 0) && sectorInfo && sectorInfo.rank > 0) {
      sectorRank = sectorInfo.rank;
      data[i][17] = sectorInfo.rank;
    }

    var newsBefore = num_(data[i][7]);
    var sectorBefore = num_(data[i][6]);
    var sugSector = scoreSectorStrengthSuggestion_(sectorInfo, sectorRank);
    var eventDecay = eventAgeDecayMultiplier_(eventAgeBySym[sym]);
    var sugNews = scoreNewsEventsFromSignals_(orderN, filingsN, promoterBuy, revN, eventDecay);

    data[i][7] = Math.max(newsBefore, sugNews);
    data[i][6] = Math.max(sectorBefore, sugSector);

    if (logSamples.length < 8 && (orderN > 0 || filingsN > 0 || sectorRank > 0 || sugSector > 0)) {
      logSamples.push({
        symbol: sym,
        N: filingsN, O: orderN, R: sectorRank,
        sectorKey: (universeBySym[sym] || {}).sectorKey || '',
        H_news_before: newsBefore, H_news_after: data[i][7],
        G_sector_before: sectorBefore, G_sector_after: data[i][6],
        M_after: calculateConvictionFromRow_(data[i])
      });
    }
  }
  if (logSamples.length) {
    Logger.log('applyAutoSubScores_: samples=' + JSON.stringify(logSamples));
  }
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} limit
 * @param {boolean} includeExcluded
 * @return {Array<string>}
 */
function getTopScoringSymbols_(ss, limit, includeExcluded) {
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return [];

  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  var rows = [];
  data.forEach(function(r) {
    var sym = String(r[0] || '').trim();
    if (!sym) return;
    if (!includeExcluded && (r[29] === true || r[29] === 'TRUE')) return;
    rows.push({ symbol: sym, conviction: num_(r[12]) });
  });
  rows.sort(function(a, b) { return b.conviction - a.conviction; });
  return rows.slice(0, limit).map(function(x) { return x.symbol; });
}

function syncRankedWatchlist() {
  return generateRecommendations_();
}

/**
 * Builds all six recommendation lists on Tab 11 from Tab 10 + event tabs.
 * @return {number}
 */
function generateRecommendations_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('Tab 10 empty. Run **Rebuild scoring pipeline from UNIVERSE** first.');
    return 0;
  }

  var universeMap = buildUniverseLookup_(ss);
  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  var candidates = data.map(function(r) {
    return buildScoringCandidate_(r, universeMap);
  }).filter(function(c) {
    return c.symbol && !c.excluded;
  });
  if (typeof enrichCandidatesWithNewsCounts_ === 'function') {
    enrichCandidatesWithNewsCounts_(candidates, buildNewsArticleCountBySymbol_(ss));
  }
  var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
  candidates.forEach(function(c) {
    var p = prices[c.symbol];
    if (p) c.priceAgeDays = p.ageDays || 0;
  });

  var macroRows = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  var sectorLookup = buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH'));
  var out = [];
  var refreshed = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

  RECOMMENDATION_LIST_DEFS.forEach(function(listDef) {
    var picked = pickRecommendationCandidates_(candidates, listDef.filter, macroRows, sectorLookup, 10);
    var rows = typeof finalizeRecommendationPicksWithAnalystNotes_ === 'function' ?
      finalizeRecommendationPicksWithAnalystNotes_(picked, candidates, listDef, macroRows, sectorLookup, 10) :
      null;

    if (rows && rows.length) {
      rows.forEach(function(row, idx) {
        var nar = row.narrative;
        var c = row.candidate;
        out.push([
          listDef.name,
          idx + 1,
          c.symbol,
          c.companyName,
          c.sector,
          num_(c.opportunityRank) || c.conviction,
          nar.bull,
          nar.bear,
          nar.catalyst,
          nar.horizon,
          nar.confidence,
          nar.evidence,
          refreshed
        ]);
      });
    } else {
      Logger.log('generateRecommendations_: analyst note engine unavailable for ' + listDef.name);
    }
  });

  if (typeof appendThemeIntelligenceTab11Lists_ === 'function') {
    appendThemeIntelligenceTab11Lists_(out, ss, refreshed);
  }
  if (typeof appendSmeOpportunitiesToTab11_ === 'function') {
    appendSmeOpportunitiesToTab11_(out, ss, refreshed);
  }
  if (typeof appendIpoIntelligenceToTab11_ === 'function') {
    appendIpoIntelligenceToTab11_(out, ss, refreshed);
  }

  var watchSheet = getOrCreateSheet_('11. RANKED WATCHLIST');
  var headers = getSheetHeaders_('11. RANKED WATCHLIST');
  watchSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  clearDataBelowHeader_(watchSheet, headers.length);

  if (out.length) {
    watchSheet.getRange(2, 1, out.length, headers.length).setValues(out);
  }

  appendAlert('', 'sync_recommendations', out.length + ' recommendation rows', '11. RANKED WATCHLIST');
  return out.length;
}

/**
 * @param {Array} r
 * @return {string}
 */
function pickHorizonLabel_(r) {
  if (r[19] === true || r[19] === 'TRUE') return '1w';
  if (r[20] === true || r[20] === 'TRUE') return '1m';
  if (r[21] === true || r[21] === 'TRUE') return '3m';
  if (r[22] === true || r[22] === 'TRUE') return '6-12m';
  return '';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildUniverseLookup_(ss) {
  var map = {};
  getEligibleUniverseRows_(ss).forEach(function(u) {
    map[u.symbol] = u;
  });
  var uni = ss.getSheetByName('1. UNIVERSE');
  if (uni && uni.getLastRow() >= 2) {
    var uNum = uni.getLastRow() - 1;
    uni.getRange(2, 1, uNum, 18).getValues().forEach(function(r) {
      var u = universeRowToObject_(r);
      if (u.symbol) map[u.symbol] = u;
    });
  }
  return map;
}

/** Tab 21 optional — evidence merged into Tab 11; pipeline does not write stubs. */
function syncAnalysisOutput() {
  appendAlert('', 'sync_analysis_skip',
    'Tab 21 not auto-written; use Tab 11 evidence column or paste Section 4/5 manually',
    '21. ANALYSIS_OUTPUT');
  return 0;
}

/**
 * @param {boolean=} silent
 */
function rebuildScoringPipeline(silent) {
  var n = syncScoringFromUniverse();
  if (typeof applyInvestmentThemeTagsToUniverse_ === 'function') {
    try {
      applyInvestmentThemeTagsToUniverse_(SpreadsheetApp.getActiveSpreadsheet());
    } catch (themeErr) {
      Logger.log('applyInvestmentThemeTags: ' + themeErr);
    }
  }
  if (n === 0) {
    if (!silent) {
      SpreadsheetApp.getUi().alert('Pipeline stopped: no eligible UNIVERSE rows.');
    }
    return;
  }

  refreshWatchlistPricesSilent_();
  computeHelperSignalsInternal_();
  applyNewsFlowToScores_();
  populateQuantitativeScores_();
  applyAutoSubScoresAndRefreshTotals_();
  if (typeof runThemeIntelligenceEngine_ === 'function') {
    try { runThemeIntelligenceEngine_(SpreadsheetApp.getActiveSpreadsheet()); } catch (tiErr) {
      Logger.log('theme intelligence: ' + tiErr);
    }
  }
  if (typeof applyRiskEngineToScoreSheet_ === 'function') {
    try { applyRiskEngineToScoreSheet_(SpreadsheetApp.getActiveSpreadsheet()); } catch (riskErr) {
      Logger.log('risk engine: ' + riskErr);
    }
  }
  generateRecommendations_();

  appendAlert('', 'rebuild_pipeline', n + ' symbols through Tab 10→11 recommendations', 'system');
  if (!silent) {
    SpreadsheetApp.getUi().alert(
      'Scoring pipeline complete',
      n + ' eligible symbols on Tab 10.\nTab 11: six Top-10 recommendation lists.\n\nImport Screener CSV to Tab 6 for moat/financials/valuation; Tab 4 for institutional flow.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function applyAutoSubScoresAndRefreshTotals_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return;

  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  var sectorLookup = buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH'));
  var universeBySym = buildUniverseBySymbol_(loadSheetData_(ss, '1. UNIVERSE'));
  var macroRows = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  var eventAgeBySym = buildLatestFilingAgeBySymbol_(loadSheetData_(ss, '15. FILINGS'));
  applyMacroBeneficiariesToData_(data, macroRows, universeBySym, sectorLookup);
  if (typeof applyGeopoliticsFlagsToData_ === 'function') {
    applyGeopoliticsFlagsToData_(data, loadSheetData_(ss, '9. GEOPOLITICS FLAGS'), universeBySym);
  }
  applyAutoSubScores_(data, sectorLookup, universeBySym, eventAgeBySym);
  applyScoringDataMetrics_(data,
    buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS')),
    buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS')),
    buildUniverseBySymbol_(loadSheetData_(ss, '1. UNIVERSE')));
  if (typeof applyPeerComparisonBatch_ === 'function') {
    applyPeerComparisonBatch_(data, ss);
  }
  if (typeof applyRiskEngineBatch_ === 'function') {
    applyRiskEngineBatch_(data, ss);
  }
  if (typeof applyConvictionEngine3Batch_ === 'function') {
    applyConvictionEngine3Batch_(data, ss);
  } else {
    applyConvictionTotalsInScript_(data);
    if (typeof applyAlphaScoresBatch_ === 'function') {
      applyAlphaScoresBatch_(data, ss);
    }
  }
  scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).setValues(data);
  applyConvictionFormulas_(scoreSheet, numRows);
}

/**
 * Tab 6/2/4 (+ optional Tab 8 FII) → sub-scores C–J on Tab 10. Preserves higher manual scores.
 */
function populateQuantitativeScores_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return;

  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  var fundamentals = buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS'));
  var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
  var techCtx = typeof buildTechnicalMomentumContext_ === 'function' ?
    buildTechnicalMomentumContext_(ss) : null;
  var instFlowCtx = typeof buildInstitutionalFlowContext_ === 'function' ?
    buildInstitutionalFlowContext_(ss) : null;
  var bulkBias = buildBulkFlowBiasBySymbol_(loadSheetData_(ss, '4. BULK & LARGE DEALS'), new Date());
  var fiiBias = readMacroFiiBias_(loadSheetData_(ss, '8. MACRO DASHBOARD'));
  var uniRows = loadSheetData_(ss, '1. UNIVERSE');
  var universeBySym = buildUniverseBySymbol_(uniRows);
  var capBySym = {};
  uniRows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (sym) capBySym[sym] = String(r[6] || '').toLowerCase();
  });

  if (typeof applyFivePillarScoresBatch_ === 'function') {
    applyFivePillarScoresBatch_(data, ss, fundamentals, prices, universeBySym, techCtx, instFlowCtx, bulkBias, fiiBias);
  }

  var updated = 0;
  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;
    var f = fundamentals[sym];
    var staleMult = f ? fundamentalsStalenessMultiplier_(f) : 1;
    if (f && staleMult > 0) {
      var gro = Math.round(scoreGrowthFromFundamentals_(f) * staleMult);
      if (gro > 0) { data[i][4] = Math.max(num_(data[i][4]), gro); updated++; }
    }
    if (num_(data[i][12]) > 0) updated++;
  }

  if (APPLY_PERPLEXITY_SCORES && getPerplexityApiKey_()) {
    enrichMoatFromNews_(data, ss);
  }

  applyScoringDataMetrics_(data, fundamentals, prices, universeBySym, ss);

  if (typeof applyPeerComparisonBatch_ === 'function') {
    applyPeerComparisonBatch_(data, ss);
  }
  if (typeof applyRiskEngineBatch_ === 'function') {
    applyRiskEngineBatch_(data, ss);
  }
  if (typeof applyConvictionEngine3Batch_ === 'function') {
    applyConvictionEngine3Batch_(data, ss);
  } else if (typeof applyAlphaScoresBatch_ === 'function') {
    applyAlphaScoresBatch_(data, ss);
  }

  for (var j = 0; j < data.length; j++) {
    reconcileConvictionColumn_(data[j]);
  }
  scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).setValues(data);
  applyConvictionFormulas_(scoreSheet, numRows);
  Logger.log('populateQuantitativeScores_: rows=' + numRows + ' touchCount=' + updated +
    ' fundamentalsSyms=' + Object.keys(fundamentals).length);
}

/**
 * @param {Array<Array>} rows
 * @return {Object}
 */
function buildFundamentalsBySymbol_(rows) {
  var map = {};
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    var lastUpdated = parseSheetDate_(r[23]);
    map[sym] = {
      marketCapCr: num_(r[1]),
      roce: num_(r[2]),
      roe: num_(r[3]),
      revYoy: num_(r[4]),
      patYoy: num_(r[5]),
      debtEquity: num_(r[6]),
      currentRatio: num_(r[7]),
      pe: num_(r[8]),
      pb: num_(r[9]),
      dividendYield: num_(r[10]),
      promoterHolding: num_(r[11]),
      fiiHolding: num_(r[12]),
      sectorRaw: String(r[13] || '').trim(),
      sectorNormalized: String(r[14] || '').trim(),
      ebitdaYoy: num_(r[15]),
      ebitdaMargin: num_(r[16]),
      fcfTrend: String(r[17] || '').toLowerCase(),
      earningsQualityNote: String(r[18] || '').toLowerCase(),
      peVs3y: num_(r[20]),
      valuationTag: String(r[21] || '').toLowerCase(),
      lastUpdated: lastUpdated,
      staleFlag: r[24] === true || r[24] === 'TRUE' || String(r[24]).toLowerCase() === 'true',
      ageDays: fundamentalsAgeDays_(lastUpdated)
    };
  });
  return map;
}

/**
 * @param {Array<Array>} rows
 * @return {Object}
 */
function buildPriceBySymbol_(rows) {
  var map = {};
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    var asOf = parseSheetDate_(r[15] || r[13]);
    map[sym] = {
      price: num_(r[1]),
      chgPct: num_(r[2]),
      vol: num_(r[3]),
      dma20: num_(r[4]),
      dma50: num_(r[5]),
      dma200: num_(r[6]),
      vs50: num_(r[10]),
      vs200: num_(r[11]),
      rsi: num_(r[7]),
      high52: num_(r[12]),
      volAvg20: num_(r[13]),
      techSetup: String(r[14] || '').trim(),
      asOfDate: asOf,
      ageDays: priceAgeDays_(asOf)
    };
  });
  return map;
}

/**
 * @param {Array<Array>} rows
 * @param {Date} today
 * @return {Object}
 */
function buildBulkFlowBiasBySymbol_(rows, today) {
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - 90);
  var map = {};
  rows.forEach(function(r) {
    var d = parseSheetDate_(r[0]);
    if (!d || d < cutoff) return;
    var sym = normalizeSymbolKey_(r[1]);
    if (!sym) return;
    var side = String(r[3] || '').toLowerCase();
    if (!map[sym]) map[sym] = { buy: 0, sell: 0 };
    if (side.indexOf('buy') >= 0) map[sym].buy++;
    else if (side.indexOf('sell') >= 0) map[sym].sell++;
  });
  return map;
}

/**
 * @param {Array<Array>} rows
 * @return {number} 0–2 macro boost for all symbols when FII row positive
 */
function readMacroFiiBias_(rows) {
  for (var i = 0; i < rows.length; i++) {
    var metric = String(rows[i][0] || '').toLowerCase();
    if (metric.indexOf('fii') < 0 && metric.indexOf('foreign') < 0) continue;
    var bias = String(rows[i][3] || '').toLowerCase();
    if (bias === 'positive' || bias === 'bullish') return 1;
  }
  return 0;
}

/**
 * @param {Object} f
 * @return {number}
 */
/**
 * C — fundamentals (0–25). See CONVICTION_SCORE.md
 * @param {Object} f
 * @param {string} capSegment
 * @return {number}
 */
function scoreFundamentalsFromFundamentals_(f, capSegment) {
  if (typeof scoreFundamentalsQualityOnly_ === 'function') {
    return scoreFundamentalsQualityOnly_(f, capSegment);
  }
  var pts = 0;
  if (f.roce >= 25) pts += 5;
  else if (f.roce >= 18) pts += 3;
  else if (f.roce >= 12) pts += 2;
  if (f.roe >= 20) pts += 3;
  else if (f.roe >= 15) pts += 2;
  if (f.ebitdaMargin >= 20) pts += 3;
  else if (f.ebitdaMargin >= 12) pts += 1;
  if (f.promoterHolding >= 50) pts += 2;
  if (capSegment === 'large') pts += 1;
  return Math.min(CONVICTION_CAP.fundamentals, pts);
}

/**
 * E — growth (0–15). See CONVICTION_SCORE.md
 * @param {Object} f
 * @return {number}
 */
function scoreGrowthFromFundamentals_(f) {
  var pts = 0;
  if (f.revYoy >= 20) pts += 6;
  else if (f.revYoy >= 12) pts += 4;
  else if (f.revYoy >= 8) pts += 2;
  if (f.patYoy >= 20) pts += 5;
  else if (f.patYoy >= 12) pts += 3;
  else if (f.patYoy >= 8) pts += 2;
  if (f.ebitdaYoy >= 15) pts += 4;
  else if (f.ebitdaYoy >= 8) pts += 2;
  return Math.min(CONVICTION_CAP.growth, pts);
}

/**
 * F — financial strength (0–15). See CONVICTION_SCORE.md
 * @param {Object} f
 * @return {number}
 */
function scoreFinancialStrengthFromFundamentals_(f) {
  var pts = 0;
  if (f.debtEquity > 0 && f.debtEquity < 0.5) pts += 5;
  else if (f.debtEquity > 0 && f.debtEquity <= 1) pts += 3;
  if (f.currentRatio >= 1.5) pts += 3;
  if (f.fcfTrend.indexOf('improv') >= 0 || f.fcfTrend.indexOf('positive') >= 0) pts += 4;
  if (f.dividendYield >= 1) pts += 1;
  return Math.min(CONVICTION_CAP.financial_strength, pts);
}

/**
 * @param {Object} f
 * @return {number}
 */
function scoreValuationFromFundamentals_(f) {
  var pts = 5;
  if (f.valuationTag.indexOf('cheap') >= 0 || f.valuationTag.indexOf('underv') >= 0) pts += 4;
  else if (f.valuationTag.indexOf('fair') >= 0) pts += 1;
  else if (f.valuationTag.indexOf('expensive') >= 0 || f.valuationTag.indexOf('rich') >= 0) pts -= 2;
  if (f.peVs3y > 0 && f.peVs3y < 0.9) pts += 2;
  else if (f.peVs3y > 1.2) pts -= 1;
  if (f.pe > 0 && f.pe < 18) pts += 2;
  else if (f.pe > 45) pts -= 1;
  if (f.pb > 0 && f.pb < 2) pts += 1;
  else if (f.pb > 5) pts -= 1;
  return Math.max(0, Math.min(CONVICTION_CAP.valuation, pts));
}

/**
 * I — technical momentum (0–5). See CONVICTION_SCORE.md
 * @param {Object} p
 * @return {number}
 */
function scoreTechnicalMomentum_(p) {
  var pts = 2;
  if (p.chgPct >= 3) pts += 1;
  else if (p.chgPct >= 1) pts += 1;
  else if (p.chgPct <= -5) pts -= 1;
  if (p.vs50 > 0) pts += 1;
  if (p.vs200 > 0) pts += 1;
  if (p.rsi >= 55 && p.rsi <= 70) pts += 1;
  else if (p.rsi > 75) pts -= 1;
  return Math.max(0, Math.min(CONVICTION_CAP.technical_momentum, pts));
}

/**
 * H — news & events from helper counts (0–10). See CONVICTION_SCORE.md
 */
function scoreNewsEventsFromSignals_(orderN, filingsN, promoterBuy, revN, eventDecay) {
  var pts = 0;
  pts += Math.min(4, orderN * 2);
  pts += Math.min(3, Math.round(filingsN * 1.5));
  if (promoterBuy) pts += 2;
  pts += Math.min(2, revN);
  pts = Math.round(pts * (eventDecay || 1));
  return Math.min(CONVICTION_CAP.news_events, pts);
}

/**
 * @param {Object|undefined} bulk
 * @param {number} fiiBias
 * @return {number}
 */
function scoreInstitutionalFlow_(bulk, fiiBias) {
  if (typeof institutionalFlowScore === 'function' && bulk && bulk.symbol) {
    return institutionalFlowScore(bulk.symbol, bulk.ctx).score;
  }
  var pts = fiiBias > 0 ? 1 : 0;
  if (!bulk) return Math.min(CONVICTION_CAP.institutional_flow, pts);
  var net = bulk.buy - bulk.sell;
  if (net >= 3) pts += 3;
  else if (net >= 1) pts += 2;
  else if (net <= -2) pts = Math.max(0, pts - 1);
  return Math.min(CONVICTION_CAP.institutional_flow, pts);
}

/**
 * Optional Perplexity moat hint (inline prompt only). Skipped unless APPLY_PERPLEXITY_SCORES=true.
 * @param {Array<Array>} data
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function enrichMoatFromNews_(data, ss) {
  var headlines = fetchRecentNewsContext_(10, createNewsPipelineSummary_()).headlines || [];
  if (!headlines.length) return;
  var prompt = 'For each symbol, return JSON array {symbol, moat_score_0_10} from headlines only. ' +
    'Headlines: ' + JSON.stringify(headlines.slice(0, 8));
  try {
    var key = getPerplexityApiKey_();
    var resp = UrlFetchApp.fetch(PERPLEXITY_API_URL, {
      method: 'post',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: 'Output JSON only. No investment advice.' },
          { role: 'user', content: prompt }
        ]
      }),
      muteHttpExceptions: true
    });
    var body = JSON.parse(resp.getContentText());
    var text = body.choices && body.choices[0] && body.choices[0].message ?
      body.choices[0].message.content : '[]';
    var arr = JSON.parse(String(text).replace(/```json|```/g, '').trim());
    if (!Array.isArray(arr)) return;
    var moatMap = {};
    arr.forEach(function(item) {
      var sym = normalizeSymbolKey_(item.symbol);
      if (sym) moatMap[sym] = Math.min(CONVICTION_CAP.business_moat, Math.round(num_(item.moat_score_0_10)));
    });
    for (var i = 0; i < data.length; i++) {
      var sym = normalizeSymbolKey_(data[i][0]);
      if (moatMap[sym]) data[i][10] = Math.max(num_(data[i][10]), Math.min(CONVICTION_CAP.business_moat, moatMap[sym]));
    }
  } catch (e) {
    Logger.log('enrichMoatFromNews_ skip: ' + e.message);
  }
}

/**
 * @param {Date|null} lastUpdated
 * @return {number}
 */
function fundamentalsAgeDays_(lastUpdated) {
  if (!lastUpdated) return 999;
  var today = new Date();
  return Math.floor((today.getTime() - lastUpdated.getTime()) / 86400000);
}

/**
 * @param {Object} f
 * @return {number} 0 = zero auto scores; 0.8 = 20% penalty; 1 = fresh
 */
function fundamentalsStalenessMultiplier_(f) {
  if (f.staleFlag || f.ageDays >= FUNDAMENTALS_STALE_ZERO_DAYS) return 0;
  if (f.ageDays >= FUNDAMENTALS_STALE_SCORE_DAYS) return 0.8;
  return 1;
}

/**
 * @param {Date|null} asOfDate
 * @return {number}
 */
function priceAgeDays_(asOfDate) {
  if (!asOfDate) return 999;
  return fundamentalsAgeDays_(asOfDate);
}

/**
 * Phase 5 data quality — missing, stale, completeness, source reliability, composite %.
 * See shared/scoring/DATA_QUALITY.md
 * @param {Array} row Tab 10 row
 * @param {Object|null} f Tab 6 fundamentals object
 * @param {Object|null} p Tab 2 price object
 * @param {Object|null} u Tab 1 universe object
 * @return {Object}
 */
function computeDataQualityReport_(row, f, p, u, dqCtx) {
  var sym = normalizeSymbolKey_(row[0]);
  if (typeof dataQualityScore === 'function') {
    var ctx = dqCtx;
    if (!ctx) {
      ctx = {
        fundamentals: {},
        prices: {},
        universeBySym: {},
        newsCount30d: {},
        dealsBySym: {},
        shareholdingBySym: {},
        promoterBySym: {},
        tab4Rows: 0,
        tab24Rows: 0,
        tab7Rows: 0
      };
      if (sym && f) ctx.fundamentals[sym] = f;
      if (sym && p) ctx.prices[sym] = p;
      if (sym && u) ctx.universeBySym[sym] = u;
    }
    var rowOpts = {
      newsEvents: num_(row[7]),
      filingsN: num_(row[13]),
      orderN: num_(row[14]),
      sectorRank: num_(row[17])
    };
    return mapDataQualityToLegacyReport_(dataQualityScore(sym, ctx, rowOpts));
  }
  return computeDataQualityReportLegacy_(row, f, p, u);
}

/**
 * Legacy fallback if DataQualityEngine.gs not loaded.
 */
function computeDataQualityReportLegacy_(row, f, p, u) {
  var missing = ['ENGINE_NOT_LOADED'];
  return {
    missing: missing,
    stale: [],
    completenessPct: 0,
    freshnessPct: 0,
    sourceReliabilityPct: 15,
    dataQualityPct: 0,
    qualityGrade: 'F',
    dataGateFlag: false,
    fundamentalsAgeDays: f ? f.ageDays : '',
    stalenessPenalty: 0.2,
    keyFields: 0
  };
}

/**
 * Tab 10 AH–AP: data gates, completeness, staleness, quality_rank, data quality system.
 * @param {Array<Array>} data
 * @param {Object} fundamentals
 * @param {Object=} prices
 * @param {Object=} universeBySym
 */
function applyScoringDataMetrics_(data, fundamentals, prices, universeBySym, ss) {
  fundamentals = fundamentals || {};
  prices = prices || {};
  universeBySym = universeBySym || {};
  var dqCtx = null;
  if (typeof buildDataQualityContext_ === 'function') {
    try {
      ss = ss || SpreadsheetApp.getActiveSpreadsheet();
      dqCtx = buildDataQualityContext_(ss);
      dqCtx.fundamentals = fundamentals;
      dqCtx.prices = prices;
      dqCtx.universeBySym = universeBySym;
    } catch (e) {
      Logger.log('applyScoringDataMetrics_: dq context ' + e);
    }
  }
  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    var f = fundamentals[sym];
    var p = prices[sym];
    var u = universeBySym[sym];
    var report = computeDataQualityReport_(data[i], f, p, u, dqCtx);
    var conviction = calculateConvictionFromRow_(data[i]);
    var quality = Math.round(
      conviction * (report.completenessPct / 100) * (1 - report.stalenessPenalty)
    );

    data[i][33] = report.dataGateFlag;
    data[i][34] = report.fundamentalsAgeDays;
    data[i][35] = report.completenessPct;
    data[i][36] = report.stalenessPenalty;
    data[i][37] = quality;
    data[i][38] = report.missing.join(',');
    data[i][39] = report.stale.join(',');
    data[i][40] = report.sourceReliabilityPct;
    data[i][41] = report.dataQualityPct;
    data[i][42] = report.qualityGrade ||
      (typeof qualityGradeFromScore_ === 'function' ?
        qualityGradeFromScore_(report.dataQualityPct) : 'F');
  }
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object} symbol → data_quality_pct
 */
function buildDataQualityPctBySymbol_(ss) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  var map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (sym) map[sym] = num_(r[41]);
  });
  return map;
}

/**
 * Latest filing age (days) per symbol for CT/FI decay.
 * @param {Array<Array>} filingRows
 * @return {Object}
 */
function buildLatestFilingAgeBySymbol_(filingRows) {
  var map = {};
  var today = new Date();
  filingRows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[1]);
    var d = parseSheetDate_(r[0]);
    if (!sym || !d) return;
    var age = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (map[sym] === undefined || age < map[sym]) map[sym] = age;
  });
  return map;
}

/**
 * @param {number|undefined} ageDays Latest event age (smaller = fresher)
 * @return {number}
 */
function eventAgeDecayMultiplier_(ageDays) {
  if (ageDays === undefined || ageDays === null) return 1;
  if (ageDays <= 14) return 1;
  if (ageDays <= 30) return 0.85;
  if (ageDays <= 60) return 0.65;
  if (ageDays <= 90) return 0.45;
  return 0.25;
}

/**
 * @param {*} raw
 * @return {string}
 */
function normalizeSectorName_(raw) {
  if (typeof canonicalSector_ === 'function') {
    return canonicalSector_(raw);
  }
  var s = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!s) return '';
  if (SECTOR_TAXONOMY_.indexOf(s) >= 0) return s;
  return 'MISCELLANEOUS';
}

// --- Screener CSV → Tab 6 ---

/** Menu: Import Screener CSV to Tab 6 (paste range or active selection). */
function importScreenerCsvToFundamentals() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var choice = ui.alert(
    'Import Screener CSV',
    'Use active sheet selection (includes header row), or Cancel to paste via prompt.\n\n' +
      'OK = selected range | Cancel = type/paste CSV text',
    ui.ButtonSet.OK_CANCEL
  );

  var grid = [];
  try {
  if (choice === ui.Button.OK) {
    var active = ss.getActiveSheet();
    var range = active.getActiveRange();
    if (!range || range.getNumRows() < 2) {
      ui.alert('Select at least 2 rows (header + data) on the sheet with Screener export.');
      return;
    }
    grid = range.getValues();
  } else {
    var resp = ui.prompt('Paste Screener CSV', 'Paste CSV text (header row first):', ui.ButtonSet.OK_CANCEL);
    if (resp.getSelectedButton() !== ui.Button.OK) return;
    grid = Utilities.parseCsv(String(resp.getResponseText() || ''));
  }

  if (!grid.length) {
    ui.alert('No data to import.');
    return;
  }

  var merged = mergeScreenerGridIntoFundamentals_(ss, grid);
  ui.alert(
    'Screener import complete',
    'Merged ' + merged.merged + ' symbols on Tab 6.\n' +
      'UNIVERSE sector updated: ' + merged.sectorsUpdated + '\n' +
      'Stale (> ' + FUNDAMENTALS_STALE_IMPORT_DAYS + 'd): ' + merged.staleSet + '\n\n' +
      'Run **Rebuild scoring pipeline** to refresh Tab 10–11.',
    ui.ButtonSet.OK
  );
  } catch (err) {
    ui.alert('Screener import failed', String(err.message || err), ui.ButtonSet.OK);
  }
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Array<Array>} grid
 * @return {Object}
 */
function mergeScreenerGridIntoFundamentals_(ss, grid) {
  var headerRow = grid[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  var colMap = mapScreenerHeaders_(headerRow);
  if (colMap.symbol < 0) {
    throw new Error('Could not find symbol column (NSE Code / Symbol)');
  }

  var fundSheet = getOrCreateSheet_('6. FUNDAMENTALS');
  var headers = getSheetHeaders_('6. FUNDAMENTALS');
  fundSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var existing = {};
  if (fundSheet.getLastRow() >= 2) {
    var n = fundSheet.getLastRow() - 1;
    fundSheet.getRange(2, 1, n, FUNDAMENTALS_NUM_COLS).getValues().forEach(function(r) {
      var sym = normalizeSymbolKey_(r[0]);
      if (sym) existing[sym] = r.slice();
    });
  }

  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'Asia/Kolkata', 'yyyy-MM-dd');
  var merged = 0;
  var staleSet = 0;

  for (var i = 1; i < grid.length; i++) {
    var row = grid[i];
    var sym = normalizeSymbolKey_(pickScreenerCell_(row, colMap.symbol));
    if (!sym) continue;

    var sectorRaw = pickScreenerCell_(row, colMap.sector);
    var sectorNorm = normalizeSectorName_(sectorRaw);
    var quarterEnd = pickScreenerCell_(row, colMap.quarterEnd);
    var qDate = parseSheetDate_(quarterEnd);
    var ageFromQuarter = qDate ? fundamentalsAgeDays_(qDate) : 0;
    var stale = ageFromQuarter > FUNDAMENTALS_STALE_IMPORT_DAYS;

    var out = existing[sym] ? existing[sym].slice() : new Array(FUNDAMENTALS_NUM_COLS);
    out[0] = sym;
    if (colMap.marketCap >= 0) out[1] = num_(pickScreenerCell_(row, colMap.marketCap));
    if (colMap.roce >= 0) out[2] = num_(pickScreenerCell_(row, colMap.roce));
    if (colMap.roe >= 0) out[3] = num_(pickScreenerCell_(row, colMap.roe));
    if (colMap.revYoy >= 0) out[4] = num_(pickScreenerCell_(row, colMap.revYoy));
    if (colMap.patYoy >= 0) out[5] = num_(pickScreenerCell_(row, colMap.patYoy));
    if (colMap.debtEquity >= 0) out[6] = num_(pickScreenerCell_(row, colMap.debtEquity));
    if (colMap.currentRatio >= 0) out[7] = num_(pickScreenerCell_(row, colMap.currentRatio));
    if (colMap.pe >= 0) out[8] = num_(pickScreenerCell_(row, colMap.pe));
    if (colMap.pb >= 0) out[9] = num_(pickScreenerCell_(row, colMap.pb));
    if (colMap.dividendYield >= 0) out[10] = num_(pickScreenerCell_(row, colMap.dividendYield));
    if (colMap.promoterHolding >= 0) out[11] = num_(pickScreenerCell_(row, colMap.promoterHolding));
    if (colMap.fiiHolding >= 0) out[12] = num_(pickScreenerCell_(row, colMap.fiiHolding));
    if (sectorRaw) {
      out[13] = sectorRaw;
      out[14] = sectorNorm;
    }
    if (colMap.ebitdaYoy >= 0) out[15] = num_(pickScreenerCell_(row, colMap.ebitdaYoy));
    if (colMap.ebitdaMargin >= 0) out[16] = num_(pickScreenerCell_(row, colMap.ebitdaMargin));
    if (colMap.fcfTrend >= 0) out[17] = pickScreenerCell_(row, colMap.fcfTrend);
    if (colMap.peVs3y >= 0) out[20] = num_(pickScreenerCell_(row, colMap.peVs3y));
    if (colMap.valuationTag >= 0) out[21] = pickScreenerCell_(row, colMap.valuationTag);
    if (quarterEnd) out[22] = quarterEnd;
    out[23] = todayStr;
    out[24] = stale;
    if (stale) staleSet++;

    existing[sym] = out;
    merged++;
  }

  var allRows = Object.keys(existing).sort().map(function(k) { return existing[k]; });
  clearDataBelowHeader_(fundSheet, headers.length);
  if (allRows.length) {
    fundSheet.getRange(2, 1, allRows.length, FUNDAMENTALS_NUM_COLS).setValues(allRows);
  }

  var sectorsUpdated = applyScreenerSectorToUniverse_(ss, existing);
  appendAlert('', 'screener_import', merged + ' symbols merged on Tab 6', '6. FUNDAMENTALS');
  return { merged: merged, sectorsUpdated: sectorsUpdated, staleSet: staleSet };
}

/**
 * @param {Array<string>} headerRow lowercased
 * @return {Object}
 */
function mapScreenerHeaders_(headerRow) {
  function findIdx(keys) {
    for (var k = 0; k < keys.length; k++) {
      var idx = headerRow.indexOf(keys[k]);
      if (idx >= 0) return idx;
    }
    return -1;
  }
  return {
    symbol: findIdx(['nse code', 'nse symbol', 'symbol', 'ticker']),
    marketCap: findIdx(['market capitalization', 'market cap', 'market_cap_cr', 'mcap']),
    roce: findIdx(['roce %', 'roce']),
    roe: findIdx(['roe %', 'roe']),
    revYoy: findIdx(['sales growth %', 'sales growth', 'revenue growth', 'rev_yoy']),
    patYoy: findIdx(['profit growth %', 'profit growth', 'pat growth', 'pat_yoy']),
    debtEquity: findIdx(['debt / equity', 'debt to equity', 'debt_equity']),
    currentRatio: findIdx(['current ratio', 'current_ratio']),
    pe: findIdx(['price to earning', 'p/e', 'pe ratio', 'pe']),
    pb: findIdx(['price to book', 'p/b', 'pb ratio', 'pb']),
    dividendYield: findIdx(['dividend yield', 'dividend_yield']),
    promoterHolding: findIdx(['promoter holding', 'promoter_holding']),
    fiiHolding: findIdx(['fii holding', 'fii_holding', 'fii %']),
    sector: findIdx(['sector', 'industry']),
    ebitdaYoy: findIdx(['ebitda growth', 'ebitda_yoy']),
    ebitdaMargin: findIdx(['ebitda margin %', 'ebitda margin', 'opm', 'operating profit margin']),
    fcfTrend: findIdx(['fcf', 'free cash flow', 'fcf_trend']),
    peVs3y: findIdx(['pe vs 3y', 'pe_vs_3y']),
    valuationTag: findIdx(['valuation', 'valuation_tag']),
    quarterEnd: findIdx(['quarter', 'quarter_end', 'result date'])
  };
}

/**
 * @param {Array} row
 * @param {number} idx
 * @return {*}
 */
function pickScreenerCell_(row, idx) {
  if (idx < 0 || idx >= row.length) return '';
  return row[idx];
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} fundBySym row arrays keyed by symbol
 * @return {number}
 */
function applyScreenerSectorToUniverse_(ss, fundBySym) {
  var uni = ss.getSheetByName('1. UNIVERSE');
  if (!uni || uni.getLastRow() < 2) return 0;
  var n = uni.getLastRow() - 1;
  var data = uni.getRange(2, 1, n, 18).getValues();
  var updated = 0;
  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    var fRow = fundBySym[sym];
    if (!fRow || !fRow[14]) continue;
    data[i][3] = fRow[14];
    if (fRow[1]) data[i][5] = fRow[1];
    data[i][16] = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    updated++;
  }
  uni.getRange(2, 1, n, 18).setValues(data);
  return updated;
}

// --- v2 event-led helpers ---

var NSE_FILINGS_URL_TEMPLATE =
  'https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol=';

function openNseFilingsHelper() {
  var ui = SpreadsheetApp.getUi();
  var active = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var defaultSym = '';
  if (active && active.getActiveCell()) {
    var row = active.getActiveCell().getRow();
    if (row >= 2) {
      defaultSym = String(active.getRange(row, 1).getValue() || '').trim();
    }
  }
  var resp = ui.prompt('NSE filings helper', 'Enter NSE symbol:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var sym = String(resp.getResponseText() || defaultSym).trim().toUpperCase();
  if (!sym) {
    ui.alert('No symbol entered.');
    return;
  }
  var url = NSE_FILINGS_URL_TEMPLATE + encodeURIComponent(sym);
  var html = HtmlService.createHtmlOutput(
    '<p>Open filings for <b>' + sym + '</b>:</p><p><a href="' + url + '" target="_blank">' + url + '</a></p>'
  ).setWidth(420).setHeight(120);
  ui.showModalDialog(html, 'NSE filings — ' + sym);
  appendAlert(sym, 'nse_filings_helper', url, '15. FILINGS');
}

/** Fills Tab 10 helper columns N–R from tabs 15–19 (all Tab 10 rows). */
function computeScoringHelpers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) {
    var n = syncScoringFromUniverse();
    if (n === 0) {
      SpreadsheetApp.getUi().alert('No Tab 10 rows. Import UNIVERSE and run **Rebuild scoring pipeline**.');
      return;
    }
  }
  refreshWatchlistPricesSilent_();
  computeHelperSignalsInternal_();
  applyNewsFlowToScores_();
  populateQuantitativeScores_();
  applyAutoSubScoresAndRefreshTotals_();
  generateRecommendations_();
  SpreadsheetApp.getUi().alert(
    'Scoring helpers updated (N–R), quantitative scores applied, Tab 11 recommendations refreshed.'
  );
}

function computeHelperSignals() {
  computeScoringHelpers();
}

function computeHelperSignalsInternal_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return;

  var numRows = scoreSheet.getLastRow() - 1;
  var helpers = scoreSheet.getRange(2, 14, numRows, 5).getValues();
  var symbols = scoreSheet.getRange(2, 1, numRows, 1).getValues();
  var today = new Date();
  var filings = loadSheetData_(ss, '15. FILINGS');
  var orderbook = loadSheetData_(ss, '16. ORDER BOOK TRACKER');
  var analyst = loadSheetData_(ss, '17. ANALYST REVISIONS');
  var promoter = loadSheetData_(ss, '18. PROMOTER ACTIVITY');
  var sectorRows = loadSheetData_(ss, '19. SECTOR STRENGTH');
  var macroRows = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  var universe = loadSheetData_(ss, '1. UNIVERSE');
  var sectorLookup = buildSectorStrengthLookup_(sectorRows);
  var universeBySym = buildUniverseBySymbol_(universe);

  Logger.log('computeHelperSignalsInternal_: tabRows=' + JSON.stringify({
    filings: filings.length, orderbook: orderbook.length, analyst: analyst.length,
    promoter: promoter.length, sector: sectorRows.length, macro: macroRows.length,
    universe: universe.length, tab10: numRows, sectorKeys: Object.keys(sectorLookup).length
  }));

  var matchedOrder = 0;
  var matchedSector = 0;
  var logSamples = [];

  for (var i = 0; i < symbols.length; i++) {
    var sym = normalizeSymbolKey_(symbols[i][0]);
    if (!sym) continue;
    helpers[i][0] = countEventsSince_(filings, sym, 1, 0, 30, today);
    helpers[i][1] = countEventsSince_(orderbook, sym, 0, 1, 90, today);
    helpers[i][2] = hasPromoterBuy_(promoter, sym, 90, today);
    helpers[i][3] = countEventsSince_(analyst, sym, 0, 1, 60, today);
    var sectorInfo = resolveSectorStrengthForSymbol_(sym, universeBySym, sectorLookup);
    helpers[i][4] = sectorInfo ? sectorInfo.rank : '';
    if (helpers[i][1] > 0) matchedOrder++;
    if (helpers[i][4] !== '' && num_(helpers[i][4]) > 0) matchedSector++;
    if (logSamples.length < 6 && (helpers[i][1] > 0 || helpers[i][4] !== '')) {
      logSamples.push({
        symbol: sym,
        sectorKey: (universeBySym[sym] || {}).sectorKey || '',
        N: helpers[i][0], O: helpers[i][1], P: helpers[i][2], Q: helpers[i][3], R: helpers[i][4]
      });
    }
  }

  Logger.log('computeHelperSignalsInternal_: stocksWithOrderbook=' + matchedOrder +
    ' stocksWithSectorRank=' + matchedSector + ' samples=' + JSON.stringify(logSamples));

  scoreSheet.getRange(2, 14, numRows, 5).setValues(helpers);
  appendAlert('', 'compute_helpers', 'Updated helper columns for ' + numRows + ' rows', '10. SCORING MODEL');
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @return {Array<Array>}
 */
function loadSheetData_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var numDataRows = sh.getLastRow() - 1;
  var numCols = sh.getLastColumn();
  return sh.getRange(2, 1, numDataRows, numCols).getValues();
}

/**
 * @param {*} sym
 * @return {string}
 */
function normalizeSymbolKey_(sym) {
  return String(sym || '').trim().toUpperCase();
}

/**
 * @param {*} name
 * @return {string}
 */
function normalizeSectorKey_(name) {
  if (typeof canonicalSector_ === 'function') return canonicalSector_(name);
  return normalizeSectorName_(name);
}

/**
 * @param {*} val
 * @return {string}
 */
function weekEndingKey_(val) {
  var d = parseSheetDate_(val);
  if (d) return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
  return String(val || '').trim();
}

/**
 * @param {Array<Array>} universe
 * @return {Object}
 */
function buildUniverseBySymbol_(universe) {
  var map = {};
  universe.forEach(function(r) {
    var u = universeRowToObject_(r);
    if (!u.symbol) return;
    var sym = normalizeSymbolKey_(u.symbol);
    map[sym] = {
      symbol: sym,
      sectorRaw: u.sector,
      sectorKey: normalizeSectorName_(u.sector),
      marketCapCr: u.marketCapCr,
      capSegment: u.capSegment,
      marketCapBucket: u.capSegment,
      isSme: u.isSme,
      liquidityFlag: u.liquidityFlag,
      pledgePct: u.pledgePct
    };
  });
  return map;
}

/**
 * Tab 19 is sector-level (no symbol). Map normalized sector → rank + scores for latest week.
 * @param {Array<Array>} sectorRows
 * @return {Object}
 */
function buildSectorStrengthLookup_(sectorRows) {
  var map = {};
  var latestWeek = '';
  sectorRows.forEach(function(r) {
    var wk = weekEndingKey_(r[0]);
    if (wk > latestWeek) latestWeek = wk;
  });
  sectorRows.forEach(function(r) {
    if (latestWeek && weekEndingKey_(r[0]) !== latestWeek) return;
    var sector = normalizeSectorName_(r[1]);
    if (!sector) return;
    map[sector] = {
      rank: num_(r[5]),
      narrative: num_(r[2]),
      macro: num_(r[3]),
      flow: num_(r[4])
    };
  });
  return map;
}

/**
 * @param {string} sym
 * @param {Object} universeBySym
 * @param {Object} sectorLookup
 * @return {Object|null}
 */
function resolveSectorStrengthForSymbol_(sym, universeBySym, sectorLookup) {
  sym = normalizeSymbolKey_(sym);
  var u = universeBySym[sym];
  if (!u || !u.sectorKey) return null;
  var info = sectorLookup[u.sectorKey];
  if (info) return info;
  if (u.sectorRaw) {
    info = sectorLookup[normalizeSectorKey_(u.sectorRaw)];
    if (info) return info;
  }
  return null;
}

/**
 * @param {Object|null} sectorInfo
 * @param {number} sectorRank
 * @return {number}
 */
function scoreSectorStrengthSuggestion_(sectorInfo, sectorRank) {
  var cap = CONVICTION_CAP.sector_strength;
  var rank = sectorRank > 0 ? sectorRank : (sectorInfo ? sectorInfo.rank : 0);
  if (rank > 0) {
    if (rank <= 3) return Math.min(cap, 8);
    if (rank <= 7) return Math.min(cap, 5);
    return Math.min(cap, 2);
  }
  if (!sectorInfo) return 0;
  var score = Math.max(sectorInfo.narrative, sectorInfo.macro, sectorInfo.flow);
  if (score <= 0) return 0;
  return Math.min(cap, Math.round(score * 0.8));
}

/**
 * Tab 20 beneficiaries/losers (symbols or sectors) → sector_macro boost on Tab 10.
 * @param {Array<Array>} data
 * @param {Array<Array>} macroRows
 * @param {Object} universeBySym
 * @param {Object} sectorLookup
 */
function applyMacroBeneficiariesToData_(data, macroRows, universeBySym, sectorLookup) {
  if (!macroRows.length) return;

  var symBoost = {};
  var sectorBoost = {};
  macroRows.forEach(function(r) {
    var bias = String(r[3] || '').toLowerCase();
    if (bias === 'negative' || bias === 'bearish') return;
    parseBeneficiaryTokens_(r[4]).forEach(function(token) {
      var sym = normalizeSymbolKey_(token);
      if (universeBySym[sym]) {
        symBoost[sym] = (symBoost[sym] || 0) + 1;
        return;
      }
      var sec = normalizeSectorKey_(token);
      if (sectorLookup[sec]) sectorBoost[sec] = (sectorBoost[sec] || 0) + 1;
    });
  });

  var matchedSyms = Object.keys(symBoost).length;
  var matchedSectors = Object.keys(sectorBoost).length;
  Logger.log('applyMacroBeneficiariesToData_: macroRows=' + macroRows.length +
    ' symbolHits=' + matchedSyms + ' sectorHits=' + matchedSectors);

  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;
    var boost = 0;
    if (symBoost[sym]) boost = Math.min(CONVICTION_CAP.sector_strength, symBoost[sym] * 3);
    var u = universeBySym[sym];
    if (!boost && u && u.sectorKey && sectorBoost[u.sectorKey]) {
      boost = Math.min(CONVICTION_CAP.sector_strength, sectorBoost[u.sectorKey] * 2);
    }
    if (boost) data[i][6] = Math.max(num_(data[i][6]), boost);
  }
}

/**
 * @param {*} text
 * @return {Array<string>}
 */
function parseBeneficiaryTokens_(text) {
  return String(text || '').split(/[|,;]/).map(function(t) {
    return t.trim();
  }).filter(function(t) { return t.length > 0; });
}

/**
 * @param {Array<Array>} rows
 * @param {string} sym
 * @param {number} symCol
 * @param {number} dateCol
 * @param {number} days
 * @param {Date} today
 * @return {number}
 */
function countEventsSince_(rows, sym, symCol, dateCol, days, today) {
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - days);
  var symKey = normalizeSymbolKey_(sym);
  var count = 0;
  rows.forEach(function(r) {
    if (normalizeSymbolKey_(r[symCol]) !== symKey) return;
    var d = parseSheetDate_(r[dateCol]);
    if (!d || d >= cutoff) count++;
  });
  return count;
}

/**
 * @param {Array<Array>} rows
 * @param {string} sym
 * @param {number} days
 * @param {Date} today
 * @return {boolean}
 */
function hasPromoterBuy_(rows, sym, days, today) {
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - days);
  var symKey = normalizeSymbolKey_(sym);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeSymbolKey_(rows[i][0]) !== symKey) continue;
    var tx = String(rows[i][5] || '').toLowerCase();
    if (tx.indexOf('buy') < 0) continue;
    var d = parseSheetDate_(rows[i][1]);
    if (!d || d >= cutoff) return true;
  }
  return false;
}

/**
 * @param {*} val
 * @return {Date|null}
 */
function parseSheetDate_(val) {
  if (val instanceof Date) return val;
  if (!val) return null;
  var d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// --- News intelligence / Perplexity (Section 14) ---

/**
 * @return {string|null}
 */
function getPerplexityApiKey_() {
  var key = PropertiesService.getScriptProperties().getProperty('PERPLEXITY_API_KEY');
  if (!key) return null;
  key = String(key).trim();
  return key.length ? key : null;
}

/**
 * @return {boolean}
 */
function shouldRunPerplexityDaily_() {
  var flag = PropertiesService.getScriptProperties().getProperty('RUN_PERPLEXITY_DAILY');
  if (flag === 'false' || flag === '0') return false;
  return getPerplexityApiKey_() !== null;
}

/**
 * @return {string}
 */
function getNewsExtractionSystemPrompt_() {
  return 'You are an Indian equity event extraction engine. Output STRICT JSON only matching the schema in the user message. ' +
    'Never fabricate NSE symbols. Use only symbols from the watchlist or headline symbol fields. ' +
    'Label interpretations with [INTERPRETED]; exchange filings with [CONFIRMED]. Not investment advice.';
}

/**
 * @param {Object} context
 * @return {string}
 */
function buildNewsExtractionUserPrompt_(context) {
  var dateIst = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var watch = (context.watchlistSymbols || []).join(', ');
  return [
    'Date IST: ' + dateIst,
    'Run ID: ' + (context.runId || ''),
    'Watchlist: ' + watch,
    'Eligible universe symbols: ' + (context.eligibleCount || 0),
    '',
    'Return one JSON object with keys: filings, order_book, promoter_activity, analyst_revisions,',
    'sector_strength, macro_beneficiaries, geopolitics, india_impact (arrays).',
    'See prompts/sections/14-news-to-events-json.md for field definitions.',
    '',
    'Headlines (Tab 7):',
    JSON.stringify(context.headlines || []),
    '',
    '[USE REAL-TIME WEB SEARCH]'
  ].join('\n');
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildUniverseSymbolSet_(ss) {
  var set = {};
  getEligibleUniverseRows_(ss).forEach(function(u) {
    if (u.symbol) set[String(u.symbol).trim().toUpperCase()] = true;
  });
  return set;
}

/**
 * @return {Object}
 */
function createNewsPipelineSummary_() {
  return {
    startedAt: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    success: false,
    error: '',
    news: {},
    perplexity: {},
    parsed: {},
    extractedRaw: {},
    filters: { droppedSymbol: {}, droppedDedup: {}, droppedMateriality: 0 },
    written: { tabs: [], counts: {} }
  };
}

/**
 * @param {Object} summary
 * @return {string}
 */
function formatNewsPipelineOneLine_(summary) {
  var w = summary.written && summary.written.counts ? summary.written.counts : {};
  var n = summary.news || {};
  var p = summary.perplexity || {};
  var parts = [
    'news=' + (n.headlinesSent || 0) + '/' + (n.newsRowsTotal || 0),
    'eligible=' + (n.eligibleUniverseCount || 0),
    'pplx=' + (p.requests || 0) + (p.httpStatus ? '@' + p.httpStatus : ''),
    'wrote f' + (w.filings || 0) + ' ob' + (w.order_book || 0) + ' ar' + (w.analyst_revisions || 0) +
      ' pr' + (w.promoter_activity || 0) + ' s19=' + (w.sector_strength || 0) + ' s20=' + (w.macro_beneficiaries || 0)
  ];
  if (summary.success) parts.push('OK');
  else parts.push('FAIL:' + String(summary.error || '').substring(0, 80));
  return parts.join(' | ');
}

/**
 * @param {Object} summary
 * @return {string}
 */
function formatNewsPipelineAlertMessage_(summary) {
  var lines = ['News intelligence pipeline', 'Started: ' + (summary.startedAt || '')];
  var n = summary.news || {};
  lines.push('');
  lines.push('Tab 7 news');
  lines.push('  Rows on sheet: ' + (n.newsRowsTotal || 0));
  lines.push('  In ' + PERPLEXITY_NEWS_HOURS_LOOKBACK + 'h lookback: ' + (n.inLookback || 0));
  lines.push('  With headline: ' + (n.withHeadline || 0));
  lines.push('  Tagged eligible symbol: ' + (n.withEligibleSymbol || 0));
  lines.push('  Sent to Perplexity: ' + (n.headlinesSent || 0));
  lines.push('  Eligible UNIVERSE symbols: ' + (n.eligibleUniverseCount || 0));

  var p = summary.perplexity || {};
  lines.push('');
  lines.push('Perplexity');
  lines.push('  Requests: ' + (p.requests || 0));
  if (p.httpStatus) lines.push('  HTTP: ' + p.httpStatus + ' | response chars: ' + (p.responseLength || 0));
  if (p.contentLength != null) lines.push('  Assistant content chars: ' + p.contentLength);

  var raw = summary.extractedRaw || {};
  lines.push('');
  lines.push('Extracted (raw JSON array lengths)');
  lines.push('  filings=' + (raw.filings || 0) + ' order_book=' + (raw.order_book || 0) +
    ' promoter=' + (raw.promoter_activity || 0) + ' analyst=' + (raw.analyst_revisions || 0));
  lines.push('  sector=' + (raw.sector_strength || 0) + ' macro=' + (raw.macro_beneficiaries || 0) +
    ' geo=' + (raw.geopolitics || 0) + ' india=' + (raw.india_impact || 0));

  var f = summary.filters || {};
  var symDrop = f.droppedSymbol || {};
  var dedupDrop = f.droppedDedup || {};
  lines.push('');
  lines.push('Filtered out');
  lines.push('  Ineligible/missing symbol: ' + JSON.stringify(symDrop));
  lines.push('  Dedup skipped: ' + JSON.stringify(dedupDrop));
  lines.push('  Materiality/confidence: ' + (f.droppedMateriality || 0));

  var w = summary.written && summary.written.counts ? summary.written.counts : {};
  lines.push('');
  lines.push('Written to sheets');
  lines.push('  ' + JSON.stringify(w));
  if (summary.written && summary.written.tabs && summary.written.tabs.length) {
    lines.push('  Tabs: ' + summary.written.tabs.join(', '));
  }

  if (summary.error) {
    lines.push('');
    lines.push('Error: ' + summary.error);
  } else if (summary.success) {
    lines.push('');
    lines.push('Status: SUCCESS');
  }
  return lines.join('\n');
}

/**
 * @param {Object} summary
 */
function logNewsPipelineSummary_(summary) {
  var json = JSON.stringify(summary);
  Logger.log('NEWS_PIPELINE_SUMMARY ' + json);
  try {
    PropertiesService.getScriptProperties().setProperty(LAST_NEWS_PIPELINE_SUMMARY_PROP, json);
  } catch (e) {
    Logger.log('Could not store LAST_NEWS_PIPELINE_SUMMARY: ' + e.message);
  }
  appendAlert('', 'news_intelligence', formatNewsPipelineOneLine_(summary), 'system');
}

function viewLastNewsPipelineLog() {
  var json = PropertiesService.getScriptProperties().getProperty(LAST_NEWS_PIPELINE_SUMMARY_PROP);
  if (!json) {
    SpreadsheetApp.getUi().alert('No pipeline log yet. Run **Run news intelligence pipeline (Perplexity)** first.');
    return;
  }
  try {
    SpreadsheetApp.getUi().alert(formatNewsPipelineAlertMessage_(JSON.parse(json)));
  } catch (e) {
    SpreadsheetApp.getUi().alert('Stored log (raw):\n\n' + json.substring(0, 7500));
  }
}

/**
 * @param {number=} maxItems
 * @param {Object=} summary
 * @return {Object}
 */
function fetchRecentNewsContext_(maxItems, summary) {
  maxItems = maxItems || PERPLEXITY_NEWS_MAX_HEADLINES;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var newsSheet = ss.getSheetByName('7. NEWS FLOW');
  var eligible = buildUniverseSymbolSet_(ss);
  var watchlist = getTopScoringSymbols_(ss, 30, false);
  var cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - PERPLEXITY_NEWS_HOURS_LOOKBACK);
  var items = [];
  var newsRowsTotal = 0;
  var inLookback = 0;
  var withHeadline = 0;
  var withEligibleSymbol = 0;

  if (newsSheet && newsSheet.getLastRow() >= 2) {
    var data = newsSheet.getRange(2, 1, newsSheet.getLastRow(), 21).getValues();
    newsRowsTotal = data.length;
    data.sort(function(a, b) {
      var da = parseSheetDate_(a[0]);
      var db = parseSheetDate_(b[0]);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.getTime() - da.getTime();
    });
    for (var i = 0; i < data.length && items.length < maxItems; i++) {
      var r = data[i];
      var pub = parseSheetDate_(r[0]);
      if (pub && pub < cutoff) continue;
      inLookback++;
      var sym = String(r[10] || '').trim().toUpperCase();
      var headline = String(r[2] || '').trim();
      if (!headline) continue;
      withHeadline++;
      if (sym && eligible[sym]) withEligibleSymbol++;
      if (sym && !eligible[sym]) sym = '';
      items.push({
        published_at: r[0],
        headline: headline,
        summary: String(r[3] || '').substring(0, 280),
        url: r[4],
        source_name: r[5],
        symbol: sym,
        sector_tags: r[11],
        materiality: r[14],
        sentiment: r[15],
        event_type: r[17]
      });
    }
  }

  var stats = {
    newsRowsTotal: newsRowsTotal,
    inLookback: inLookback,
    withHeadline: withHeadline,
    withEligibleSymbol: withEligibleSymbol,
    headlinesSent: items.length,
    eligibleUniverseCount: Object.keys(eligible).length
  };
  Logger.log('fetchRecentNewsContext_: ' + JSON.stringify(stats));

  if (summary) summary.news = stats;

  return {
    headlines: items,
    watchlistSymbols: watchlist,
    eligibleCount: stats.eligibleUniverseCount,
    runId: 'gas-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMddHHmmss'),
    stats: stats
  };
}

/**
 * @param {string} text
 * @return {Object|null}
 */
function parseJsonFromPerplexityResponse_(text) {
  if (!text) return null;
  var trimmed = String(text).trim();
  var fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) trimmed = fence[1].trim();
  var start = trimmed.indexOf('{');
  var end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  var slice = trimmed.substring(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (e1) {
    try {
      return JSON.parse(trimmed);
    } catch (e2) {
      return null;
    }
  }
}

/**
 * @param {Object} raw
 * @return {Object}
 */
function normalizePerplexityPayload_(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  var keys = ['filings', 'order_book', 'promoter_activity', 'analyst_revisions',
    'sector_strength', 'macro_beneficiaries', 'geopolitics', 'india_impact'];
  var aliases = {
    order_book: ['orderbook', 'orderBook'],
    promoter_activity: ['promoterActivity'],
    analyst_revisions: ['analystRevisions'],
    sector_strength: ['sectorStrength'],
    macro_beneficiaries: ['macroBeneficiaries'],
    geopolitics: ['geopolitics_flags'],
    india_impact: ['indiaImpact']
  };
  var out = {};
  keys.forEach(function(k) {
    if (Array.isArray(raw[k])) {
      out[k] = raw[k];
      return;
    }
    var alt = aliases[k] || [];
    for (var i = 0; i < alt.length; i++) {
      if (Array.isArray(raw[alt[i]])) {
        out[k] = raw[alt[i]];
        return;
      }
    }
    out[k] = [];
  });
  return out;
}

/**
 * @param {Object} context
 * @param {Object=} summary
 * @return {Object}
 */
function callPerplexityNewsExtraction_(context, summary) {
  var apiKey = getPerplexityApiKey_();
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set in Script Properties');

  var body = {
    model: PERPLEXITY_MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: getNewsExtractionSystemPrompt_() },
      { role: 'user', content: buildNewsExtractionUserPrompt_(context) }
    ]
  };

  Logger.log('callPerplexityNewsExtraction_: sending 1 request, headlines=' +
    (context.headlines ? context.headlines.length : 0));

  var resp = UrlFetchApp.fetch(PERPLEXITY_API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = resp.getResponseCode();
  var respText = resp.getContentText();
  var meta = {
    requests: 1,
    httpStatus: code,
    responseLength: respText ? respText.length : 0,
    contentLength: 0,
    parsedKeys: [],
    parseOk: false
  };
  Logger.log('callPerplexityNewsExtraction_: HTTP ' + code + ' responseLength=' + meta.responseLength);

  if (code !== 200) {
    if (summary) summary.perplexity = meta;
    appendAlert('', 'perplexity_error', 'HTTP ' + code + ': ' + respText.substring(0, 300), 'system');
    throw new Error('Perplexity API HTTP ' + code);
  }

  var parsed = JSON.parse(respText);
  var content = parsed.choices && parsed.choices[0] && parsed.choices[0].message
    ? parsed.choices[0].message.content : '';
  meta.contentLength = content ? String(content).length : 0;
  Logger.log('callPerplexityNewsExtraction_: assistant contentLength=' + meta.contentLength);

  var events = parseJsonFromPerplexityResponse_(content);
  if (!events) {
    if (summary) summary.perplexity = meta;
    appendAlert('', 'perplexity_parse_error', String(content).substring(0, 400), 'system');
    throw new Error('Could not parse JSON from Perplexity response');
  }

  meta.parsedKeys = Object.keys(events);
  meta.parseOk = true;
  Logger.log('callPerplexityNewsExtraction_: parsedKeys=' + meta.parsedKeys.join(','));

  var payload = normalizePerplexityPayload_(events);
  var rawCounts = {};
  ['filings', 'order_book', 'promoter_activity', 'analyst_revisions',
    'sector_strength', 'macro_beneficiaries', 'geopolitics', 'india_impact'].forEach(function(k) {
    rawCounts[k] = (payload[k] || []).length;
  });
  Logger.log('callPerplexityNewsExtraction_: rawCounts=' + JSON.stringify(rawCounts));

  if (summary) {
    summary.perplexity = meta;
    summary.parsed = { keys: meta.parsedKeys };
    summary.extractedRaw = rawCounts;
  }

  return payload;
}

/**
 * @param {*} val
 * @return {boolean}
 */
function parseBoolFlag_(val) {
  if (val === true || val === 'TRUE' || val === 'true') return true;
  if (val === false || val === 'FALSE' || val === 'false') return false;
  return String(val || '').toLowerCase() === 'yes';
}

/**
 * @param {string} sym
 * @param {Object} eligible
 * @return {string}
 */
function normalizeEventSymbol_(sym, eligible) {
  var s = String(sym || '').trim().toUpperCase();
  if (!s) return '';
  if (eligible && !eligible[s]) return '';
  return s;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<Array>} rows
 * @param {Function} keyFn
 * @return {{added: number, skipped: number}}
 */
function appendRowsDeduped_(sheet, rows, keyFn) {
  if (!rows.length) return { added: 0, skipped: 0 };
  var existing = {};
  if (sheet.getLastRow() >= 2) {
    var data = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    data.forEach(function(r) {
      existing[keyFn(r)] = true;
    });
  }
  var added = 0;
  rows.forEach(function(row) {
    var key = keyFn(row);
    if (!key || existing[key]) return;
    existing[key] = true;
    sheet.appendRow(row);
    added++;
  });
  return { added: added, skipped: rows.length - added };
}

/**
 * @param {Array} items
 * @param {Object} eligible
 * @param {boolean} requireSymbol
 * @param {Function} mapFn
 * @return {{rows: Array, droppedSymbol: number, droppedMissingSymbol: number}}
 */
function mapEligibleEventRows_(items, eligible, requireSymbol, mapFn) {
  var droppedSymbol = 0;
  var droppedMissingSymbol = 0;
  var rows = [];
  (items || []).forEach(function(it) {
    var rawSym = String(it.symbol || '').trim().toUpperCase();
    if (requireSymbol && !rawSym) {
      droppedMissingSymbol++;
      return;
    }
    var sym = requireSymbol ? normalizeEventSymbol_(rawSym, eligible) : '';
    if (requireSymbol) {
      if (rawSym && !sym) {
        droppedSymbol++;
        return;
      }
      if (!sym) {
        droppedMissingSymbol++;
        return;
      }
    }
    var row = requireSymbol ? mapFn(it, sym) : mapFn(it);
    if (row) rows.push(row);
  });
  return { rows: rows, droppedSymbol: droppedSymbol, droppedMissingSymbol: droppedMissingSymbol };
}

/**
 * @param {Object} payload
 * @param {Object=} summary
 * @return {Object}
 */
function writeExtractedEventsToSheets_(payload, summary) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var eligible = buildUniverseSymbolSet_(ss);
  var counts = {
    filings: 0, order_book: 0, promoter_activity: 0, analyst_revisions: 0,
    sector_strength: 0, macro_beneficiaries: 0, geopolitics: 0, india_impact: 0
  };
  var droppedSymbol = {};
  var droppedDedup = {};
  var tabsWritten = [];

  var sh15 = getOrCreateSheet_('15. FILINGS');
  var f15 = mapEligibleEventRows_(payload.filings, eligible, true, function(it, sym) {
    return [
      it.date || '', sym, it.filing_type || '', it.sub_type || '', it.headline || '',
      it.materiality || 'medium', it.source_url || '', parseBoolFlag_(it.confirmed_flag),
      it.impact_window || '', it.catalyst_type || 'other',
      String(it.ai_interpretation || '').substring(0, 500)
    ];
  });
  droppedSymbol.filings = f15.droppedSymbol + f15.droppedMissingSymbol;
  var r15 = appendRowsDeduped_(sh15, f15.rows, function(r) {
    return r[1] + '|' + r[0] + '|' + String(r[4]).substring(0, 80);
  });
  counts.filings = r15.added;
  droppedDedup.filings = r15.skipped;
  if (r15.added) tabsWritten.push('15. FILINGS');

  var sh16 = getOrCreateSheet_('16. ORDER BOOK TRACKER');
  var f16 = mapEligibleEventRows_(payload.order_book, eligible, true, function(it, sym) {
    return [
      sym, it.date || '', it.order_value_cr || '', it.customer_type || '', it.project_type || '',
      it.sector || '', it.domestic_export || '', it.execution_period || '',
      it.order_book_est_cr || '', it.ttm_revenue_cr || '', it.orderbook_revenue_ratio || '',
      it.source_url || '', it.confidence || 'medium', String(it.notes || '').substring(0, 300)
    ];
  });
  droppedSymbol.order_book = f16.droppedSymbol + f16.droppedMissingSymbol;
  var r16 = appendRowsDeduped_(sh16, f16.rows, function(r) {
    return r[0] + '|' + r[1] + '|' + String(r[5]).substring(0, 60);
  });
  counts.order_book = r16.added;
  droppedDedup.order_book = r16.skipped;
  if (r16.added) tabsWritten.push('16. ORDER BOOK TRACKER');

  var sh17 = getOrCreateSheet_('17. ANALYST REVISIONS');
  var f17 = mapEligibleEventRows_(payload.analyst_revisions, eligible, true, function(it, sym) {
    return [
      sym, it.date || '', it.broker || '', it.rating_old || '', it.rating_new || '',
      it.target_old || '', it.target_new || '', it.eps_fy1_old || '', it.eps_fy1_new || '',
      it.margin_change || '', it.confidence || 'medium', it.source_url || ''
    ];
  });
  droppedSymbol.analyst_revisions = f17.droppedSymbol + f17.droppedMissingSymbol;
  var r17 = appendRowsDeduped_(sh17, f17.rows, function(r) {
    return r[0] + '|' + r[1] + '|' + r[2];
  });
  counts.analyst_revisions = r17.added;
  droppedDedup.analyst_revisions = r17.skipped;
  if (r17.added) tabsWritten.push('17. ANALYST REVISIONS');

  var sh18 = getOrCreateSheet_('18. PROMOTER ACTIVITY');
  var f18 = mapEligibleEventRows_(payload.promoter_activity, eligible, true, function(it, sym) {
    return [
      sym, it.date || '', it.entity_name || '', it.entity_type || '',
      parseBoolFlag_(it.promoter_group_flag), it.transaction_type || '',
      it.qty || '', it.value || '', it.post_holding || '', it.pledge_pct || '',
      it.pledge_trend || '', parseBoolFlag_(it.trust_holding_flag), it.source_url || ''
    ];
  });
  droppedSymbol.promoter_activity = f18.droppedSymbol + f18.droppedMissingSymbol;
  var r18 = appendRowsDeduped_(sh18, f18.rows, function(r) {
    return r[0] + '|' + r[1] + '|' + r[5];
  });
  counts.promoter_activity = r18.added;
  droppedDedup.promoter_activity = r18.skipped;
  if (r18.added) tabsWritten.push('18. PROMOTER ACTIVITY');

  var sh19 = getOrCreateSheet_('19. SECTOR STRENGTH');
  if (payload.sector_strength && payload.sector_strength.length) {
    clearDataBelowHeader_(sh19, getSheetHeaders_('19. SECTOR STRENGTH').length);
    var s19 = payload.sector_strength.map(function(it) {
      return [
        it.week_ending || '', it.sector || '', it.narrative_score || '', it.macro_score || '',
        it.flow_score || '', it.composite_rank || '', it.momentum_vs_prior_week || '',
        it.sectors_helped_note || ''
      ];
    });
    if (s19.length) {
      var s19Rows = s19.length;
      var s19Cols = s19[0].length;
      Logger.log('Writing sector rows: ' + s19Rows +
        ' getRange row=2 col=1 numRows=' + s19Rows + ' numCols=' + s19Cols);
      sh19.getRange(2, 1, s19Rows, s19Cols).setValues(s19);
      counts.sector_strength = s19.length;
      tabsWritten.push('19. SECTOR STRENGTH');
    }
  }

  var sh20 = getOrCreateSheet_('20. MACRO BENEFICIARIES');
  if (payload.macro_beneficiaries && payload.macro_beneficiaries.length) {
    clearDataBelowHeader_(sh20, getSheetHeaders_('20. MACRO BENEFICIARIES').length);
    var s20 = payload.macro_beneficiaries.map(function(it) {
      return [
        it.metric || '', it.value || '', it.trend || '', it.bias || '',
        it.beneficiaries || '', it.losers || '', it.as_of_date || '', it.notes || ''
      ];
    });
    if (s20.length) {
      var s20Rows = s20.length;
      var s20Cols = s20[0].length;
      Logger.log('Writing macro rows: ' + s20Rows +
        ' getRange row=2 col=1 numRows=' + s20Rows + ' numCols=' + s20Cols);
      sh20.getRange(2, 1, s20Rows, s20Cols).setValues(s20);
      counts.macro_beneficiaries = s20.length;
      tabsWritten.push('20. MACRO BENEFICIARIES');
    }
  }

  var sh9 = getOrCreateSheet_('9. GEOPOLITICS FLAGS');
  var g9 = (payload.geopolitics || []).map(function(it) {
    return [
      it.event || '', it.status || '', it.sectors_helped || '', it.sectors_hurt || '',
      it.last_updated || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
      String(it.notes || '').substring(0, 300)
    ];
  });
  Logger.log('Writing geo rows: ' + g9.length + ' (append deduped)');
  var r9 = appendRowsDeduped_(sh9, g9, function(r) {
    return String(r[0]).substring(0, 100) + '|' + r[4];
  });
  counts.geopolitics = r9.added;
  droppedDedup.geopolitics = r9.skipped;
  if (r9.added) tabsWritten.push('9. GEOPOLITICS FLAGS');

  var sh14 = getOrCreateSheet_('14. INDIA IMPACT LOG');
  var g14 = (payload.india_impact || []).map(function(it) {
    return [
      it.date || '', it.global_headline || '', it.source || '', it.global_theme || '',
      it.india_transmission || '', it.sectors_helped || '', it.sectors_hurt || '',
      it.watchlist_symbols || '', it.confidence || 'medium', String(it.action_note || '').substring(0, 300)
    ];
  });
  Logger.log('Writing India rows: ' + g14.length + ' (append deduped)');
  var r14 = appendRowsDeduped_(sh14, g14, function(r) {
    return r[0] + '|' + String(r[1]).substring(0, 80);
  });
  counts.india_impact = r14.added;
  droppedDedup.india_impact = r14.skipped;
  if (r14.added) tabsWritten.push('14. INDIA IMPACT LOG');

  Logger.log('writeExtractedEventsToSheets_: counts=' + JSON.stringify(counts) +
    ' droppedSymbol=' + JSON.stringify(droppedSymbol) + ' droppedDedup=' + JSON.stringify(droppedDedup));

  var summaryText = 'Wrote events: filings=' + counts.filings + ' orders=' + counts.order_book +
    ' promoter=' + counts.promoter_activity + ' analyst=' + counts.analyst_revisions +
    ' sector=' + counts.sector_strength + ' macro=' + counts.macro_beneficiaries +
    ' geo=' + counts.geopolitics + ' india=' + counts.india_impact;
  appendAlert('', 'write_events', summaryText, '15-20');

  if (summary) {
    summary.filters = summary.filters || {};
    summary.filters.droppedSymbol = droppedSymbol;
    summary.filters.droppedDedup = droppedDedup;
    summary.written = { tabs: tabsWritten, counts: counts };
  }

  return { summary: summaryText, counts: counts, droppedSymbol: droppedSymbol, droppedDedup: droppedDedup };
}

/** Tab 7 materiality → suggested sub-scores on Tab 10 (hints; Tab 15 preferred when confirmed). */
function applyNewsFlowToScores_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return;

  var newsRows = loadSheetData_(ss, '7. NEWS FLOW');
  var universe = loadSheetData_(ss, '1. UNIVERSE');
  var symToSector = {};
  universe.forEach(function(r) {
    var s = String(r[0] || '').trim().toUpperCase();
    if (s) symToSector[s] = normalizeSectorName_(r[3]);
  });

  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  var newsBySym = {};
  var sectorNewsCount = {};

  newsRows.forEach(function(r) {
    var pub = parseSheetDate_(r[0]);
    if (pub && pub < cutoff) return;
    var sym = String(r[10] || '').trim().toUpperCase();
    var mat = String(r[14] || '').toLowerCase();
    var sectors = String(r[11] || '').toUpperCase();
    if (sym) {
      if (!newsBySym[sym]) newsBySym[sym] = { high: 0, medium: 0, low: 0 };
      if (mat === 'high') newsBySym[sym].high++;
      else if (mat === 'medium') newsBySym[sym].medium++;
      else newsBySym[sym].low++;
    }
    if (sectors) {
      sectors.split(/[,|;]/).forEach(function(sec) {
        sec = sec.trim();
        if (sec) sectorNewsCount[sec] = (sectorNewsCount[sec] || 0) + 1;
      });
    }
  });

  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

  for (var i = 0; i < data.length; i++) {
    var sym = String(data[i][0] || '').trim().toUpperCase();
    if (!sym) continue;
    var counts = newsBySym[sym];
    var newsBoost = 0;
    if (counts) {
      newsBoost = Math.min(CONVICTION_CAP.news_events, counts.high * 3 + counts.medium * 2 + counts.low);
    }
    if (newsBoost) {
      data[i][7] = Math.max(num_(data[i][7]), newsBoost);
      data[i][30] = Math.min(5, newsBoost);
    }
    var sector = symToSector[sym] || '';
    if (sector && sectorNewsCount[sector]) {
      var secBoost = Math.min(CONVICTION_CAP.sector_strength, sectorNewsCount[sector] * 2);
      data[i][6] = Math.max(num_(data[i][6]), secBoost);
      data[i][31] = Math.min(5, secBoost);
    }
    data[i][32] = today;
  }

  scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).setValues(data);
  appendAlert('', 'news_flow_scores', 'Tab 7 hints applied for ' + numRows + ' symbols', '10. SCORING MODEL');
}

/**
 * NEWS → Perplexity → Tabs 15–20 → full scoring rebuild.
 * @param {boolean=} silent
 * @return {boolean}
 */
function runNewsIntelligencePipeline(silent) {
  silent = silent === true;
  var summary = createNewsPipelineSummary_();
  try {
    if (!getPerplexityApiKey_()) {
      summary.error = 'No PERPLEXITY_API_KEY';
      logNewsPipelineSummary_(summary);
      if (!silent) {
        SpreadsheetApp.getUi().alert('Set Script Property PERPLEXITY_API_KEY (Project Settings → Script properties).');
      }
      appendAlert('', 'perplexity_skip', 'No PERPLEXITY_API_KEY', 'system');
      return false;
    }
    var context = fetchRecentNewsContext_(PERPLEXITY_NEWS_MAX_HEADLINES, summary);
    if (!context.headlines.length) {
      summary.error = 'No Tab 7 headlines in lookback';
      logNewsPipelineSummary_(summary);
      if (!silent) {
        SpreadsheetApp.getUi().alert('No recent headlines on Tab 7. Run **Fetch RSS news** first.');
      }
      appendAlert('', 'perplexity_skip', 'No Tab 7 headlines in lookback window', '7. NEWS FLOW');
      return false;
    }
    var payload = callPerplexityNewsExtraction_(context, summary);
    var written = writeExtractedEventsToSheets_(payload, summary);
    parseAnnouncementKeywordsInternal_();
    rebuildScoringPipeline(true);
    summary.success = true;
    summary.writeSummary = written.summary;
    logNewsPipelineSummary_(summary);
    if (!silent) {
      SpreadsheetApp.getUi().alert(formatNewsPipelineAlertMessage_(summary));
    }
    return true;
  } catch (err) {
    summary.success = false;
    summary.error = err.message;
    logNewsPipelineSummary_(summary);
    appendAlert('', 'news_intelligence_error', err.message, 'system');
    if (!silent) SpreadsheetApp.getUi().alert('News intelligence failed: ' + err.message);
    return false;
  }
}

function parseAnnouncementKeywordsInternal_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ann = ss.getSheetByName('3. NSE/BSE ANNOUNCEMENTS');
  if (!ann || ann.getLastRow() < 2) return 0;

  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  var data = ann.getRange(2, 1, ann.getLastRow(), 7).getValues();
  var suggestions = 0;

  data.forEach(function(r) {
    var sym = String(r[0] || '').trim();
    var headline = String(r[2] || '').toLowerCase();
    var d = parseSheetDate_(r[1]);
    if (!sym || !headline || !d || d < cutoff) return;

    var orderHit = ANNOUNCEMENT_KEYWORDS_ORDER.some(function(kw) {
      return headline.indexOf(kw) >= 0;
    });
    var filingHit = ANNOUNCEMENT_KEYWORDS_FILING.some(function(kw) {
      return headline.indexOf(kw) >= 0;
    });
    var dealsHit = ANNOUNCEMENT_KEYWORDS_DEALS.some(function(kw) {
      return headline.indexOf(kw) >= 0;
    });

    if (orderHit) {
      appendAlert(sym, 'suggest_orderbook', headline.substring(0, 180), '16. ORDER BOOK TRACKER');
      suggestions++;
    }
    if (filingHit) {
      appendAlert(sym, 'suggest_filing', headline.substring(0, 180), '15. FILINGS');
      suggestions++;
    }
    if (dealsHit) {
      var tab = headline.indexOf('sharehold') >= 0 ? '24. SHAREHOLDING PATTERN' : '4. BULK & LARGE DEALS';
      appendAlert(sym, 'suggest_institutional', headline.substring(0, 180), tab);
      suggestions++;
    }
  });
  return suggestions;
}

function parseAnnouncementKeywords() {
  var ann = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('3. NSE/BSE ANNOUNCEMENTS');
  if (!ann || ann.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No rows on Tab 3.');
    return;
  }
  var suggestions = parseAnnouncementKeywordsInternal_();
  SpreadsheetApp.getUi().alert('Keyword scan complete. ' + suggestions + ' suggestion(s) logged on Tab 12.');
}

/**
 * @param {Array} r
 * @param {Object} universeMap
 * @return {Object}
 */
function buildScoringCandidate_(r, universeMap) {
  var sym = String(r[0] || '').trim();
  var u = universeMap[sym] || {};
  return {
    symbol: sym,
    companyName: String(r[1] || u.companyName || ''),
    sector: u.sector || '',
    fundamentals: num_(r[2]),
    valuation: num_(r[3]),
    growth: num_(r[4]),
    financialStrength: num_(r[5]),
    sectorStrength: num_(r[6]),
    newsEvents: num_(r[7]),
    technicalMomentum: num_(r[8]),
    institutional: num_(r[9]),
    businessMoat: num_(r[10]),
    moatConfidence: num_(r[11]),
    conviction: num_(r[12]),
    filingsSignals: num_(r[13]),
    orderbookSignals: num_(r[14]),
    promoterBuy: r[15] === true || r[15] === 'TRUE' || r[15] === 'true',
    revisionUpgrades: num_(r[16]),
    sectorRank: num_(r[17]),
    horizon1w: r[19] === true || r[19] === 'TRUE',
    horizon1m: r[20] === true || r[20] === 'TRUE',
    horizon3m: r[21] === true || r[21] === 'TRUE',
    horizonLong: r[22] === true || r[22] === 'TRUE',
    pumpFlag: r[25] === true || r[25] === 'TRUE',
    excluded: r[29] === true || r[29] === 'TRUE',
    sectorKey: normalizeSectorName_(u.sector || ''),
    dataGateFlag: r[33] === true || r[33] === 'TRUE',
    qualityRank: num_(r[37]),
    dataQualityPct: num_(r[41]),
    qualityGrade: String(r[42] || '').trim() ||
      (typeof qualityGradeFromScore_ === 'function' ? qualityGradeFromScore_(num_(r[41])) : ''),
    dataCompletenessPct: num_(r[35]),
    sourceReliabilityPct: num_(r[40]),
    staleFlags: String(r[39] || ''),
    fundamentalsAgeDays: num_(r[34]),
    lastScoredDate: String(r[32] || ''),
    newsArticleCount30d: 0,
    priceAgeDays: 0,
    alphaScore: num_(r[43]),
    alphaClassification: String(r[44] || '').trim(),
    qualityScore: num_(r[45]),
    valuationScore: num_(r[46]),
    catalystScore: num_(r[47]),
    convictionStage: String(r[48] || '').trim(),
    opportunityRank: num_(r[49]) || num_(r[12]),
    relativeQualityScore: num_(r[50]),
    relativeValuationScore: num_(r[51]),
    relativeGrowthScore: num_(r[52]),
    relativeStrengthScore: num_(r[52]),
    sectorMedianPe: num_(r[53]),
    sectorMedianPb: num_(r[54]),
    sectorMedianRoce: num_(r[55]),
    sectorMedianGrowth: num_(r[56]),
    sectorMedianRoe: num_(r[64]),
    sectorMedianMargin: num_(r[65]),
    pledgeGt50: r[25] === true || r[25] === 'TRUE',
    sebiInvestigation: r[27] === true || r[27] === 'TRUE',
    themeTags: parseThemeTags_(universeMap[sym] ? universeMap[sym].themeTags : ''),
    themeConvictionScore: num_(r[57]),
    primaryThemeId: String(r[58] || '').trim(),
    themeExposure: String(r[61] || '').trim(),
    themeStrength: num_(r[62]),
    themeMomentum: num_(r[63]),
    riskScore: num_(r[59]),
    riskGrade: String(r[60] || '').trim(),
    riskDanger: num_(r[59]) > 0 ? 100 - num_(r[59]) : 0,
    rewardRiskRatio: num_(r[66]),
    cfoPatDivergence: r[27] === true || r[27] === 'TRUE',
    mgmtExits: r[28] === true || r[28] === 'TRUE'
  };
}

/**
 * @param {Object} c
 * @return {string}
 */
function recommendationTier_(c) {
  if (c.dataGateFlag && c.qualityRank >= 25) return 'full';
  if (c.orderbookSignals > 0 || c.filingsSignals > 0) return 'event';
  if (c.conviction >= 20) return 'watchlist';
  return 'universe';
}

/**
 * @param {Object} c
 * @param {string} filter
 * @return {number}
 */
function recommendationSortKey_(c, filter) {
  var rank = num_(c.opportunityRank) || num_(c.conviction);
  var riskMult = typeof recommendationRiskSortMultiplier_ === 'function' ?
    recommendationRiskSortMultiplier_(c) : 1;
  var fpMult = typeof recommendationFalsePositiveSortMultiplier_ === 'function' ?
    recommendationFalsePositiveSortMultiplier_(c, filter) : 1;
  rank = Math.round(rank * riskMult * fpMult);
  var peerBoost = peerComparisonSortBoost_(c);
  if (filter === 'immediate') {
    var newsTerm = (num_(c.catalystScore) || c.newsEvents) * 0.5;
    if (typeof isSingleNewsDrivenRanking_ === 'function' &&
      isSingleNewsDrivenRanking_(c, filter)) {
      newsTerm *= 0.35;
    }
    return newsTerm + rank * 0.3 + peerBoost * 0.2;
  }
  if (filter === 'three_month' || filter === 'compounders') {
    var rrBoost = typeof recommendationRewardRiskSortBoost_ === 'function' ?
      recommendationRewardRiskSortBoost_(c) : 0;
    return (num_(c.qualityScore) || (c.fundamentals + c.financialStrength)) * 0.28 +
      (num_(c.valuationScore) || c.valuation) * 0.14 +
      (num_(c.relativeQualityScore) || 50) * 0.11 +
      (num_(c.relativeGrowthScore) || 50) * 0.09 + rank * 0.12 +
      peerBoost * 0.18 + rrBoost * 0.08;
  }
  if (filter === 'gov_beneficiary') {
    return c.sectorStrength + (num_(c.catalystScore) || c.newsEvents) +
      (num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore) || 50) * 0.1 +
      num_(c.themeConvictionScore) * 0.12;
  }
  if (filter === 'turnaround') {
    return c.financialStrength + c.growth +
      num_(c.relativeValuationScore) * 0.18 +
      (num_(c.relativeGrowthScore) || 50) * 0.08 + rank * 0.12;
  }
  if (filter === 'theme_stocks') {
    return (num_(c.themeConvictionScore) || 0) * 0.5 +
      (num_(c.themeStrength) || 0) * 0.12 +
      (num_(c.themeMomentum) || 0) * 0.08 + rank * 0.3;
  }
  return rank + peerBoost * 0.25;
}

/**
 * @param {Object} c
 * @return {number}
 */
function peerComparisonSortBoost_(c) {
  if (typeof peerComparisonSortBoostFromCandidate_ === 'function') {
    return peerComparisonSortBoostFromCandidate_(c);
  }
  var q = num_(c.relativeQualityScore);
  var v = num_(c.relativeValuationScore);
  var g = num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore);
  if (!q && !v && !g) return 0;
  return Math.round((q * 0.38 + v * 0.32 + g * 0.30) * 0.38);
}

/**
 * @param {Array<Object>} candidates
 * @param {string} filter
 * @param {Array<Array>} macroRows
 * @param {Object} sectorLookup
 * @param {number} limit
 * @return {Array<Object>}
 */
function pickRecommendationCandidates_(candidates, filter, macroRows, sectorLookup, limit) {
  var pool = candidates;
  if (typeof passesRecommendationQualityGate_ === 'function') {
    pool = candidates.filter(function(c) {
      return passesRecommendationQualityGate_(c, filter);
    });
  }
  pool = pool.filter(function(c) {
    return String(c.convictionStage || '').toUpperCase() !== 'REJECTED';
  });
  var beneficiarySyms = typeof buildThematicBeneficiarySet_ === 'function' ?
    buildThematicBeneficiarySet_(pool, macroRows) :
    buildMacroBeneficiarySymbolSet_(macroRows, pool);
  var filtered = pool.filter(function(c) {
    var tier = recommendationTier_(c);
    if (filter === 'immediate') {
      return (tier === 'full' || tier === 'event') &&
        (c.horizon1w || c.horizon1m || c.orderbookSignals > 0 || c.filingsSignals > 0) &&
        c.conviction >= 30;
    }
    if (filter === 'three_month') {
      return (tier === 'full' || tier === 'watchlist') &&
        (c.horizon3m || (c.sectorRank > 0 && c.sectorRank <= 10)) &&
        c.conviction >= 28 && c.qualityRank >= 15;
    }
    if (filter === 'compounders') {
      var q = num_(c.qualityScore) || (c.fundamentals + c.financialStrength + c.businessMoat);
      return c.dataGateFlag && q >= 45 &&
        (c.horizonLong || c.fundamentals >= 12 || c.businessMoat >= 7);
    }
    if (filter === 'monopoly') {
      return c.dataGateFlag && (c.businessMoat >= 7 || (c.fundamentals + c.businessMoat) >= 18);
    }
    if (filter === 'gov_beneficiary') {
      var thematic = c.themeTags && c.themeTags.length > 0;
      return (c.sectorStrength >= 6 || thematic) &&
        (beneficiarySyms[c.symbol] || beneficiarySyms[c.sectorKey] || thematic);
    }
    if (filter === 'turnaround') {
      return c.valuation >= 5 && c.financialStrength >= 5 && !c.pumpFlag;
    }
    if (filter === 'theme_stocks') {
      return (c.themeTags && c.themeTags.length > 0) &&
        num_(c.themeConvictionScore) >= 38 &&
        num_(c.themeStrength) >= 35 &&
        (num_(c.opportunityRank) >= 25 || num_(c.qualityScore) >= 40);
    }
    return true;
  });

  filtered.sort(function(a, b) {
    var keyA = recommendationSortKey_(a, filter);
    var keyB = recommendationSortKey_(b, filter);
    if (keyB !== keyA) return keyB - keyA;
    if (b.qualityRank !== a.qualityRank) return b.qualityRank - a.qualityRank;
    return b.conviction - a.conviction;
  });

  if (filtered.length < limit) {
    var fallback = pool.slice().sort(function(a, b) {
      if (b.qualityRank !== a.qualityRank) return b.qualityRank - a.qualityRank;
      return b.conviction - a.conviction;
    });
    fallback.forEach(function(c) {
      if (filtered.length >= limit) return;
      if (filtered.indexOf(c) >= 0) return;
      if ((filter === 'monopoly' || filter === 'compounders') && !c.dataGateFlag) return;
      if (filter === 'monopoly' && c.businessMoat < 5 && c.fundamentals < 12) return;
      if (filter === 'turnaround' && c.pumpFlag) return;
      filtered.push(c);
    });
  }

  return filtered.slice(0, limit);
}

/**
 * @param {Array<Array>} macroRows
 * @param {Array<Object>} candidates
 * @return {Object}
 */
function buildMacroBeneficiarySymbolSet_(macroRows, candidates) {
  var set = {};
  var universeBySym = {};
  candidates.forEach(function(c) {
    universeBySym[c.symbol] = { sectorKey: c.sectorKey };
  });
  macroRows.forEach(function(r) {
    var bias = String(r[3] || '').toLowerCase();
    if (bias === 'negative' || bias === 'bearish') return;
    parseBeneficiaryTokens_(r[4]).forEach(function(token) {
      var sym = normalizeSymbolKey_(token);
      if (universeBySym[sym]) {
        set[sym] = true;
        return;
      }
      var sec = normalizeSectorKey_(token);
      if (sec) set[sec] = true;
    });
  });
  return set;
}

/**
 * Rule-based bull/bear/catalyst/evidence from Tabs 7,15,16,19,20.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} c
 * @return {Object}
 */
function buildRecommendationNarrative_(ss, c) {
  var parts = [];
  var catalyst = [];
  var bear = [];

  if (c.orderbookSignals > 0) {
    catalyst.push('Order win 90d x' + c.orderbookSignals);
    parts.push('OB:' + c.orderbookSignals);
  }
  if (c.filingsSignals > 0) parts.push('Filings 30d:' + c.filingsSignals);
  if (c.sectorRank > 0 && c.sectorRank <= 5) {
    catalyst.push('Sector rank ' + c.sectorRank);
    parts.push('Sector rank ' + c.sectorRank);
  }
  if (c.promoterBuy) catalyst.push('Promoter buy 90d');
  if (c.revisionUpgrades > 0) catalyst.push('Analyst upgrades ' + c.revisionUpgrades);
  if (c.fundamentals >= 18) parts.push('Fundamentals ' + c.fundamentals);
  if (c.financialStrength >= 9) parts.push('Financial strength ' + c.financialStrength);
  if (c.growth >= 9) parts.push('Growth ' + c.growth);
  if (c.valuation >= 9) parts.push('Valuation ' + c.valuation);
  if (c.pumpFlag) bear.push('Pump flag set');
  if (c.valuation <= 5 && c.financialStrength < 6) bear.push('Weak quality vs price');

  var horizon = '3m';
  if (c.horizon1w) horizon = '1w';
  else if (c.horizon1m) horizon = '1m';
  else if (c.horizonLong) horizon = '12m';
  else if (c.horizon3m) horizon = '3m';
  else if (c.orderbookSignals > 0 || c.filingsSignals > 0) horizon = '1m';

  var bull = 'Conviction ' + c.conviction + ' (Engine 2.0)';
  if (c.newsEvents >= 6) bull += '; News/events ' + c.newsEvents;
  if (c.sectorStrength >= 7) bull += '; Sector strength ' + c.sectorStrength;

  return {
    bull: bull,
    bear: bear.length ? bear.join('; ') : 'Monitor pledge/liquidity',
    catalyst: catalyst.length ? catalyst.join('; ') : 'Pipeline signal pending',
    horizon: horizon,
    confidence: computeRecommendationConfidence_(c),
    evidence: parts.length ? parts.join('; ') : 'Tab10 H' + c.newsEvents + ' G' + c.sectorStrength
  };
}

/**
 * Tab 11 confidence — conviction weighted by data quality (not duplicated in frontend).
 * @param {Object} c
 * @return {number}
 */
function computeRecommendationConfidence_(c) {
  var dq = c.dataQualityPct > 0 ? c.dataQualityPct : 50;
  if (c.dataGateFlag) dq = Math.max(0, dq - 15);
  var rank = num_(c.opportunityRank) || c.conviction;
  return Math.min(100, Math.round(rank * 0.85 + dq * 0.15));
}

/**
 * Template decision block (Why / What / Risk / Catalyst / Timeline) from existing Tab 10/11 fields — no rescoring.
 * @param {Object} c scoring candidate or null
 * @param {Object} item Tab 11 row fields
 * @param {string} listName
 * @return {Object}
 */
function buildDecisionNarrativeFromScores_(c, item, listName) {
  c = c || {};
  item = item || {};
  var conviction = num_(item.conviction_total || c.conviction);
  var pillars = [];
  if (num_(c.fundamentals) >= 10) pillars.push('quality ' + num_(c.fundamentals) + '/15');
  if (c.businessMoat >= 5) pillars.push('moat ' + c.businessMoat + '/10');
  if (num_(c.growth) >= 10) pillars.push('growth ' + num_(c.growth) + '/15');
  if (num_(c.valuation) >= 8) pillars.push('valuation ' + num_(c.valuation) + '/15');
  if (num_(c.sectorStrength) >= 6) pillars.push('sector ' + num_(c.sectorStrength) + '/10');
  if (num_(c.newsEvents) >= 5) pillars.push('news/events ' + num_(c.newsEvents) + '/10');

  var whyParts = [];
  if (conviction >= 30) {
    whyParts.push('Conviction ' + conviction + '/100 on Engine 2.0 scoring');
  } else {
    whyParts.push('Watchlist-tier conviction ' + conviction + '/100 — verify data gate before sizing');
  }
  if (pillars.length) whyParts.push('Led by ' + pillars.slice(0, 3).join(', '));
  if (typeof buildScoreBreakdown_ === 'function' && c && c.symbol) {
    whyParts.push('Breakdown: ' + buildScoreBreakdown_(c));
  } else if (String(item.score_breakdown || '').trim()) {
    whyParts.push('Breakdown: ' + String(item.score_breakdown).trim());
  }
  if (c.dataQualityPct > 0) whyParts.push('Data quality ' + Math.round(c.dataQualityPct) + '%');
  if (String(item.evidence || '').trim()) whyParts.push(String(item.evidence).trim());
  else if (String(item.bull_case || '').trim()) whyParts.push(String(item.bull_case).trim());

  var what = decisionActionThesis_(listName, conviction, c);
  var risk = String(item.bear_case || '').trim();
  if (!risk) {
    risk = 'Sector rotation, earnings miss, or liquidity squeeze could invalidate the thesis.';
  }
  if (typeof buildRiskRecommendationBlock_ === 'function' && c && c.symbol) {
    risk = buildRiskRecommendationBlock_(c) + '. ' + risk;
  }
  if (c.pumpFlag) risk = 'Pump flag active — ' + risk;
  if (c.dataGateFlag === false) risk = 'Incomplete fundamentals (data gate) — ' + risk;

  var rrBlock = null;
  if (typeof buildRiskRewardMetrics_ === 'function' && c && c.symbol) {
    rrBlock = buildRiskRewardMetrics_(c);
  }

  var catalyst = String(item.catalyst || '').trim();
  if (!catalyst) {
    if (c.orderbookSignals > 0) catalyst = 'Order-book wins in last 90d (x' + c.orderbookSignals + ')';
    else if (c.filingsSignals > 0) catalyst = 'Corporate filings in last 30d (x' + c.filingsSignals + ')';
    else catalyst = 'Monitor Tab 7 news and Tab 15–18 event pipeline for the next trigger';
  }

  var timeline = decisionTimelineLabel_(item.target_horizon, c, listName);

  var engineWhy = typeof buildEngine3DecisionFields_ === 'function' ?
    buildEngine3DecisionFields_(c, item) : null;

  return {
    why: whyParts.join('. ').replace(/\.\./g, '.') + '.',
    what: what,
    risk: risk,
    catalyst: catalyst,
    timeline: timeline,
    why_now: engineWhy ? engineWhy.why_now : (String(item.why_now || '').trim() || catalyst),
    why_stock: engineWhy ? engineWhy.why_stock : whyParts.slice(0, 2).join('. '),
    why_peers: engineWhy ? engineWhy.why_peers : ('Sector ' + (c.sectorKey || item.sector || '—')),
    upside: rrBlock ? ('Upside ' + rrBlock.upside_score + '/100') : '',
    reward_risk: rrBlock ? ('Reward/Risk ' + rrBlock.reward_risk_ratio + ':1') : ''
  };
}

/**
 * @param {Object} c
 * @param {Object} item
 * @return {{why_now:string, why_stock:string, why_peers:string}|null}
 */
function buildEngine3DecisionFields_(c, item) {
  if (!c || !c.symbol) return null;
  if (String(c.convictionStage || '').indexOf('REJECT') >= 0) return null;
  var whyNow = String(item.why_now || c.whyNow || '').trim();
  var whyStock = String(item.why_stock || c.whyStock || '').trim();
  var whyPeers = String(item.why_peers || c.whyPeers || '').trim();
  if (!whyNow && num_(c.catalystScore) > 0) {
    whyNow = 'Catalyst score ' + num_(c.catalystScore) + '/100 — ' + String(item.catalyst || '');
  }
  if (!whyStock && num_(c.qualityScore) > 0) {
    whyStock = 'Quality score ' + num_(c.qualityScore) + '/100 — pillars C/F/K drive the thesis';
  }
  if (!whyPeers) {
    whyPeers = 'Opportunity rank ' + (num_(c.opportunityRank) || num_(c.conviction)) +
      ' vs sector ' + (c.sectorKey || c.sector || '—');
  }
  return { why_now: whyNow, why_stock: whyStock, why_peers: whyPeers };
}

/**
 * @param {string} listName
 * @param {number} conviction
 * @param {Object} c
 * @return {string}
 */
function decisionActionThesis_(listName, conviction, c) {
  var list = String(listName || '').toLowerCase();
  if (list.indexOf('immediate') >= 0) {
    return 'Starter position on confirmed near-term catalyst; trim if news/events score fades below 4.';
  }
  if (list.indexOf('3-month') >= 0) {
    return 'Build toward a 3-month swing — add on dips while growth + valuation pillars hold.';
  }
  if (list.indexOf('compounder') >= 0) {
    return 'Accumulate for compounding — prioritize quality (fundamentals + financial strength) over timing.';
  }
  if (list.indexOf('monopoly') >= 0) {
    return 'Core hold candidate — add on sector weakness if moat+quality stay strong (K+C).';
  }
  if (list.indexOf('government') >= 0 || list.indexOf('beneficiar') >= 0) {
    return 'Thematic allocation on policy/macro beneficiary tailwinds; rebalance after sector rank drops.';
  }
  if (list.indexOf('turnaround') >= 0) {
    return 'Speculative recovery play — scale in only after balance-sheet metrics improve on Tab 6.';
  }
  if (list.indexOf('theme') >= 0) {
    return 'Thematic leader — size by theme_conviction_score; rotate if Tab 27 theme rank drops.';
  }
  if (conviction >= 55) return 'Research overweight — align position size with conviction and data quality tier.';
  if (conviction >= 35) return 'Watchlist with conditional buy — wait for catalyst or data refresh.';
  return 'Monitor only until conviction ≥35 and data gate passes.';
}

/**
 * @param {string} horizon
 * @param {Object} c
 * @param {string} listName
 * @return {string}
 */
function decisionTimelineLabel_(horizon, c, listName) {
  var h = String(horizon || '').toLowerCase();
  var list = String(listName || '').toLowerCase();
  if (h === '1w' || h === '1 week') return '1 week — event-driven, reassess after next filing or order update';
  if (h === '1m' || h === '1 month') return '1 month — near-term catalyst window';
  if (h === '3m' || h === '3 month') return '3 months — swing / earnings cycle horizon';
  if (h === '6-12m' || h === '12m' || h.indexOf('12') >= 0) return '6–12 months — structural compounder horizon';
  if (list.indexOf('immediate') >= 0) return '1–4 weeks — immediate opportunity list';
  if (list.indexOf('compounder') >= 0 || list.indexOf('monopoly') >= 0) return '6–12 months — quality compounder horizon';
  if (c && c.horizon1w) return '1 week — flagged on Tab 10 horizon_1w';
  if (c && c.horizon1m) return '1 month — flagged on Tab 10 horizon_1m';
  if (c && c.horizonLong) return '6–12 months — flagged on Tab 10 horizon_6_12m';
  return '3 months — default research horizon unless catalyst accelerates';
}

/**
 * @param {*} v
 * @return {number}
 */
function num_(v) {
  var n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * @param {string} name
 * @return {Array<string>}
 */
function getSheetHeaders_(name) {
  var def = SHEET_DEFS.filter(function(d) { return d.name === name; })[0];
  return def ? def.headers : [];
}
