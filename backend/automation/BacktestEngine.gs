/**
 * Backtest Engine v4.0 — actual Tab 22 recommendation snapshots only.
 * No synthetic cohorts or current-Tab-11 fallbacks. Per-trade paired alpha vs
 * Nifty 50 and sector index on identical entry/exit dates.
 * See docs/BACKTEST_ENGINE.md · docs/BACKTEST_VALIDATION_REPORT.md
 *
 * Tab 22 — snapshots · Tab 23 — results · Tab 31 — dashboard · Tab 36 — validation
 */

var BACKTEST_ENGINE_VERSION_ = '4.0';
var BACKTEST_SHEET_LOG = '22. BACKTEST LOG';
var BACKTEST_SHEET_RESULTS = '23. BACKTEST RESULTS';
var BACKTEST_SHEET_DASHBOARD_ = '31. RECOMMENDATION PERFORMANCE';
var BACKTEST_SHEET_VALIDATION_ = '36. BACKTEST VALIDATION';
/** Minimum completed trades per horizon to mark validation PASS. */
var BACKTEST_MIN_TRADES_VALIDATION_ = 3;
var NIFTY_FINANCE_SYMBOLS_ = ['INDEXNSE:NIFTY 50', 'NSE:NIFTY', 'NSEI:NIFTY 50'];
/** Minimum Tab 22 rows per list before horizons are evaluated. */
var BACKTEST_MIN_SNAPSHOT_ROWS_ = 5;

/** Fallback if RECOMMENDATION_LIST_DEFS unavailable. */
var BACKTEST_TRACKED_LISTS_FALLBACK_ = [
  'Top 10 Immediate Opportunities',
  'Top 10 3-Month Opportunities',
  'Top 10 12-Month Compounders',
  'Top 10 Monopoly Businesses',
  'Top 10 Government Beneficiaries',
  'Top 10 Turnarounds'
];

/** @type {Array<Object>} */
var BACKTEST_HORIZONS_ = [
  { key: '1M', label: '1 Month', days: 30 },
  { key: '3M', label: '3 Month', days: 90 },
  { key: '6M', label: '6 Month', days: 180 },
  { key: '12M', label: '12 Month', days: 365 }
];

var BACKTEST_HEADERS_LOG = [
  'snapshot_date', 'list_name', 'rank', 'symbol', 'company_name', 'sector_key',
  'entry_price', 'conviction_total', 'data_quality_pct', 'source'
];

var BACKTEST_HEADERS_RESULTS = [
  'run_at', 'list_name', 'horizon', 'benchmark', 'sample_count', 'hit_rate_pct', 'avg_return_pct',
  'median_return_pct', 'alpha_pct', 'sharpe_ratio', 'sortino_ratio', 'max_drawdown_pct',
  'total_return_pct', 'winners', 'losers', 'mode', 'notes'
];

var BACKTEST_HEADERS_VALIDATION_ = [
  'run_at', 'scope', 'list_name', 'horizon', 'verdict', 'snapshot_rows', 'trade_count',
  'hit_rate_pct', 'avg_return_pct', 'alpha_vs_nifty_pct', 'alpha_vs_sector_pct',
  'sharpe_ratio', 'sortino_ratio', 'max_drawdown_pct', 'mode', 'notes'
];

/** Sector → NSE index / ETF proxy for benchmark return. */
var SECTOR_BENCHMARK_SYMBOLS_ = {
  'IT SERVICES': ['NSE:NIFTYIT', 'INDEXNSE:NIFTY IT'],
  'BFSI': ['NSE:NIFTYBANK', 'INDEXNSE:NIFTY BANK'],
  'PHARMACEUTICALS': ['NSE:NIFTYPHARMA', 'INDEXNSE:NIFTY PHARMA'],
  'AUTOMOBILES': ['NSE:NIFTYAUTO', 'INDEXNSE:NIFTY AUTO'],
  'METALS & MINING': ['NSE:NIFTYMETAL', 'INDEXNSE:NIFTY METAL'],
  'METALS': ['NSE:NIFTYMETAL', 'INDEXNSE:NIFTY METAL'],
  'OIL & GAS': ['NSE:NIFTYOILGAS', 'INDEXNSE:NIFTY OIL & GAS'],
  'POWER': ['NSE:NIFTYPSE', 'INDEXNSE:NIFTY PSE'],
  'REAL ESTATE': ['NSE:NIFTYREALTY', 'INDEXNSE:NIFTY REALTY'],
  'CONSUMER': ['NSE:NIFTYFMCG', 'INDEXNSE:NIFTY FMCG'],
  'FMCG': ['NSE:NIFTYFMCG', 'INDEXNSE:NIFTY FMCG'],
  'INDUSTRIALS': ['NSE:NIFTYINDIAMFG', 'INDEXNSE:NIFTY INDIA MFG'],
  'DEFENCE': ['NSE:NIFTYINDDEFENCE', 'INDEXNSE:NIFTY IND DEFENCE'],
  'INFRASTRUCTURE': ['NSE:NIFTYINFRA', 'INDEXNSE:NIFTY INFRA'],
  'TELECOM': ['NSE:NIFTYMEDIA', 'INDEXNSE:NIFTY MEDIA'],
  'MEDIA': ['NSE:NIFTYMEDIA', 'INDEXNSE:NIFTY MEDIA'],
  'CHEMICALS': ['NSE:NIFTYCOMMODITIES', 'INDEXNSE:NIFTY COMMODITIES'],
  'CEMENT': ['NSE:NIFTYINFRA', 'INDEXNSE:NIFTY INFRA'],
  'NBFC': ['NSE:NIFTYBANK', 'INDEXNSE:NIFTY BANK'],
  'INSURANCE': ['NSE:NIFTYBANK', 'INDEXNSE:NIFTY BANK'],
  'RETAIL': ['NSE:NIFTYCONSUMPTION', 'INDEXNSE:NIFTY CONSUMPTION'],
  'LOGISTICS': ['NSE:NIFTYTRANSPORT', 'INDEXNSE:NIFTY TRANSPORTATION & LOGISTICS'],
  'ELECTRICALS': ['NSE:NIFTYINDIAMFG', 'INDEXNSE:NIFTY INDIA MFG'],
  'RENEWABLES': ['NSE:NIFTYENERGY', 'INDEXNSE:NIFTY ENERGY'],
  'DEFAULT': NIFTY_FINANCE_SYMBOLS_
};

/**
 * @return {Array<string>}
 */
function getBacktestTrackedLists_() {
  if (typeof RECOMMENDATION_LIST_DEFS !== 'undefined' && RECOMMENDATION_LIST_DEFS.length) {
    return RECOMMENDATION_LIST_DEFS.map(function(d) { return d.name; });
  }
  return BACKTEST_TRACKED_LISTS_FALLBACK_.slice();
}

/**
 * Ensure Tab 22/23/31 exist.
 */
function ensureBacktestSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetWithHeaders_(ss, BACKTEST_SHEET_LOG, BACKTEST_HEADERS_LOG);
  ensureSheetWithHeaders_(ss, BACKTEST_SHEET_RESULTS, BACKTEST_HEADERS_RESULTS);
  ensureSheetWithHeaders_(ss, BACKTEST_SHEET_DASHBOARD_, [
    'run_at', 'list_name', 'horizon', 'metric', 'recommendations', 'nifty', 'sector', 'alpha_vs_nifty',
    'alpha_vs_sector', 'mode', 'snapshot_rows'
  ]);
  ensureSheetWithHeaders_(ss, BACKTEST_SHEET_VALIDATION_, BACKTEST_HEADERS_VALIDATION_);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @param {Array<string>} headers
 */
function ensureSheetWithHeaders_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

/**
 * Snapshot all Tab 11 lists to Tab 22 (deduped by date+list+symbol).
 * @return {number} rows appended
 */
function snapshotBacktestPicks() {
  return snapshotAllBacktestLists_();
}

/**
 * @return {number}
 */
