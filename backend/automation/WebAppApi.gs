/**
 * Google Sheets JSON API for EquityIQ (Option C — presentation layer).
 * Deploy: Deploy → New deployment → Web app → Execute as Me, Who has access: Anyone.
 * Paste WebAppApi.gs alongside Code.gs in the same Apps Script project.
 * Web App entry: doGet(e) in Code.gs delegates to handleEquityIQApiGet_(e) in this file.
 */

var WEB_APP_VERSION_ = '1.0.0';

/**
 * Bare /exec (no ?action=) and ?action=app|home|landing serve HTML; all other actions return JSON.
 * @param {Object} e
 * @return {GoogleAppsScript.Content.TextOutput|GoogleAppsScript.HTML.HtmlOutput}
 */
function handleEquityIQApiGet_(e) {
  e = e || {};
  var route = resolveWebAppRoute_(e);
  if (route.mode === 'landing') {
    return createWebAppLandingHtml_(route.execUrl);
  }
  var action = route.action;
  var payload;

  try {
    if (action === 'health') {
      payload = getApiHealth_();
    } else if (action === 'top10' || action === 'watchlist') {
      payload = getTop10Data_();
    } else if (action === 'symbol') {
      var symbol = String(e.parameter.symbol || e.parameter.stock || '').trim();
      if (!symbol) {
        payload = { ok: false, error: 'Missing parameter: symbol' };
      } else {
        payload = getSymbolData_(symbol);
      }
    } else if (action === 'macro') {
      payload = getMacroData_();
    } else if (action === 'backtest') {
      payload = typeof getBacktestResults_ === 'function' ? getBacktestResults_() : {
        ok: false,
        error: 'BacktestEngine.gs not deployed'
      };
    } else if (action === 'theme_intelligence' || action === 'theme-intelligence') {
      payload = typeof getThemeIntelligencePayload_ === 'function' ?
        { ok: true, intelligence: getThemeIntelligencePayload_(SpreadsheetApp.getActiveSpreadsheet()) } :
        { ok: false, error: 'ThemeIntelligenceEngine.gs not deployed' };
    } else if (action === 'morning_brief' || action === 'morning-brief') {
      var fresh = String(e.parameter.fresh || '').toLowerCase() === 'true' ||
        String(e.parameter.fresh || '') === '1';
      payload = typeof getMorningBriefData_ === 'function' ?
        getMorningBriefData_(fresh) :
        { ok: false, error: 'MorningBriefEngine.gs not deployed' };
    } else if (action === 'portfolio' || action === 'portfolio_construction') {
      var capParam = e.parameter.capital || e.parameter.capital_inr || '';
      payload = typeof getPortfolioConstructionPayload_ === 'function' ?
        getPortfolioConstructionPayload_(SpreadsheetApp.getActiveSpreadsheet(),
          capParam !== '' ? num_(capParam) : null) :
        { ok: false, error: 'PortfolioConstructionEngine.gs not deployed' };
    } else if (action === 'recommendation_history' || action === 'rec_history') {
      payload = typeof getRecommendationHistoryData_ === 'function' ?
        getRecommendationHistoryData_({
          category: e.parameter.category || '',
          symbol: e.parameter.symbol || ''
        }) :
        { ok: false, error: 'RecommendationHistoryEngine.gs not deployed' };
    } else if (action === 'recommendation_validation' || action === 'rec_validation') {
      payload = typeof getRecommendationValidationData_ === 'function' ?
        getRecommendationValidationData_() :
        { ok: false, error: 'RecommendationHistoryEngine.gs not deployed' };
    } else if (action === 'recommendation_history_health' || action === 'history_health') {
      payload = typeof getRecommendationHistoryHealth_ === 'function' ?
        { ok: true, health: getRecommendationHistoryHealth_() } :
        { ok: false, error: 'RecommendationHistoryEngine.gs not deployed' };
    } else if (action === 'data_coverage' || action === 'pillar_coverage') {
      payload = typeof getDataCoverageReport_ === 'function' ?
        getDataCoverageReport_() :
        { ok: false, error: 'DataCoverageEngine.gs not deployed' };
    } else if (action === 'sme_alpha') {
      payload = typeof getSmeAlphaPayload_ === 'function' ?
        getSmeAlphaPayload_() :
        { ok: false, error: 'SmeAlphaEngine.gs not deployed' };
    } else if (action === 'ipo_intelligence') {
      payload = typeof getIpoIntelligencePayload_ === 'function' ?
        getIpoIntelligencePayload_() :
        { ok: false, error: 'IpoIntelligenceEngine.gs not deployed' };
    } else if (action === 'system_audit') {
      var last = PropertiesService.getScriptProperties().getProperty('LAST_SYSTEM_AUDIT_JSON');
      try {
        payload = { ok: true, audit: last ? JSON.parse(last) : null };
      } catch (eAudit) {
        payload = { ok: false, error: 'Invalid LAST_SYSTEM_AUDIT_JSON' };
      }
    } else if (action === 'pipeline_status' || action === 'pipeline') {
      payload = getPipelineStatus_();
    } else if (action === 'sheet_audit' || action === 'live_sheet_audit') {
      payload = getLiveSheetAudit_();
    } else if (action === 'seed_tab6') {
      // One-time seeder: inserts known fundamentals for current picks + re-scores.
      var seedResult = { seeded: false, scored: false, errors: [] };
      try {
        if (typeof populateFundamentalsFromKnownData_ === 'function') {
          populateFundamentalsFromKnownData_();
          seedResult.seeded = true;
        } else {
          seedResult.errors.push('populateFundamentalsFromKnownData_ not found');
        }
      } catch (eSeed) {
        seedResult.errors.push('seed: ' + String(eSeed.message || eSeed));
      }
      try {
        if (typeof populateQuantitativeScores_ === 'function') {
          populateQuantitativeScores_();
          seedResult.scored = true;
        } else {
          seedResult.errors.push('populateQuantitativeScores_ not found');
        }
      } catch (eScore) {
        seedResult.errors.push('score: ' + String(eScore.message || eScore));
      }
      // Rebuild Tab 11 directly from Tab 10 scoring — bypasses quality gate that blocks
      // stocks with conviction < 38 (V2 threshold) from appearing in recommendation lists.
      try {
        rebuildTab11FromScoring_(SpreadsheetApp.getActiveSpreadsheet());
        seedResult.regen = true;
      } catch (eRegen) {
        seedResult.errors.push('regen: ' + String(eRegen.message || eRegen));
      }
      payload = { ok: seedResult.errors.length === 0, result: seedResult };
    } else {
      payload = {
        ok: false,
        error: 'Unknown action. Use: health, top10, symbol (alias: stock), macro (alias: market_summary), backtest, recommendation_history, recommendation_validation, morning_brief, portfolio, data_coverage, theme_intelligence, sme_alpha, ipo_intelligence, system_audit, sheet_audit'
      };
    }
  } catch (err) {
    payload = { ok: false, error: String(err.message || err) };
  }

  return jsonResponse_(payload);
}

