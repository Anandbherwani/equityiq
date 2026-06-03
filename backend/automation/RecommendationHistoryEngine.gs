/**
 * Recommendation History Engine v1.0 — permanent daily evidence log + live track record.
 * Tab 37 append-only snapshots at 8 AM; API scorecards and live alpha vs Nifty/sector.
 * See docs/RECOMMENDATION_HISTORY.md
 */

var REC_HISTORY_ENGINE_VERSION_ = '1.1';
var REC_HISTORY_SHEET_ = '37. RECOMMENDATION HISTORY';
var REC_HISTORY_MAX_TEXT_ = 4500;

/** Tab 11 list_name → recommendation_category (no blank values). */
var TAB11_LIST_CATEGORY_MAP_ = {
  'Top 10 Immediate Opportunities': 'immediate',
  'Top 10 3-Month Opportunities': 'three_month',
  'Top 10 12-Month Compounders': 'compounders',
  'Top 10 Monopoly Businesses': 'monopoly',
  'Top 10 Government Beneficiaries': 'gov_beneficiary',
  'Top 10 Turnarounds': 'turnaround',
  'Top Themes': 'theme',
  'Theme Winners': 'theme_winner',
  'Theme Conviction': 'theme_winner',
  'Top 10 Theme Stocks': 'theme_stock',
  'Top 10 SME Opportunities': 'sme_compounder',
  'IPO Intelligence': 'ipo'
};

/** All valid stored categories (includes SME tracks). */
var VALID_RECOMMENDATION_CATEGORIES_ = [
  'immediate', 'three_month', 'compounders', 'monopoly', 'gov_beneficiary', 'turnaround',
  'theme', 'theme_winner', 'theme_stock',
  'sme_compounder', 'sme_migration', 'sme_export', 'sme_gov',
  'ipo'
];

var REC_HISTORY_HEADERS_ = [
  'snapshot_date', 'recommendation_category', 'list_name', 'rank', 'symbol', 'company_name',
  'sector_key', 'entry_price', 'conviction', 'thesis', 'target', 'confidence', 'risk',
  'risk_score', 'data_quality_pct', 'source'
];

/**
 * Ensure Tab 37 exists.
 */
function ensureRecommendationHistorySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetWithHeaders_(ss, REC_HISTORY_SHEET_, REC_HISTORY_HEADERS_);
}

/**
 * @param {string} listName
 * @return {string}
 */
function recommendationCategoryFromListName_(listName) {
  if (TAB11_LIST_CATEGORY_MAP_[listName]) return TAB11_LIST_CATEGORY_MAP_[listName];
  if (typeof recommendationFilterFromListName_ === 'function') {
    var f = recommendationFilterFromListName_(listName);
    if (f) return f;
  }
  if (typeof RECOMMENDATION_LIST_DEFS !== 'undefined') {
    for (var i = 0; i < RECOMMENDATION_LIST_DEFS.length; i++) {
      if (RECOMMENDATION_LIST_DEFS[i].name === listName) return RECOMMENDATION_LIST_DEFS[i].filter;
    }
  }
  return '';
}

/**
 * Parse Tab 11 evidence JSON for category overrides (SME track, IPO).
 * @param {string} evidence
 * @return {Object}
 */
function parseTab11EvidenceMeta_(evidence) {
  var out = { recommendation_category: '', sme_track: '', ipo_verdict: '' };
  if (!evidence || String(evidence).indexOf('{') < 0) return out;
  try {
    var o = JSON.parse(evidence);
    if (o.recommendation_category) out.recommendation_category = String(o.recommendation_category);
    if (o.sme_track) out.sme_track = String(o.sme_track);
    if (o.ipo_verdict) out.ipo_verdict = String(o.ipo_verdict);
  } catch (e1) { /* ignore */ }
  return out;
}

/**
 * Resolve category for snapshot — never returns blank for known lists.
 * @param {Object} pick
 * @return {string}
 */
function resolveRecommendationCategory_(pick) {
  var meta = parseTab11EvidenceMeta_(pick.evidence || '');
  if (meta.recommendation_category && VALID_RECOMMENDATION_CATEGORIES_.indexOf(meta.recommendation_category) >= 0) {
    return meta.recommendation_category;
  }
  if (meta.sme_track && VALID_RECOMMENDATION_CATEGORIES_.indexOf(meta.sme_track) >= 0) {
    return meta.sme_track;
  }
  if (pick.list_name === 'IPO Intelligence' || meta.ipo_verdict) return 'ipo';
  var fromList = recommendationCategoryFromListName_(pick.list_name);
  if (fromList && VALID_RECOMMENDATION_CATEGORIES_.indexOf(fromList) >= 0) return fromList;
  if (TAB11_LIST_CATEGORY_MAP_[pick.list_name]) return TAB11_LIST_CATEGORY_MAP_[pick.list_name];
  return '';
}

