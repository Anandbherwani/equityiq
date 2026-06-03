/**
 * Google Sheets JSON API for EquityIQ (Option C — presentation layer).
 * Deploy: Deploy → New deployment → Web app → Execute as Me, Who has access: Anyone.
 * Paste WebAppApi.gs alongside Code.gs in the same Apps Script project.
 */

var WEB_APP_VERSION_ = '1.0.0';

/**
 * @param {Object} e
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  e = e || {};
  var action = String(e.parameter.action || 'health').toLowerCase();
  var payload;

  try {
    if (action === 'health') {
      payload = getApiHealth_();
    } else if (action === 'top10' || action === 'watchlist') {
      payload = getTop10Data_();
    } else if (action === 'symbol') {
      var symbol = String(e.parameter.symbol || '').trim();
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
    } else {
      payload = { ok: false, error: 'Unknown action. Use: health, top10, symbol, macro, backtest, theme_intelligence, morning_brief, portfolio, recommendation_history, recommendation_validation, recommendation_history_health, data_coverage, sme_alpha, ipo_intelligence, system_audit' };
    }
  } catch (err) {
    payload = { ok: false, error: String(err.message || err) };
  }

  return jsonResponse_(payload);
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
    tab10Rows: rowCount_(ss, '10. SCORING MODEL'),
    tab11Rows: rowCount_(ss, '11. RANKED WATCHLIST'),
    tab6Rows: rowCount_(ss, '6. FUNDAMENTALS')
  };
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
  var byList = {};

  data.forEach(function(r) {
    var listName = String(r[0] || '').trim();
    if (!listName) return;
    if (!byList[listName]) byList[listName] = [];
    var conviction = num_(r[5]);
    var sym = String(r[2] || '').trim();
    var sheetConfidence = hasConfidenceCol ? r[10] : null;
    var evidenceCol = hasConfidenceCol ? 11 : 10;
    var updatedCol = hasConfidenceCol ? 12 : 11;
    var item = {
      rank: num_(r[1]),
      symbol: sym,
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
    enrichAcceptanceFields_(ss, item, sheetConfidence);
    byList[listName].push(item);
  });

  var dqMap = buildDataQualityPctBySymbol_(ss);
  var scoringMap = buildScoringCandidateMap_(ss);

  var lists = Object.keys(byList).map(function(name) {
    var items = byList[name].sort(function(a, b) { return a.rank - b.rank; });
    items.forEach(function(item) {
      var sym = normalizeSymbolKey_(item.symbol);
      item.data_quality_pct = sym && dqMap[sym] !== undefined ? dqMap[sym] : null;
      var candidate = sym && scoringMap[sym] ? scoringMap[sym] : null;
      if (candidate && typeof buildScoreBreakdown_ === 'function') {
        item.score_breakdown = buildScoreBreakdown_(candidate);
        item.why_ranked = typeof buildWhyRanked_ === 'function' ?
          buildWhyRanked_(candidate, name, null) : '';
      }
      if (typeof parseAnalystNoteFromEvidence_ === 'function') {
        var parsedNote = parseAnalystNoteFromEvidence_(item.evidence);
        if (parsedNote) item.analyst_note = parsedNote;
      }
      if (!item.analyst_note && candidate &&
        typeof buildAnalystRecommendationNote_ === 'function') {
        var filterId = typeof recommendationFilterFromListName_ === 'function' ?
          recommendationFilterFromListName_(name) : '';
        var note = buildAnalystRecommendationNote_(candidate, filterId, null, name, ss);
        if (typeof isAnalystNoteComplete_ === 'function' && isAnalystNoteComplete_(note)) {
          item.analyst_note = note;
        }
      }
      if (item.analyst_note) {
        if (item.analyst_note.investment_thesis) item.thesis = item.analyst_note.investment_thesis;
        if (num_(item.analyst_note.confidence) > 0) item.confidence = num_(item.analyst_note.confidence);
      }
      item.decision = typeof buildDecisionFromAnalystNote_ === 'function' ?
        buildDecisionFromAnalystNote_(item.analyst_note, candidate, item, name) :
        buildDecisionNarrativeFromScores_(candidate, item, name);
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
      : (typeof buildDecisionNarrativeFromScores_ === 'function'
        ? buildDecisionNarrativeFromScores_(
          buildScoringCandidateMap_(ss)[key] || null,
          { conviction_total: scoring ? scoring.conviction_total : 0, bear_case: '', catalyst: '', evidence: '', bull_case: '' },
          ''
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
  var top = getTop10Data_();
  if (!top.ok) return [];
  var matches = [];
  top.lists.forEach(function(list) {
    (list.items || []).forEach(function(item) {
      if (normalizeSymbolKey_(item.symbol) === key) {
        matches.push({
          list_name: list.name,
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
          decision: item.decision || buildDecisionNarrativeFromScores_(null, item, list.name)
        });
      }
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
      'Endpoints:\n' +
      '  ?action=health\n' +
      '  ?action=top10\n' +
      '  ?action=symbol&symbol=RELIANCE\n' +
      '  ?action=macro\n' +
      '  ?action=morning_brief\n' +
      '  ?action=morning_brief&fresh=true\n' +
      '  ?action=portfolio\n' +
      '  ?action=portfolio&capital=1000000\n\n' +
      'Deployed URL:\n' + url + '\n\n' +
      'Paste URL into EquityIQ Settings → Sheets Web App URL.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
