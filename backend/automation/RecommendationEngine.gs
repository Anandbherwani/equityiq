/**
 * Tab 11 recommendation quality gates + audit.
 * v2 false-positive filters: RecommendationAuditEngine.gs
 * See docs/RECOMMENDATION_ENGINE_REVIEW.md, docs/RECOMMENDATION_FILTERS.md
 */

/** Minimum thresholds — symbols below any gate are excluded from Tab 11. */
var REC_FILTER_MIN_DATA_QUALITY_ = typeof DATA_QUALITY_TAB11_MIN_SCORE_ !== 'undefined' ?
  DATA_QUALITY_TAB11_MIN_SCORE_ : 60;
var REC_FILTER_MIN_CONFIDENCE_ = 50;
var REC_FILTER_MIN_CONVICTION_ = 20;
var REC_FILTER_MIN_QUALITY_SCORE_LEGACY_ = 35;

var REC_NEWS_LOOKBACK_DAYS_ = 30;
var REC_REVIEW_PROP_ = 'LAST_RECOMMENDATION_ENGINE_REVIEW_JSON';

/**
 * @param {Object} c scoring candidate
 * @return {{pass:boolean, reasons:Array<string>, confidence:number}}
 */
function evaluateRecommendationQuality_(c, filter) {
  var reasons = [];
  var cfg = typeof getRecommendationFilterConfig_ === 'function' ?
    getRecommendationFilterConfig_() : null;
  var minRank = cfg ? cfg.min_opportunity_rank : REC_FILTER_MIN_CONVICTION_;
  var minDq = cfg ? cfg.min_data_quality : REC_FILTER_MIN_DATA_QUALITY_;
  var minConf = cfg ? cfg.min_confidence : REC_FILTER_MIN_CONFIDENCE_;
  var minQs = cfg ? cfg.min_quality_score : REC_FILTER_MIN_QUALITY_SCORE_LEGACY_;

  var confidence = typeof computeRecommendationConfidence_ === 'function' ?
    computeRecommendationConfidence_(c) : Math.min(100, Math.round(c.conviction * 0.9));

  if (!c || !c.symbol) {
    return { pass: false, reasons: ['INVALID_SYMBOL'], confidence: 0 };
  }
  if (c.excluded) {
    reasons.push('EXCLUDED_WATCHLIST');
  }
  if (String(c.convictionStage || '').toUpperCase() === 'REJECTED') {
    reasons.push('ENGINE3_REJECTED');
  }
  if (num_(c.qualityScore) > 0 && num_(c.qualityScore) < minQs) {
    reasons.push('LOW_QUALITY_SCORE_' + num_(c.qualityScore));
  }
  var rank = num_(c.opportunityRank) || c.conviction;
  if (rank < minRank) {
    reasons.push('LOW_OPPORTUNITY_RANK_' + rank + '_LT_' + minRank);
  }
  var dq = num_(c.dataQualityPct);
  if (dq < minDq) {
    reasons.push('LOW_DATA_QUALITY_' + dq + '_LT_' + minDq);
  }
  if (confidence < minConf) {
    reasons.push('LOW_CONFIDENCE_' + confidence + '_LT_' + minConf);
  }
  if (isRecommendationStale_(c)) {
    reasons.push('STALE_DATA');
  }
  if (isNewsOnlyRecommendation_(c)) {
    reasons.push('NEWS_ONLY_THESIS');
  }
  if (typeof isExcessiveStockRisk_ === 'function' && isExcessiveStockRisk_(c)) {
    var rg = String(c.riskGrade || '').toUpperCase();
    var rd = num_(c.riskDanger) || (num_(c.riskScore) > 0 ? 100 - num_(c.riskScore) : 0);
    reasons.push('EXCESSIVE_RISK_' + rg + '_D' + Math.round(rd));
  }

  if (typeof evaluateRecommendationFalsePositiveFilters_ === 'function') {
    var fp = evaluateRecommendationFalsePositiveFilters_(c, filter || '');
    if (!fp.pass) {
      fp.reasons.forEach(function(r) {
        if (reasons.indexOf(r) < 0) reasons.push(r);
      });
    }
  }

  return {
    pass: reasons.length === 0,
    reasons: reasons,
    confidence: confidence
  };
}