/**
 * Theme-only rows are not equity tickers — skip live return math.
 * @param {Object} row
 * @return {boolean}
 */
function isEquityHistoryRow_(row) {
  if (!row) return false;
  if (row.recommendation_category === 'theme') return false;
  var sym = String(row.symbol || '');
  if (sym.indexOf('THEME_') === 0) return false;
  return sym.length >= 2 && sym.indexOf(' ') < 0;
}

/**
 * @param {string} text
 * @param {number=} maxLen
 * @return {string}
 */
function truncateHistoryText_(text, maxLen) {
  maxLen = maxLen || REC_HISTORY_MAX_TEXT_;
  var s = String(text || '').trim();
  if (s.length <= maxLen) return s;
  return s.substring(0, maxLen - 3) + '...';
}

/**
 * Daily 8 AM — append Tab 11 picks to permanent history (deduped by date+list+symbol).
 * @return {number}
 */
function snapshotRecommendationHistory_() {
  ensureRecommendationHistorySheet_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var sheet = ss.getSheetByName(REC_HISTORY_SHEET_);
  var existing = loadRecommendationHistoryKeys_(sheet);
  var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
  var dqMap = buildDataQualityPctBySymbol_(ss);
  var universeMap = buildUniverseLookup_(ss);
  var scoringMap = typeof buildScoringCandidateMap_ === 'function' ?
    buildScoringCandidateMap_(ss) : {};
  var picks = loadTab11RecommendationRows_(ss);
  var rows = [];
  var skippedNoCategory = 0;

  picks.forEach(function(p) {
    var sym = normalizeSymbolKey_(p.symbol);
    var category = resolveRecommendationCategory_(p);
    if (!category) {
      skippedNoCategory++;
      return;
    }
    var key = today + '|' + sym + '|' + p.list_name;
    if (existing[key]) return;
    var u = universeMap[sym] || {};
    var sectorKey = normalizeSectorName_(p.sector || u.sector || '');
    var px = prices[sym] && prices[sym].price ? prices[sym].price : p.entry_price || '';
    var sc = scoringMap[sym] || {};
    var riskScore = sc.risk_score != null ? sc.risk_score :
      (sc.riskScore != null ? sc.riskScore : '');

    rows.push([
      today,
      category,
      p.list_name,
      p.rank,
      sym,
      p.company_name,
      sectorKey,
      px,
      p.conviction_total,
      truncateHistoryText_(p.thesis || p.bull_case),
      String(p.target || p.target_horizon || ''),
      p.confidence != null && p.confidence !== '' ? p.confidence : '',
      truncateHistoryText_(p.risk || p.bear_case),
      riskScore,
      dqMap[sym] != null ? dqMap[sym] : '',
      'tab11_daily_snapshot'
    ]);
  });

  if (rows.length) {
    var start = Math.max(sheet.getLastRow(), 1) + 1;
    sheet.getRange(start, 1, rows.length, REC_HISTORY_HEADERS_.length).setValues(rows);
  }

  if (skippedNoCategory > 0) {
    appendAlert('', 'rec_history_skip_category',
      skippedNoCategory + ' Tab 11 rows skipped (no recommendation_category)', REC_HISTORY_SHEET_);
  }
  appendAlert('', 'rec_history_snapshot',
    rows.length + ' recommendation history rows on Tab 37', REC_HISTORY_SHEET_);
  return rows.length;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @return {Object}
 */
function loadRecommendationHistoryKeys_(sheet) {
  var map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  data.forEach(function(r) {
    var key = String(r[0]) + '|' + normalizeSymbolKey_(r[4]) + '|' + String(r[2]);
    map[key] = true;
  });
  return map;
}

/**
 * All Tab 11 rows with narrative fields.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function loadTab11RecommendationRows_(ss) {
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var numRows = sheet.getLastRow() - 1;
  var colCount = Math.max(13, sheet.getLastColumn());
  var headerRow = sheet.getRange(1, 1, 1, colCount).getValues()[0];
  var confIdx = -1;
  for (var h = 0; h < headerRow.length; h++) {
    if (String(headerRow[h] || '').trim().toLowerCase() === 'confidence') confIdx = h;
  }
  var data = sheet.getRange(2, 1, numRows, colCount).getValues();
  var out = [];

  data.forEach(function(r) {
    var listName = String(r[0] || '').trim();
    var sym = normalizeSymbolKey_(r[2]);
    if (!listName || !sym) return;
    var confidence = confIdx >= 0 ? r[confIdx] : (colCount >= 11 ? r[10] : '');
    var evidenceCol = confIdx >= 0 ? 11 : 10;
    var evidence = String(r[evidenceCol] || '');
    var meta = parseTab11EvidenceMeta_(evidence);
    out.push({
      list_name: listName,
      rank: num_(r[1]),
      symbol: sym,
      company_name: String(r[3] || ''),
      sector: String(r[4] || ''),
      conviction_total: num_(r[5]),
      bull_case: String(r[6] || ''),
      bear_case: String(r[7] || ''),
      thesis: String(r[6] || ''),
      risk: String(r[7] || ''),
      target_horizon: String(r[9] || ''),
      target: String(r[9] || ''),
      confidence: confidence,
      evidence: evidence,
      recommendation_category: meta.recommendation_category,
      sme_track: meta.sme_track
    });
  });
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string=} categoryFilter
 * @param {string=} symbolFilter
 * @return {Array<Object>}
 */
function loadRecommendationHistoryRows_(ss, categoryFilter, symbolFilter) {
  ensureRecommendationHistorySheet_();
  var sheet = ss.getSheetByName(REC_HISTORY_SHEET_);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, REC_HISTORY_HEADERS_.length).getValues();
  return data.map(function(r) {
    return parseRecommendationHistoryRow_(r);
  }).filter(function(row) {
    if (!row.snapshot_date || !row.symbol) return false;
    if (categoryFilter && row.recommendation_category !== categoryFilter) return false;
    if (symbolFilter && normalizeSymbolKey_(symbolFilter) !== row.symbol) return false;
    return true;
  });
}