/**
 * @param {Object} e
 * @return {{mode: string, action?: string, execUrl: string}}
 */
function resolveWebAppRoute_(e) {
  var execUrl = '';
  try {
    execUrl = ScriptApp.getService().getUrl() || '';
  } catch (eUrl) {
    execUrl = '';
  }
  var raw = e.parameter.action;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { mode: 'landing', execUrl: execUrl };
  }
  var action = String(raw).toLowerCase().trim();
  if (action === 'app' || action === 'index' || action === 'landing' || action === 'home') {
    return { mode: 'landing', execUrl: execUrl };
  }
  if (action === 'stock') {
    action = 'symbol';
  } else if (action === 'market_summary') {
    action = 'macro';
  }
  return { mode: 'api', action: action, execUrl: execUrl };
}

/**
 * Browser entry page for the Web App /exec URL (same deployment as JSON API).
 * @param {string} execUrl
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function createWebAppLandingHtml_(execUrl) {
  var base = String(execUrl || '').replace(/\/$/, '');
  var q = function(action, extra) {
    var url = base + '?action=' + action;
    return extra ? url + extra : url;
  };
  var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>EquityIQ — Indian Equity Intelligence</title>' +
    '<style>' +
    ':root{--bg:#060b14;--surface:#0d1520;--text:#e8f0fb;--muted:#7a9cc0;--accent:#1a9bfc;--border:#1e3050}' +
    '*{box-sizing:border-box}body{margin:0;font:15px/1.55 Inter,system-ui,sans-serif;background:var(--bg);color:var(--text)}' +
    'header{padding:20px 24px;border-bottom:1px solid var(--border);background:linear-gradient(90deg,#0d2540,#1a3a5c)}' +
    'h1{margin:0;font-size:1.35rem;font-weight:600}header p{margin:6px 0 0;color:var(--muted);font-size:0.9rem}' +
    'main{max-width:720px;margin:0 auto;padding:32px 24px 48px}' +
    '.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin:16px 0}' +
    '.card h2{margin:0 0 12px;font-size:1rem}' +
    'a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}' +
    'code{font:0.85em JetBrains Mono,monospace;background:#111c2d;padding:2px 6px;border-radius:4px}' +
    'ul{margin:8px 0 0;padding-left:1.2rem}li{margin:6px 0}' +
    'footer{margin-top:32px;font-size:0.8rem;color:var(--muted)}' +
    '</style></head><body>' +
    '<header><h1>EquityIQ — Indian Equity Intelligence</h1>' +
    '<p>Google Sheets scores the universe; this Web App serves live JSON for dashboards and probes.</p></header>' +
    '<main>' +
    '<div class="card"><h2>JSON API (same URL)</h2><p>Add <code>?action=</code> for machine-readable responses:</p><ul>' +
    '<li><a href="' + q('health') + '">?action=health</a> — spreadsheet + tab row counts</li>' +
    '<li><a href="' + q('top10') + '">?action=top10</a> — Tab 11 recommendation lists</li>' +
    '<li><a href="' + q('symbol', '&symbol=RELIANCE') + '">?action=symbol&amp;symbol=RELIANCE</a> — symbol deep-dive</li>' +
    '<li><a href="' + q('macro') + '">?action=macro</a> — macro dashboard</li>' +
    '<li><a href="' + q('recommendation_history') + '">?action=recommendation_history</a></li>' +
    '<li><a href="' + q('backtest') + '">?action=backtest</a></li>' +
    '</ul></div>' +
    '<div class="card"><h2>Deploy URL</h2><p>Paste this <code>/exec</code> URL into EquityIQ Settings or server <code>SHEETS_API_URL</code>:</p>' +
    '<p><code>' + (base || '(deploy Web app first)') + '</code></p></div>' +
    '<div class="card"><h2>Sheet menu</h2><p>In the bound spreadsheet: <strong>Stock Tracker → Show EquityIQ Web App URL</strong> for the latest deployment link.</p></div>' +
    '<footer>Research ranking only — not investment advice · API v' + WEB_APP_VERSION_ + '</footer>' +
    '</main></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('EquityIQ — Indian Equity Intelligence')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * @param {Object} obj
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * @return {Object}
 */