/**
 * Pre-v2 gates only (for audit baseline — no FP classifiers).
 * @param {Object} c
 * @return {{pass:boolean, reasons:Array<string>}}
 */
function evaluateRecommendationQualityLegacy_(c) {
  var reasons = [];
  if (!c || !c.symbol) return { pass: false, reasons: ['INVALID_SYMBOL'] };
  if (c.excluded) reasons.push('EXCLUDED_WATCHLIST');
  if (String(c.convictionStage || '').toUpperCase() === 'REJECTED') reasons.push('ENGINE3_REJECTED');
  if (num_(c.qualityScore) > 0 && num_(c.qualityScore) < REC_FILTER_MIN_QUALITY_SCORE_LEGACY_) {
    reasons.push('LOW_QUALITY_SCORE');
  }
  var rank = num_(c.opportunityRank) || c.conviction;
  if (rank < REC_FILTER_MIN_CONVICTION_) reasons.push('LOW_OPPORTUNITY_RANK');
  if (num_(c.dataQualityPct) < REC_FILTER_MIN_DATA_QUALITY_) reasons.push('LOW_DATA_QUALITY');
  var confidence = typeof computeRecommendationConfidence_ === 'function' ?
    computeRecommendationConfidence_(c) : Math.min(100, Math.round(c.conviction * 0.9));
  if (confidence < REC_FILTER_MIN_CONFIDENCE_) reasons.push('LOW_CONFIDENCE');
  if (isRecommendationStale_(c)) reasons.push('STALE_DATA');
  if (isNewsOnlyRecommendation_(c)) reasons.push('NEWS_ONLY_THESIS');
  if (typeof isExcessiveStockRisk_ === 'function' && isExcessiveStockRisk_(c)) {
    reasons.push('EXCESSIVE_RISK');
  }
  return { pass: reasons.length === 0, reasons: reasons };
}

/**
 * @param {Object} c
 * @return {boolean}
 */
function passesRecommendationQualityGate_(c, filter) {
  return evaluateRecommendationQuality_(c, filter).pass;
}

/**
 * @param {Object} c
 * @return {boolean}
 */
function isRecommendationStale_(c) {
  var staleStr = String(c.staleFlags || '').toUpperCase();
  if (staleStr.indexOf('TAB2_STALE') >= 0 || staleStr.indexOf('TAB6_STALE_FLAG') >= 0) return true;
  if (staleStr.indexOf('TAB6_STALE') >= 0) return true;
  if (num_(c.fundamentalsAgeDays) >= (typeof FUNDAMENTALS_STALE_ZERO_DAYS !== 'undefined' ?
    FUNDAMENTALS_STALE_ZERO_DAYS : 180)) return true;
  if (num_(c.priceAgeDays) >= (typeof PRICE_STALE_ZERO_DAYS !== 'undefined' ?
    PRICE_STALE_ZERO_DAYS : 30)) return true;
  return false;
}

/**
 * Reject picks driven mainly by a single news headline / news_events with weak pillars.
 * @param {Object} c
 * @return {boolean}
 */
function isNewsOnlyRecommendation_(c) {
  var core = num_(c.fundamentals) + num_(c.financialStrength) + num_(c.growth) +
    num_(c.valuation) + num_(c.businessMoat) + num_(c.technicalMomentum) + num_(c.institutional);
  var events = num_(c.orderbookSignals) + num_(c.filingsSignals) +
    (c.promoterBuy ? 2 : 0) + num_(c.revisionUpgrades);

  if (num_(c.newsEvents) < 4) return false;
  if (core >= 20 || events >= 2) return false;

  if (num_(c.newsArticleCount30d) === 1 && num_(c.newsEvents) >= 3) return true;
  if (num_(c.newsEvents) >= 6 && core < 14 && events === 0) return true;
  if (num_(c.newsEvents) >= 4 && core < 10 && events === 0 &&
    num_(c.fundamentals) < 5 && num_(c.financialStrength) < 5) return true;
  return false;
}

/**
 * Tab 7 headline count per symbol (30d).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number=} days
 * @return {Object}
 */
