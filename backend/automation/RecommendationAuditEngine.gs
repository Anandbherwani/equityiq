/**
 * Recommendation audit — last N Tab 11 rows + false-positive classification.
 * Works with stricter gates in RecommendationEngine.gs (v2 filters).
 * See docs/RECOMMENDATION_FILTERS.md
 */

var REC_AUDIT_SHEET_ = '32. RECOMMENDATION AUDIT';
var REC_AUDIT_LAST_N_ = 100;
var REC_AUDIT_PROP_ = 'LAST_RECOMMENDATION_AUDIT_JSON';

/** Stricter gates (~50% fewer marginal Tab 11 slots vs legacy thresholds). */
var REC_FILTER_V2_ENABLED_ = true;
var REC_FILTER_MIN_DATA_QUALITY_V2_ = 68;
var REC_FILTER_MIN_CONFIDENCE_V2_ = 58;
var REC_FILTER_MIN_OPPORTUNITY_RANK_V2_ = 38;
var REC_FILTER_MIN_QUALITY_SCORE_V2_ = 48;
var REC_FILTER_MIN_CORE_PILLARS_V2_ = 22;
var REC_FILTER_MIN_CORE_WITH_GATE_V2_ = 26;
var REC_FILTER_MAX_PRICE_AGE_DAYS_V2_ = 14;
var REC_FILTER_MAX_FUNDAMENTALS_AGE_V2_ = 120;
var REC_FILTER_MAX_NEWS_EVENTS_SINGLE_DRIVER_ = 5;
var REC_FILTER_SINGLE_NEWS_MAX_ARTICLES_ = 1;

/**
 * Effective filter constants (v2 when enabled).
 * @return {Object}
 */
function getRecommendationFilterConfig_() {
  if (!REC_FILTER_V2_ENABLED_) {
    return {
      min_data_quality: REC_FILTER_MIN_DATA_QUALITY_,
      min_confidence: REC_FILTER_MIN_CONFIDENCE_,
      min_opportunity_rank: REC_FILTER_MIN_CONVICTION_,
      min_quality_score: 35,
      min_core_pillars: 0,
      v2: false
    };
  }
  return {
    min_data_quality: REC_FILTER_MIN_DATA_QUALITY_V2_,
    min_confidence: REC_FILTER_MIN_CONFIDENCE_V2_,
    min_opportunity_rank: REC_FILTER_MIN_OPPORTUNITY_RANK_V2_,
    min_quality_score: REC_FILTER_MIN_QUALITY_SCORE_V2_,
    min_core_pillars: REC_FILTER_MIN_CORE_PILLARS_V2_,
    min_core_with_gate: REC_FILTER_MIN_CORE_WITH_GATE_V2_,
    max_price_age_days: REC_FILTER_MAX_PRICE_AGE_DAYS_V2_,
    max_fundamentals_age_days: REC_FILTER_MAX_FUNDAMENTALS_AGE_V2_,
    v2: true
  };
}

/**
 * Core pillar sum C+F+K+D+E (quality backbone, excludes news/H).
 * @param {Object} c
 * @return {number}
 */
function recommendationCorePillarSum_(c) {
  return num_(c.fundamentals) + num_(c.financialStrength) + num_(c.businessMoat) +
    num_(c.valuation) + num_(c.growth);
}

/**
 * Structural events (not single headline / single LOA).
 * @param {Object} c
 * @return {number}
 */
function recommendationStructuralEventScore_(c) {
  return num_(c.orderbookSignals) + num_(c.filingsSignals) +
    (c.promoterBuy ? 2 : 0) + num_(c.revisionUpgrades);
}

/**
 * @param {Object} c
 * @return {boolean}
 */
function isWeakConvictionRecommendation_(c) {
  var cfg = getRecommendationFilterConfig_();
  var rank = num_(c.opportunityRank) || num_(c.conviction);
  var qs = num_(c.qualityScore);
  if (rank < cfg.min_opportunity_rank) return true;
  if (rank < cfg.min_opportunity_rank + 12 && qs > 0 && qs < cfg.min_quality_score) return true;
  if (num_(c.alphaScore) > 0 && num_(c.alphaScore) < 28 &&
    String(c.alphaClassification || '').toUpperCase() === 'AVOID') return true;
  if (num_(c.qualityRank) > 0 && num_(c.qualityRank) < 20 && rank < 45) return true;
  return false;
}

/**
 * @param {Object} c
 * @return {boolean}
 */
