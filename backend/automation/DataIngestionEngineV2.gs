/**
 * Data Ingestion Engine v2 — automated Tabs 4, 6, 24 (+ history/coverage).
 * Goals: public source map, cadence, rate limits, retries, DQ scoring,
 * incremental updates, historical retention, 80%+ universe coverage.
 *
 * Delegates NSE fetch/merge to DataIngestionEngine.gs (v1 primitives).
 * See docs/DATA_INGESTION_V2.md
 */

var INGESTION_V2_VERSION_ = '2.0.0';
var INGESTION_V2_ENABLED_PROP_ = 'DATA_INGESTION_V2_ENABLED';
var INGESTION_V2_LAST_SUMMARY_PROP_ = 'LAST_DATA_INGESTION_V2_JSON';
var INGESTION_V2_STATE_PROP_ = 'DATA_INGESTION_V2_STATE_JSON';
var INGESTION_V2_COVERAGE_TARGET_PCT_ = 80;

/** Per-run API budget (NSE www calls). */
var INGESTION_V2_MAX_API_CALLS_PER_RUN_ = 220;
var INGESTION_V2_RETRY_MAX_ = 3;
var INGESTION_V2_RETRY_BASE_MS_ = 600;

/** Cadence batch sizes (tuned for ~80% universe in 10–12 trading days @ 500 symbols). */
var INGESTION_V2_DEALS_LOOKBACK_DAYS_ = 7;
var INGESTION_V2_SHAREHOLDING_PER_RUN_ = 90;
var INGESTION_V2_FINANCIALS_PER_RUN_ = 90;
var INGESTION_V2_CORP_ACTIONS_PER_RUN_ = 45;
var INGESTION_V2_COMPANY_INFO_PER_RUN_ = 40;

var INGESTION_V2_HISTORY_RETAIN_DAYS_ = 365;
var INGESTION_V2_SHAREHOLDING_RETAIN_ROWS_ = 8000;
var INGESTION_V2_COVERAGE_SHEET_ = '33. INGESTION COVERAGE';
var INGESTION_V2_HISTORY_SHEET_ = '34. INGESTION HISTORY';

/** Independent rotation cursors per dataset. */
var INGESTION_V2_CURSOR_SHAREHOLDING_ = 'DATA_INGEST_V2_CURSOR_SHAREHOLDING';
var INGESTION_V2_CURSOR_FINANCIALS_ = 'DATA_INGEST_V2_CURSOR_FINANCIALS';
var INGESTION_V2_CURSOR_CORP_ACTIONS_ = 'DATA_INGEST_V2_CURSOR_CORP_ACTIONS';
var INGESTION_V2_CURSOR_COMPANY_INFO_ = 'DATA_INGEST_V2_CURSOR_COMPANY_INFO';

// --- Public source registry ---

/**
 * @return {Array<Object>}
 */