function snapshotAllBacktestLists_() {
  ensureBacktestSheets_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var logSheet = ss.getSheetByName(BACKTEST_SHEET_LOG);
  var existing = loadBacktestSnapshotKeys_(logSheet);
  var dqMap = buildDataQualityPctBySymbol_(ss);
  var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
  var universeMap = buildUniverseLookup_(ss);
  var rows = [];
  var lists = getBacktestTrackedLists_();

  lists.forEach(function(listName) {
    var picks = buildPicksFromTab11List_(ss, listName, 10);
    picks.forEach(function(p) {
      var sym = normalizeSymbolKey_(p.symbol);
      var key = today + '|' + sym + '|' + listName;
      if (existing[key]) return;
      var u = universeMap[sym] || {};
      var sectorKey = normalizeSectorName_(p.sector || u.sector || '');
      var px = prices[sym] && prices[sym].price ? prices[sym].price : '';
      rows.push([
        today,
        listName,
        p.rank,
        sym,
        p.company_name,
        sectorKey,
        px,
        p.conviction_total,
        dqMap[sym] || '',
        'tab11_snapshot'
      ]);
    });
  });

  if (rows.length) {
    var start = Math.max(logSheet.getLastRow(), 1) + 1;
    logSheet.getRange(start, 1, rows.length, BACKTEST_HEADERS_LOG.length).setValues(rows);
  }

  appendAlert('', 'backtest_snapshot',
    rows.length + ' picks logged (' + lists.length + ' lists) on Tab 22', BACKTEST_SHEET_LOG);
  return rows.length;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} listName
 * @param {number} limit
 * @return {Array<Object>}
 */