function isLowQualityRecommendation_(c) {
  var cfg = getRecommendationFilterConfig_();
  var dq = num_(c.dataQualityPct);
  if (dq > 0 && dq < cfg.min_data_quality) return true;
  var qs = num_(c.qualityScore);
  if (qs > 0 && qs < cfg.min_quality_score) return true;
  var core = recommendationCorePillarSum_(c);
  if (REC_FILTER_V2_ENABLED_ && core < cfg.min_core_pillars) return true;
  if (REC_FILTER_V2_ENABLED_ && !c.dataGateFlag && core < cfg.min_core_with_gate) return true;
  if (REC_FILTER_V2_ENABLED_ && !c.dataGateFlag &&
    (num_(c.opportunityRank) || c.conviction) < 50) return true;
  return false;
}

/**
 * Single Tab 7 headline inflating H / sort (immediate & high H).
 * @param {Object} c
 * @param {string=} filter
 * @return {boolean}
 */
function isSingleNewsDrivenRanking_(c, filter) {
  if (typeof isNewsOnlyRecommendation_ === 'function' && isNewsOnlyRecommendation_(c)) return true;

  var core = recommendationCorePillarSum_(c);
  var events = recommendationStructuralEventScore_(c);
  var newsH = num_(c.newsEvents);
  var articles = num_(c.newsArticleCount30d);

  if (articles <= REC_FILTER_SINGLE_NEWS_MAX_ARTICLES_ && newsH >= 3) return true;
  if (newsH >= REC_FILTER_MAX_NEWS_EVENTS_SINGLE_DRIVER_ && core < 24 && events < 2) return true;
  if (newsH >= 6 && core < 18 && events === 0) return true;

  if (filter === 'immediate' || filter === 'gov_beneficiary') {
    var newsSort = newsH * 0.5;
    var rank = num_(c.opportunityRank) || num_(c.conviction);
    if (newsH >= 4 && newsSort > rank * 0.35 && core < 22) return true;
  }
  return false;
}

/**
 * One order-book line item driving rank without quality backstop.
 * @param {Object} c
 * @param {string=} filter
 * @return {boolean}
 */
function isSingleOrderDrivenRanking_(c, filter) {
  var ob = num_(c.orderbookSignals);
  var core = recommendationCorePillarSum_(c);
  var events = recommendationStructuralEventScore_(c);
  var qs = num_(c.qualityScore);

  if (ob === 1 && events <= 1 && core < 20) return true;
  if (ob >= 1 && ob <= 2 && core < 16 && qs < 42 && num_(c.filingsSignals) === 0) return true;
  if (filter === 'immediate' && ob >= 1 && core < 18 &&
    !c.horizon1w && !c.horizon1m && num_(c.newsEvents) < 4) return true;
  return false;
}

/**
 * Stricter stale than legacy isRecommendationStale_.
 * @param {Object} c
 * @return {boolean}
 */
function isRecommendationStaleStrict_(c) {
  if (typeof isRecommendationStale_ === 'function' && isRecommendationStale_(c)) return true;
  if (!REC_FILTER_V2_ENABLED_) return false;

  var cfg = getRecommendationFilterConfig_();
  if (num_(c.priceAgeDays) >= cfg.max_price_age_days) return true;
  if (num_(c.fundamentalsAgeDays) >= cfg.max_fundamentals_age_days) return true;

  var staleStr = String(c.staleFlags || '').toUpperCase();
  if (staleStr.indexOf('MISSING') >= 0) return true;
  if (num_(c.dataCompletenessPct) > 0 && num_(c.dataCompletenessPct) < 45) return true;

  return false;
}

/**
 * Full false-positive filter evaluation.
 * @param {Object} c
 * @param {string=} filter
 * @return {{pass:boolean, reasons:Array<string>, flags:Object}}
 */
function evaluateRecommendationFalsePositiveFilters_(c, filter) {
  var reasons = [];
  var flags = {
    low_quality: false,
    weak_conviction: false,
    news_only: false,
    single_news_driven: false,
    single_order_driven: false,
    stale: false
  };

  if (isLowQualityRecommendation_(c)) {
    flags.low_quality = true;
    reasons.push('LOW_QUALITY');
  }
  if (isWeakConvictionRecommendation_(c)) {
    flags.weak_conviction = true;
    reasons.push('WEAK_CONVICTION');
  }
  if (typeof isNewsOnlyRecommendation_ === 'function' && isNewsOnlyRecommendation_(c)) {
    flags.news_only = true;
    reasons.push('NEWS_ONLY_THESIS');
  }
  if (isSingleNewsDrivenRanking_(c, filter)) {
    flags.single_news_driven = true;
    reasons.push('SINGLE_NEWS_DRIVEN');
  }
  if (isSingleOrderDrivenRanking_(c, filter)) {
    flags.single_order_driven = true;
    reasons.push('SINGLE_ORDER_DRIVEN');
  }
  if (isRecommendationStaleStrict_(c)) {
    flags.stale = true;
    reasons.push('STALE_RECOMMENDATION');
  }

  return { pass: reasons.length === 0, reasons: reasons, flags: flags };
}