function buildNewsArticleCountBySymbol_(ss, days) {
  days = days || REC_NEWS_LOOKBACK_DAYS_;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  var map = {};
  loadSheetData_(ss, '7. NEWS FLOW').forEach(function(r) {
    var sym = normalizeSymbolKey_(r[10]);
    var d = parseSheetDate_(r[0]);
    if (!sym || !d || d < cutoff) return;
    map[sym] = (map[sym] || 0) + 1;
  });
  return map;
}

/**
 * Attach news counts to candidate array.
 * @param {Array<Object>} candidates
 * @param {Object} newsCounts
 */
function enrichCandidatesWithNewsCounts_(candidates, newsCounts) {
  newsCounts = newsCounts || {};
  candidates.forEach(function(c) {
    c.newsArticleCount30d = newsCounts[c.symbol] || 0;
  });
}

/**
 * Human-readable pillar breakdown for Tab 11 / API.
 * @param {Object} c
 * @return {string}
 */
function buildScoreBreakdown_(c) {
  if (!c) return '';
  var e3 = num_(c.qualityScore) > 0 ?
    ' E3 Q' + num_(c.qualityScore) + ' V' + num_(c.valuationScore) + ' C' + num_(c.catalystScore) +
    ' α' + num_(c.alphaScore) + ' [' + (c.convictionStage || '') + ']' : '';
  var peer = num_(c.relativeQualityScore) > 0 ?
    ' Peer Q' + num_(c.relativeQualityScore) + ' V' + num_(c.relativeValuationScore) +
    ' G' + (num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore)) : '';
  var th = num_(c.themeConvictionScore) > 0 ?
    ' ThemeConv ' + num_(c.themeConvictionScore) + ' [' + (c.primaryThemeId || '') + ']' +
    (num_(c.themeStrength) > 0 ? ' S' + num_(c.themeStrength) : '') +
    (num_(c.themeMomentum) > 0 ? ' M' + num_(c.themeMomentum) : '') : '';
  var rk = num_(c.riskScore) > 0 ?
    ' Risk ' + num_(c.riskScore) + ' [' + (c.riskGrade || '') + ']' +
    (num_(c.rewardRiskRatio) > 0 ? ' R/R ' + num_(c.rewardRiskRatio) : '') : '';
  return [
    'C' + num_(c.fundamentals) + '/15',
    'K' + num_(c.businessMoat) + '/10',
    'D' + num_(c.valuation) + '/15',
    'E' + num_(c.growth) + '/15',
    'F' + num_(c.financialStrength) + '/15',
    'G' + num_(c.sectorStrength) + '/10',
    'H' + num_(c.newsEvents) + '/10',
    'I' + num_(c.technicalMomentum) + '/5',
    'J' + num_(c.institutional) + '/5',
    'M' + (num_(c.opportunityRank) || num_(c.conviction)) + '/100' + e3 + peer + th + rk
  ].join(' ');
}

/**
 * @param {Object} c
 * @param {string} filter
 * @param {number} sortKey
 * @return {string}
 */
function buildWhyRanked_(c, filter, sortKey) {
  var parts = [];
  parts.push('List sort key ' + (sortKey != null ? sortKey : '—') + ' on filter "' + filter + '"');
  if (c.sectorRank > 0 && c.sectorRank <= 10) parts.push('sector rank #' + c.sectorRank);
  if (c.orderbookSignals > 0) parts.push('orderbook x' + c.orderbookSignals);
  if (c.filingsSignals > 0) parts.push('filings x' + c.filingsSignals);
  if (c.promoterBuy) parts.push('promoter buy 90d');
  if (c.revisionUpgrades > 0) parts.push('analyst upgrades x' + c.revisionUpgrades);
  if (c.dataGateFlag) parts.push('data gate pass');
  if (num_(c.dataQualityPct) > 0) parts.push('DQ ' + Math.round(num_(c.dataQualityPct)) + '%');
  return parts.join('; ');
}

/**
 * @param {Object} c
 * @param {string} filter
 * @param {number} sortKey
 * @param {Object} qualityEval
 * @return {Object}
 */