function buildPicksFromTab11List_(ss, listName, limit) {
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var numRows = sheet.getLastRow() - 1;
  var colCount = Math.max(12, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, numRows, colCount).getValues();
  var dqMap = buildDataQualityPctBySymbol_(ss);
  var out = [];

  data.forEach(function(r) {
    if (String(r[0] || '').trim() !== listName) return;
    var sym = normalizeSymbolKey_(r[2]);
    if (!sym) return;
    out.push({
      rank: num_(r[1]),
      symbol: sym,
      company_name: String(r[3] || ''),
      sector: String(r[4] || ''),
      conviction_total: num_(r[5]),
      data_quality_pct: dqMap[sym] || null
    });
  });

  out.sort(function(a, b) { return a.rank - b.rank; });
  return out.slice(0, limit);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @return {Object}
 */
function loadBacktestSnapshotKeys_(sheet) {
  var map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  data.forEach(function(r) {
    var key = String(r[0]) + '|' + normalizeSymbolKey_(r[3]) + '|' + String(r[1]);
    map[key] = true;
  });
  return map;
}

/**
 * Menu: run full backtest → Tab 23 + Tab 31 dashboard.
 */
function runBacktestEngine() {
  var report = evaluateBacktestAllHorizons_();
  writeBacktestResults_(report);
  writeBacktestDashboardSheet_(report);
  writeBacktestValidationSheet_(report.validation);
  SpreadsheetApp.getUi().alert(
    'Backtest v' + BACKTEST_ENGINE_VERSION_ + ' complete',
    formatBacktestSummaryAlert_(report),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return report;
}

/**
 * @return {Object}
 */
function evaluateBacktestAllHorizons_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var allSnapshots = loadBacktestSnapshots_(ss);
  var results = [];
  var listReports = [];
  var tracked = getBacktestTrackedLists_();

  tracked.forEach(function(listName) {
    var listSnaps = allSnapshots.filter(function(s) { return s.list_name === listName; });
    var ready = listSnaps.length >= BACKTEST_MIN_SNAPSHOT_ROWS_;
    var mode = ready ? 'snapshot_log' : 'insufficient_snapshots';

    listReports.push({
      list_name: listName,
      mode: mode,
      cohort_size: ready ? listSnaps.length : 0,
      snapshot_rows: listSnaps.length,
      ready: ready
    });

    BACKTEST_HORIZONS_.forEach(function(h) {
      if (!ready) {
        results.push.apply(results, buildBacktestSkippedRows_(listName, h, listSnaps.length));
        return;
      }
      var recTrades = evaluateRecommendationSnapshotTrades_(listSnaps, h.days, today);
      var niftyTrades = evaluateSnapshotCohortForHorizon_(listSnaps, h.days, today, 'nifty');
      var sectorTrades = evaluateSnapshotCohortForHorizon_(listSnaps, h.days, today, 'sector');
      results.push.apply(results,
        buildHorizonResultSet_(listName, h, recTrades, niftyTrades, sectorTrades, mode));
    });
  });

  var dashboard = buildRecommendationPerformanceDashboard_(results, listReports, allSnapshots.length);
  var syntheticExcluded = countSyntheticSnapshotsExcluded_(ss);
  var validation = buildBacktestValidationReport_(results, listReports, allSnapshots, today, syntheticExcluded);

  return {
    engine_version: BACKTEST_ENGINE_VERSION_,
    run_at: Utilities.formatDate(today, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    lists: listReports,
    snapshot_rows_total: allSnapshots.length,
    snapshot_only: true,
    synthetic_excluded: syntheticExcluded,
    results: results,
    dashboard: dashboard,
    validation: validation
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {number}
 */
function countSyntheticSnapshotsExcluded_(ss) {
  var sheet = ss.getSheetByName(BACKTEST_SHEET_LOG);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var n = 0;
  var colCount = Math.max(10, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, colCount).getValues();
  data.forEach(function(r) {
    var src = colCount >= 10 ? String(r[9] || '') : String(r[8] || '');
    if (src.indexOf('synthetic') >= 0) n++;
  });
  return n;
}

/**
 * @param {string} listName
 * @param {Object} h
 * @param {number} snapCount
 * @return {Array<Array>}
 */
function buildBacktestSkippedRows_(listName, h, snapCount) {
  var note = 'Need ' + BACKTEST_MIN_SNAPSHOT_ROWS_ + '+ Tab 22 recommendation snapshots (have ' +
    snapCount + '). Run daily snapshotAllBacktestLists_. v4 uses snapshot history only — no synthetic data.';
  var row = function(bench) {
    return buildBacktestResultRow_(listName, h, bench, [], 'insufficient_snapshots', {
      alpha_vs_nifty_pct: '',
      alpha_vs_sector_pct: '',
      notes: note
    });
  };
  return [row('recommendations'), row('nifty'), row('sector')];
}

/**
 * @param {string} listName
 * @param {Object} h
 * @param {Array<Object>} recTrades
 * @param {Array<Object>} niftyTrades
 * @param {Array<Object>} sectorTrades
 * @param {string} mode
 * @return {Array<Array>}
 */
function buildHorizonResultSet_(listName, h, recTrades, niftyTrades, sectorTrades, mode) {
  var recM = computeBacktestMetrics_(recTrades);
  var nifM = computeBacktestMetrics_(niftyTrades);
  var secM = computeBacktestMetrics_(sectorTrades);
  var alphaN = recM.mean_alpha_vs_nifty_pct != null ? recM.mean_alpha_vs_nifty_pct :
    (recM.sample_count > 0 && nifM.sample_count > 0 ?
      Math.round((recM.avg_return_pct - nifM.avg_return_pct) * 100) / 100 : '');
  var alphaS = recM.mean_alpha_vs_sector_pct != null ? recM.mean_alpha_vs_sector_pct :
    (recM.sample_count > 0 && secM.sample_count > 0 ?
      Math.round((recM.avg_return_pct - secM.avg_return_pct) * 100) / 100 : '');

  return [
    buildBacktestResultRow_(listName, h, 'recommendations', recTrades, mode, {
      alpha_vs_nifty_pct: alphaN,
      alpha_vs_sector_pct: alphaS,
      notes: recM.sample_count < BACKTEST_MIN_TRADES_VALIDATION_ ?
        'Low sample — keep daily Tab 22 snapshots' : 'Paired alpha vs Nifty/sector on snapshot dates'
    }),
    buildBacktestResultRow_(listName, h, 'nifty', niftyTrades, mode, {}),
    buildBacktestResultRow_(listName, h, 'sector', sectorTrades, mode, {})
  ];
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string=} listName
 * @return {Array<Object>}
 */
function loadBacktestSnapshots_(ss, listName) {
  var sheet = ss.getSheetByName(BACKTEST_SHEET_LOG);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var colCount = Math.max(BACKTEST_HEADERS_LOG.length, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, colCount).getValues();
  var tracked = getBacktestTrackedLists_();
  var universeMap = buildUniverseLookup_(ss);

  return data.map(function(r) {
    var row = parseBacktestLogRow_(r, colCount);
    if (!row.sector_key && universeMap[row.symbol]) {
      row.sector_key = normalizeSectorName_(universeMap[row.symbol].sector || '');
    }
    return row;
  }).filter(function(row) {
    if (!row.snapshot_date || !row.symbol || !row.list_name) return false;
    if (listName && row.list_name !== listName) return false;
    if (tracked.indexOf(row.list_name) < 0) return false;
    if (String(row.source).indexOf('synthetic') >= 0) return false;
    return true;
  });
}

/**
 * @param {Array} r
 * @param {number} colCount
 * @return {Object}
 */
function parseBacktestLogRow_(r, colCount) {
  if (colCount >= BACKTEST_HEADERS_LOG.length) {
    return {
      snapshot_date: parseSheetDate_(r[0]),
      list_name: String(r[1] || ''),
      rank: num_(r[2]),
      symbol: normalizeSymbolKey_(r[3]),
      company_name: String(r[4] || ''),
      sector_key: normalizeSectorName_(String(r[5] || '')),
      entry_price_logged: num_(r[6]),
      conviction_total: num_(r[7]),
      data_quality_pct: num_(r[8]),
      source: String(r[9] || 'tab11_snapshot')
    };
  }
  return {
    snapshot_date: parseSheetDate_(r[0]),
    list_name: String(r[1] || ''),
    rank: num_(r[2]),
    symbol: normalizeSymbolKey_(r[3]),
    company_name: String(r[4] || ''),
    sector_key: '',
    entry_price_logged: num_(r[5]),
    conviction_total: num_(r[6]),
    data_quality_pct: num_(r[7]),
    source: String(r[8] || 'tab11_snapshot')
  };
}

/**
 * Recommendation picks from Tab 22 snapshots — paired alpha vs Nifty & sector on same dates.
 * @param {Array<Object>} cohort
 * @param {number} horizonDays
 * @param {Date} today
 * @return {Array<Object>}
 */
function evaluateRecommendationSnapshotTrades_(cohort, horizonDays, today) {
  var trades = [];
  var msDay = 86400000;

  cohort.forEach(function(row) {
    var window = resolveSnapshotTradeWindow_(row.snapshot_date, horizonDays, today);
    if (!window) return;

    var entryPrice = row.entry_price_logged > 0 ?
      row.entry_price_logged :
      fetchHistoricalClose_(row.symbol, window.entryDate);
    var exitPrice = fetchHistoricalClose_(row.symbol, window.exitDate);
    if (!entryPrice || !exitPrice || entryPrice <= 0) return;

    var retPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    var niftyEntry = fetchHistoricalClose_(NIFTY_FINANCE_SYMBOLS_, window.entryDate);
    var niftyExit = fetchHistoricalClose_(NIFTY_FINANCE_SYMBOLS_, window.exitDate);
    var niftyRet = niftyEntry > 0 && niftyExit > 0 ?
      ((niftyExit - niftyEntry) / niftyEntry) * 100 : null;

    var sectorSym = resolveSectorBenchmarkSymbol_(row.sector_key);
    var secEntry = fetchHistoricalClose_(sectorSym, window.entryDate);
    var secExit = fetchHistoricalClose_(sectorSym, window.exitDate);
    var sectorRet = secEntry > 0 && secExit > 0 ?
      ((secExit - secEntry) / secEntry) * 100 : null;

    trades.push({
      symbol: row.symbol,
      list_name: row.list_name,
      sector_key: row.sector_key,
      snapshot_date: row.snapshot_date,
      entryDate: window.entryDate,
      exitDate: window.exitDate,
      entryPrice: entryPrice,
      exitPrice: exitPrice,
      return_pct: retPct,
      nifty_return_pct: niftyRet,
      sector_return_pct: sectorRet,
      alpha_vs_nifty_pct: niftyRet != null ? Math.round((retPct - niftyRet) * 100) / 100 : null,
      alpha_vs_sector_pct: sectorRet != null ? Math.round((retPct - sectorRet) * 100) / 100 : null,
      hit: retPct > 0
    });
  });

  return trades;
}

/**
 * @param {Date} entryDate
 * @param {number} horizonDays
 * @param {Date} today
 * @return {{entryDate:Date, exitDate:Date}|null}
 */
function resolveSnapshotTradeWindow_(entryDate, horizonDays, today) {
  if (!entryDate) return null;
  var msDay = 86400000;
  var naturalExit = new Date(entryDate.getTime() + horizonDays * msDay);
  if (naturalExit > today) return null;
  return { entryDate: entryDate, exitDate: naturalExit };
}

/**
 * Historical snapshot cohort — entry = snapshot_date, exit = entry + horizon (≤ today).
 * @param {Array<Object>} cohort
 * @param {number} horizonDays
 * @param {Date} today
 * @param {string} benchmarkType nifty|sector
 * @return {Array<Object>}
 */
function evaluateSnapshotCohortForHorizon_(cohort, horizonDays, today, benchmarkType) {
  var trades = [];
  var msDay = 86400000;

  cohort.forEach(function(row) {
    var window = resolveSnapshotTradeWindow_(row.snapshot_date, horizonDays, today);
    if (!window) return;
    var entryDate = window.entryDate;
    var exitDate = window.exitDate;

    var entryPrice;
    var exitPrice;
    var label = row.symbol;

    if (benchmarkType === 'nifty') {
      entryPrice = fetchHistoricalClose_(NIFTY_FINANCE_SYMBOLS_, entryDate);
      exitPrice = fetchHistoricalClose_(NIFTY_FINANCE_SYMBOLS_, exitDate);
      label = 'NIFTY50';
    } else if (benchmarkType === 'sector') {
      var sectorSym = resolveSectorBenchmarkSymbol_(row.sector_key);
      entryPrice = fetchHistoricalClose_(sectorSym, entryDate);
      exitPrice = fetchHistoricalClose_(sectorSym, exitDate);
      label = 'SECTOR:' + (row.sector_key || 'DEFAULT');
    }

    if (!entryPrice || !exitPrice || entryPrice <= 0) return;

    var retPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    trades.push({
      symbol: label,
      list_name: row.list_name,
      sector_key: row.sector_key,
      entryDate: entryDate,
      exitDate: exitDate,
      entryPrice: entryPrice,
      exitPrice: exitPrice,
      return_pct: retPct,
      hit: retPct > 0
    });
  });

  return trades;
}

/**
 * @param {string} sectorKey
 * @return {Array<string>}
 */
function resolveSectorBenchmarkSymbol_(sectorKey) {
  var sk = String(sectorKey || '').toUpperCase().trim();
  if (!sk) return SECTOR_BENCHMARK_SYMBOLS_.DEFAULT;
  if (SECTOR_BENCHMARK_SYMBOLS_[sk]) return SECTOR_BENCHMARK_SYMBOLS_[sk];
  var keys = Object.keys(SECTOR_BENCHMARK_SYMBOLS_);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] === 'DEFAULT') continue;
    if (sk.indexOf(keys[i]) >= 0 || keys[i].indexOf(sk) >= 0) {
      return SECTOR_BENCHMARK_SYMBOLS_[keys[i]];
    }
  }
  return SECTOR_BENCHMARK_SYMBOLS_.DEFAULT;
}

/**
 * @param {string} listName
 * @param {Object} h
 * @param {string} benchmark
 * @param {Array<Object>} trades
 * @param {string} mode
 * @param {Object=} extras
 * @return {Array}
 */
function buildBacktestResultRow_(listName, h, benchmark, trades, mode, extras) {
  extras = extras || {};
  var m = computeBacktestMetrics_(trades);
  var alphaCol = '';
  if (benchmark === 'recommendations') {
    if (extras.alpha_vs_nifty_pct !== undefined && extras.alpha_vs_nifty_pct !== '') {
      alphaCol = extras.alpha_vs_nifty_pct;
    }
  }
  return [
    Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    listName,
    h.label,
    benchmark,
    m.sample_count,
    m.hit_rate_pct,
    m.avg_return_pct,
    m.median_return_pct,
    alphaCol,
    m.sharpe_ratio,
    m.sortino_ratio,
    m.max_drawdown_pct,
    m.total_return_pct,
    m.winners,
    m.losers,
    mode,
    extras.notes || (m.sample_count < 3 ? 'Low sample' : '')
  ];
}

/**
 * @param {Array<Object>} trades
 * @return {Object}
 */
function computeBacktestMetrics_(trades) {
  if (!trades.length) {
    return emptyBacktestMetrics_();
  }

  var rets = trades.map(function(t) { return t.return_pct; });
  var sorted = rets.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(sorted.length / 2);
  var median = sorted.length % 2 === 0 ?
    (sorted[mid - 1] + sorted[mid]) / 2 :
    sorted[mid];

  var winners = trades.filter(function(t) { return t.hit; }).length;
  var losers = trades.length - winners;
  var avg = rets.reduce(function(a, b) { return a + b; }, 0) / rets.length;

  var variance = 0;
  rets.forEach(function(r) { variance += Math.pow(r - avg, 2); });
  variance = rets.length > 1 ? variance / (rets.length - 1) : 0;
  var std = Math.sqrt(variance);
  var sharpe = std > 0 ? (avg / std) * Math.sqrt(12) : (avg > 0 ? 1 : 0);

  var downside = rets.filter(function(r) { return r < 0; });
  var downVar = 0;
  if (downside.length > 1) {
    var downAvg = downside.reduce(function(a, b) { return a + b; }, 0) / downside.length;
    downside.forEach(function(r) { downVar += Math.pow(r - downAvg, 2); });
    downVar = downVar / (downside.length - 1);
  } else if (downside.length === 1) {
    downVar = Math.pow(downside[0], 2);
  }
  var downDev = Math.sqrt(downVar);
  var sortino = downDev > 0 ? (avg / downDev) * Math.sqrt(12) : (avg > 0 ? sharpe : 0);

  var alphaN = meanNumericField_(trades, 'alpha_vs_nifty_pct');
  var alphaS = meanNumericField_(trades, 'alpha_vs_sector_pct');

  var equity = 1;
  var peak = 1;
  var maxDd = 0;
  rets.forEach(function(r) {
    equity *= (1 + r / 100);
    if (equity > peak) peak = equity;
    var dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  });

  return {
    sample_count: trades.length,
    hit_rate_pct: Math.round((winners / trades.length) * 1000) / 10,
    avg_return_pct: Math.round(avg * 100) / 100,
    median_return_pct: Math.round(median * 100) / 100,
    max_drawdown_pct: Math.round(maxDd * 100) / 100,
    sharpe_ratio: Math.round(sharpe * 100) / 100,
    sortino_ratio: Math.round(sortino * 100) / 100,
    total_return_pct: Math.round((equity - 1) * 10000) / 100,
    mean_alpha_vs_nifty_pct: alphaN,
    mean_alpha_vs_sector_pct: alphaS,
    winners: winners,
    losers: losers
  };
}

/**
 * @param {Array<Object>} trades
 * @param {string} field
 * @return {number|null}
 */
function meanNumericField_(trades, field) {
  var vals = trades.map(function(t) { return t[field]; }).filter(function(v) {
    return v != null && !isNaN(v);
  });
  if (!vals.length) return null;
  var s = vals.reduce(function(a, b) { return a + b; }, 0);
  return Math.round((s / vals.length) * 100) / 100;
}

/**
 * @return {Object}
 */
function emptyBacktestMetrics_() {
  return {
    sample_count: 0,
    hit_rate_pct: 0,
    avg_return_pct: 0,
    median_return_pct: 0,
    max_drawdown_pct: 0,
    sharpe_ratio: 0,
    sortino_ratio: 0,
    total_return_pct: 0,
    mean_alpha_vs_nifty_pct: null,
    mean_alpha_vs_sector_pct: null,
    winners: 0,
    losers: 0
  };
}

/**
 * Validation report for v4 — PASS / PARTIAL / FAIL per list and horizon.
 * @param {Array<Array>} resultRows
 * @param {Array<Object>} listReports
 * @param {Array<Object>} allSnapshots
 * @param {Date} today
 * @param {number=} syntheticExcluded
 * @return {Object}
 */
function buildBacktestValidationReport_(resultRows, listReports, allSnapshots, today, syntheticExcluded) {
  var parsed = parseBacktestResultRows_(resultRows);
  var comparison = buildBacktestComparison_(parsed);
  var runAt = Utilities.formatDate(today, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  syntheticExcluded = syntheticExcluded || 0;
  var listSections = [];
  var sheetRows = [];
  var passCount = 0;
  var partialCount = 0;
  var failCount = 0;

  (listReports || []).forEach(function(lr) {
    var horizons = [];
    BACKTEST_HORIZONS_.forEach(function(h) {
      var rec = parsed.filter(function(r) {
        return r.list_name === lr.list_name && r.horizon === h.label &&
          r.benchmark === 'recommendations';
      })[0];
      var hv = validationVerdictForHorizon_(lr, rec, h.label);
      var secRow = comparison.filter(function(c) {
        return c.list_name === lr.list_name && c.horizon === h.label;
      })[0];
      if (secRow && secRow.alpha_vs_sector_avg_pct != null) {
        hv.alpha_vs_sector_pct = secRow.alpha_vs_sector_avg_pct;
      }
      horizons.push(hv);
      sheetRows.push(validationRowToSheet_(runAt, lr.list_name, hv));

      if (hv.verdict === 'PASS') passCount++;
      else if (hv.verdict === 'PARTIAL') partialCount++;
      else failCount++;
    });

    var listVerdict = validationVerdictForList_(lr, horizons);
    listSections.push({
      list_name: lr.list_name,
      verdict: listVerdict,
      mode: lr.mode,
      snapshot_rows: lr.snapshot_rows,
      min_snapshots_required: BACKTEST_MIN_SNAPSHOT_ROWS_,
      horizons: horizons
    });
    sheetRows.push([
      runAt, 'LIST_SUMMARY', lr.list_name, '', listVerdict, lr.snapshot_rows, '',
      '', '', '', '', '', '', lr.mode,
      listVerdict === 'PASS' ? 'List validated on snapshot history' :
        (lr.ready ? 'Some horizons lack completed trades' :
          'Insufficient Tab 22 snapshots')
    ]);
  });

  var overall = failCount > passCount ? 'FAIL' :
    (partialCount > 0 || passCount === 0 ? 'PARTIAL' : 'PASS');
  if (!listReports.length) overall = 'FAIL';

  var summary = buildValidationSummaryLines_(overall, allSnapshots.length, listReports, passCount, partialCount);

  return {
    report_version: BACKTEST_ENGINE_VERSION_,
    run_at: runAt,
    overall_verdict: overall,
    snapshot_only: true,
    snapshot_rows_total: allSnapshots.length,
    synthetic_rows_excluded: syntheticExcluded,
    lists_ready: (listReports || []).filter(function(l) { return l.ready; }).length,
    lists_total: (listReports || []).length,
    horizons_pass: passCount,
    horizons_partial: partialCount,
    horizons_fail: failCount,
    lists: listSections,
    summary_lines: summary,
    sheet_rows: sheetRows
  };
}

/**
 * @param {Object} lr
 * @param {Object|null} rec
 * @param {string} horizonLabel
 * @return {Object}
 */
function validationVerdictForHorizon_(lr, rec, horizonLabel) {
  if (!lr.ready) {
    return {
      horizon: horizonLabel,
      verdict: 'FAIL',
      trade_count: 0,
      snapshot_rows: lr.snapshot_rows,
      mode: 'insufficient_snapshots',
      notes: 'Need ' + BACKTEST_MIN_SNAPSHOT_ROWS_ + '+ daily Tab 22 snapshots for this list'
    };
  }
  if (!rec || rec.sample_count < 1) {
    return {
      horizon: horizonLabel,
      verdict: 'PARTIAL',
      trade_count: 0,
      snapshot_rows: lr.snapshot_rows,
      mode: rec ? rec.mode : 'snapshot_log',
      notes: 'Horizon not yet mature — exit date still in the future for most snapshots'
    };
  }

  var n = rec.sample_count;
  var verdict = n >= BACKTEST_MIN_TRADES_VALIDATION_ ? 'PASS' : 'PARTIAL';
  var alphaN = rec.alpha_pct != null && !isNaN(rec.alpha_pct) ? rec.alpha_pct : null;

  return {
    horizon: horizonLabel,
    verdict: verdict,
    trade_count: n,
    snapshot_rows: lr.snapshot_rows,
    hit_rate_pct: rec.hit_rate_pct,
    avg_return_pct: rec.avg_return_pct,
    alpha_vs_nifty_pct: alphaN,
    alpha_vs_sector_pct: null,
    sharpe_ratio: rec.sharpe_ratio,
    sortino_ratio: rec.sortino_ratio,
    max_drawdown_pct: rec.max_drawdown_pct,
    mode: rec.mode,
    notes: rec.notes || ''
  };
}

/**
 * @param {Object} lr
 * @param {Array<Object>} horizons
 * @return {string}
 */
function validationVerdictForList_(lr, horizons) {
  if (!lr.ready) return 'FAIL';
  var pass = horizons.filter(function(h) { return h.verdict === 'PASS'; }).length;
  if (pass >= 2) return 'PASS';
  if (horizons.some(function(h) { return h.trade_count > 0; })) return 'PARTIAL';
  return 'FAIL';
}

/**
 * @param {string} runAt
 * @param {string} listName
 * @param {Object} hv
 * @return {Array}
 */
function validationRowToSheet_(runAt, listName, hv) {
  return [
    runAt, 'HORIZON', listName, hv.horizon, hv.verdict, hv.snapshot_rows, hv.trade_count,
    hv.hit_rate_pct != null ? hv.hit_rate_pct : '',
    hv.avg_return_pct != null ? hv.avg_return_pct : '',
    hv.alpha_vs_nifty_pct != null ? hv.alpha_vs_nifty_pct : '',
    hv.alpha_vs_sector_pct != null ? hv.alpha_vs_sector_pct : '',
    hv.sharpe_ratio != null ? hv.sharpe_ratio : '',
    hv.sortino_ratio != null ? hv.sortino_ratio : '',
    hv.max_drawdown_pct != null ? hv.max_drawdown_pct : '',
    hv.mode || '',
    hv.notes || ''
  ];
}

/**
 * @param {string} overall
 * @param {number} snapTotal
 * @param {Array<Object>} listReports
 * @param {number} passCount
 * @param {number} partialCount
 * @return {Array<string>}
 */
function buildValidationSummaryLines_(overall, snapTotal, listReports, passCount, partialCount) {
  var ready = (listReports || []).filter(function(l) { return l.ready; }).length;
  var total = (listReports || []).length;
  return [
    'Backtest v' + BACKTEST_ENGINE_VERSION_ + ' validation: ' + overall,
    'Data source: Tab 22 recommendation snapshots only (synthetic rows excluded).',
    'Benchmarks: Nifty 50 + sector index per pick on identical entry/exit dates.',
    'Metrics: paired Alpha, Hit Rate, Sharpe, Sortino, Max Drawdown.',
    'Tab 22 rows: ' + snapTotal + ' · Lists ready: ' + ready + '/' + total,
    'Horizons PASS/PARTIAL: ' + passCount + '/' + partialCount + ' (FAIL = remainder)'
  ];
}

/**
 * @param {Object} validation
 */
function writeBacktestValidationSheet_(validation) {
  if (!validation) return;
  ensureBacktestSheets_();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BACKTEST_SHEET_VALIDATION_);
  clearDataBelowHeader_(sheet, BACKTEST_HEADERS_VALIDATION_.length);
  var rows = validation.sheet_rows || [];
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, BACKTEST_HEADERS_VALIDATION_.length).setValues(rows);
  }
  try {
    PropertiesService.getScriptProperties().setProperty('LAST_BACKTEST_VALIDATION_JSON',
      JSON.stringify({
        report_version: validation.report_version,
        run_at: validation.run_at,
        overall_verdict: validation.overall_verdict,
        summary_lines: validation.summary_lines,
        lists: validation.lists
      }).substring(0, 9000));
  } catch (e1) {
    Logger.log('writeBacktestValidationSheet_: ' + e1);
  }
  appendAlert('', 'backtest_validation',
    'Verdict ' + validation.overall_verdict + ' · Tab 36', BACKTEST_SHEET_VALIDATION_);
}