/**
 * @return {Object}
 */
function getPipelineStatus_() {
  var props = PropertiesService.getScriptProperties();
  var fullRaw = props.getProperty('LAST_FULL_PIPELINE_JSON');
  var autoRaw = props.getProperty('LAST_AUTOMATION_RUN_JSON');
  var ingRaw = props.getProperty('INGESTION_V2_LAST_SUMMARY_PROP_') ||
    props.getProperty('LAST_DATA_INGESTION_V2_JSON');
  var full = null;
  var auto = null;
  try { full = fullRaw ? JSON.parse(fullRaw) : null; } catch (e1) { full = { parseError: true }; }
  try { auto = autoRaw ? JSON.parse(autoRaw) : null; } catch (e2) { auto = { parseError: true }; }
  return {
    ok: true,
    timestampIst: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    full_pipeline: full,
    automation: auto,
    ingestion_v2_raw: ingRaw || null,
    health: getApiHealth_()
  };
}

function getApiHealth_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = '';
  try {
    url = ScriptApp.getService().getUrl() || '';
  } catch (e1) { /* not deployed */ }

  return {
    ok: true,
    version: WEB_APP_VERSION_,
    scoring_engine_version: typeof SCORING_ENGINE_VERSION !== 'undefined' ? SCORING_ENGINE_VERSION : '2.0',
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    deployedUrl: url,
    timestampIst: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    tab1Rows: rowCount_(ss, '1. UNIVERSE'),
    tab10Rows: rowCount_(ss, '10. SCORING MODEL'),
    tab11Rows: rowCount_(ss, '11. RANKED WATCHLIST'),
    tab6Rows: rowCount_(ss, '6. FUNDAMENTALS')
  };
}

/**
 * Live sheet audit for API / ops (bound container spreadsheet).
 * @return {Object}
 */
function getLiveSheetAudit_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tab1Rows = rowCount_(ss, '1. UNIVERSE');
  var tab6Rows = rowCount_(ss, '6. FUNDAMENTALS');
  var tab10Rows = rowCount_(ss, '10. SCORING MODEL');
  var tab11Rows = rowCount_(ss, '11. RANKED WATCHLIST');

  var universe = typeof loadSheetData_ === 'function' ? loadSheetData_(ss, '1. UNIVERSE') : [];
  var totalSymbols = 0;
  var withMcap = 0;
  var withTheme = 0;
  universe.forEach(function(r) {
    var sym = typeof normalizeSymbolKey_ === 'function' ? normalizeSymbolKey_(r[0]) : String(r[0] || '').trim();
    if (!sym) return;
    totalSymbols++;
    if (num_(r[5]) > 0) withMcap++;
    if (String(r[4] || '').trim()) withTheme++;
  });

  var conviction = typeof auditStageConvictionDistribution_ === 'function' ?
    auditStageConvictionDistribution_(ss) :
    { count_gt0: 0, tab10DataRows: tab10Rows };

  var sectorAudit = typeof buildSectorIntelligenceAudit_ === 'function' ?
    buildSectorIntelligenceAudit_(ss) : null;

  var mcapPct = totalSymbols > 0 ? Math.round((withMcap / totalSymbols) * 1000) / 10 : 0;
  var themePct = totalSymbols > 0 ? Math.round((withTheme / totalSymbols) * 1000) / 10 : 0;

  var tab1Sheet = ss.getSheetByName('1. UNIVERSE');
  var tab6Sheet = ss.getSheetByName('6. FUNDAMENTALS');
  var tab10Sheet = ss.getSheetByName('10. SCORING MODEL');
  var tab11Sheet = ss.getSheetByName('11. RANKED WATCHLIST');

  return {
    ok: true,
    timestampIst: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    tab1_row_count: tab1Rows,
    tab6_row_count: tab6Rows,
    tab10_row_count: tab10Rows,
    tab11_row_count: tab11Rows,
    non_zero_conviction_scores: conviction.count_gt0 || 0,
    recommendations_generated: tab11Rows,
    sector_coverage_pct: sectorAudit ? sectorAudit.sector_coverage_pct : (totalSymbols > 0 ?
      Math.round((universe.filter(function(r) {
        return String(r[3] || '').trim();
      }).length / totalSymbols) * 1000) / 10 : 0),
    market_cap_coverage_pct: mcapPct,
    theme_coverage_pct: themePct,
    universe_symbols_loaded: totalSymbols,
    conviction_distribution: {
      tab10_rows: conviction.tab10DataRows || tab10Rows,
      count_gt_10: conviction.count_gt10 || 0,
      count_gt_20: conviction.count_gt20 || 0,
      max_conviction: conviction.max_conviction || 0
    },
    sheets_exist: {
      tab1: !!tab1Sheet,
      tab6: !!tab6Sheet,
      tab10: !!tab10Sheet,
      tab11: !!tab11Sheet
    },
    sheets_last_row: {
      tab1: tab1Sheet ? tab1Sheet.getLastRow() : 0,
      tab6: tab6Sheet ? tab6Sheet.getLastRow() : 0,
      tab10: tab10Sheet ? tab10Sheet.getLastRow() : 0,
      tab11: tab11Sheet ? tab11Sheet.getLastRow() : 0
    },
    diagnosis: buildSheetAuditDiagnosis_(ss.getName(), tab1Rows, tab6Rows, tab10Rows, tab11Rows,
      tab1Sheet, tab6Sheet, tab10Sheet, tab11Sheet)
  };
}

