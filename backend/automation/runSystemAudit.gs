/**
 * Live system audit — run in your Google Sheet (reads real row counts).
 * Menu: Stock Tracker → Run full system audit
 * Does not call Perplexity unless optional probe flag and API key set.
 */

var LAST_SYSTEM_AUDIT_JSON_PROP = 'LAST_SYSTEM_AUDIT_JSON';
var AUDIT_SNAPSHOT_SHEET = 'AUDIT SNAPSHOT';
var AUDIT_SAMPLE_SYMBOLS = ['RELIANCE', 'TCS', 'BEL', 'HAL'];

var AUDIT_REQUIRED_FUNCTIONS_ = [
  'setupAllSheets', 'syncScoringFromUniverse', 'rebuildScoringPipeline',
  'fetchNewsRss', 'runNewsIntelligencePipeline', 'syncRankedWatchlist',
  'fixRankedWatchlistHeaders', 'migrateRankedWatchlistHeaders_',
  'generateRecommendations_', 'populateQuantitativeScores_',
  'reconcileConvictionColumn_', 'importScreenerCsvToFundamentals',
  'mergeScreenerGridIntoFundamentals_', 'applyScoringDataMetrics_',
  'normalizeSectorName_', 'scoreFundamentalsFromFundamentals_',
  'writeExtractedEventsToSheets_',
  'computeHelperSignalsInternal_', 'applyAutoSubScores_', 'pickRecommendationCandidates_',
  'dailyMaintenance', 'installDailyTriggers', 'dailyDataRefresh6am', 'dailyBriefing8am',
  'installDailyAutomationTriggers'
];

var AUDIT_DEAD_FUNCTIONS_ = [
  { name: 'computeHelperSignals', reason: 'Menu alias only; calls computeScoringHelpers → computeHelperSignalsInternal_' }
];

var AUDIT_ROW_COUNT_SHEETS_ = [
  '1. UNIVERSE', '6. FUNDAMENTALS', '2. PRICE & TECHNICALS', '4. BULK & LARGE DEALS',
  '24. SHAREHOLDING PATTERN',
  '7. NEWS FLOW', '9. GEOPOLITICS FLAGS', '14. INDIA IMPACT LOG',
  '15. FILINGS', '16. ORDER BOOK TRACKER', '17. ANALYST REVISIONS',
  '18. PROMOTER ACTIVITY', '19. SECTOR STRENGTH', '20. MACRO BENEFICIARIES',
  '10. SCORING MODEL', '11. RANKED WATCHLIST',
  '21. ANALYSIS_OUTPUT', '12. ALERTS LOG'
];

/**
 * Entry point — menu: Run full system audit
 * @param {Object=} options
 * @param {boolean=} options.probePerplexity If true and key set, HEAD request only (no extraction spend)
 */