function buildRecommendationNarrativeV2_(c, filter, sortKey, qualityEval) {
  qualityEval = qualityEval || evaluateRecommendationQuality_(c);
  if (typeof buildAnalystRecommendationNote_ === 'function' &&
    typeof mapAnalystNoteToNarrative_ === 'function') {
    var listName = typeof recommendationListNameFromFilter_ === 'function' ?
      recommendationListNameFromFilter_(filter) : '';
    var note = buildAnalystRecommendationNote_(c, filter, sortKey, listName);
    var nar = mapAnalystNoteToNarrative_(note, c, qualityEval);
    nar.why_ranked = buildWhyRanked_(c, filter, sortKey);
    nar.score_breakdown = buildScoreBreakdown_(c);
    nar.data_quality_pct = num_(c.dataQualityPct);
    return nar;
  }

  var base = typeof buildRecommendationNarrative_ === 'function' ?
    buildRecommendationNarrative_(SpreadsheetApp.getActiveSpreadsheet(), c) :
    { bull: '', bear: '', catalyst: '', horizon: '3m', confidence: 50, evidence: '' };
  var breakdown = buildScoreBreakdown_(c);
  var why = buildWhyRanked_(c, filter, sortKey);
  var bull = 'Why ranked: ' + why + '. ' + base.bull;
  var evidence = 'Breakdown: ' + breakdown +
    ' | DQ ' + Math.round(num_(c.dataQualityPct)) + '%' +
    ' | Conf ' + qualityEval.confidence + '%' +
    (base.evidence ? ' | ' + base.evidence : '');

  return {
    bull: bull,
    bear: base.bear,
    catalyst: base.catalyst,
    horizon: base.horizon,
    confidence: qualityEval.confidence,
    evidence: evidence,
    why_ranked: why,
    score_breakdown: breakdown,
    data_quality_pct: num_(c.dataQualityPct),
    filter_pass: qualityEval.pass,
    filter_reasons: qualityEval.reasons
  };
}

/**
 * Audit current Tab 11 + simulation; store JSON in script properties.
 * @return {Object}
 */
function runRecommendationEngineReview() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = buildRecommendationEngineReviewReport_(ss);
  try {
    PropertiesService.getScriptProperties().setProperty(REC_REVIEW_PROP_,
      JSON.stringify(report).substring(0, 9000));
  } catch (e) {
    Logger.log('runRecommendationEngineReview: property save failed ' + e);
  }
  writeRecommendationReviewSheet_(ss, report);
  return report;
}

/**
 * Menu wrapper.
 */