/**
 * @param {Array<Array>} resultRows
 * @param {Array<Object>} listReports
 * @param {number} snapshotTotal
 * @return {Object}
 */
function buildRecommendationPerformanceDashboard_(resultRows, listReports, snapshotTotal) {
  var parsed = parseBacktestResultRows_(resultRows);
  var byListHorizon = buildBacktestComparison_(parsed);
  var overall = aggregateDashboardHorizon_(parsed, '12 Month');
  var horizons = BACKTEST_HORIZONS_.map(function(h) {
    return aggregateDashboardHorizon_(parsed, h.label);
  });

  return {
    snapshot_rows_total: snapshotTotal,
    snapshot_only: true,
    min_snapshots_required: BACKTEST_MIN_SNAPSHOT_ROWS_,
    lists_ready: (listReports || []).filter(function(l) { return l.ready; }).length,
    lists_total: (listReports || []).length,
    overall_12m: overall,
    by_horizon: horizons,
    comparison: byListHorizon,
    comparison_by_list: buildBacktestComparisonByList_(parsed)
  };
}

/**
 * @param {Array<Array>} rows
 * @return {Array<Object>}
 */
function parseBacktestResultRows_(rows) {
  return (rows || []).map(function(r) {
    return {
      run_at: String(r[0] || ''),
      list_name: String(r[1] || ''),
      horizon: String(r[2] || ''),
      benchmark: String(r[3] || ''),
      sample_count: num_(r[4]),
      hit_rate_pct: num_(r[5]),
      avg_return_pct: num_(r[6]),
      median_return_pct: num_(r[7]),
      alpha_pct: r[8] === '' || r[8] == null ? null : num_(r[8]),
      sharpe_ratio: num_(r[9]),
      sortino_ratio: num_(r[10]),
      max_drawdown_pct: num_(r[11]),
      total_return_pct: num_(r[12]),
      winners: num_(r[13]),
      losers: num_(r[14]),
      mode: String(r[15] || ''),
      notes: String(r[16] || '')
    };
  });
}