function runFullSystemAudit(options) {
  options = options || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date();
  var ts = Utilities.formatDate(now, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");

  var report = {
    timestampIst: ts,
    spreadsheetName: ss.getName(),
    overall: 'PASS',
    failCount: 0,
    partialCount: 0,
    stages: {}
  };

  report.stages.A_setup = auditStageSetup_(ss);
  report.stages.B_rowCounts = auditStageRowCounts_(ss);
  report.stages.B_fundamentals = auditStageFundamentals_(ss);
  report.stages.H_dataIngestion = auditStageDataIngestion_(ss);
  report.stages.C_sampleSymbols = auditStageSampleSymbols_(ss);
  report.stages.C_universeSector = auditStageUniverseSector_(ss);
  report.stages.F_convictionDistribution = auditStageConvictionDistribution_(ss);
  report.stages.G_dataQuality = auditStageDataQuality_(ss);
  report.stages.I_recommendationHistory = typeof auditStageRecommendationHistoryHealth_ === 'function' ?
    auditStageRecommendationHistoryHealth_(ss) :
    { status: 'PARTIAL', note: 'RecommendationHistoryEngine.gs not deployed' };
  report.stages.J_pillarCoverage = typeof computePillarCoverageScorecards_ === 'function' ?
    auditStagePillarCoverage_(ss) :
    { status: 'PARTIAL', note: 'DataCoverageEngine.gs not deployed' };
  report.stages.D_triggers = auditStageTriggers_();
  report.stages.E_integrations = auditStageIntegrations_(ss, options);

  aggregateAuditVerdict_(report);

  var json = JSON.stringify(report);
  PropertiesService.getScriptProperties().setProperty(LAST_SYSTEM_AUDIT_JSON_PROP, json);
  Logger.log('FULL_SYSTEM_AUDIT\n' + json);

  writeAuditSnapshot_(ss, report);
  showAuditSummaryAlert_(report);

  return report;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageSetup_(ss) {
  var expected = SHEET_DEFS.length;
  var missing = [];
  var headerMismatch = [];

  SHEET_DEFS.forEach(function(def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      missing.push(def.name);
      return;
    }
    if (sheet.getLastRow() < 1) {
      headerMismatch.push(def.name + ': no header row');
      return;
    }
    var existing = sheet.getRange(1, 1, 1, def.headers.length).getValues()[0];
    def.headers.forEach(function(h, i) {
      if (String(existing[i] || '').trim() !== h) {
        headerMismatch.push(def.name + ': col ' + (i + 1) + ' expected "' + h + '"');
      }
    });
  });

  var fnCheck = {};
  AUDIT_REQUIRED_FUNCTIONS_.forEach(function(fn) {
    fnCheck[fn] = auditFunctionExists_(fn);
  });

  var missingFns = Object.keys(fnCheck).filter(function(k) { return !fnCheck[k]; });
  var status = 'PASS';
  if (missing.length || missingFns.length) status = 'FAIL';
  else if (headerMismatch.length) status = 'PARTIAL';

  return {
    status: status,
    sheetsExpected: expected,
    sheetsMissing: missing,
    headerMismatches: headerMismatch.slice(0, 20),
    functionsChecked: fnCheck,
    functionsMissing: missingFns
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageRowCounts_(ss) {
  var counts = {};
  var missing = [];

  AUDIT_ROW_COUNT_SHEETS_.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      counts[name] = { exists: false, dataRows: 0 };
      missing.push(name);
      return;
    }
    var last = sheet.getLastRow();
    counts[name] = { exists: true, dataRows: Math.max(0, last - 1) };
  });

  var status = 'PASS';
  if (missing.length) status = 'FAIL';
  else if ((counts['10. SCORING MODEL'] || {}).dataRows === 0) status = 'PARTIAL';

  return { status: status, counts: counts, sheetsMissing: missing };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageSampleSymbols_(ss) {
  var universe = loadSheetData_(ss, '1. UNIVERSE');
  var scoring = loadSheetData_(ss, '10. SCORING MODEL');
  var sectorRows = loadSheetData_(ss, '19. SECTOR STRENGTH');
  var universeBySym = buildUniverseBySymbol_(universe);
  var sectorLookup = buildSectorStrengthLookup_(sectorRows);

  var scoringBySym = {};
  scoring.forEach(function(r) {
    var k = normalizeSymbolKey_(r[0]);
    if (k) scoringBySym[k] = r;
  });

  var universeByKey = {};
  universe.forEach(function(r) {
    var k = normalizeSymbolKey_(r[0]);
    if (k) universeByKey[k] = r;
  });

  var symbols = {};
  AUDIT_SAMPLE_SYMBOLS.forEach(function(sym) {
    var key = normalizeSymbolKey_(sym);
    var uRow = universeByKey[key];
    var sRow = scoringBySym[key];
    var convictionAudit = sRow ? auditScoringConviction_(sRow) : null;
    var sectorInfo = resolveSectorStrengthForSymbol_(key, universeBySym, sectorLookup);
    var u = universeBySym[key];

    symbols[sym] = {
      inUniverse: !!uRow,
      universeSector: uRow ? String(uRow[3] || '') : '',
      universeSectorKey: u ? u.sectorKey : '',
      inScoringTab10: !!sRow,
      colsC_M: convictionAudit ? convictionAudit.colsC_M : null,
      convictionAudit: convictionAudit,
      helpersN_R: sRow ? {
        N_filings_30d: num_(sRow[13]),
        O_orderbook_90d: num_(sRow[14]),
        P_promoter_buy: sRow[15],
        Q_revisions_60d: num_(sRow[16]),
        R_sector_rank: num_(sRow[17])
      } : null,
      sectorMatchTab19: sectorInfo ? {
        rank: sectorInfo.rank,
        narrative: sectorInfo.narrative,
        macro: sectorInfo.macro,
        flow: sectorInfo.flow
      } : null,
      sectorJoinOk: !!sectorInfo
    };
  });

  var withScoring = AUDIT_SAMPLE_SYMBOLS.filter(function(s) {
    return symbols[s].inScoringTab10;
  }).length;
  var withConviction = AUDIT_SAMPLE_SYMBOLS.filter(function(s) {
    var ca = symbols[s].convictionAudit;
    return ca && ca.m_effective > 0;
  }).length;
  var staleMCount = AUDIT_SAMPLE_SYMBOLS.filter(function(s) {
    return symbols[s].convictionAudit && symbols[s].convictionAudit.m_stale;
  }).length;

  var status = 'PASS';
  if (withScoring === 0) status = 'FAIL';
  else if (withConviction < 2) status = 'PARTIAL';

  return {
    status: status,
    symbols: symbols,
    inScoringCount: withScoring,
    withConvictionCount: withConviction,
    staleMCount: staleMCount
  };
}

/**
 * Tab 10 conviction: sheet M vs sum(C–J) — Scoring Engine 2.0.
 * @param {Array} r
 * @return {Object}
 */
function auditScoringConviction_(r) {
  var colsC_M = {
    C_fundamentals: num_(r[2]),
    D_valuation: num_(r[3]),
    E_growth: num_(r[4]),
    F_financial_strength: num_(r[5]),
    G_sector_strength: num_(r[6]),
    H_news_events: num_(r[7]),
    I_technical_momentum: num_(r[8]),
    J_institutional_flow: num_(r[9]),
    M_conviction_total: num_(r[12])
  };
  var mRecomputed = calculateConvictionFromRow_(r);
  var mSheet = colsC_M.M_conviction_total;
  var mStale = mSheet > 0 && mRecomputed === 0;
  return {
    colsC_M: colsC_M,
    m_sheet: mSheet,
    m_recomputed: mRecomputed,
    m_effective: mStale ? 0 : Math.max(mSheet, mRecomputed),
    m_stale: mStale,
    m_is_formula: typeof r[12] === 'string' && String(r[12]).indexOf('=') === 0
  };
}

/**
 * Tab 4 / 6 / 24 ingestion health + last pipeline log.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageDataIngestion_(ss) {
  var tab4 = countSheetDataRows_(ss, '4. BULK & LARGE DEALS');
  var tab6 = countSheetDataRows_(ss, '6. FUNDAMENTALS');
  var tab24 = countSheetDataRows_(ss, '24. SHAREHOLDING PATTERN');
  var lastRun = null;
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('LAST_DATA_INGESTION_JSON');
    if (raw) lastRun = JSON.parse(raw);
  } catch (ignore) {}

  var coverage = typeof computeIngestionUniverseCoverage_ === 'function' ?
    computeIngestionUniverseCoverage_(ss) : null;
  var covPct = coverage ? coverage.weighted_coverage_pct : 0;
  var targetPct = typeof INGESTION_V2_COVERAGE_TARGET_PCT_ !== 'undefined' ?
    INGESTION_V2_COVERAGE_TARGET_PCT_ : 80;

  var status = 'PASS';
  if (tab4 === 0 && tab24 === 0) status = 'FAIL';
  else if (tab4 < 10 || tab6 < 20 || tab24 < 10) status = 'PARTIAL';
  if (coverage && covPct < targetPct) {
    status = status === 'PASS' ? 'PARTIAL' : status;
  }

  return {
    status: status,
    tab4Rows: tab4,
    tab6Rows: tab6,
    tab24Rows: tab24,
    ingestionEngine: lastRun && lastRun.engine === 'v2' ? 'v2' : 'v1',
    weightedCoveragePct: covPct,
    coverageTargetPct: targetPct,
    meetsCoverageTarget: coverage ? coverage.meets_target : false,
    coverageBreakdown: coverage ? coverage.breakdown : null,
    lastIngestion: lastRun,
    note: tab4 === 0 ? 'Run Stock Tracker → Data ingestion → Run ingestion v2' :
      (covPct < targetPct ? 'Coverage ' + covPct + '% < ' + targetPct + '% — run daily v2 ~12 sessions' : '')
  };
}

/**
 * Tab 6 coverage, stale rows, Tab 10 data_gate pass count.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageFundamentals_(ss) {
  var fundRows = loadSheetData_(ss, '6. FUNDAMENTALS');
  var universe = loadSheetData_(ss, '1. UNIVERSE');
  var scoring = loadSheetData_(ss, '10. SCORING MODEL');

  var staleCount = 0;
  var emptySector = 0;
  fundRows.forEach(function(r) {
    if (r[24] === true || r[24] === 'TRUE') staleCount++;
    if (!String(r[14] || r[13] || '').trim()) emptySector++;
  });

  var universeEmptySector = 0;
  universe.forEach(function(r) {
    if (!String(r[3] || '').trim()) universeEmptySector++;
  });

  var dataGatePass = 0;
  scoring.forEach(function(r) {
    if (r[33] === true || r[33] === 'TRUE') dataGatePass++;
  });

  var status = 'PASS';
  if (fundRows.length === 0) status = 'PARTIAL';
  else if (fundRows.length < 50) status = 'PARTIAL';
  if (universe.length && universeEmptySector / universe.length > 0.5) {
    status = status === 'PASS' ? 'PARTIAL' : status;
  }

  return {
    status: status,
    tab6DataRows: fundRows.length,
    tab6StaleRows: staleCount,
    tab6EmptySectorRows: emptySector,
    universeEmptySectorRows: universeEmptySector,
    tab10DataGatePass: dataGatePass,
    tab10ScoringRows: scoring.length,
    note: 'Import Screener CSV weekly; rebuild pipeline after merge.'
  };
}

/**
 * Tab 10 data quality columns (Phase 5): avg DQ %, missing/stale counts.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageDataQuality_(ss) {
  var scoring = loadSheetData_(ss, '10. SCORING MODEL');
  if (!scoring.length) {
    return { status: 'FAIL', avgDataQualityPct: 0, rowsWithDq: 0, missingAny: 0, staleAny: 0 };
  }

  var sum = 0;
  var withDq = 0;
  var missingAny = 0;
  var staleAny = 0;
  var lowDq = 0;

  scoring.forEach(function(r) {
    var dq = num_(r[41]);
    if (dq > 0) {
      withDq++;
      sum += dq;
    }
    if (String(r[38] || '').trim()) missingAny++;
    if (String(r[39] || '').trim()) staleAny++;
    if (dq > 0 && dq < 40) lowDq++;
  });

  var avg = withDq ? Math.round(sum / withDq) : 0;
  var status = 'PASS';
  if (withDq < scoring.length * 0.1) status = 'FAIL';
  else if (avg < 40 || lowDq > scoring.length * 0.8) status = 'PARTIAL';

  return {
    status: status,
    avgDataQualityPct: avg,
    rowsWithDq: withDq,
    tab10Rows: scoring.length,
    rowsWithMissingFlags: missingAny,
    rowsWithStaleFlags: staleAny,
    rowsLowDqUnder40: lowDq,
    note: 'Run rebuild after Tab 6 import. See shared/scoring/DATA_QUALITY.md'
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageUniverseSector_(ss) {
  var universe = loadSheetData_(ss, '1. UNIVERSE');
  var total = universe.length;
  var emptySector = 0;
  universe.forEach(function(r) {
    if (!String(r[3] || '').trim()) emptySector++;
  });
  var sampleEmpty = AUDIT_SAMPLE_SYMBOLS.filter(function(sym) {
    var key = normalizeSymbolKey_(sym);
    for (var i = 0; i < universe.length; i++) {
      if (normalizeSymbolKey_(universe[i][0]) === key) {
        return !String(universe[i][3] || '').trim();
      }
    }
    return true;
  }).length;

  var status = 'PASS';
  if (total === 0) status = 'FAIL';
  else if (emptySector / total > 0.5 || sampleEmpty >= 3) status = 'PARTIAL';

  return {
    status: status,
    universeDataRows: total,
    emptySectorRows: emptySector,
    sampleSymbolsEmptySector: sampleEmpty,
    note: 'Empty UNIVERSE sector blocks Tab 19 join (sectorJoinOk false). Merge Screener sector column.'
  };
}

/**
 * Tab 10 column M distribution (all rows, not audit samples only).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageConvictionDistribution_(ss) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) {
    return {
      status: 'PARTIAL',
      tab10DataRows: 0,
      count_gt0: 0,
      count_gt10: 0,
      count_gt20: 0,
      count_gt40: 0,
      max_conviction: 0,
      top20: []
    };
  }

  var n = sheet.getLastRow() - 1;
  var block = sheet.getRange(2, 1, n, SCORING_NUM_COLS).getValues();
  var rows = [];
  var staleCount = 0;
  block.forEach(function(r) {
    var sym = String(r[0] || '').trim();
    if (!sym) return;
    var ca = auditScoringConviction_(r);
    if (ca.m_stale) staleCount++;
    rows.push({ symbol: sym, m: ca.m_effective, m_sheet: ca.m_sheet, m_stale: ca.m_stale });
  });
  rows.sort(function(a, b) { return b.m - a.m; });

  var gt = function(t) {
    return rows.filter(function(x) { return x.m > t; }).length;
  };
  var countGt0 = gt(0);
  var countGt10 = gt(10);
  var countGt20 = gt(20);
  var countGt40 = gt(40);
  var countGt60 = gt(60);
  var maxM = rows.length ? rows[0].m : 0;
  var top20 = rows.slice(0, 20).map(function(x) {
    return { symbol: x.symbol, conviction_total: x.m };
  });

  Logger.log(
    'AUDIT conviction distribution Tab10 rows=' + rows.length +
    ' gt0=' + countGt0 + ' gt10=' + countGt10 + ' gt20=' + countGt20 +
    ' gt40=' + countGt40 + ' gt60=' + countGt60 + ' max=' + maxM
  );

  var status = 'PASS';
  if (rows.length === 0) status = 'PARTIAL';
  else if (countGt0 === 0) status = 'PARTIAL';
  else if (countGt0 / rows.length < 0.05) status = 'PARTIAL';

  return {
    status: status,
    tab10DataRows: rows.length,
    count_gt0: countGt0,
    count_gt10: countGt10,
    count_gt20: countGt20,
    count_gt40: countGt40,
    count_gt60: countGt60,
    max_conviction: maxM,
    stale_m_count: staleCount,
    top20: top20
  };
}

/**
 * @return {Object}
 */
function auditStageTriggers_() {
  var triggers = ScriptApp.getProjectTriggers().map(function(t) {
    return {
      handler: t.getHandlerFunction(),
      type: String(t.getEventType()),
      source: t.getTriggerSource() ? String(t.getTriggerSource()) : ''
    };
  });

  var has6 = triggers.some(function(t) {
    return t.handler === 'dailyDataRefresh6am' || t.handler === 'dailyMaintenance';
  });
  var has8 = triggers.some(function(t) {
    return t.handler === 'dailyBriefing8am';
  });
  var hasRss = triggers.some(function(t) {
    return t.handler === 'fetchNewsRss';
  });

  var status = (has6 && has8) ? 'PASS' : ((has6 || has8) ? 'PARTIAL' : (triggers.length ? 'PARTIAL' : 'FAIL'));

  return {
    status: status,
    count: triggers.length,
    has6amDataRefresh: has6,
    has8amBriefing: has8,
    hasDailyMaintenance: has6,
    hasFetchNewsRss: hasRss,
    triggers: triggers
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} options
 * @return {Object}
 */
function auditStageIntegrations_(ss, options) {
  var props = PropertiesService.getScriptProperties();
  var hasKey = !!String(props.getProperty('PERPLEXITY_API_KEY') || '').trim();
  var runDaily = props.getProperty('RUN_PERPLEXITY_DAILY');
  var lastNews = props.getProperty(LAST_NEWS_PIPELINE_SUMMARY_PROP);

  var deadFns = [];
  AUDIT_DEAD_FUNCTIONS_.forEach(function(item) {
    var exists = auditFunctionExists_(item.name);
    deadFns.push({ name: item.name, existsInProject: exists, note: item.reason });
  });

  var boardAnalysis = auditRecommendationLists_(ss);

  var perplexityProbe = { skipped: true, reason: 'probePerplexity not requested' };
  if (options.probePerplexity && hasKey) {
    perplexityProbe = probePerplexityReachable_();
  }

  var status = 'PASS';
  if (!hasKey) status = 'PARTIAL';
  if (boardAnalysis.listsEmptyCount > 4) status = status === 'PASS' ? 'PARTIAL' : status;

  return {
    status: status,
    perplexityApiKeySet: hasKey,
    runPerplexityDaily: runDaily,
    lastNewsPipelineSummaryPresent: !!lastNews,
    lastNewsPipelineSummarySnippet: lastNews ? String(lastNews).substring(0, 400) : '',
    deadFunctions: deadFns,
    recommendationLists: boardAnalysis,
    perplexityProbe: perplexityProbe
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditRecommendationLists_(ss) {
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) {
    return { status: 'FAIL', reason: 'Tab 10 empty', lists: [] };
  }

  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  var universeLookup = buildUniverseLookup_(ss);
  var macroRows = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  var sectorLookup = buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH'));
  var candidates = [];

  data.forEach(function(r) {
    if (r[29] === true || r[29] === 'TRUE') return;
    candidates.push(buildScoringCandidate_(r, universeLookup));
  });

  var lists = [];
  RECOMMENDATION_LIST_DEFS.forEach(function(listDef) {
    var picked = pickRecommendationCandidates_(candidates, listDef.filter, macroRows, sectorLookup, 10);
    lists.push({
      name: listDef.name,
      pickedCount: picked.length,
      topSymbols: picked.slice(0, 3).map(function(p) { return p.symbol; }),
      topConviction: picked.length ? picked[0].conviction : 0,
      filter: listDef.filter
    });
  });

  var empty = lists.filter(function(b) { return b.pickedCount === 0; }).length;
  var immediate = lists.filter(function(b) { return b.filter === 'immediate'; })[0];

  return {
    status: immediate && immediate.pickedCount >= 5 ? 'PASS' : (immediate && immediate.pickedCount > 0 ? 'PARTIAL' : 'FAIL'),
    candidateCount: candidates.length,
    listsEmptyCount: empty,
    lists: lists
  };
}

/**
 * Optional lightweight API reachability (no chat completion).
 * @return {Object}
 */
function probePerplexityReachable_() {
  try {
    var key = getPerplexityApiKey_();
    var resp = UrlFetchApp.fetch(PERPLEXITY_API_URL, {
      method: 'post',
      muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      })
    });
    return { skipped: false, httpCode: resp.getResponseCode(), note: 'Minimal completion probe (may incur small cost)' };
  } catch (e) {
    return { skipped: false, error: String(e) };
  }
}

/**
 * @param {Object} report
 */
function aggregateAuditVerdict_(report) {
  var stages = report.stages;
  var keys = Object.keys(stages);
  keys.forEach(function(k) {
    var st = stages[k].status;
    if (st === 'FAIL') report.failCount++;
    else if (st === 'PARTIAL') report.partialCount++;
  });

  if (report.failCount > 0) report.overall = 'FAIL';
  else if (report.partialCount > 0) report.overall = 'PARTIAL';
  else report.overall = 'PASS';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 */
function writeAuditSnapshot_(ss, report) {
  var sheet = ss.getSheetByName(AUDIT_SNAPSHOT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_SNAPSHOT_SHEET);
    sheet.getRange(1, 1, 1, 5).setValues([['timestamp_ist', 'stage', 'check', 'status', 'detail']]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  var rows = [];
  rows.push([report.timestampIst, 'SUMMARY', 'overall', report.overall,
    'fail=' + report.failCount + ' partial=' + report.partialCount]);

  appendAuditRows_(rows, report.timestampIst, 'A_setup', report.stages.A_setup);
  appendAuditRows_(rows, report.timestampIst, 'B_rowCounts', report.stages.B_rowCounts);
  appendAuditRows_(rows, report.timestampIst, 'B_fundamentals', report.stages.B_fundamentals);
  appendAuditRows_(rows, report.timestampIst, 'C_symbols', report.stages.C_sampleSymbols);
  appendAuditRows_(rows, report.timestampIst, 'C_universeSector', report.stages.C_universeSector);
  appendAuditRows_(rows, report.timestampIst, 'F_conviction', report.stages.F_convictionDistribution);
  appendAuditRows_(rows, report.timestampIst, 'G_dataQuality', report.stages.G_dataQuality);
  if (report.stages.F_convictionDistribution && report.stages.F_convictionDistribution.top20) {
    report.stages.F_convictionDistribution.top20.forEach(function(item, i) {
      rows.push([report.timestampIst, 'F_top20', String(i + 1), item.symbol,
        'M=' + item.conviction_total]);
    });
  }
  appendAuditRows_(rows, report.timestampIst, 'D_triggers', report.stages.D_triggers);
  appendAuditRows_(rows, report.timestampIst, 'E_integrations', report.stages.E_integrations);

  if (report.stages.C_sampleSymbols && report.stages.C_sampleSymbols.symbols) {
    AUDIT_SAMPLE_SYMBOLS.forEach(function(sym) {
      var s = report.stages.C_sampleSymbols.symbols[sym];
      rows.push([report.timestampIst, 'C_symbol', sym, s.inScoringTab10 ? 'PASS' : 'FAIL',
        JSON.stringify(s).substring(0, 450)]);
    });
  }

  var startRow = sheet.getLastRow() + 1;
  if (rows.length) {
    Logger.log('AUDIT SNAPSHOT rows=' + rows.length);
    sheet.getRange(startRow, 1, rows.length, 5).setValues(rows);
  }

  appendAlert('', 'system_audit', report.overall + ' @ ' + report.timestampIst, AUDIT_SNAPSHOT_SHEET);
}

/**
 * @param {Array<Array>} rows
 * @param {string} stageKey
 * @param {Object} stage
 */
/**
 * @param {string} fnName
 * @return {boolean}
 */
function auditFunctionExists_(fnName) {
  try {
    return typeof eval(fnName) === 'function';
  } catch (e) {
    return false;
  }
}

/**
 * @param {Array<Array>} rows
 * @param {string} ts
 * @param {string} stageKey
 * @param {Object} stage
 */
function appendAuditRows_(rows, ts, stageKey, stage) {
  if (!stage) return;
  rows.push([ts, stageKey, 'stage_status', stage.status, JSON.stringify(stage).substring(0, 450)]);
}

/**
 * @param {Object} report
 */
function showAuditSummaryAlert_(report) {
  var b = report.stages.B_rowCounts;
  var bf = report.stages.B_fundamentals || {};
  var c = report.stages.C_sampleSymbols;
  var sec = report.stages.C_universeSector || {};
  var f = report.stages.F_convictionDistribution || {};
  var g = report.stages.G_dataQuality || {};
  var d = report.stages.D_triggers;
  var e = report.stages.E_integrations;
  var a = report.stages.A_setup;
  var tab11HeaderIssues = (a.headerMismatches || []).filter(function(h) {
    return h.indexOf('11. RANKED WATCHLIST') === 0;
  }).length;

  var lines = [
    'Overall: ' + report.overall,
    'Fails: ' + report.failCount + ' | Partial: ' + report.partialCount,
    '',
    'A Setup: ' + a.status +
      (a.sheetsMissing.length ? ' (missing tabs)' : '') +
      (tab11HeaderIssues ? ' — Tab11 headers wrong: menu Fix Tab 11 headers' : ''),
    'B Rows: Tab10=' + ((b.counts['10. SCORING MODEL'] || {}).dataRows || 0) +
      ' Tab11=' + ((b.counts['11. RANKED WATCHLIST'] || {}).dataRows || 0) +
      ' Fund6=' + ((b.counts['6. FUNDAMENTALS'] || {}).dataRows || 0) +
      ' UNIVERSE=' + ((b.counts['1. UNIVERSE'] || {}).dataRows || 0),
    'B Fund6: rows=' + (bf.tab6DataRows || 0) + ' stale=' + (bf.tab6StaleRows || 0) +
      ' emptySector=' + (bf.tab6EmptySectorRows || 0) +
      ' dataGatePass=' + (bf.tab10DataGatePass || 0) + '/' + (bf.tab10ScoringRows || 0),
    'C Samples: ' + c.inScoringCount + '/4 on Tab10, ' + c.withConvictionCount + ' with M>0' +
      (c.staleMCount ? ' (' + c.staleMCount + ' stale M: C–J=0 but old M — rebuild pipeline)' : ''),
    'C Sector: ' + (sec.emptySectorRows || 0) + '/' + (sec.universeDataRows || 0) +
      ' UNIVERSE rows missing sector → Tab19 join fails. Merge Screener sector.',
    'G Data quality: avg=' + (g.avgDataQualityPct || 0) + '% rowsWithDQ=' +
      (g.rowsWithDq || 0) + '/' + (g.tab10Rows || 0) +
      ' missingFlags=' + (g.rowsWithMissingFlags || 0) + ' staleFlags=' + (g.rowsWithStaleFlags || 0),
    'I Tab37 history: ' + ((report.stages.I_recommendationHistory || {}).status || 'n/a') +
      ' rows=' + ((report.stages.I_recommendationHistory || {}).totalHistoryRows || 0) +
      ' today=' + ((report.stages.I_recommendationHistory || {}).rowsAddedToday || 0),
    'J Pillars: ' + ((report.stages.J_pillarCoverage || {}).status || 'n/a') +
      ' avgCov=' + ((report.stages.J_pillarCoverage || {}).averageCoveragePct || 0) + '%',
    'F Tab10 M (effective): >0=' + (f.count_gt0 || 0) + ' >40=' + (f.count_gt40 || 0) +
      ' >60=' + (f.count_gt60 || 0) +
      ' max=' + (f.max_conviction || 0) + ' staleM=' + (f.stale_m_count || 0) +
      ' / ' + (f.tab10DataRows || 0) + ' rows',
    'D Triggers: ' + d.count + ' (daily=' + d.hasDailyMaintenance + ' rss=' + d.hasFetchNewsRss + ')',
    'E Perplexity key: ' + (e.perplexityApiKeySet ? 'YES' : 'NO'),
    '',
    'Full JSON → Script property LAST_SYSTEM_AUDIT_JSON',
    'Rows appended → tab "' + AUDIT_SNAPSHOT_SHEET + '"',
    'See Executions log for Logger output.'
  ];

  SpreadsheetApp.getUi().alert('System audit — ' + report.overall, lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}