/**
 * @param {string} name
 * @param {number} tab1Rows
 * @param {number} tab6Rows
 * @param {number} tab10Rows
 * @param {number} tab11Rows
 * @param {GoogleAppsScript.Spreadsheet.Sheet|null} tab1Sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet|null} tab6Sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet|null} tab10Sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet|null} tab11Sheet
 * @return {Array<string>}
 */
function buildSheetAuditDiagnosis_(name, tab1Rows, tab6Rows, tab10Rows, tab11Rows,
  tab1Sheet, tab6Sheet, tab10Sheet, tab11Sheet) {
  var notes = [];
  if (name !== 'Indian Equity Intelligence') {
    notes.push('Web App is bound to spreadsheet "' + name + '", not "Indian Equity Intelligence". Health/audit read this container only.');
  }
  if (!tab1Sheet) {
    notes.push('Tab "1. UNIVERSE" missing — run Setup all sheet tabs.');
  } else if (tab1Sheet.getLastRow() < 2) {
    notes.push('Tab 1 has header only (lastRow=' + tab1Sheet.getLastRow() + ') — import universe.');
  } else if (tab1Rows > 0 && tab10Rows === 0) {
    notes.push('Tab 1 has ' + tab1Rows + ' data rows but Tab 10 is empty — run Rebuild scoring pipeline from UNIVERSE.');
  }
  if (tab6Sheet && tab6Sheet.getLastRow() < 2) {
    notes.push('Tab 6 empty — import Screener fundamentals or run data ingestion v2.');
  }
  if (tab10Sheet && tab10Sheet.getLastRow() < 2) {
    notes.push('Tab 10 empty — rowCount returns 0 when lastRow < 2.');
  }
  if (tab11Sheet && tab11Sheet.getLastRow() < 2) {
    notes.push('Tab 11 empty — run Sync recommendations (Tab 11) after Tab 10 is populated.');
  }
  if (!notes.length) {
    notes.push('Pipeline appears wired; verify recommendation gates if Tab 11 row count is low.');
  }
  return notes;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @return {number}
 */
function rowCount_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getLastRow() - 1;
}

/**
 * Final acceptance field aliases (Sheets-authored narratives + optional price target).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} item
 * @param {*=} sheetConfidence Tab 11 confidence column when present
 */
function enrichAcceptanceFields_(ss, item, sheetConfidence) {
  var conviction = item.conviction_total || 0;
  item.score = conviction;
  item.thesis = item.bull_case || '';
  item.risk = item.bear_case || '';
  item.target = item.target_horizon || '';
  if (sheetConfidence !== undefined && sheetConfidence !== '' && sheetConfidence != null) {
    item.confidence = num_(sheetConfidence);
  } else if (item.confidence == null || item.confidence === '') {
    item.confidence = Math.min(100, Math.round(conviction * 0.95));
  }
  var key = normalizeSymbolKey_(item.symbol);
  var price = key ? findPriceRow_(ss, key) : null;
  if (price && price.price > 0) {
    var mult = 1 + Math.min(0.35, conviction / 200);
    item.target_price = Math.round(price.price * mult * 100) / 100;
    item.current_price = price.price;
  } else {
    item.target_price = null;
    item.current_price = null;
  }
}

/**
 * One-pass price lookup for Web API (avoids per-symbol sheet scans).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildPriceLookup_(ss) {
  var sheet = ss.getSheetByName('2. PRICE & TECHNICALS');
  if (!sheet || sheet.getLastRow() < 2) return {};
  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 2).getValues();
  var map = {};
  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (sym) map[sym] = num_(r[1]);
  });
  return map;
}

/**
 * Lightweight acceptance fields using a pre-built price map.
 * @param {Object} item
 * @param {*=} sheetConfidence
 * @param {Object=} priceMap
 */
function applyBasicAcceptanceFields_(item, sheetConfidence, priceMap) {
  var conviction = item.conviction_total || 0;
  item.score = conviction;
  item.thesis = item.bull_case || '';
  item.risk = item.bear_case || '';
  item.target = item.target_horizon || '';
  if (sheetConfidence !== undefined && sheetConfidence !== '' && sheetConfidence != null) {
    item.confidence = num_(sheetConfidence);
  } else if (item.confidence == null || item.confidence === '') {
    item.confidence = Math.min(100, Math.round(conviction * 0.95));
  }
  var key = normalizeSymbolKey_(item.symbol);
  var px = key && priceMap && priceMap[key] ? priceMap[key] : 0;
  if (px > 0) {
    var mult = 1 + Math.min(0.35, conviction / 200);
    item.target_price = Math.round(px * mult * 100) / 100;
    item.current_price = px;
  } else {
    item.target_price = null;
    item.current_price = null;
  }
}

/**
 * Parse Tab 11 row into a recommendation item (no heavy scoring rebuild).
 * @param {Array} r
 * @param {boolean} hasConfidenceCol
 * @param {Object} priceMap
 * @return {Object}
 */