/**
 * @param {Array<Object>} rows
 * @param {string} horizonLabel
 * @return {Object|null}
 */
function aggregateDashboardHorizon_(rows, horizonLabel) {
  var rec = rows.filter(function(r) {
    return r.benchmark === 'recommendations' && r.horizon === horizonLabel && r.sample_count > 0;
  });
  if (!rec.length) return null;

  var w = 0;
  var hit = 0;
  var avg = 0;
  var alphaN = 0;
  var alphaS = 0;
  var sharpe = 0;
  var sortino = 0;
  var maxDd = 0;
  rec.forEach(function(r) {
    var wt = r.sample_count;
    w += wt;
    hit += r.hit_rate_pct * wt;
    avg += r.avg_return_pct * wt;
    sharpe += r.sharpe_ratio * wt;
    sortino += r.sortino_ratio * wt;
    maxDd = Math.max(maxDd, r.max_drawdown_pct);
    if (r.alpha_pct != null && !isNaN(r.alpha_pct)) alphaN += r.alpha_pct * wt;
  });
  if (!w) return null;

  var nif = rows.filter(function(r) {
    return r.benchmark === 'nifty' && r.horizon === horizonLabel && r.sample_count > 0;
  });
  var sec = rows.filter(function(r) {
    return r.benchmark === 'sector' && r.horizon === horizonLabel && r.sample_count > 0;
  });
  var nifAvg = weightedAvgBenchmark_(nif);
  var secAvg = weightedAvgBenchmark_(sec);

  return {
    horizon: horizonLabel,
    hit_rate_pct: Math.round(hit / w * 10) / 10,
    avg_return_pct: Math.round(avg / w * 100) / 100,
    alpha_vs_nifty_pct: Math.round((avg / w - nifAvg) * 100) / 100,
    alpha_vs_sector_pct: Math.round((avg / w - secAvg) * 100) / 100,
    sharpe_ratio: Math.round(sharpe / w * 100) / 100,
    sortino_ratio: Math.round(sortino / w * 100) / 100,
    max_drawdown_pct: maxDd,
    sample_trades: w,
    lists_with_data: rec.length
  };
}

/**
 * @param {Array<Object>} benchRows
 * @return {number}
 */
function weightedAvgBenchmark_(benchRows) {
  if (!benchRows.length) return 0;
  var w = 0;
  var s = 0;
  benchRows.forEach(function(r) {
    w += r.sample_count;
    s += r.avg_return_pct * r.sample_count;
  });
  return w ? s / w : 0;
}