function getIngestionV2SourceRegistry_() {
  return [
    { id: 'fundamentals', label: 'Fundamentals (partial)', provider: 'NSE India', endpoint: '/corporates-financial-results', method: 'GET',
      target_tab: '6. FUNDAMENTALS', cadence: 'daily_batch', reliability: 'medium', rate_limit_ms: 400,
      fields: ['roe', 'roce', 'rev_yoy', 'pat_yoy', 'quarter_end'] },
    { id: 'fundamentals_company', label: 'Company info / ratios', provider: 'NSE India', endpoint: '/company/{symbol}',
      method: 'GET', target_tab: '6. FUNDAMENTALS', cadence: 'daily_batch', reliability: 'low-medium', rate_limit_ms: 400,
      fields: ['pe', 'pb', 'sector'] },
    { id: 'shareholding', label: 'Shareholding pattern', provider: 'NSE India', endpoint: '/corporate-share-holdings',
      method: 'GET', target_tab: '24. SHAREHOLDING PATTERN', cadence: 'daily_batch', reliability: 'medium', rate_limit_ms: 400,
      fields: ['promoter_pct', 'public_pct'] },
    { id: 'fii_ownership', label: 'FII / FPI ownership', provider: 'NSE shareholding', endpoint: '/corporate-share-holdings',
      method: 'GET', target_tab: '24 + 6', cadence: 'daily_batch', reliability: 'medium', rate_limit_ms: 400,
      fields: ['fii_pct'] },
    { id: 'dii_ownership', label: 'DII ownership', provider: 'NSE shareholding', endpoint: '/corporate-share-holdings',
      method: 'GET', target_tab: '24 + 6', cadence: 'daily_batch', reliability: 'medium', rate_limit_ms: 400,
      fields: ['dii_pct'] },
    { id: 'mf_ownership', label: 'Mutual fund ownership', provider: 'NSE shareholding', endpoint: '/corporate-share-holdings',
      method: 'GET', target_tab: '24. SHAREHOLDING PATTERN', cadence: 'daily_batch', reliability: 'medium', rate_limit_ms: 400,
      fields: ['mf_pct'] },
    { id: 'bulk_deals', label: 'Bulk deals', provider: 'NSE India', endpoint: '/historical/bulk-deals-type',
      method: 'GET', target_tab: '4. BULK & LARGE DEALS', cadence: 'daily', reliability: 'medium-high', rate_limit_ms: 400,
      fields: ['bulk_buy', 'bulk_sell'] },
    { id: 'block_deals', label: 'Block deals', provider: 'NSE India', endpoint: '/historical/bulk-deals-type',
      method: 'GET', target_tab: '4. BULK & LARGE DEALS', cadence: 'daily', reliability: 'medium-high', rate_limit_ms: 400,
      fields: ['block_buy', 'block_sell'] },
    { id: 'quarterly_results', label: 'Quarterly results', provider: 'NSE India', endpoint: '/corporates-financial-results',
      method: 'GET', target_tab: '6. FUNDAMENTALS', cadence: 'daily_batch', reliability: 'medium', rate_limit_ms: 400,
      fields: ['revenue', 'pat', 'period_end'] },
    { id: 'corporate_actions', label: 'Corporate actions', provider: 'NSE India', endpoint: '/corporates-corporateActions',
      method: 'GET', target_tab: '3. NSE/BSE ANNOUNCEMENTS', cadence: 'daily_batch', reliability: 'medium', rate_limit_ms: 400,
      fields: ['dividend', 'split', 'bonus'] },
    { id: 'fii_dii_market', label: 'Market FII/DII net flow', provider: 'NSE India', endpoint: '/fiidiiTradeReact',
      method: 'GET', target_tab: '8. MACRO DASHBOARD', cadence: 'daily', reliability: 'medium', rate_limit_ms: 400,
      fields: ['fii_net', 'dii_net'] },
    { id: 'screener_csv', label: 'Full fundamentals (moat/valuation)', provider: 'Screener.in export',
      endpoint: 'manual_csv', method: 'IMPORT', target_tab: '6. FUNDAMENTALS', cadence: 'weekly_optional',
      reliability: 'high', rate_limit_ms: 0, fields: ['ev_ebitda', 'pe_vs_3y', 'moat'] }
  ];
}

// --- Menu ---