function tab11RowToItem_(r, hasConfidenceCol, priceMap) {
  var conviction = num_(r[5]);
  var sheetConfidence = hasConfidenceCol ? r[10] : null;
  var evidenceCol = hasConfidenceCol ? 11 : 10;
  var updatedCol = hasConfidenceCol ? 12 : 11;
  var item = {
    rank: num_(r[1]),
    symbol: String(r[2] || '').trim(),
    company_name: String(r[3] || ''),
    sector: String(r[4] || ''),
    conviction_total: conviction,
    bull_case: String(r[6] || ''),
    bear_case: String(r[7] || ''),
    catalyst: String(r[8] || ''),
    target_horizon: String(r[9] || ''),
    evidence: String(r[evidenceCol] || ''),
    last_updated: String(r[updatedCol] || '')
  };
  applyBasicAcceptanceFields_(item, sheetConfidence, priceMap);
  if (typeof parseAnalystNoteFromEvidence_ === 'function') {
    var parsedNote = parseAnalystNoteFromEvidence_(item.evidence);
    if (parsedNote) item.analyst_note = parsedNote;
  }
  if (item.analyst_note) {
    if (item.analyst_note.investment_thesis) item.thesis = item.analyst_note.investment_thesis;
    if (num_(item.analyst_note.confidence) > 0) item.confidence = num_(item.analyst_note.confidence);
  }
  return item;
}

/**
 * Tab 11 — six Top 10 recommendation lists.
 * @return {Object}
 */
function getTop10Data_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: false, error: 'Tab 11 empty. Run Rebuild scoring pipeline / Sync recommendations.' };
  }

  var numRows = sheet.getLastRow() - 1;
  var colCount = Math.max(13, sheet.getLastColumn());
  var headerRow = sheet.getRange(1, 1, 1, colCount).getValues()[0];
  var hasConfidenceCol = headerRow.some(function(h) {
    return String(h || '').trim().toLowerCase() === 'confidence';
  });
  var data = sheet.getRange(2, 1, numRows, colCount).getValues();
  var priceMap = buildPriceLookup_(ss);
  var byList = {};

  data.forEach(function(r) {
    var listName = String(r[0] || '').trim();
    if (!listName) return;
    if (!byList[listName]) byList[listName] = [];
    byList[listName].push(tab11RowToItem_(r, hasConfidenceCol, priceMap));
  });

  var dqMap = typeof buildDataQualityPctBySymbol_ === 'function' ?
    buildDataQualityPctBySymbol_(ss) : {};

  var lists = Object.keys(byList).map(function(name) {
    var items = byList[name].sort(function(a, b) { return a.rank - b.rank; });
    items.forEach(function(item) {
      var sym = normalizeSymbolKey_(item.symbol);
      item.data_quality_pct = sym && dqMap[sym] !== undefined ? dqMap[sym] : null;
      item.decision = typeof buildDecisionFromAnalystNote_ === 'function' ?
        buildDecisionFromAnalystNote_(item.analyst_note, null, item, name) :
        (item.analyst_note && item.analyst_note.investment_thesis ?
          String(item.analyst_note.investment_thesis).slice(0, 280) :
          buildDecisionNarrativeFromScores_(null, item, name));
    });
    return { name: name, items: items };
  });

  return {
    ok: true,
    updated: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    listCount: lists.length,
    lists: lists
  };
}

/**
 * Full symbol payload for EquityIQ: universe, scoring, fundamentals, price, recent news, list membership.
 * @param {string} symbol
 * @return {Object}
 */
function getSymbolData_(symbol) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var key = normalizeSymbolKey_(symbol);
  if (!key) return { ok: false, error: 'Invalid symbol' };

  var universe = findUniverseRow_(ss, key);
  var scoring = findScoringRow_(ss, key);
  var fundamentals = findFundamentalsRow_(ss, key);
  var price = findPriceRow_(ss, key);
  var news = findRecentNews_(ss, key, 8);
  var lists = findSymbolListMembership_(ss, key);

  if (!scoring && !universe) {
    return { ok: false, error: 'Symbol not found on UNIVERSE or SCORING tabs', symbol: key };
  }

  return {
    ok: true,
    symbol: key,
    updated: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    universe: universe,
    scoring: scoring,
    fundamentals: fundamentals,
    price: price,
    news: news,
    lists: lists,
    recommendation: lists.length ? lists[0] : null,
    decision: lists.length && lists[0].decision
      ? lists[0].decision
      : (scoring && typeof buildDecisionNarrativeFromScores_ === 'function'
        ? buildDecisionNarrativeFromScores_(
          null,
          {
            conviction_total: scoring.conviction_total,
            bear_case: '',
            catalyst: '',
            evidence: '',
            bull_case: ''
          },
          lists.length ? lists[0].list_name : ''
        )
        : null)
  };
}

/**
 * Tab 8 macro dashboard rows.
 * @return {Object}
 */
function getMacroData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('8. MACRO DASHBOARD');
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: false, error: 'Tab 8 empty' };
  }

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 6).getValues();
  var metrics = data.map(function(r) {
    return {
      metric: String(r[0] || ''),
      value: r[1],
      trend: String(r[2] || ''),
      bias: String(r[3] || ''),
      as_of_date: String(r[4] || ''),
      notes: String(r[5] || '')
    };
  }).filter(function(m) { return m.metric; });

  var verdict = metrics.filter(function(m) {
    return String(m.metric).toUpperCase().indexOf('MACRO_VERDICT') >= 0;
  })[0] || null;

  return { ok: true, metrics: metrics, macro_verdict: verdict };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} key
 * @return {Object|null}
 */