/**
 * @param {Object} report
 */
function writeBacktestResults_(report) {
  ensureBacktestSheets_();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BACKTEST_SHEET_RESULTS);
  clearDataBelowHeader_(sheet, BACKTEST_HEADERS_RESULTS.length);
  if (report.results && report.results.length) {
    sheet.getRange(2, 1, report.results.length, BACKTEST_HEADERS_RESULTS.length).setValues(report.results);
  }
  var jsonPayload = {
    engine_version: report.engine_version,
    run_at: report.run_at,
    lists: report.lists,
    snapshot_rows_total: report.snapshot_rows_total,
    snapshot_only: report.snapshot_only,
    synthetic_excluded: report.synthetic_excluded,
    results: report.results,
    dashboard: report.dashboard,
    validation: report.validation
  };
  PropertiesService.getScriptProperties().setProperty('LAST_BACKTEST_JSON',
    JSON.stringify(jsonPayload).substring(0, 9000));
  appendAlert('', 'backtest_run',
    'v' + BACKTEST_ENGINE_VERSION_ + ' rows=' + report.results.length,
    BACKTEST_SHEET_RESULTS);
}

/**
 * @param {Object} report
 */
function writeBacktestDashboardSheet_(report) {
  if (!report || !report.dashboard) return;
  ensureBacktestSheets_();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BACKTEST_SHEET_DASHBOARD_);
  var dash = report.dashboard;
  var rows = [];
  var runAt = report.run_at || '';

  (dash.by_horizon || []).forEach(function(h) {
    if (!h) return;
    rows.push([
      runAt, 'ALL', h.horizon, 'hit_rate_pct', h.hit_rate_pct, '', '', h.alpha_vs_nifty_pct,
      h.alpha_vs_sector_pct, 'snapshot_log', dash.snapshot_rows_total
    ]);
    rows.push([
      runAt, 'ALL', h.horizon, 'avg_return_pct', h.avg_return_pct, '', '', h.alpha_vs_nifty_pct,
      h.alpha_vs_sector_pct, 'snapshot_log', dash.snapshot_rows_total
    ]);
    rows.push([
      runAt, 'ALL', h.horizon, 'sharpe_ratio', h.sharpe_ratio, '', '', '', '',
      'snapshot_log', dash.snapshot_rows_total
    ]);
    rows.push([
      runAt, 'ALL', h.horizon, 'sortino_ratio', h.sortino_ratio, '', '', '', '',
      'snapshot_log', dash.snapshot_rows_total
    ]);
    rows.push([
      runAt, 'ALL', h.horizon, 'max_drawdown_pct', h.max_drawdown_pct, '', '', '', '',
      'snapshot_log', dash.snapshot_rows_total
    ]);
  });

  (dash.comparison || []).forEach(function(c) {
    var rec = c.recommendations;
    if (!rec || rec.sample_count < 1) return;
    rows.push([
      runAt, c.list_name, c.horizon, 'alpha_vs_nifty', c.alpha_avg_return_pct,
      rec.avg_return_pct, c.nifty ? c.nifty.avg_return_pct : '',
      c.sector ? c.sector.avg_return_pct : '',
      c.alpha_avg_return_pct, c.alpha_vs_sector_avg_pct, rec.mode, dash.snapshot_rows_total
    ]);
  });

  clearDataBelowHeader_(sheet, 11);
  if (rows.length) sheet.getRange(2, 1, rows.length, 11).setValues(rows);
}

/**
 * @param {Object} report
 * @return {string}
 */
function formatBacktestSummaryAlert_(report) {
  var lines = [
    'Backtest v' + BACKTEST_ENGINE_VERSION_ + ' (Tab 22 snapshots only)',
    'Tab 22 snapshots: ' + report.snapshot_rows_total,
    (report.synthetic_excluded > 0 ?
      'Synthetic rows excluded: ' + report.synthetic_excluded : 'No synthetic rows in cohort'),
    'Lists ready: ' + (report.dashboard ? report.dashboard.lists_ready : 0) +
      ' / ' + (report.dashboard ? report.dashboard.lists_total : 0),
    ''
  ];
  if (report.validation) {
    lines.push('Validation: ' + report.validation.overall_verdict +
      ' (PASS horizons: ' + report.validation.horizons_pass + ')');
    lines.push('Tab 36 BACKTEST VALIDATION written.');
    lines.push('');
  }
  (report.lists || []).forEach(function(l) {
    lines.push(l.list_name + ': ' + l.mode + ' · snapshots ' + l.snapshot_rows);
  });
  if (report.dashboard && report.dashboard.overall_12m) {
    var o = report.dashboard.overall_12m;
    lines.push('');
    lines.push('12M aggregate: hit ' + o.hit_rate_pct + '% · α Nifty ' + o.alpha_vs_nifty_pct +
      '% · Sharpe ' + o.sharpe_ratio + ' · Max DD ' + o.max_drawdown_pct + '%');
  }
  lines.push('');
  lines.push('Tab 23 results · Tab 31 dashboard · Tab 36 validation · API ?action=backtest');
  return lines.join('\n');
}

/**
 * Web API — Tab 23 + dashboard JSON.
 * @return {Object}
 */
function getBacktestResults_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BACKTEST_SHEET_RESULTS);
  var lastJson = PropertiesService.getScriptProperties().getProperty('LAST_BACKTEST_JSON');
  var meta = null;
  try {
    meta = lastJson ? JSON.parse(lastJson) : null;
  } catch (e1) { /* ignore */ }
  if (meta && !meta.validation) {
    try {
      var vJson = PropertiesService.getScriptProperties().getProperty('LAST_BACKTEST_VALIDATION_JSON');
      if (vJson) meta.validation = JSON.parse(vJson);
    } catch (e2) { /* ignore */ }
  }

  if (!sheet || sheet.getLastRow() < 2) {
    if (meta && meta.dashboard) {
      return buildBacktestApiPayload_(meta.results || [], meta);
    }
    return {
      ok: false,
      error: 'No backtest results. Snapshot Tab 22 daily, then Run backtest engine.',
      snapshot_only: true,
      min_snapshots_required: BACKTEST_MIN_SNAPSHOT_ROWS_
    };
  }

  var numRows = sheet.getLastRow() - 1;
  var colCount = Math.max(BACKTEST_HEADERS_RESULTS.length, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, numRows, colCount).getValues();
  return buildBacktestApiPayload_(data, meta);
}

/**
 * @param {Array<Array>} data
 * @param {Object|null} meta
 * @return {Object}
 */
function buildBacktestApiPayload_(data, meta) {
  var rows = parseBacktestResultRowsFromSheet_(data);
  var comparison = buildBacktestComparison_(rows);
  var listReports = meta && meta.lists ? meta.lists : [];
  var snapTotal = meta && meta.snapshot_rows_total != null ?
    meta.snapshot_rows_total :
    loadBacktestSnapshots_(SpreadsheetApp.getActiveSpreadsheet()).length;

  var dashboard = meta && meta.dashboard ?
    meta.dashboard :
    buildRecommendationPerformanceDashboard_(rows, listReports, snapTotal);

  return {
    ok: true,
    engine_version: BACKTEST_ENGINE_VERSION_,
    updated: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    snapshot_only: true,
    min_snapshots_required: BACKTEST_MIN_SNAPSHOT_ROWS_,
    tracked_lists: getBacktestTrackedLists_(),
    lists: listReports,
    snapshot_rows_total: snapTotal,
    results: rows,
    comparison: comparison,
    comparison_by_list: buildBacktestComparisonByList_(rows),
    dashboard: dashboard,
    validation: meta && meta.validation ? meta.validation : null
  };
}

/**
 * Parse sheet rows with legacy column layouts.
 * @param {Array<Array>} data
 * @return {Array<Object>}
 */