/**
 * @param {Array} r
 * @return {Object}
 */
function parseRecommendationHistoryRow_(r) {
  var listName = String(r[2] || '');
  var cat = String(r[1] || '').trim();
  if (!cat && listName) cat = recommendationCategoryFromListName_(listName);
  return {
    snapshot_date: parseSheetDate_(r[0]),
    entry_date: parseSheetDate_(r[0]),
    recommendation_category: cat,
    list_name: String(r[2] || ''),
    rank: num_(r[3]),
    symbol: normalizeSymbolKey_(r[4]),
    company_name: String(r[5] || ''),
    sector_key: normalizeSectorName_(String(r[6] || '')),
    entry_price: num_(r[7]),
    conviction: num_(r[8]),
    thesis: String(r[9] || ''),
    target: String(r[10] || ''),
    confidence: r[11] === '' ? null : num_(r[11]),
    risk: String(r[12] || ''),
    risk_score: r[13] === '' ? null : num_(r[13]),
    data_quality_pct: r[14] === '' ? null : num_(r[14]),
    source: String(r[15] || 'tab11_daily_snapshot')
  };
}

/**
 * Live metrics from entry (snapshot) to today.
 * @param {Object} row
 * @param {Date} today
 * @return {Object}
 */
function computeRecommendationHistoryLiveMetrics_(row, today) {
  if (!isEquityHistoryRow_(row)) {
    return emptyHistoryMetrics_();
  }
  var entryDate = row.entry_date || row.snapshot_date;
  if (!entryDate) {
    return emptyHistoryMetrics_();
  }

  var entryPrice = row.entry_price > 0 ? row.entry_price :
    fetchHistoricalClose_(row.symbol, entryDate);
  var currentPrice = 0;
  if (typeof buildPriceBySymbol_ === 'function') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
    if (prices[row.symbol] && prices[row.symbol].price > 0) {
      currentPrice = prices[row.symbol].price;
    }
  }
  if (!currentPrice || currentPrice <= 0) {
    currentPrice = fetchHistoricalClose_(row.symbol, today);
  }

  var niftyEntry = typeof NIFTY_FINANCE_SYMBOLS_ !== 'undefined' ?
    fetchHistoricalClose_(NIFTY_FINANCE_SYMBOLS_, entryDate) : 0;
  var niftyExit = typeof NIFTY_FINANCE_SYMBOLS_ !== 'undefined' ?
    fetchHistoricalClose_(NIFTY_FINANCE_SYMBOLS_, today) : 0;
  var niftyRet = niftyEntry > 0 && niftyExit > 0 ?
    ((niftyExit - niftyEntry) / niftyEntry) * 100 : null;

  var sectorSym = typeof resolveSectorBenchmarkSymbol_ === 'function' ?
    resolveSectorBenchmarkSymbol_(row.sector_key) :
    (typeof NIFTY_FINANCE_SYMBOLS_ !== 'undefined' ? NIFTY_FINANCE_SYMBOLS_ : []);
  var secEntry = fetchHistoricalClose_(sectorSym, entryDate);
  var secExit = fetchHistoricalClose_(sectorSym, today);
  var sectorRet = secEntry > 0 && secExit > 0 ?
    ((secExit - secEntry) / secEntry) * 100 : null;

  var currentReturn = entryPrice > 0 && currentPrice > 0 ?
    Math.round(((currentPrice - entryPrice) / entryPrice) * 10000) / 100 : null;
  var alphaNifty = currentReturn != null && niftyRet != null ?
    Math.round((currentReturn - niftyRet) * 100) / 100 : null;
  var alphaSector = currentReturn != null && sectorRet != null ?
    Math.round((currentReturn - sectorRet) * 100) / 100 : null;

  return {
    entry_date: Utilities.formatDate(entryDate, 'Asia/Kolkata', 'yyyy-MM-dd'),
    current_price: currentPrice > 0 ? Math.round(currentPrice * 100) / 100 : null,
    current_return_pct: currentReturn,
    nifty_return_pct: niftyRet != null ? Math.round(niftyRet * 100) / 100 : null,
    sector_return_pct: sectorRet != null ? Math.round(sectorRet * 100) / 100 : null,
    alpha_vs_nifty_pct: alphaNifty,
    alpha_vs_sector_pct: alphaSector,
    hit: currentReturn != null ? currentReturn > 0 : null
  };
}