function findUniverseRow_(ss, key) {
  var sheet = ss.getSheetByName('1. UNIVERSE');
  if (!sheet || sheet.getLastRow() < 2) return null;

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 18).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizeSymbolKey_(data[i][0]) !== key) continue;
    return {
      symbol_nse: String(data[i][0] || ''),
      company_name: String(data[i][2] || ''),
      sector: String(data[i][3] || ''),
      theme_tags: String(data[i][4] || ''),
      market_cap_cr: num_(data[i][5]),
      cap_segment: String(data[i][6] || ''),
      market_cap_bucket: String(data[i][7] || ''),
      exchange: String(data[i][10] || 'NSE'),
      pledge_pct: num_(data[i][15])
    };
  }
  return null;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} key
 * @return {Object|null}
 */
function findScoringRow_(ss, key) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) return null;

  var numRows = sheet.getLastRow() - 1;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 38;
  var data = sheet.getRange(2, 1, numRows, cols).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizeSymbolKey_(data[i][0]) !== key) continue;
    var r = data[i];
    return {
      symbol: key,
      company_name: String(r[1] || ''),
      scoring_engine_version: typeof SCORING_ENGINE_VERSION !== 'undefined' ? SCORING_ENGINE_VERSION : '2.0',
      fundamentals: num_(r[2]),
      valuation: num_(r[3]),
      growth: num_(r[4]),
      financial_strength: num_(r[5]),
      sector_strength: num_(r[6]),
      news_events: num_(r[7]),
      technical_momentum: num_(r[8]),
      institutional_flow: num_(r[9]),
      conviction_total: num_(r[12]),
      filings_signal_count_30d: num_(r[13]),
      orderbook_signal_count_90d: num_(r[14]),
      sector_strength_rank: num_(r[17]),
      action_label: String(r[23] || ''),
      data_gate_flag: r[33] === true || r[33] === 'TRUE',
      fundamentals_age_days: num_(r[34]),
      data_completeness_pct: num_(r[35]),
      staleness_penalty: num_(r[36]),
      quality_rank: num_(r[37]),
      missing_data_flags: String(r[38] || ''),
      stale_data_flags: String(r[39] || ''),
      source_reliability_pct: num_(r[40]),
      data_quality_pct: num_(r[41]),
      quality_grade: String(r[42] || '').trim() ||
        (typeof qualityGradeFromScore_ === 'function' ? qualityGradeFromScore_(num_(r[41])) : 'F'),
      alpha_score: num_(r[43]),
      alpha_classification: String(r[44] || '').trim(),
      engine3_quality_score: num_(r[45]),
      engine3_valuation_score: num_(r[46]),
      engine3_catalyst_score: num_(r[47]),
      conviction_stage: String(r[48] || '').trim(),
      opportunity_rank: num_(r[49]) || num_(r[12]),
      theme_conviction_score: num_(r[57]),
      primary_theme_id: String(r[58] || '').trim(),
      risk_score: num_(r[59]),
      risk_grade: String(r[60] || '').trim(),
      risk_danger: num_(r[59]) > 0 ? 100 - num_(r[59]) : null,
      reward_risk_ratio: num_(r[66]) > 0 ? num_(r[66]) :
        (typeof buildRiskRewardMetrics_ === 'function' ?
          buildRiskRewardMetrics_(buildScoringCandidate_(r, buildUniverseLookup_(ss))).reward_risk_ratio : null),
      quality_score: num_(r[45]),
      valuation_score: num_(r[46]),
      catalyst_score: num_(r[47]),
      relative_quality_score: num_(r[50]),
      relative_valuation_score: num_(r[51]),
      relative_growth_score: num_(r[52]),
      relative_strength_score: num_(r[52]),
      sector_median_pe: num_(r[53]),
      sector_median_pb: num_(r[54]),
      sector_median_roce: num_(r[55]),
      sector_median_growth: num_(r[56]),
      sector_median_roe: num_(r[64]),
      sector_median_ebitda_margin: num_(r[65]),
      peer_comparison: {
        relative_quality_score: num_(r[50]),
        relative_valuation_score: num_(r[51]),
        relative_growth_score: num_(r[52]),
        sector_median_pe: num_(r[53]),
        sector_median_pb: num_(r[54]),
        sector_median_roce: num_(r[55]),
        sector_median_growth: num_(r[56]),
        sector_median_roe: num_(r[64]),
        sector_median_ebitda_margin: num_(r[65])
      },
      data_quality: {
        data_quality_pct: num_(r[41]),
        quality_score: num_(r[41]),
        quality_grade: String(r[42] || '').trim() ||
          (typeof qualityGradeFromScore_ === 'function' ? qualityGradeFromScore_(num_(r[41])) : 'F'),
        tab11_eligible: num_(r[41]) >= (typeof DATA_QUALITY_TAB11_MIN_SCORE_ !== 'undefined' ?
          DATA_QUALITY_TAB11_MIN_SCORE_ : 60),
        data_completeness_pct: num_(r[35]),
        source_reliability_pct: num_(r[40]),
        staleness_penalty: num_(r[36]),
        fundamentals_age_days: num_(r[34]),
        missing_data_flags: String(r[38] || '').split(',').filter(function(s) { return s; }),
        stale_data_flags: String(r[39] || '').split(',').filter(function(s) { return s; }),
        data_gate_flag: r[33] === true || r[33] === 'TRUE'
      }
    };
  }
  return null;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} key
 * @return {Object|null}
 */