function parseBacktestResultRowsFromSheet_(data) {
  if (!data.length) return [];
  var first = data[0];
  var isLegacy = String(first[1] || '').indexOf('Month') >= 0 ||
    String(first[1] || '').indexOf('Top 10') < 0 && String(first[2] || '').indexOf('Month') >= 0;

  var bench0 = String(first[3] || '').toLowerCase();
  if (bench0 === 'recommendations' || bench0 === 'nifty' || bench0 === 'sector') {
    return parseBacktestResultRows_(data);
  }

  return data.map(function(r) {
    var hasList = String(r[1] || '').indexOf('Top 10') >= 0;
    if (hasList) {
      return {
        run_at: String(r[0] || ''),
        list_name: String(r[1] || ''),
        horizon: String(r[2] || ''),
        benchmark: String(r[3] || ''),
        sample_count: num_(r[4]),
        hit_rate_pct: num_(r[5]),
        avg_return_pct: num_(r[6]),
        median_return_pct: num_(r[7]),
        alpha_pct: r[8] === '' ? null : num_(r[8]),
        sharpe_ratio: num_(r[9]),
        sortino_ratio: num_(r[10]),
        max_drawdown_pct: num_(r[11]),
        total_return_pct: num_(r[12]),
        winners: num_(r[13]),
        losers: num_(r[14]),
        mode: String(r[15] || ''),
        notes: String(r[16] || '')
      };
    }
    return {
      run_at: String(r[0] || ''),
      list_name: getBacktestTrackedLists_()[0],
      horizon: String(r[1] || ''),
      benchmark: String(r[2] || ''),
      sample_count: num_(r[3]),
      hit_rate_pct: num_(r[4]),
      avg_return_pct: num_(r[5]),
      median_return_pct: 0,
      alpha_pct: null,
      sharpe_ratio: num_(r[7] || r[6]),
      sortino_ratio: 0,
      max_drawdown_pct: num_(r[6] || r[5]),
      total_return_pct: num_(r[8] || r[7]),
      winners: num_(r[9]),
      losers: num_(r[10]),
      mode: String(r[11] || ''),
      notes: String(r[12] || '')
    };
  });
}

/**
 * @param {Array<Object>} rows
 * @return {Array<Object>}
 */
function buildBacktestComparison_(rows) {
  var byKey = {};
  rows.forEach(function(r) {
    var key = (r.list_name || '') + '|' + r.horizon;
    if (!byKey[key]) {
      byKey[key] = {
        list_name: r.list_name,
        horizon: r.horizon,
        recommendations: null,
        nifty: null,
        sector: null
      };
    }
    if (r.benchmark === 'recommendations') byKey[key].recommendations = r;
    if (r.benchmark === 'nifty') byKey[key].nifty = r;
    if (r.benchmark === 'sector') byKey[key].sector = r;
  });

  return Object.keys(byKey).map(function(k) {
    var x = byKey[k];
    var rec = x.recommendations;
    var nif = x.nifty;
    var sec = x.sector;
    return {
      list_name: x.list_name,
      horizon: x.horizon,
      alpha_avg_return_pct: rec && nif ?
        Math.round((rec.avg_return_pct - nif.avg_return_pct) * 100) / 100 : null,
      alpha_median_return_pct: rec && nif && rec.median_return_pct != null ?
        Math.round((rec.median_return_pct - nif.median_return_pct) * 100) / 100 : null,
      alpha_hit_rate_pct: rec && nif ?
        Math.round((rec.hit_rate_pct - nif.hit_rate_pct) * 100) / 100 : null,
      alpha_vs_sector_avg_pct: rec && sec ?
        Math.round((rec.avg_return_pct - sec.avg_return_pct) * 100) / 100 : null,
      recommendations: rec,
      nifty: nif,
      sector: sec
    };
  });
}

/**
 * @param {Array<Object>} rows
 * @return {Object}
 */
function buildBacktestComparisonByList_(rows) {
  var out = {};
  buildBacktestComparison_(rows).forEach(function(c) {
    var ln = c.list_name || 'Unknown';
    if (!out[ln]) out[ln] = [];
    out[ln].push(c);
  });
  return out;
}

/**
 * @param {string|Array<string>} symbol
 * @param {Date} date
 * @return {number}
 */
function fetchHistoricalClose_(symbol, date) {
  var candidates = Array.isArray(symbol) ? symbol : [toFinanceSymbol_(symbol)];
  for (var i = 0; i < candidates.length; i++) {
    var px = fetchGoogleFinanceCloseOnDate_(candidates[i], date);
    if (px > 0) return px;
  }
  return 0;
}

/**
 * @param {string} symbol
 * @return {string}
 */
function toFinanceSymbol_(symbol) {
  var s = String(symbol || '').trim().toUpperCase();
  if (!s) return '';
  if (s.indexOf(':') >= 0) return s;
  return 'NSE:' + s;
}

/**
 * @param {string} financeSymbol
 * @param {Date} date
 * @return {number}
 */
function fetchGoogleFinanceCloseOnDate_(financeSymbol, date) {
  if (!financeSymbol || !date) return 0;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tempName = '_BACKTEST_TEMP';
  var temp = ss.getSheetByName(tempName);
  if (!temp) {
    temp = ss.insertSheet(tempName);
    try { temp.hideSheet(); } catch (hideErr) { /* ok */ }
  }
  temp.clearContents();
  var d = Utilities.formatDate(date, 'Asia/Kolkata', 'yyyy-MM-dd');
  temp.getRange('A1').setFormula(
    '=IFERROR(GOOGLEFINANCE("' + financeSymbol + '","close","' + d + '","' + d + '"),"")'
  );
  SpreadsheetApp.flush();
  Utilities.sleep(1200);
  return num_(temp.getRange('A1').getValue());
}

/** Roadmap: unique snapshot dates before hit rates are interpretable. */
var BACKTEST_INTERPRETABLE_SNAPSHOT_DAYS_ = 30;

/**
 * Estimate calendar days until list has PASS-ready 12M horizon + interpretable history.
 * @param {Array<Object>} listSnaps
 * @param {Date} today
 * @return {Object}
 */
function estimateBacktestDaysToMeaningful_(listSnaps, today) {
  var n = (listSnaps || []).length;
  var unique = {};
  (listSnaps || []).forEach(function(s) {
    if (s.snapshot_date) {
      unique[Utilities.formatDate(s.snapshot_date, 'Asia/Kolkata', 'yyyy-MM-dd')] = true;
    }
  });
  var uniqueDays = Object.keys(unique).length;
  var daysToMinRows = n >= BACKTEST_MIN_SNAPSHOT_ROWS_ ? 0 : 1;
  var daysInterpretable = Math.max(0, BACKTEST_INTERPRETABLE_SNAPSHOT_DAYS_ - uniqueDays);
  var maxHorizonPass = 0;
  var perHorizon = [];

  BACKTEST_HORIZONS_.forEach(function(h) {
    var mature = 0;
    (listSnaps || []).forEach(function(row) {
      if (resolveSnapshotTradeWindow_(row.snapshot_date, h.days, today)) mature++;
    });
    var gap = Math.max(0, BACKTEST_MIN_TRADES_VALIDATION_ - mature);
    var daysPass = 0;
    if (n < BACKTEST_MIN_SNAPSHOT_ROWS_) {
      daysPass = h.days + 1;
    } else if (gap > 0) {
      var oldest = null;
      (listSnaps || []).forEach(function(row) {
        if (!row.snapshot_date) return;
        if (!oldest || row.snapshot_date < oldest) oldest = row.snapshot_date;
      });
      if (!oldest) {
        daysPass = h.days;
      } else {
        var msDay = 86400000;
        var naturalExit = new Date(oldest.getTime() + h.days * msDay);
        daysPass = naturalExit > today ?
          Math.ceil((naturalExit.getTime() - today.getTime()) / msDay) : gap;
      }
    }
    maxHorizonPass = Math.max(maxHorizonPass, daysPass);
    perHorizon.push({ horizon: h.label, mature_trades: mature, days_to_pass: daysPass });
  });

  return {
    days_to_min_rows: daysToMinRows,
    days_to_interpretable_history: daysInterpretable,
    days_to_longest_horizon_pass: maxHorizonPass,
    days_estimated_overall: Math.max(daysToMinRows, daysInterpretable, maxHorizonPass),
    unique_snapshot_days: uniqueDays,
    per_horizon: perHorizon
  };
}

/**
 * Build docs/BACKTEST_V4_STATUS.md content from live Tab 22 + last backtest run.
 * @param {Object=} report Optional output of evaluateBacktestAllHorizons_()
 * @return {string}
 */