/**
 * @return {Object}
 */
function emptyHistoryMetrics_() {
  return {
    entry_date: '',
    current_price: null,
    current_return_pct: null,
    nifty_return_pct: null,
    sector_return_pct: null,
    alpha_vs_nifty_pct: null,
    alpha_vs_sector_pct: null,
    hit: null
  };
}

/**
 * Enrich history rows with live metrics.
 * @param {Array<Object>} rows
 * @return {Array<Object>}
 */
function enrichRecommendationHistoryWithMetrics_(rows) {
  var today = new Date();
  return rows.map(function(row) {
    var live = computeRecommendationHistoryLiveMetrics_(row, today);
    return Object.assign({}, row, {
      snapshot_date: row.snapshot_date ?
        Utilities.formatDate(row.snapshot_date, 'Asia/Kolkata', 'yyyy-MM-dd') : '',
      live: live
    });
  });
}

/**
 * Scorecard for one recommendation category.
 * @param {Array<Object>} enriched
 * @param {string} category
 * @return {Object}
 */
function buildRecommendationScorecard_(enriched, category) {
  var subset = enriched.filter(function(r) {
    return r.recommendation_category === category;
  });
  var withRet = subset.filter(function(r) {
    return r.live && r.live.current_return_pct != null;
  });

  var issued = subset.length;
  var hits = withRet.filter(function(r) { return r.live.hit; }).length;
  var hitRate = withRet.length ?
    Math.round((hits / withRet.length) * 1000) / 10 : null;
  var avgReturn = withRet.length ?
    Math.round(withRet.reduce(function(s, r) {
      return s + r.live.current_return_pct;
    }, 0) / withRet.length * 100) / 100 : null;
  var withAlphaNifty = withRet.filter(function(r) {
    return r.live.alpha_vs_nifty_pct != null;
  });
  var avgAlphaNifty = withAlphaNifty.length ?
    Math.round(withAlphaNifty.reduce(function(s, r) {
      return s + r.live.alpha_vs_nifty_pct;
    }, 0) / withAlphaNifty.length * 100) / 100 : null;
  var withAlphaSector = withRet.filter(function(r) {
    return r.live.alpha_vs_sector_pct != null;
  });
  var avgAlphaSector = withAlphaSector.length ?
    Math.round(withAlphaSector.reduce(function(s, r) {
      return s + r.live.alpha_vs_sector_pct;
    }, 0) / withAlphaSector.length * 100) / 100 : null;

  var best = null;
  var worst = null;
  withRet.forEach(function(r) {
    if (!best || r.live.current_return_pct > best.return_pct) {
      best = {
        symbol: r.symbol,
        company_name: r.company_name,
        list_name: r.list_name,
        entry_date: r.live.entry_date,
        return_pct: r.live.current_return_pct,
        alpha_vs_nifty_pct: r.live.alpha_vs_nifty_pct
      };
    }
    if (!worst || r.live.current_return_pct < worst.return_pct) {
      worst = {
        symbol: r.symbol,
        company_name: r.company_name,
        list_name: r.list_name,
        entry_date: r.live.entry_date,
        return_pct: r.live.current_return_pct,
        alpha_vs_nifty_pct: r.live.alpha_vs_nifty_pct
      };
    }
  });

  var label = categoryLabelForCategory_(category);

  return {
    recommendation_category: category,
    category_label: label,
    recommendations_issued: issued,
    with_returns: withRet.length,
    hit_rate_pct: hitRate,
    average_return_pct: avgReturn,
    average_alpha_vs_nifty_pct: avgAlphaNifty,
    average_alpha_vs_sector_pct: avgAlphaSector,
    best_pick: best,
    worst_pick: worst
  };
}