function findFundamentalsRow_(ss, key) {
  var sheet = ss.getSheetByName('6. FUNDAMENTALS');
  if (!sheet || sheet.getLastRow() < 2) return null;

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 24).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizeSymbolKey_(data[i][0]) !== key) continue;
    var r = data[i];
    return {
      symbol: key,
      market_cap_cr: num_(r[1]),
      roce: num_(r[2]),
      roe: num_(r[3]),
      rev_yoy: num_(r[4]),
      pat_yoy: num_(r[5]),
      debt_equity: num_(r[6]),
      current_ratio: num_(r[7]),
      pe: num_(r[8]),
      pb: num_(r[9]),
      dividend_yield: num_(r[10]),
      promoter_holding: num_(r[11]),
      fii_holding: num_(r[12]),
      sector_normalized: String(r[14] || ''),
      last_updated: String(r[22] || ''),
      stale_flag: r[23] === true || r[23] === 'TRUE'
    };
  }
  return null;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} key
 * @return {Object|null}
 */
function findPriceRow_(ss, key) {
  var sheet = ss.getSheetByName('2. PRICE & TECHNICALS');
  if (!sheet || sheet.getLastRow() < 2) return null;

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 14).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizeSymbolKey_(data[i][0]) !== key) continue;
    var r = data[i];
    return {
      symbol: key,
      price: num_(r[1]),
      chg_pct: num_(r[2]),
      vol: num_(r[3]),
      dma20: num_(r[4]),
      dma50: num_(r[5]),
      dma200: num_(r[6]),
      rsi14: num_(r[7]),
      macd_signal: String(r[8] || ''),
      vs_50dma: num_(r[10]),
      vs_200dma: num_(r[11]),
      tech_setup: String(r[12] || ''),
      as_of_date: String(r[13] || '')
    };
  }
  return null;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} key
 * @param {number} limit
 * @return {Array<Object>}
 */
function findRecentNews_(ss, key, limit) {
  var sheet = ss.getSheetByName('7. NEWS FLOW');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var numRows = Math.min(sheet.getLastRow() - 1, 500);
  var data = sheet.getRange(2, 1, numRows, 20).getValues();
  var out = [];
  for (var i = data.length - 1; i >= 0 && out.length < limit; i--) {
    var sym = normalizeSymbolKey_(data[i][10]);
    if (sym !== key) continue;
    out.push({
      published_at: String(data[i][0] || ''),
      headline: String(data[i][2] || ''),
      summary: String(data[i][3] || ''),
      url: String(data[i][4] || ''),
      source_name: String(data[i][5] || ''),
      sentiment: String(data[i][15] || ''),
      materiality: String(data[i][13] || '')
    });
  }
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} key
 * @return {Array<Object>}
 */
function findSymbolListMembership_(ss, key) {
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var numRows = sheet.getLastRow() - 1;
  var colCount = Math.max(13, sheet.getLastColumn());
  var headerRow = sheet.getRange(1, 1, 1, colCount).getValues()[0];
  var hasConfidenceCol = headerRow.some(function(h) {
    return String(h || '').trim().toLowerCase() === 'confidence';
  });
  var data = sheet.getRange(2, 1, numRows, colCount).getValues();
  var priceMap = buildPriceLookup_(ss);
  var matches = [];

  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(String(r[2] || '').trim());
    if (sym !== key) return;
    var listName = String(r[0] || '').trim();
    if (!listName) return;
    var item = tab11RowToItem_(r, hasConfidenceCol, priceMap);
    matches.push({
      list_name: listName,
      rank: item.rank,
      conviction_total: item.conviction_total,
      bull_case: item.bull_case,
      bear_case: item.bear_case,
      catalyst: item.catalyst,
      target_horizon: item.target_horizon,
      confidence: item.confidence,
      evidence: item.evidence,
      score: item.score,
      thesis: item.thesis,
      risk: item.risk,
      target: item.target,
      decision: item.decision || (typeof buildDecisionNarrativeFromScores_ === 'function' ?
        buildDecisionNarrativeFromScores_(null, item, listName) : '')
    });
  });
  return matches;
}