function buildBacktestV4StatusMarkdown_(report) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var tz = 'Asia/Kolkata';
  var generated = Utilities.formatDate(today, tz, 'yyyy-MM-dd HH:mm:ss') + ' IST';
  if (!report) {
    report = evaluateBacktestAllHorizons_();
  }

  var allSnapshots = loadBacktestSnapshots_(ss);
  var validation = report.validation || {};
  var parsed = parseBacktestResultRows_(report.results || []);
  var comparison = buildBacktestComparison_(parsed);
  var tracked = getBacktestTrackedLists_();
  var lines = [
    '# Backtest v4 — Status Report',
    '',
    '**Generated:** ' + generated + ' (live spreadsheet)',
    '**Engine:** BacktestEngine.gs v' + BACKTEST_ENGINE_VERSION_ + ' · snapshot-only',
    '**Spreadsheet:** ' + ss.getName(),
    '',
    '## Executive summary',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Overall validation verdict | **' + (validation.overall_verdict || '—') + '** |',
    '| Total Tab 22 rows | **' + (report.snapshot_rows_total || allSnapshots.length) + '** |',
    '| Lists ready (≥' + BACKTEST_MIN_SNAPSHOT_ROWS_ + ' snapshots) | **' +
      (validation.lists_ready != null ? validation.lists_ready : 0) + '** / ' +
      (validation.lists_total || tracked.length) + ' |',
    '| Horizons PASS / PARTIAL / FAIL | **' +
      (validation.horizons_pass || 0) + '** / ' +
      (validation.horizons_partial || 0) + ' / ' +
      (validation.horizons_fail || 0) + ' |',
    '| Synthetic rows excluded | **' + (report.synthetic_excluded || 0) + '** |',
    ''
  ];

  if (validation.summary_lines && validation.summary_lines.length) {
    lines.push('### Validation summary');
    lines.push('');
    validation.summary_lines.forEach(function(s) { lines.push('- ' + s); });
    lines.push('');
  }

  var maxEst = 0;
  lines.push('---', '', '## Per recommendation list', '');

  tracked.forEach(function(listName) {
    var listSnaps = allSnapshots.filter(function(s) { return s.list_name === listName; });
    var lr = (report.lists || []).filter(function(l) { return l.list_name === listName; })[0] || {};
    var vList = (validation.lists || []).filter(function(l) { return l.list_name === listName; })[0];
    var dates = listSnaps.map(function(s) { return s.snapshot_date; }).filter(Boolean);
    var earliest = dates.length ?
      Utilities.formatDate(
        dates.reduce(function(a, b) { return a < b ? a : b; }), tz, 'yyyy-MM-dd') : '—';
    var latest = dates.length ?
      Utilities.formatDate(
        dates.reduce(function(a, b) { return a > b ? a : b; }), tz, 'yyyy-MM-dd') : '—';
    var est = estimateBacktestDaysToMeaningful_(listSnaps, today);
    maxEst = Math.max(maxEst, est.days_estimated_overall);

    lines.push('### ' + listName, '');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push('| Tab 22 snapshot rows | **' + listSnaps.length + '** (min ' +
      BACKTEST_MIN_SNAPSHOT_ROWS_ + ') |');
    lines.push('| Earliest snapshot | ' + earliest + ' |');
    lines.push('| Latest snapshot | ' + latest + ' |');
    lines.push('| Evaluation mode | `' + (lr.mode || 'insufficient_snapshots') + '` |');
    lines.push('| List validation verdict | **' + (vList ? vList.verdict : 'FAIL') + '** |');
    lines.push('');
    lines.push('#### Completed trades by horizon');
    lines.push('');
    lines.push('| Horizon | Trades | Verdict | Hit % | Avg ret % | α Nifty | α Sector |');
    lines.push('|---------|--------|---------|-------|-----------|---------|----------|');

    var anyPass = false;
    BACKTEST_HORIZONS_.forEach(function(h) {
      var hv = vList && vList.horizons ?
        vList.horizons.filter(function(x) { return x.horizon === h.label; })[0] : null;
      var rec = parsed.filter(function(r) {
        return r.list_name === listName && r.horizon === h.label &&
          r.benchmark === 'recommendations';
      })[0];
      var comp = comparison.filter(function(c) {
        return c.list_name === listName && c.horizon === h.label;
      })[0];
      var verdict = hv ? hv.verdict : (lr.ready ? 'PARTIAL' : 'FAIL');
      if (verdict === 'PASS') anyPass = true;
      var tc = hv ? hv.trade_count : (rec ? rec.sample_count : 0);
      var alphaN = hv && hv.alpha_vs_nifty_pct != null ? hv.alpha_vs_nifty_pct :
        (rec && rec.alpha_pct != null ? rec.alpha_pct : null);
      var alphaS = hv && hv.alpha_vs_sector_pct != null ? hv.alpha_vs_sector_pct :
        (comp && comp.alpha_vs_sector_avg_pct != null ? comp.alpha_vs_sector_avg_pct : null);

      lines.push('| ' + h.label + ' | ' + tc + ' | **' + verdict + '** | ' +
        fmtBacktestStatusNum_(hv ? hv.hit_rate_pct : (rec ? rec.hit_rate_pct : null)) + ' | ' +
        fmtBacktestStatusNum_(hv ? hv.avg_return_pct : (rec ? rec.avg_return_pct : null)) + ' | ' +
        fmtBacktestStatusNum_(alphaN, true) + ' | ' +
        fmtBacktestStatusNum_(alphaS, true) + ' |');
    });

    lines.push('');
    lines.push('| Any horizon PASS? | ' + (anyPass ? '**Yes**' : '**No**') + ' |');
    lines.push('| Est. days to meaningful stats | **' + est.days_estimated_overall +
      '** calendar days |');
    lines.push('| Unique snapshot days | ' + est.unique_snapshot_days + ' (target ' +
      BACKTEST_INTERPRETABLE_SNAPSHOT_DAYS_ + '+) |');
    lines.push('');
  });

  lines.push('---', '');
  lines.push('## Portfolio-wide time to meaningful results');
  lines.push('');
  lines.push('**Max estimated days across lists:** **' + maxEst + '** calendar days.');
  lines.push('');
  lines.push('This is driven by the **12 Month** horizon (~365 days from the oldest snapshot) ');
  lines.push('and **30** unique daily snapshot dates for interpretable aggregate hit rates.');
  lines.push('');
  lines.push('**Operational checklist:**');
  lines.push('1. Sync Tab 11 recommendations');
  lines.push('2. **Snapshot all lists → Tab 22** daily (8 AM or menu)');
  lines.push('3. **Run backtest engine** after ≥5 rows per list');
  lines.push('4. Copy this markdown to `docs/BACKTEST_V4_STATUS.md` in the repo');
  lines.push('');
  lines.push('See [BACKTEST_ENGINE.md](../docs/BACKTEST_ENGINE.md) · ');
  lines.push('[BACKTEST_VALIDATION_REPORT.md](../docs/BACKTEST_VALIDATION_REPORT.md).');

  return lines.join('\n');
}

/**
 * @param {number|null} v
 * @param {boolean=} asPct
 * @return {string}
 */
function fmtBacktestStatusNum_(v, asPct) {
  if (v == null || v === '' || isNaN(v)) return '—';
  var s = Math.round(v * 100) / 100;
  return asPct ? (s >= 0 ? '+' : '') + s + '%' : String(s);
}

/**
 * Menu: log BACKTEST_V4_STATUS markdown (paste into docs/BACKTEST_V4_STATUS.md).
 */
function generateBacktestV4StatusReport() {
  var report = evaluateBacktestAllHorizons_();
  writeBacktestResults_(report);
  writeBacktestDashboardSheet_(report);
  writeBacktestValidationSheet_(report.validation);
  var md = buildBacktestV4StatusMarkdown_(report);
  Logger.log(md);
  try {
    PropertiesService.getScriptProperties().setProperty('LAST_BACKTEST_V4_STATUS_MD',
      md.substring(0, 45000));
  } catch (e1) {
    Logger.log('generateBacktestV4StatusReport: ' + e1);
  }
  var html = HtmlService.createHtmlOutput(
    '<pre style="font:12px monospace;white-space:pre-wrap;max-height:80vh;overflow:auto;">' +
    md.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>'
  ).setWidth(920).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, 'BACKTEST_V4_STATUS.md');
}