function auditTab11Recommendations() {
  var report = runRecommendationEngineReview();
  var msg = 'Tab 11 audit complete.\n\n' +
    'Lists: ' + report.lists.length + '\n' +
    'Live rows: ' + report.tab11_row_count + '\n' +
    'Passed filters: ' + report.totals.passed_gate + '\n' +
    'Rejected: ' + report.totals.rejected + '\n\n' +
    'See sheet **RECOMMENDATION REVIEW** and docs/RECOMMENDATION_ENGINE_REVIEW.md';
  SpreadsheetApp.getUi().alert(msg.substring(0, 1800));
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildRecommendationEngineReviewReport_(ss) {
  var universeMap = buildUniverseLookup_(ss);
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  var candidates = [];
  if (scoreSheet && scoreSheet.getLastRow() >= 2) {
    var numRows = scoreSheet.getLastRow() - 1;
    var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
    candidates = data.map(function(r) {
      return buildScoringCandidate_(r, universeMap);
    }).filter(function(c) { return c.symbol && !c.excluded; });
  }
  enrichCandidatesWithNewsCounts_(candidates, buildNewsArticleCountBySymbol_(ss));

  var macroRows = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  var sectorLookup = buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH'));
  var tab11Rows = readTab11Rows_(ss);
  var lists = [];

  RECOMMENDATION_LIST_DEFS.forEach(function(listDef) {
    var allForList = candidates.filter(function(c) {
      return passesListFilterLoose_(c, listDef.filter, macroRows, sectorLookup);
    });
    var picked = pickRecommendationCandidates_(candidates, listDef.filter, macroRows, sectorLookup, 10);
    var rejected = [];
    allForList.forEach(function(c) {
      var ev = evaluateRecommendationQuality_(c, listDef.filter);
      if (!ev.pass) {
        rejected.push({
          symbol: c.symbol,
          conviction: c.conviction,
          data_quality_pct: c.dataQualityPct,
          confidence: ev.confidence,
          reasons: ev.reasons
        });
      }
    });

    var items = picked.map(function(c, idx) {
      var sk = recommendationSortKey_(c, listDef.filter);
      var ev = evaluateRecommendationQuality_(c, listDef.filter);
      var nar = buildRecommendationNarrativeV2_(c, listDef.filter, sk, ev);
      return {
        rank: idx + 1,
        symbol: c.symbol,
        company_name: c.companyName,
        sector: c.sector,
        conviction_total: c.conviction,
        data_quality_pct: c.dataQualityPct,
        confidence: nar.confidence,
        why_ranked: nar.why_ranked,
        score_breakdown: nar.score_breakdown,
        catalyst: nar.catalyst,
        risk: nar.bear,
        bull_case: nar.bull,
        filter_pass: ev.pass,
        filter_reasons: ev.reasons,
        stale: isRecommendationStale_(c),
        news_only: isNewsOnlyRecommendation_(c),
        news_articles_30d: c.newsArticleCount30d
      };
    });

    lists.push({
      list_name: listDef.name,
      filter: listDef.filter,
      picked_count: items.length,
      rejected_sample: rejected.slice(0, 15),
      rejected_count: rejected.length,
      items: items
    });
  });

  var passed = 0;
  var rejected = 0;
  lists.forEach(function(l) {
    l.items.forEach(function(it) {
      if (it.filter_pass) passed++;
      else rejected++;
    });
  });

  return {
    generated_at: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    engine_version: typeof SCORING_ENGINE_VERSION !== 'undefined' ? SCORING_ENGINE_VERSION : '2.1',
    filters: {
      min_data_quality_pct: REC_FILTER_MIN_DATA_QUALITY_,
      min_confidence_pct: REC_FILTER_MIN_CONFIDENCE_,
      min_conviction: REC_FILTER_MIN_CONVICTION_
    },
    tab11_row_count: tab11Rows.length,
    tab11_live: tab11Rows,
    candidate_count: candidates.length,
    totals: { passed_gate: passed, rejected: rejected },
    lists: lists
  };
}

/**
 * Loose list predicate (pre quality gate) for rejection stats.
 */
function passesListFilterLoose_(c, filter, macroRows, sectorLookup) {
  var beneficiarySyms = buildMacroBeneficiarySymbolSet_(macroRows, [c]);
  if (filter === 'immediate') {
    return (c.horizon1w || c.horizon1m || c.orderbookSignals > 0 || c.filingsSignals > 0);
  }
  if (filter === 'three_month') {
    return c.horizon3m || (c.sectorRank > 0 && c.sectorRank <= 10);
  }
  if (filter === 'compounders') {
    return c.fundamentals >= 12 || c.financialStrength >= 6;
  }
  if (filter === 'monopoly') {
    return c.businessMoat >= 5 || c.fundamentals >= 12;
  }
  if (filter === 'gov_beneficiary') {
    return c.sectorStrength >= 4;
  }
  if (filter === 'turnaround') {
    return c.valuation >= 3 && !c.pumpFlag;
  }
  return true;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function readTab11Rows_(ss) {
  var sh = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sh || sh.getLastRow() < 2) return [];
  var numRows = sh.getLastRow() - 1;
  var data = sh.getRange(2, 1, numRows, 13).getValues();
  return data.map(function(r) {
    return {
      list_name: String(r[0] || ''),
      rank: num_(r[1]),
      symbol: String(r[2] || ''),
      conviction_total: num_(r[5]),
      confidence: num_(r[10]),
      catalyst: String(r[8] || ''),
      risk: String(r[7] || ''),
      bull_case: String(r[6] || '').substring(0, 200)
    };
  });
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 */
function writeRecommendationReviewSheet_(ss, report) {
  var name = 'RECOMMENDATION REVIEW';
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  var rows = [['list_name', 'rank', 'symbol', 'conviction', 'data_quality_pct', 'confidence',
    'why_ranked', 'score_breakdown', 'catalyst', 'risk', 'filter_pass', 'filter_reasons']];
  report.lists.forEach(function(list) {
    list.items.forEach(function(it) {
      rows.push([
        list.list_name, it.rank, it.symbol, it.conviction_total, it.data_quality_pct,
        it.confidence, it.why_ranked, it.score_breakdown, it.catalyst, it.risk,
        it.filter_pass, (it.filter_reasons || []).join(',')
      ]);
    });
  });
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.setFrozenRows(1);
}