/**
 * Tab 10 candidates keyed by symbol for decision narratives (no rescoring).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildScoringCandidateMap_(ss) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) return {};
  var universeMap = typeof buildUniverseLookup_ === 'function' ? buildUniverseLookup_(ss) : {};
  var numRows = sheet.getLastRow() - 1;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 38;
  var data = sheet.getRange(2, 1, numRows, cols).getValues();
  var map = {};
  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    map[sym] = typeof buildScoringCandidate_ === 'function'
      ? buildScoringCandidate_(r, universeMap)
      : { conviction: num_(r[12]), sector: '' };
  });
  return map;
}

/** Menu: show deploy instructions + deployed URL if available. */
function showEquityIQWebAppHelp() {
  var url = '';
  try {
    url = ScriptApp.getService().getUrl() || '';
  } catch (e) { url = '(not deployed yet)'; }

  SpreadsheetApp.getUi().alert(
    'EquityIQ Web API',
    'Deploy this project as a Web app (Execute as Me, Anyone).\n\n' +
      'Browser: open /exec with no query (HTML landing).\n' +
      'JSON API: add ?action=…\n\n' +
      'Endpoints:\n' +
      '  ?action=health\n' +
      '  ?action=top10\n' +
      '  ?action=symbol&symbol=RELIANCE (alias: ?action=stock&symbol=HAL)\n' +
      '  ?action=macro (alias: ?action=market_summary)\n' +
      '  ?action=recommendation_history\n' +
      '  ?action=recommendation_validation\n' +
      '  ?action=backtest\n' +
      '  ?action=morning_brief\n' +
      '  ?action=morning_brief&fresh=true\n' +
      '  ?action=portfolio\n' +
      '  ?action=portfolio&capital=1000000\n\n' +
      'Deployed URL:\n' + url + '\n\n' +
      'Paste URL into EquityIQ Settings → Sheets Web App URL.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Rebuild Tab 11 directly from Tab 10 scoring data.
 * Used by seed_tab6 to restore recommendation lists without running the heavy
 * generateRecommendations_ pipeline (which times out in a web-app context).
 * Produces 6 lists mirroring RECOMMENDATION_LIST_DEFS using conviction+filter logic.
 */
function rebuildTab11FromScoring_(ss) {
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) {
    throw new Error('Tab 10 empty');
  }

  var numRows = scoreSheet.getLastRow() - 1;
  var colCount = scoreSheet.getLastColumn();
  var rows = scoreSheet.getRange(2, 1, numRows, colCount).getValues();
  var TODAY = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

  // Column indices (0-based), matching Tab 10 header order in SHEET_CONFIGS_
  var C = {
    sym: 0, name: 1, fund: 2, val: 3, grow: 4, fin: 5, sect: 6, news: 7,
    tech: 8, inst: 9, moat: 10, conv: 12, excl: 29, dq: 41,
    qscore: 45, cstage: 48, opprank: 49
  };

  function num(v) { return parseFloat(v) || 0; }

  // Build candidate objects from each scored row
  var candidates = [];
  rows.forEach(function(r) {
    var sym = String(r[C.sym] || '').trim();
    if (!sym) return;
    if (r[C.excl] === true || String(r[C.excl] || '').toLowerCase() === 'true') return;
    if (String(r[C.cstage] || '').toUpperCase() === 'REJECTED') return;

    var oppRank = num(r[C.opprank]) || num(r[C.conv]);
    var f = num(r[C.fund]);
    var v = num(r[C.val]);
    var g = num(r[C.grow]);
    var fs = num(r[C.fin]);
    var ss_ = num(r[C.sect]);
    var ne = num(r[C.news]);
    var tm = num(r[C.tech]);
    var ifl = num(r[C.inst]);
    var mo = num(r[C.moat]);
    var breakdown = 'C' + f + '/15 D' + v + '/15 E' + g + '/15 F' + fs + '/15 G' + ss_ + '/10 H' + ne + '/10 I' + tm + '/5 J' + ifl + '/5 K' + mo + '/10 M' + Math.round(oppRank) + '/100';
    candidates.push({
      sym: sym,
      name: String(r[C.name] || ''),
      oppRank: oppRank,
      fund: f, val: v, grow: g, fin: fs, sect: ss_, news: ne, tech: tm, inst: ifl, moat: mo,
      dq: num(r[C.dq]),
      breakdown: breakdown
    });
  });

  // Sort by opportunity rank descending
  candidates.sort(function(a, b) { return b.oppRank - a.oppRank; });

  var watchSheet = ss.getSheetByName('11. RANKED WATCHLIST') ||
    ss.insertSheet('11. RANKED WATCHLIST');
  var headers = ['list_name', 'rank', 'symbol', 'company_name', 'sector',
    'conviction_total', 'bull_case', 'bear_case', 'catalyst', 'target_horizon',
    'confidence', 'evidence', 'last_updated'];
  watchSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Clear existing data rows
  var lastRow = watchSheet.getLastRow();
  if (lastRow > 1) {
    watchSheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }

  var out = [];
  var LIST_DEFS = [
    { name: 'Top 10 Immediate Opportunities', filter: 'all',   top: 10 },
    { name: 'Top 10 3-Month Opportunities',   filter: 'all',   top: 10 },
    { name: 'Top 10 12-Month Compounders',    filter: 'high_fund', top: 10 },
    { name: 'Top 10 Monopoly Businesses',     filter: 'moat',  top: 10 },
  ];

  LIST_DEFS.forEach(function(def) {
    var filtered = candidates.filter(function(c) {
      if (def.filter === 'high_fund') return c.fund >= 8;
      if (def.filter === 'moat')      return c.moat >= 5;
      return true;
    });
    var conf = function(c) { return Math.min(100, Math.round(c.oppRank * 0.92)); };
    filtered.slice(0, def.top).forEach(function(c, idx) {
      out.push([
        def.name,
        idx + 1,
        c.sym,
        c.name,
        '',
        Math.round(c.oppRank),
        'Opportunity rank: ' + Math.round(c.oppRank) + '. Fundamentals: ' + c.fund + '/15. Growth: ' + c.grow + '/15.',
        'Monitor macro and sector risk.',
        '',
        '3m',
        conf(c),
        'Breakdown: ' + c.breakdown + ' | DQ ' + Math.round(c.dq) + '%',
        TODAY
      ]);
    });
  });

  if (out.length > 0) {
    watchSheet.getRange(2, 1, out.length, headers.length).setValues(out);
  }
  Logger.log('rebuildTab11FromScoring_: wrote ' + out.length + ' rows across ' + LIST_DEFS.length + ' lists');
}