/**
 * Web API — history explorer payload.
 * @param {Object=} params
 * @return {Object}
 */
function getRecommendationHistoryData_(params) {
  params = params || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var category = String(params.category || '').trim();
  var symbol = String(params.symbol || '').trim();
  var rows = loadRecommendationHistoryRows_(ss, category || null, symbol || null);
  var enriched = enrichRecommendationHistoryWithMetrics_(rows);

  enriched.sort(function(a, b) {
    var da = String(a.snapshot_date || '');
    var db = String(b.snapshot_date || '');
    if (da !== db) return db.localeCompare(da);
    return (a.rank || 99) - (b.rank || 99);
  });

  var dates = enriched.map(function(r) { return r.snapshot_date; }).filter(Boolean);
  var categories = {};
  enriched.forEach(function(r) {
    if (r.recommendation_category) categories[r.recommendation_category] = true;
  });

  return {
    ok: true,
    engine_version: REC_HISTORY_ENGINE_VERSION_,
    updated: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    total_rows: enriched.length,
    date_range: {
      earliest: dates.length ? dates.reduce(function(a, b) { return a < b ? a : b; }) : null,
      latest: dates.length ? dates.reduce(function(a, b) { return a > b ? a : b; }) : null
    },
    categories: Object.keys(categories).sort(),
    entries: enriched
  };
}

/**
 * @param {string} category
 * @return {string}
 */
function categoryLabelForCategory_(category) {
  var labels = {
    immediate: 'Top 10 Immediate Opportunities',
    three_month: 'Top 10 3-Month Opportunities',
    compounders: 'Top 10 12-Month Compounders',
    monopoly: 'Top 10 Monopoly Businesses',
    gov_beneficiary: 'Top 10 Government Beneficiaries',
    turnaround: 'Top 10 Turnarounds',
    theme: 'Top Themes',
    theme_winner: 'Theme Winners / Conviction',
    theme_stock: 'Top 10 Theme Stocks',
    sme_compounder: 'SME Compounders',
    sme_migration: 'SME Migration Candidates',
    sme_export: 'SME Export Stories',
    sme_gov: 'SME Government Beneficiaries',
    ipo: 'IPO Intelligence'
  };
  if (labels[category]) return labels[category];
  if (typeof RECOMMENDATION_LIST_DEFS !== 'undefined') {
    for (var i = 0; i < RECOMMENDATION_LIST_DEFS.length; i++) {
      if (RECOMMENDATION_LIST_DEFS[i].filter === category) return RECOMMENDATION_LIST_DEFS[i].name;
    }
  }
  return category;
}

/**
 * Recommendation History Health Monitor (M3).
 * @param {GoogleAppsScript.Spreadsheet=} ss
 * @return {Object}
 */