function runDataIngestionV2Now() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var summary = runDataIngestionPipelineV2_(ss, {});
  SpreadsheetApp.getUi().alert(
    'Data Ingestion v2',
    formatIngestionV2Summary_(summary),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function viewIngestionCoverageReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = computeIngestionUniverseCoverage_(ss);
  writeIngestionCoverageSheet_(ss, report);
  SpreadsheetApp.getUi().alert(
    'Ingestion coverage',
    'Universe: ' + report.eligible_symbols + '\n' +
      'Weighted coverage: ' + report.weighted_coverage_pct + '%\n' +
      'Target: ' + INGESTION_V2_COVERAGE_TARGET_PCT_ + '%\n' +
      'Meets target: ' + (report.meets_target ? 'YES' : 'NO') + '\n\n' +
      'Tab 33 INGESTION COVERAGE updated.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function viewLastDataIngestionV2Log() {
  var raw = PropertiesService.getScriptProperties().getProperty(INGESTION_V2_LAST_SUMMARY_PROP_);
  SpreadsheetApp.getUi().alert('Ingestion v2 log', raw || 'No v2 run yet.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * v2 pipeline — replaces v1 when enabled (default true after deploy).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object=} opts
 * @return {Object}
 */
function runDataIngestionPipelineV2_(ss, opts) {
  opts = opts || {};
  var started = new Date();
  var budget = createIngestionV2ApiBudget_(opts.maxApiCalls || INGESTION_V2_MAX_API_CALLS_PER_RUN_);
  var summary = {
    engine: 'v2',
    version: INGESTION_V2_VERSION_,
    startedIst: Utilities.formatDate(started, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    dealsDays: opts.dealsDays || INGESTION_V2_DEALS_LOOKBACK_DAYS_,
    steps: [],
    api_calls_used: 0,
    ok: true
  };

  try {
    summary.steps.push(ingestionV2RunStep_(budget, 'macro_fii_dii', function() {
      return ingestNseFiiDiiMacro_(ss);
    }, 1));

    summary.steps.push(ingestionV2RunStep_(budget, 'bulk_block_deals', function() {
      return ingestNseBulkBlockDeals_(ss, summary.dealsDays);
    }, 2));

    if (opts.shareholdingBatch !== false) {
      summary.steps.push(ingestionV2RunShareholdingBatch_(ss, budget,
        opts.shareholdingBatchSize || INGESTION_V2_SHAREHOLDING_PER_RUN_));
    }
    if (opts.financialsBatch !== false) {
      summary.steps.push(ingestionV2RunFinancialsBatch_(ss, budget,
        opts.financialsBatchSize || INGESTION_V2_FINANCIALS_PER_RUN_));
    }
    if (opts.corporateActions !== false) {
      summary.steps.push(ingestionV2RunCorporateActionsBatch_(ss, budget,
        opts.corpActionsBatchSize || INGESTION_V2_CORP_ACTIONS_PER_RUN_));
    }
    if (opts.companyInfoBatch !== false) {
      summary.steps.push(ingestionV2RunCompanyInfoBatch_(ss, budget,
        opts.companyInfoBatchSize || INGESTION_V2_COMPANY_INFO_PER_RUN_));
    }

    trimIngestionHistoryOlderThan_(ss, INGESTION_V2_HISTORY_RETAIN_DAYS_);
    trimShareholdingHistoryIfNeeded_(ss, INGESTION_V2_SHAREHOLDING_RETAIN_ROWS_);

    var coverage = computeIngestionUniverseCoverage_(ss);
    writeIngestionCoverageSheet_(ss, coverage);
    summary.coverage = coverage;
  } catch (e) {
    summary.ok = false;
    summary.error = String(e.message || e);
    appendAlert('', 'data_ingestion_v2_error', summary.error, 'ingestion');
  }

  summary.api_calls_used = budget.used;
  summary.finishedIst = Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  summary.tab4Rows = countSheetDataRows_(ss, '4. BULK & LARGE DEALS');
  summary.tab6Rows = countSheetDataRows_(ss, '6. FUNDAMENTALS');
  summary.tab24Rows = countSheetDataRows_(ss, '24. SHAREHOLDING PATTERN');
  summary.tab33Rows = countSheetDataRows_(ss, INGESTION_V2_COVERAGE_SHEET_);
  summary.tab34Rows = countSheetDataRows_(ss, INGESTION_V2_HISTORY_SHEET_);

  PropertiesService.getScriptProperties().setProperty(INGESTION_V2_LAST_SUMMARY_PROP_, JSON.stringify(summary));
  PropertiesService.getScriptProperties().setProperty(LAST_INGESTION_SUMMARY_PROP_, JSON.stringify(summary));

  if (summary.ok) {
    appendAlert('', 'data_ingestion_v2',
      'cov=' + (summary.coverage ? summary.coverage.weighted_coverage_pct : '?') + '% Tab4=' +
      summary.tab4Rows + ' Tab6=' + summary.tab6Rows + ' Tab24=' + summary.tab24Rows, 'ingestion');
  }
  return summary;
}

/**
 * Route v1 menu/6AM to v2 when enabled.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object=} opts
 * @return {Object}
 */
function runDataIngestionPipelineRouted_(ss, opts) {
  if (isDataIngestionV2Enabled_()) {
    return runDataIngestionPipelineV2_(ss, opts);
  }
  return runDataIngestionPipeline_(ss, opts);
}

/**
 * @return {boolean}
 */
function isDataIngestionV2Enabled_() {
  var prop = PropertiesService.getScriptProperties().getProperty(INGESTION_V2_ENABLED_PROP_);
  if (prop === 'false') return false;
  return typeof runDataIngestionPipelineV2_ === 'function';
}

/** Enable v2 (menu helper). */
function enableDataIngestionV2() {
  PropertiesService.getScriptProperties().setProperty(INGESTION_V2_ENABLED_PROP_, 'true');
}

// --- Rate limit & retry ---

/**
 * @param {number} maxCalls
 * @return {{max:number, used:number, canSpend:function(number):boolean, spend:function(number)}}
 */
function createIngestionV2ApiBudget_(maxCalls) {
  var budget = { max: maxCalls, used: 0 };
  budget.canSpend = function(n) {
    return budget.used + (n || 1) <= budget.max;
  };
  budget.spend = function(n) {
    budget.used += (n || 1);
  };
  return budget;
}

/**
 * @param {Object} budget
 * @param {string} stepName
 * @param {function} fn
 * @param {number=} estimatedCalls
 * @return {Object}
 */
function ingestionV2RunStep_(budget, stepName, fn, estimatedCalls) {
  estimatedCalls = estimatedCalls || 1;
  if (!budget.canSpend(estimatedCalls)) {
    return { step: stepName, ok: false, skipped: true, error: 'API budget exhausted' };
  }
  try {
    var detail = ingestionV2FetchWithRetry_(fn);
    budget.spend(estimatedCalls);
    return { step: stepName, ok: true, detail: detail };
  } catch (e) {
    return { step: stepName, ok: false, error: String(e.message || e) };
  }
}

/**
 * @param {function} fn
 * @return {*}
 */
function ingestionV2FetchWithRetry_(fn) {
  var lastErr;
  for (var attempt = 0; attempt < INGESTION_V2_RETRY_MAX_; attempt++) {
    try {
      return fn();
    } catch (e) {
      lastErr = e;
      var msg = String(e.message || e).toLowerCase();
      if (msg.indexOf('403') >= 0 || msg.indexOf('401') >= 0 || msg.indexOf('429') >= 0) {
        PropertiesService.getScriptProperties().deleteProperty(NSE_SESSION_PROP_);
        Utilities.sleep(INGESTION_V2_RETRY_BASE_MS_ * (attempt + 2));
      } else if (attempt < INGESTION_V2_RETRY_MAX_ - 1) {
        Utilities.sleep(INGESTION_V2_RETRY_BASE_MS_ * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

// --- Batched steps with independent cursors ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} budget
 * @param {number} batchSize
 * @return {Object}
 */
function ingestionV2RunShareholdingBatch_(ss, budget, batchSize) {
  var symbols = nextIngestionV2SymbolBatch_(ss, batchSize, INGESTION_V2_CURSOR_SHAREHOLDING_);
  var upserted = 0;
  var errors = 0;
  var dqSum = 0;
  symbols.forEach(function(sym) {
    if (!budget.canSpend(1)) return;
    try {
      var ok = ingestionV2FetchWithRetry_(function() {
        return ingestNseShareholdingForSymbol_(ss, sym);
      });
      budget.spend(1);
      if (ok) {
        upserted++;
        var sh = loadLatestShareholdingForSymbol_(ss, sym);
        var dq = ingestionV2ScoreDataset_('shareholding', sh);
        dqSum += dq;
        ingestionV2RecordIncremental_(sym, 'shareholding', sh, dq);
        ingestionV2AppendHistory_(ss, 'shareholding', sym, sh, dq);
      }
    } catch (e) {
      errors++;
      ingestionV2AppendHistory_(ss, 'shareholding', sym, { error: String(e.message || e) }, 0);
    }
  });
  return { symbols: symbols.length, upserted: upserted, errors: errors, avg_dq: symbols.length ? Math.round(dqSum / symbols.length) : 0 };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} budget
 * @param {number} batchSize
 * @return {Object}
 */
function ingestionV2RunFinancialsBatch_(ss, budget, batchSize) {
  var symbols = nextIngestionV2SymbolBatch_(ss, batchSize, INGESTION_V2_CURSOR_FINANCIALS_);
  var updated = 0;
  var errors = 0;
  symbols.forEach(function(sym) {
    if (!budget.canSpend(1)) return;
    try {
      var ok = ingestionV2FetchWithRetry_(function() {
        return ingestNseFinancialResultsForSymbol_(ss, sym);
      });
      budget.spend(1);
      if (ok) {
        updated++;
        var fin = loadFundamentalsRowForSymbol_(ss, sym);
        var dq = ingestionV2ScoreDataset_('quarterly_results', fin);
        ingestionV2RecordIncremental_(sym, 'quarterly_results', fin, dq);
        ingestionV2AppendHistory_(ss, 'quarterly_results', sym, fin, dq);
      }
    } catch (e) {
      errors++;
    }
  });
  return { symbols: symbols.length, updated: updated, errors: errors };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} budget
 * @param {number} batchSize
 * @return {Object}
 */
function ingestionV2RunCorporateActionsBatch_(ss, budget, batchSize) {
  var symbols = nextIngestionV2SymbolBatch_(ss, batchSize, INGESTION_V2_CURSOR_CORP_ACTIONS_);
  var added = 0;
  symbols.forEach(function(sym) {
    if (!budget.canSpend(1)) return;
    try {
      var n = ingestionV2FetchWithRetry_(function() {
        return ingestNseCorporateActionsForSymbol_(ss, sym);
      });
      added += n;
      ingestionV2RecordIncremental_(sym, 'corporate_actions', { added: n }, n > 0 ? 70 : 20);
      ingestionV2AppendHistory_(ss, 'corporate_actions', sym, { added: n }, n > 0 ? 70 : 20);
      budget.spend(1);
    } catch (ignore) {}
  });
  return { symbols: symbols.length, added: added };
}

/**
 * NSE company metadata → Tab 6 PE/PB/sector when empty.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} budget
 * @param {number} batchSize
 * @return {Object}
 */
function ingestionV2RunCompanyInfoBatch_(ss, budget, batchSize) {
  var symbols = nextIngestionV2SymbolBatch_(ss, batchSize, INGESTION_V2_CURSOR_COMPANY_INFO_);
  var updated = 0;
  symbols.forEach(function(sym) {
    if (!budget.canSpend(1)) return;
    try {
      var info = ingestionV2FetchWithRetry_(function() {
        return fetchNseCompanyInfoForSymbol_(sym);
      });
      if (info && mergeCompanyInfoIntoFundamentals_(ss, sym, info)) {
        updated++;
        var dq = ingestionV2ScoreDataset_('fundamentals_company', info);
        ingestionV2RecordIncremental_(sym, 'fundamentals_company', info, dq);
        ingestionV2AppendHistory_(ss, 'fundamentals_company', sym, info, dq);
      }
      budget.spend(1);
    } catch (e) {
      Logger.log('companyInfo ' + sym + ': ' + e.message);
    }
  });
  return { symbols: symbols.length, updated: updated };
}

/**
 * @param {string} sym
 * @return {Object|null}
 */
function fetchNseCompanyInfoForSymbol_(sym) {
  var json;
  try {
    json = nseApiGetJson_('/company/' + encodeURIComponent(sym), {});
  } catch (e1) {
    try {
      json = nseApiGetJson_('/quote-equity', { symbol: sym });
    } catch (e2) {
      return null;
    }
  }
  if (!json) return null;
  var meta = json.metadata || json.info || json;
  return {
    symbol: sym,
    pe: num_(meta.pdSymbolPe || meta.pe || meta.stockPe),
    pb: num_(meta.pdSymbolPb || meta.pb),
    sector: String(meta.industry || meta.sector || meta.cmotsSector || '').trim(),
    marketCapCr: num_(meta.marketCap || meta.ffmc || meta.cmotsMarketCap)
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @param {Object} info
 * @return {boolean}
 */
function mergeCompanyInfoIntoFundamentals_(ss, sym, info) {
  var sheet = ss.getSheetByName('6. FUNDAMENTALS');
  if (!sheet) return false;
  var data = sheet.getLastRow() >= 2 ? loadSheetData_(ss, '6. FUNDAMENTALS') : [];
  var found = false;
  var changed = false;
  data.forEach(function(r) {
    if (normalizeSymbolKey_(r[0]) !== sym) return;
    found = true;
    if (info.pe > 0 && !num_(r[8])) { r[8] = info.pe; changed = true; }
    if (info.pb > 0 && !num_(r[9])) { r[9] = info.pb; changed = true; }
    if (info.marketCapCr > 0 && !num_(r[1])) { r[1] = info.marketCapCr; changed = true; }
    if (info.sector && !String(r[13] || '').trim()) {
      r[13] = info.sector;
      r[14] = info.sector;
      changed = true;
    }
    r[23] = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    r[24] = false;
  });
  if (!found) {
    var row = new Array(FUNDAMENTALS_NUM_COLS);
    row[0] = sym;
    if (info.pe > 0) row[8] = info.pe;
    if (info.pb > 0) row[9] = info.pb;
    if (info.marketCapCr > 0) row[1] = info.marketCapCr;
    if (info.sector) { row[13] = info.sector; row[14] = info.sector; }
    row[23] = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    row[24] = false;
    data.push(row);
    changed = true;
  }
  if (changed) {
    var headers = getSheetHeaders_('6. FUNDAMENTALS');
    clearDataBelowHeader_(sheet, headers.length);
    if (data.length) sheet.getRange(2, 1, data.length, FUNDAMENTALS_NUM_COLS).setValues(data);
  }
  return changed;
}

// --- Incremental state ---

/**
 * @param {string} sym
 * @param {string} dataset
 * @param {Object} payload
 * @param {number} dqScore
 */
function ingestionV2RecordIncremental_(sym, dataset, payload, dqScore) {
  var state = loadIngestionV2State_();
  if (!state.symbols) state.symbols = {};
  if (!state.symbols[sym]) state.symbols[sym] = {};
  state.symbols[sym][dataset] = {
    at: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    hash: ingestionV2PayloadHash_(payload),
    dq: dqScore
  };
  saveIngestionV2State_(state);
}

/**
 * @param {Object} payload
 * @return {string}
 */
function ingestionV2PayloadHash_(payload) {
  try {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(payload || {}))
      .map(function(b) {
        var v = (b < 0 ? b + 256 : b).toString(16);
        return v.length === 1 ? '0' + v : v;
      }).join('').substring(0, 16);
  } catch (e) {
    return String(Date.now());
  }
}

/**
 * @return {Object}
 */
function loadIngestionV2State_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(INGESTION_V2_STATE_PROP_);
    if (raw) return JSON.parse(raw);
  } catch (ignore) {}
  return { symbols: {}, version: INGESTION_V2_VERSION_ };
}

/**
 * @param {Object} state
 */
function saveIngestionV2State_(state) {
  PropertiesService.getScriptProperties().setProperty(INGESTION_V2_STATE_PROP_, JSON.stringify(state));
}

// --- Data quality scoring (0–100 per dataset) ---

/**
 * @param {string} dataset
 * @param {Object|null} record
 * @return {number}
 */
function ingestionV2ScoreDataset_(dataset, record) {
  if (!record) return 0;
  var score = 40;
  if (dataset === 'shareholding') {
    if (num_(record.fiiPct) > 0) score += 15;
    if (num_(record.diiPct) > 0) score += 15;
    if (num_(record.mfPct) > 0) score += 10;
    if (num_(record.promoterPct) > 0) score += 15;
    if (record.asOfDate) score += 5;
  } else if (dataset === 'quarterly_results' || dataset === 'fundamentals') {
    if (num_(record.roe) > 0 || num_(record[3]) > 0) score += 20;
    if (num_(record.roce) > 0 || num_(record[2]) > 0) score += 15;
    if (num_(record.revenueGrowth) > 0 || num_(record[4]) > 0) score += 15;
    if (num_(record.patGrowth) > 0 || num_(record[5]) > 0) score += 10;
  } else if (dataset === 'fundamentals_company') {
    if (num_(record.pe) > 0) score += 25;
    if (num_(record.pb) > 0) score += 20;
    if (record.sector) score += 15;
  }
  return Math.min(100, Math.max(0, score));
}

// --- Historical retention (Tab 34) ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} dataset
 * @param {string} sym
 * @param {Object} payload
 * @param {number} dq
 */
function ingestionV2AppendHistory_(ss, dataset, sym, payload, dq) {
  var sheet = getOrCreateSheet_(INGESTION_V2_HISTORY_SHEET_);
  var headers = getIngestionV2HistoryHeaders_();
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  var runAt = Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  var payloadStr = JSON.stringify(payload || {}).substring(0, 500);
  sheet.appendRow([runAt, dataset, sym, dq, ingestionV2PayloadHash_(payload), payloadStr, 'nse_v2']);
}

/**
 * @return {string[]}
 */
function getIngestionV2HistoryHeaders_() {
  return ['run_at', 'dataset', 'symbol', 'dq_score', 'payload_hash', 'payload_json', 'source'];
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} retainDays
 */
function trimIngestionHistoryOlderThan_(ss, retainDays) {
  var sheet = ss.getSheetByName(INGESTION_V2_HISTORY_SHEET_);
  if (!sheet || sheet.getLastRow() < 2) return;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retainDays);
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  var kept = data.filter(function(r) {
    var d = parseSheetDate_(r[0]);
    return d && d >= cutoff;
  });
  clearDataBelowHeader_(sheet, 7);
  if (kept.length) sheet.getRange(2, 1, kept.length, 7).setValues(kept);
}

/**
 * Keep Tab 24 from unbounded growth (retain latest N rows).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} maxRows
 */
function trimShareholdingHistoryIfNeeded_(ss, maxRows) {
  var sheet = ss.getSheetByName('24. SHAREHOLDING PATTERN');
  if (!sheet || sheet.getLastRow() - 1 <= maxRows) return;
  var data = loadSheetData_(ss, '24. SHAREHOLDING PATTERN');
  data.sort(function(a, b) {
    var da = parseSheetDate_(a[1]) || new Date(0);
    var db = parseSheetDate_(b[1]) || new Date(0);
    return db - da;
  });
  var kept = data.slice(0, maxRows);
  var headers = getSheetHeaders_('24. SHAREHOLDING PATTERN');
  clearDataBelowHeader_(sheet, headers.length);
  if (kept.length) sheet.getRange(2, 1, kept.length, headers.length).setValues(kept);
}

// --- Symbol batch (independent cursor) ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} batchSize
 * @param {string} cursorProp
 * @return {string[]}
 */
function nextIngestionV2SymbolBatch_(ss, batchSize, cursorProp) {
  var queue = buildIngestionSymbolQueue_(ss);
  if (!queue.length) return [];
  var props = PropertiesService.getScriptProperties();
  var cursor = parseInt(props.getProperty(cursorProp) || '0', 10);
  if (cursor >= queue.length) cursor = 0;
  var batch = [];
  for (var i = 0; i < batchSize && i < queue.length; i++) {
    batch.push(queue[(cursor + i) % queue.length]);
  }
  props.setProperty(cursorProp, String((cursor + batchSize) % queue.length));
  return batch;
}

// --- Universe coverage ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function computeIngestionUniverseCoverage_(ss) {
  var eligible = buildIngestionSymbolQueue_(ss);
  var n = eligible.length || 1;
  var tab4Syms = buildSymbolSetFromTab_(ss, '4. BULK & LARGE DEALS', 1, 90);
  var tab6Map = buildFundamentalsCoverageMap_(ss);
  var tab24Map = buildShareholdingCoverageMap_(ss);
  var corpSyms = buildSymbolSetFromTab_(ss, '3. NSE/BSE ANNOUNCEMENTS', 0, 180);

  var datasets = {
    fundamentals: 0,
    shareholding: 0,
    fii_ownership: 0,
    dii_ownership: 0,
    mf_ownership: 0,
    bulk_deals: 0,
    block_deals: 0,
    quarterly_results: 0,
    corporate_actions: 0
  };

  eligible.forEach(function(sym) {
    var f = tab6Map[sym];
    if (f && f.hasCore) datasets.fundamentals++;
    if (f && f.hasQuarterly) datasets.quarterly_results++;
    var sh = tab24Map[sym];
    if (sh) {
      datasets.shareholding++;
      if (sh.fii > 0) datasets.fii_ownership++;
      if (sh.dii > 0) datasets.dii_ownership++;
      if (sh.mf > 0) datasets.mf_ownership++;
    }
    if (tab4Syms[sym]) {
      datasets.bulk_deals++;
      datasets.block_deals++;
    }
    if (corpSyms[sym]) datasets.corporate_actions++;
  });

  function pct(count) {
    return Math.round((count / n) * 1000) / 10;
  }

  var breakdown = {};
  Object.keys(datasets).forEach(function(k) {
    breakdown[k] = { covered: datasets[k], pct: pct(datasets[k]) };
  });

  var weights = {
    fundamentals: 0.22,
    shareholding: 0.14,
    fii_ownership: 0.12,
    dii_ownership: 0.12,
    mf_ownership: 0.08,
    bulk_deals: 0.08,
    block_deals: 0.08,
    quarterly_results: 0.10,
    corporate_actions: 0.06
  };
  var weighted = 0;
  Object.keys(weights).forEach(function(k) {
    weighted += (breakdown[k] ? breakdown[k].pct : 0) * weights[k];
  });
  weighted = Math.round(weighted * 10) / 10;

  return {
    generated_at: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    engine_version: INGESTION_V2_VERSION_,
    eligible_symbols: n,
    breakdown: breakdown,
    weighted_coverage_pct: weighted,
    target_pct: INGESTION_V2_COVERAGE_TARGET_PCT_,
    meets_target: weighted >= INGESTION_V2_COVERAGE_TARGET_PCT_,
    tab4_rows: countSheetDataRows_(ss, '4. BULK & LARGE DEALS'),
    tab6_rows: countSheetDataRows_(ss, '6. FUNDAMENTALS'),
    tab24_rows: countSheetDataRows_(ss, '24. SHAREHOLDING PATTERN')
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildFundamentalsCoverageMap_(ss) {
  var map = {};
  loadSheetData_(ss, '6. FUNDAMENTALS').forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    map[sym] = {
      hasCore: num_(r[2]) > 0 || num_(r[3]) > 0 || num_(r[4]) > 0 || num_(r[5]) > 0,
      hasQuarterly: num_(r[4]) > 0 || num_(r[5]) > 0 || String(r[22] || '').length > 0,
      fii: num_(r[12]),
      promoter: num_(r[11])
    };
  });
  return map;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildShareholdingCoverageMap_(ss) {
  var map = {};
  loadSheetData_(ss, '24. SHAREHOLDING PATTERN').forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    var existing = map[sym];
    var asOf = parseSheetDate_(r[1]);
    if (existing && existing.asOf && asOf && asOf < existing.asOf) return;
    map[sym] = {
      asOf: asOf,
      fii: num_(r[2]),
      dii: num_(r[3]),
      mf: num_(r[4])
    };
  });
  return map;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @param {number} symCol
 * @param {number} maxAgeDays
 * @return {Object}
 */
function buildSymbolSetFromTab_(ss, sheetName, symCol, maxAgeDays) {
  var set = {};
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  loadSheetData_(ss, sheetName).forEach(function(r) {
    var d = parseSheetDate_(r[0]);
    if (maxAgeDays > 0 && d && d < cutoff) return;
    var sym = normalizeSymbolKey_(r[symCol]);
    if (sym) set[sym] = true;
  });
  return set;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 */
function writeIngestionCoverageSheet_(ss, report) {
  var headers = [
    'generated_at', 'symbol', 'fundamentals', 'quarterly', 'shareholding', 'fii', 'dii', 'mf',
    'bulk_block', 'corp_actions', 'symbol_coverage_pct', 'notes'
  ];
  var sheet = getOrCreateSheet_(INGESTION_V2_COVERAGE_SHEET_);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  clearDataBelowHeader_(sheet, headers.length);

  var eligible = buildIngestionSymbolQueue_(ss);
  var tab4 = buildSymbolSetFromTab_(ss, '4. BULK & LARGE DEALS', 1, 90);
  var tab6 = buildFundamentalsCoverageMap_(ss);
  var tab24 = buildShareholdingCoverageMap_(ss);
  var corp = buildSymbolSetFromTab_(ss, '3. NSE/BSE ANNOUNCEMENTS', 0, 180);

  var rows = eligible.map(function(sym) {
    var f = tab6[sym];
    var sh = tab24[sym];
    var flags = [
      f && f.hasCore ? 'Y' : '',
      f && f.hasQuarterly ? 'Y' : '',
      sh ? 'Y' : '',
      sh && sh.fii > 0 ? 'Y' : '',
      sh && sh.dii > 0 ? 'Y' : '',
      sh && sh.mf > 0 ? 'Y' : '',
      tab4[sym] ? 'Y' : '',
      corp[sym] ? 'Y' : ''
    ];
    var hit = flags.filter(function(x) { return x === 'Y'; }).length;
    var symPct = Math.round((hit / 8) * 1000) / 10;
    return [report.generated_at, sym].concat(flags).concat([symPct, '']);
  });

  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  sheet.getRange(1, headers.length + 2).setValue('SUMMARY');
  sheet.getRange(2, headers.length + 2, 2, 4).setValues([[
    'weighted_coverage_pct', report.weighted_coverage_pct,
    'meets_target', report.meets_target ? 'YES' : 'NO'
  ]]);
}

// --- Helpers ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @return {Object|null}
 */
function loadLatestShareholdingForSymbol_(ss, sym) {
  var rows = loadSheetData_(ss, '24. SHAREHOLDING PATTERN').filter(function(r) {
    return normalizeSymbolKey_(r[0]) === sym;
  });
  if (!rows.length) return null;
  rows.sort(function(a, b) {
    return (parseSheetDate_(b[1]) || 0) - (parseSheetDate_(a[1]) || 0);
  });
  var r = rows[0];
  return {
    symbol: sym,
    asOfDate: r[1],
    fiiPct: num_(r[2]),
    diiPct: num_(r[3]),
    mfPct: num_(r[4]),
    promoterPct: num_(r[5])
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @return {Object|null}
 */
function loadFundamentalsRowForSymbol_(ss, sym) {
  var rows = loadSheetData_(ss, '6. FUNDAMENTALS').filter(function(r) {
    return normalizeSymbolKey_(r[0]) === sym;
  });
  if (!rows.length) return null;
  var r = rows[0];
  return {
    symbol: sym,
    roce: num_(r[2]),
    roe: num_(r[3]),
    revenueGrowth: num_(r[4]),
    patGrowth: num_(r[5])
  };
}

/**
 * @param {Object} summary
 * @return {string}
 */
function formatIngestionV2Summary_(summary) {
  var lines = [
    'Engine v' + (summary.version || INGESTION_V2_VERSION_),
    'API calls: ' + summary.api_calls_used,
    'Tab 4/6/24: ' + summary.tab4Rows + ' / ' + summary.tab6Rows + ' / ' + summary.tab24Rows
  ];
  if (summary.coverage) {
    lines.push('Weighted coverage: ' + summary.coverage.weighted_coverage_pct + '% (target ' +
      summary.coverage.target_pct + '%)');
  }
  (summary.steps || []).forEach(function(s) {
    lines.push((s.ok ? '✓ ' : '✗ ') + s.step + (s.detail ? ' — ' + JSON.stringify(s.detail) : '') +
      (s.error ? ' — ' + s.error : ''));
  });
  if (summary.error) lines.push('Error: ' + summary.error);
  return lines.join('\n');
}