/**
 * Sort-key multiplier down-ranks borderline drivers before pick.
 * @param {Object} c
 * @param {string} filter
 * @return {number}
 */
function recommendationFalsePositiveSortMultiplier_(c, filter) {
  var fp = evaluateRecommendationFalsePositiveFilters_(c, filter);
  if (!fp.pass) return 0.42;
  if (isWeakConvictionRecommendation_(c)) return 0.65;
  if (num_(c.newsEvents) >= 5 && recommendationCorePillarSum_(c) < 20) return 0.72;
  return 1;
}

/**
 * Menu — audit last 100 Tab 11 recommendations.
 */
function auditLast100Recommendations() {
  var report = runRecommendationAuditLast100_();
  var t = report.totals;
  SpreadsheetApp.getUi().alert(
    'Recommendation audit (last ' + report.audited_count + ')',
    'Would pass v2 filters: ' + t.would_pass + '\n' +
      'Would reject: ' + t.would_reject + '\n\n' +
      'Low quality: ' + t.low_quality + '\n' +
      'Weak conviction: ' + t.weak_conviction + '\n' +
      'News-only: ' + t.news_only + '\n' +
      'Single-news driven: ' + t.single_news_driven + '\n' +
      'Single-order driven: ' + t.single_order_driven + '\n' +
      'Stale: ' + t.stale + '\n\n' +
      'Tab 32 RECOMMENDATION AUDIT updated.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return report;
}

/**
 * @param {GoogleAppsScript.Spreadsheet=} ss
 * @param {number=} limit
 * @return {Object}
 */
function runRecommendationAuditLast100_(ss, limit) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  limit = limit || REC_AUDIT_LAST_N_;
  var universeMap = buildUniverseLookup_(ss);
  var tab11 = readTab11RowsExtended_(ss);
  var slice = tab11.length > limit ? tab11.slice(tab11.length - limit) : tab11.slice();
  var scoringMap = buildScoringCandidateMapForAudit_(ss, universeMap);
  enrichTab11RowsWithNews_(slice, buildNewsArticleCountBySymbol_(ss));

  var cfg = getRecommendationFilterConfig_();
  var rows = [];
  var totals = {
    audited_count: slice.length,
    would_pass: 0,
    would_reject: 0,
    low_quality: 0,
    weak_conviction: 0,
    news_only: 0,
    single_news_driven: 0,
    single_order_driven: 0,
    stale: 0,
    legacy_would_pass: 0
  };

  slice.forEach(function(row) {
    var sym = normalizeSymbolKey_(row.symbol);
    var c = scoringMap[sym] || { symbol: sym, conviction: row.conviction_total };
    c.newsArticleCount30d = row.news_articles_30d || c.newsArticleCount30d || 0;
    var filter = typeof recommendationFilterFromListName_ === 'function' ?
      recommendationFilterFromListName_(row.list_name) : '';

    var legacy = typeof evaluateRecommendationQualityLegacy_ === 'function' ?
      evaluateRecommendationQualityLegacy_(c) : { pass: true, reasons: [] };
    var v2 = typeof evaluateRecommendationQuality_ === 'function' ?
      evaluateRecommendationQuality_(c, filter) : { pass: true, reasons: [] };
    var fp = evaluateRecommendationFalsePositiveFilters_(c, filter);
    var combinedPass = v2.pass;
    var allReasons = v2.reasons.length ? v2.reasons : legacy.reasons.concat(fp.reasons);

    if (legacy.pass) totals.legacy_would_pass++;
    if (combinedPass) totals.would_pass++;
    else totals.would_reject++;

    if (fp.flags.low_quality) totals.low_quality++;
    if (fp.flags.weak_conviction) totals.weak_conviction++;
    if (fp.flags.news_only) totals.news_only++;
    if (fp.flags.single_news_driven) totals.single_news_driven++;
    if (fp.flags.single_order_driven) totals.single_order_driven++;
    if (fp.flags.stale) totals.stale++;

    rows.push({
      list_name: row.list_name,
      rank: row.rank,
      symbol: sym,
      conviction_total: row.conviction_total,
      data_quality_pct: num_(c.dataQualityPct),
      opportunity_rank: num_(c.opportunityRank) || row.conviction_total,
      legacy_pass: legacy.pass,
      v2_pass: combinedPass,
      v2_only_reject: legacy.pass && !combinedPass,
      reject_reasons: allReasons,
      flags: fp.flags,
      news_events: num_(c.newsEvents),
      orderbook_signals: num_(c.orderbookSignals),
      news_articles_30d: c.newsArticleCount30d,
      core_pillars: recommendationCorePillarSum_(c),
      last_updated: row.last_updated
    });
  });

  var reductionPct = totals.audited_count > 0 ?
    Math.round((1 - totals.would_pass / totals.audited_count) * 1000) / 10 : 0;
  var legacyReduction = totals.audited_count > 0 ?
    Math.round((1 - totals.legacy_would_pass / totals.audited_count) * 1000) / 10 : 0;

  var report = {
    generated_at: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    audited_count: slice.length,
    filter_config: cfg,
    totals: totals,
    estimated_rejection_rate_v2_pct: reductionPct,
    estimated_rejection_rate_legacy_pct: legacyReduction,
    estimated_false_positive_reduction_pct: Math.max(0, reductionPct - legacyReduction),
    rows: rows
  };

  writeRecommendationAuditSheet_(ss, report);
  try {
    PropertiesService.getScriptProperties().setProperty(REC_AUDIT_PROP_,
      JSON.stringify({
        generated_at: report.generated_at,
        totals: totals,
        filter_config: cfg,
        estimated_false_positive_reduction_pct: report.estimated_false_positive_reduction_pct
      }));
  } catch (e) {
    Logger.log('runRecommendationAuditLast100_: ' + e);
  }
  return report;
}