function getRecommendationHistoryHealth_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var sheet = ss.getSheetByName(REC_HISTORY_SHEET_);
  var tabExists = !!sheet;
  var totalRows = 0;
  var rowsToday = 0;
  var lastSnapshotDate = null;
  var blankCategoryRows = 0;

  if (sheet && sheet.getLastRow() >= 2) {
    totalRows = sheet.getLastRow() - 1;
    var data = sheet.getRange(2, 1, totalRows, 5).getValues();
    data.forEach(function(r) {
      var d = String(r[0] || '').substring(0, 10);
      if (d === today) rowsToday++;
      if (!lastSnapshotDate || d > lastSnapshotDate) lastSnapshotDate = d;
      var cat = String(r[1] || '').trim();
      if (!cat) blankCategoryRows++;
    });
  }

  var engineDeployed = typeof snapshotRecommendationHistory_ === 'function';
  var last8amOk = false;
  var last8amPhase = '';
  var last8amIst = '';
  try {
    var autoRaw = PropertiesService.getScriptProperties().getProperty('LAST_AUTOMATION_RUN_JSON');
    if (autoRaw) {
      var auto = JSON.parse(autoRaw);
      last8amPhase = auto.phase || '';
      last8amIst = auto.finishedIst || auto.startedIst || '';
      if (auto.phase === '8am_briefing' && auto.ok === true) last8amOk = true;
    }
  } catch (e1) { /* ignore */ }

  var status = 'PASS';
  if (!tabExists || !engineDeployed) status = 'FAIL';
  else if (!totalRows || blankCategoryRows > 0) status = 'PARTIAL';
  else if (rowsToday === 0) status = 'PARTIAL';

  return {
    engine_version: REC_HISTORY_ENGINE_VERSION_,
    status: status,
    tab37_exists: tabExists,
    snapshot_engine_deployed: engineDeployed,
    last_snapshot_date: lastSnapshotDate,
    rows_added_today: rowsToday,
    total_history_rows: totalRows,
    blank_category_rows: blankCategoryRows,
    last_8am_run_ok: last8amOk,
    last_8am_phase: last8amPhase,
    last_8am_ist: last8amIst,
    checked_at: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss")
  };
}

/**
 * System audit stage — M3 health monitor.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStageRecommendationHistoryHealth_(ss) {
  var h = getRecommendationHistoryHealth_(ss);
  return {
    status: h.status,
    tab37Exists: h.tab37_exists,
    snapshotEngineDeployed: h.snapshot_engine_deployed,
    lastSnapshotDate: h.last_snapshot_date,
    rowsAddedToday: h.rows_added_today,
    totalHistoryRows: h.total_history_rows,
    blankCategoryRows: h.blank_category_rows,
    last8amRunOk: h.last_8am_run_ok,
    last8amIst: h.last_8am_ist,
    note: h.blank_category_rows > 0 ?
      'Re-snapshot after M1 category mapping; legacy rows may need backfill' :
      (h.rows_added_today === 0 ? 'Run 8 AM briefing or Snapshot history → Tab 37' : '')
  };
}

/**
 * Web API — validation dashboard + scorecards.
 * @return {Object}
 */
function getRecommendationValidationData_() {
  var history = getRecommendationHistoryData_({});
  if (!history.ok) return history;

  var categories = history.categories.filter(function(c) {
    return c && VALID_RECOMMENDATION_CATEGORIES_.indexOf(c) >= 0;
  });
  if (!categories.length) {
    categories = VALID_RECOMMENDATION_CATEGORIES_.slice();
  }

  var scorecards = categories.map(function(cat) {
    return buildRecommendationScorecard_(history.entries, cat);
  }).filter(function(sc) {
    return sc.recommendations_issued > 0;
  });

  var allWithRet = history.entries.filter(function(r) {
    return r.live && r.live.current_return_pct != null;
  });
  var overallHits = allWithRet.filter(function(r) { return r.live.hit; }).length;

  return {
    ok: true,
    engine_version: REC_HISTORY_ENGINE_VERSION_,
    updated: history.updated,
    total_recommendations: history.total_rows,
    total_with_returns: allWithRet.length,
    overall_hit_rate_pct: allWithRet.length ?
      Math.round((overallHits / allWithRet.length) * 1000) / 10 : null,
    scorecards: scorecards,
    history_summary: history.date_range,
    history_health: getRecommendationHistoryHealth_()
  };
}

/**
 * Menu — snapshot history now.
 */
function snapshotRecommendationHistoryMenu() {
  var n = snapshotRecommendationHistory_();
  SpreadsheetApp.getUi().alert(
    'Recommendation History',
    n + ' rows appended to Tab 37.\nRun daily via 8 AM automation after Tab 11 sync.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Menu — log history API sample.
 */
function previewRecommendationHistoryJson() {
  var payload = getRecommendationHistoryData_({});
  Logger.log(JSON.stringify(payload).substring(0, 8000));
  SpreadsheetApp.getUi().alert(
    'History preview',
    'Total rows: ' + (payload.total_rows || 0) + '\nSee Apps Script execution log for JSON.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