/**
 * @param {GoogleAppsScript.Spreadsheet} ss
 * @param {Object} universeMap
 * @return {Object}
 */
function buildScoringCandidateMapForAudit_(ss, universeMap) {
  if (typeof buildScoringCandidateMap_ === 'function') {
    return buildScoringCandidateMap_(ss);
  }
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  var map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 61;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    map[sym] = buildScoringCandidate_(r, universeMap);
  });
  return map;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function readTab11RowsExtended_(ss) {
  var sh = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sh || sh.getLastRow() < 2) return [];
  var numRows = sh.getLastRow() - 1;
  var colCount = Math.max(13, sh.getLastColumn());
  var data = sh.getRange(2, 1, numRows, colCount).getValues();
  var hasConf = colCount >= 11;
  return data.map(function(r) {
    return {
      list_name: String(r[0] || ''),
      rank: num_(r[1]),
      symbol: String(r[2] || ''),
      company_name: String(r[3] || ''),
      sector: String(r[4] || ''),
      conviction_total: num_(r[5]),
      bull_case: String(r[6] || ''),
      bear_case: String(r[7] || ''),
      catalyst: String(r[8] || ''),
      target_horizon: String(r[9] || ''),
      confidence: hasConf ? num_(r[10]) : 0,
      evidence: String(r[hasConf ? 11 : 10] || ''),
      last_updated: String(r[hasConf ? 12 : 11] || ''),
      news_articles_30d: 0
    };
  });
}

/**
 * @param {Array<Object>} rows
 * @param {Object} newsMap
 */
function enrichTab11RowsWithNews_(rows, newsMap) {
  rows.forEach(function(row) {
    var sym = normalizeSymbolKey_(row.symbol);
    row.news_articles_30d = newsMap[sym] || 0;
  });
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 */
function writeRecommendationAuditSheet_(ss, report) {
  var headers = [
    'audited_at', 'list_name', 'rank', 'symbol', 'conviction', 'opportunity_rank',
    'data_quality_pct', 'core_pillars', 'news_H', 'orderbook_90d', 'news_articles_30d',
    'legacy_pass', 'v2_pass', 'low_quality', 'weak_conviction', 'news_only',
    'single_news', 'single_order', 'stale', 'reject_reasons', 'last_updated'
  ];
  var sh = getOrCreateSheet_(REC_AUDIT_SHEET_);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  clearDataBelowHeader_(sh, headers.length);

  var out = (report.rows || []).map(function(r) {
    return [
      report.generated_at,
      r.list_name,
      r.rank,
      r.symbol,
      r.conviction_total,
      r.opportunity_rank,
      r.data_quality_pct,
      r.core_pillars,
      r.news_events,
      r.orderbook_signals,
      r.news_articles_30d,
      r.legacy_pass ? 'Y' : 'N',
      r.v2_pass ? 'Y' : 'N',
      r.flags.low_quality ? 'Y' : '',
      r.flags.weak_conviction ? 'Y' : '',
      r.flags.news_only ? 'Y' : '',
      r.flags.single_news_driven ? 'Y' : '',
      r.flags.single_order_driven ? 'Y' : '',
      r.flags.stale ? 'Y' : '',
      (r.reject_reasons || []).join(', '),
      r.last_updated
    ];
  });
  if (out.length) sh.getRange(2, 1, out.length, headers.length).setValues(out);
}
