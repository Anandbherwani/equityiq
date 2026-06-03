/**
 * Automatic market data ingestion — Tabs 4, 6, 24 (+ announcements / macro).
 * Reduces Scoring Engine 2.1 fallback dependence when NSE APIs return data.
 *
 * See docs/DATA_INGESTION.md for sources, cadence, limits.
 */

var NSE_SITE_URL_ = 'https://www.nseindia.com';
var NSE_API_BASE_ = 'https://www.nseindia.com/api';
var NSE_SESSION_PROP_ = 'NSE_SESSION_CACHE_JSON';
var NSE_SESSION_TTL_MS_ = 25 * 60 * 1000;
var NSE_REQUEST_DELAY_MS_ = 400;
var INGESTION_CURSOR_PROP_ = 'DATA_INGESTION_SYMBOL_CURSOR';
var LAST_INGESTION_SUMMARY_PROP_ = 'LAST_DATA_INGESTION_JSON';

var INGESTION_DEALS_LOOKBACK_DAYS_ = 7;
var INGESTION_DEALS_RETAIN_DAYS_ = 120;
var INGESTION_SHAREHOLDING_PER_RUN_ = 35;
var INGESTION_FINANCIALS_PER_RUN_ = 35;
var INGESTION_MAX_SYMBOL_QUEUE_ = 500;

var NSE_FETCH_HEADERS_JSON_ = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/'
};

// --- Menu entry points ---

/** Stock Tracker → Run data ingestion (deals + rotating symbol batch). */
function runDataIngestionNow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var run = typeof runDataIngestionPipelineRouted_ === 'function' ? runDataIngestionPipelineRouted_ : runDataIngestionPipeline_;
  var summary = run(ss, { dealsDays: INGESTION_DEALS_LOOKBACK_DAYS_, shareholdingBatch: true, financialsBatch: true, corporateActions: true, macroFiiDii: true });
  SpreadsheetApp.getUi().alert(
    'Data ingestion complete',
    formatIngestionSummary_(summary),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Backfill Tab 4 bulk/block deals (last N days). */
function backfillBulkBlockDeals30Days() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var run = typeof runDataIngestionPipelineRouted_ === 'function' ? runDataIngestionPipelineRouted_ : runDataIngestionPipeline_;
  var summary = run(ss, { dealsDays: 30, shareholdingBatch: false, financialsBatch: false, corporateActions: false, macroFiiDii: false });
  SpreadsheetApp.getUi().alert('Deal backfill', formatIngestionSummary_(summary), SpreadsheetApp.getUi().ButtonSet.OK);
}

/** View last ingestion JSON log. */
function viewLastDataIngestionLog() {
  var raw = PropertiesService.getScriptProperties().getProperty(LAST_INGESTION_SUMMARY_PROP);
  SpreadsheetApp.getUi().alert('Last ingestion', raw || 'No run yet.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Core pipeline — safe to call from 6 AM automation (silent).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object=} opts
 * @return {Object}
 */
function runDataIngestionPipeline_(ss, opts) {
  opts = opts || {};
  var started = new Date();
  var summary = {
    startedIst: Utilities.formatDate(started, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    dealsDays: opts.dealsDays || INGESTION_DEALS_LOOKBACK_DAYS_,
    steps: [],
    ok: true
  };

  try {
    if (opts.macroFiiDii !== false) {
      summary.steps.push(runIngestionStep_('macro_fii_dii', function() {
        return ingestNseFiiDiiMacro_(ss);
      }));
    }
    summary.steps.push(runIngestionStep_('bulk_block_deals', function() {
      return ingestNseBulkBlockDeals_(ss, summary.dealsDays);
    }));
    if (opts.shareholdingBatch !== false) {
      summary.steps.push(runIngestionStep_('shareholding_batch', function() {
        return ingestNseShareholdingBatch_(ss, INGESTION_SHAREHOLDING_PER_RUN_);
      }));
    }
    if (opts.financialsBatch !== false) {
      summary.steps.push(runIngestionStep_('financial_results_batch', function() {
        return ingestNseFinancialResultsBatch_(ss, INGESTION_FINANCIALS_PER_RUN_);
      }));
    }
    if (opts.corporateActions !== false) {
      summary.steps.push(runIngestionStep_('corporate_actions', function() {
        return ingestNseCorporateActionsBatch_(ss, 25);
      }));
    }
  } catch (e) {
    summary.ok = false;
    summary.error = String(e.message || e);
    appendAlert('', 'data_ingestion_error', summary.error, 'ingestion');
  }

  summary.finishedIst = Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  summary.tab4Rows = countSheetDataRows_(ss, '4. BULK & LARGE DEALS');
  summary.tab6Rows = countSheetDataRows_(ss, '6. FUNDAMENTALS');
  summary.tab24Rows = countSheetDataRows_(ss, '24. SHAREHOLDING PATTERN');
  PropertiesService.getScriptProperties().setProperty(LAST_INGESTION_SUMMARY_PROP, JSON.stringify(summary));
  if (summary.ok) {
    appendAlert('', 'data_ingestion', 'Tab4=' + summary.tab4Rows + ' Tab6=' + summary.tab6Rows + ' Tab24=' + summary.tab24Rows, 'ingestion');
  }
  return summary;
}

/**
 * @param {string} name
 * @param {function} fn
 * @return {Object}
 */
function runIngestionStep_(name, fn) {
  try {
    var detail = fn();
    return { step: name, ok: true, detail: detail };
  } catch (e) {
    return { step: name, ok: false, error: String(e.message || e) };
  }
}

/**
 * @param {Object} summary
 * @return {string}
 */
function formatIngestionSummary_(summary) {
  var lines = ['Deals lookback: ' + summary.dealsDays + 'd', 'Tab 4 rows: ' + summary.tab4Rows, 'Tab 6 rows: ' + summary.tab6Rows, 'Tab 24 rows: ' + summary.tab24Rows, ''];
  (summary.steps || []).forEach(function(s) {
    lines.push((s.ok ? '✓ ' : '✗ ') + s.step + (s.detail ? ' — ' + JSON.stringify(s.detail) : '') + (s.error ? ' — ' + s.error : ''));
  });
  if (summary.error) lines.push('Error: ' + summary.error);
  return lines.join('\n');
}

// --- NSE session ---

/**
 * @return {{ cookie: string, ts: number }}
 */
function nseEnsureSession_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(NSE_SESSION_PROP_);
  if (raw) {
    try {
      var cached = JSON.parse(raw);
      if (cached.cookie && (Date.now() - cached.ts) < NSE_SESSION_TTL_MS_) return cached;
    } catch (ignore) {}
  }
  Utilities.sleep(800);
  var resp = UrlFetchApp.fetch(NSE_SITE_URL_, {
    headers: NSE_FETCH_HEADERS_JSON_,
    muteHttpExceptions: true,
    followRedirects: true
  });
  if (resp.getResponseCode() !== 200) {
    throw new Error('NSE session bootstrap HTTP ' + resp.getResponseCode());
  }
  var cookie = extractSetCookieHeader_(resp);
  var session = { cookie: cookie, ts: Date.now() };
  props.setProperty(NSE_SESSION_PROP_, JSON.stringify(session));
  return session;
}

/**
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} resp
 * @return {string}
 */
function extractSetCookieHeader_(resp) {
  var headers = resp.getAllHeaders();
  var setCookie = headers['Set-Cookie'] || headers['set-cookie'];
  if (!setCookie) return '';
  var parts = Array.isArray(setCookie) ? setCookie : [setCookie];
  return parts.map(function(c) {
    return String(c).split(';')[0];
  }).join('; ');
}

/**
 * @param {string} path e.g. /historical/bulk-deals-type
 * @param {Object=} query
 * @return {*}
 */
function nseApiGetJson_(path, query) {
  var session = nseEnsureSession_();
  var q = [];
  if (query) {
    Object.keys(query).forEach(function(k) {
      if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
        q.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(query[k])));
      }
    });
  }
  var url = path.indexOf('http') === 0 ? path : NSE_API_BASE_ + path + (q.length ? '?' + q.join('&') : '');
  var headers = {};
  Object.keys(NSE_FETCH_HEADERS_JSON_).forEach(function(k) { headers[k] = NSE_FETCH_HEADERS_JSON_[k]; });
  if (session.cookie) headers.Cookie = session.cookie;
  Utilities.sleep(NSE_REQUEST_DELAY_MS_);
  var resp = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
  var code = resp.getResponseCode();
  if (code === 403 || code === 401) {
    PropertiesService.getScriptProperties().deleteProperty(NSE_SESSION_PROP_);
    session = nseEnsureSession_();
    headers.Cookie = session.cookie;
    Utilities.sleep(NSE_REQUEST_DELAY_MS_);
    resp = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
    code = resp.getResponseCode();
  }
  if (code !== 200) {
    throw new Error('NSE API ' + path + ' HTTP ' + code);
  }
  var text = resp.getContentText();
  if (!text || text.charAt(0) !== '{' && text.charAt(0) !== '[') {
    throw new Error('NSE API non-JSON response for ' + path);
  }
  return JSON.parse(text);
}

// --- Tab 4: bulk & block deals ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} daysBack
 * @return {Object}
 */
function ingestNseBulkBlockDeals_(ss, daysBack) {
  var today = new Date();
  var from = new Date(today.getTime());
  from.setDate(from.getDate() - Math.max(1, daysBack));
  var fromStr = formatNseDateDdMmYyyy_(from);
  var toStr = formatNseDateDdMmYyyy_(today);

  var added = 0;
  var modes = [
    { optionType: 'bulk_deals', dealType: 'bulk' },
    { optionType: 'block_deals', dealType: 'block' }
  ];
  modes.forEach(function(m) {
    var rows = fetchNseHistoricalDeals_(fromStr, toStr, m.optionType);
    added += mergeBulkDealRows_(ss, rows, m.dealType);
  });

  trimBulkDealsOlderThan_(ss, INGESTION_DEALS_RETAIN_DAYS_);
  return { added: added, from: fromStr, to: toStr };
}

/**
 * @param {string} fromStr DD-MM-YYYY
 * @param {string} toStr
 * @param {string} optionType bulk_deals|block_deals
 * @return {Array<Object>}
 */
function fetchNseHistoricalDeals_(fromStr, toStr, optionType) {
  var json = nseApiGetJson_('/historical/bulk-deals-type', {
    optionType: optionType,
    from: fromStr,
    to: toStr
  });
  return normalizeNseDealRecords_(json);
}

/**
 * Snapshot fallback for same-day deals when historical empty.
 * @return {Array<Object>}
 */
function fetchNseSnapshotDeals_(mode) {
  var json = nseApiGetJson_('/snapshot-capital-market-largedeal', { mode: mode || 'bulk_deals' });
  return normalizeNseDealRecords_(json);
}

/**
 * @param {*} json
 * @return {Array<Object>}
 */
function normalizeNseDealRecords_(json) {
  var list = [];
  if (!json) return list;
  if (Array.isArray(json)) list = json;
  else if (json.data && Array.isArray(json.data)) list = json.data;
  else if (json.bulkDeals && Array.isArray(json.bulkDeals)) list = json.bulkDeals;
  else if (json.blockDeals && Array.isArray(json.blockDeals)) list = json.blockDeals;

  return list.map(function(r) {
    return {
      date: r.date || r.tradeDate || r.tradedDate || r.executionDate || '',
      symbol: r.symbol || r.secSymbol || r.SYMBOL || '',
      clientName: r.clientName || r.client || r.buyerName || r.sellerName || r.name || '',
      buySell: r.buySell || r.buy_sell || r.transactionType || r.side || '',
      qty: num_(r.qty || r.quantity || r.tradedQuantity || r.tradeQty),
      price: num_(r.price || r.tradePrice || r.watp || r.avgPrice || r.tradePrice),
      pctTraded: num_(r.pctTraded || r.percentage || r.percShares),
      remarks: r.remarks || r.dealType || ''
    };
  }).filter(function(r) { return r.symbol; });
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Array<Object>} deals
 * @param {string} defaultDealType bulk|block
 * @return {number}
 */
function mergeBulkDealRows_(ss, deals, defaultDealType) {
  if (!deals.length) return 0;
  var sheet = getOrCreateSheet_('4. BULK & LARGE DEALS');
  var headers = getSheetHeaders_('4. BULK & LARGE DEALS');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var existing = loadSheetData_(ss, '4. BULK & LARGE DEALS');
  var keys = {};
  var rows = [];
  existing.forEach(function(r) {
    var key = bulkDealRowKey_(r);
    keys[key] = true;
    rows.push(r);
  });

  var added = 0;
  deals.forEach(function(d) {
    var sym = normalizeSymbolKey_(d.symbol);
    if (!sym) return;
    var dateStr = normalizeDealDate_(d.date);
    if (!dateStr) return;
    var buySell = normalizeBuySell_(d.buySell);
    var dealType = inferDealTypeFromText_(d.remarks || defaultDealType) || defaultDealType;
    var client = String(d.clientName || '').trim();
    var qty = d.qty;
    var price = d.price;
    var row = [
      dateStr, sym, client, buySell, qty, price, d.pctTraded || '',
      dealType,
      typeof classifyInvestorCategory_ === 'function' ? classifyInvestorCategory_(client) : 'other',
      qty && price ? (qty * price) / 1e7 : '',
      'nse:' + defaultDealType
    ];
    var key = bulkDealRowKey_(row);
    if (keys[key]) return;
    keys[key] = true;
    rows.push(row);
    added++;
  });

  clearDataBelowHeader_(sheet, headers.length);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  return added;
}

/**
 * @param {Array} r
 * @return {string}
 */
function bulkDealRowKey_(r) {
  return [r[0], r[1], r[2], r[3], r[4], r[5]].join('|');
}

/**
 * @param {*} val
 * @return {string}
 */
function normalizeDealDate_(val) {
  var d = parseSheetDate_(val);
  if (d) return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
  var s = String(val || '').trim();
  if (!s) return '';
  var m = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    var dd = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10) - 1;
    var yy = parseInt(m[3], 10);
    if (yy < 100) yy += 2000;
    return Utilities.formatDate(new Date(yy, mm, dd), 'Asia/Kolkata', 'yyyy-MM-dd');
  }
  return s;
}

/**
 * @param {*} val
 * @return {string}
 */
function normalizeBuySell_(val) {
  var t = String(val || '').toLowerCase();
  if (t.indexOf('buy') >= 0 || t === 'b') return 'BUY';
  if (t.indexOf('sell') >= 0 || t === 's') return 'SELL';
  return t ? t.toUpperCase() : '';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} retainDays
 */
function trimBulkDealsOlderThan_(ss, retainDays) {
  var sheet = ss.getSheetByName('4. BULK & LARGE DEALS');
  if (!sheet || sheet.getLastRow() < 2) return;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retainDays);
  var data = loadSheetData_(ss, '4. BULK & LARGE DEALS');
  var headers = getSheetHeaders_('4. BULK & LARGE DEALS');
  var kept = data.filter(function(r) {
    var d = parseSheetDate_(r[0]);
    return d && d >= cutoff;
  });
  clearDataBelowHeader_(sheet, headers.length);
  if (kept.length) sheet.getRange(2, 1, kept.length, headers.length).setValues(kept);
}

// --- Tab 24: shareholding (FII / DII / MF / promoter) ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} batchSize
 * @return {Object}
 */
function ingestNseShareholdingBatch_(ss, batchSize) {
  var symbols = nextIngestionSymbolBatch_(ss, batchSize);
  var upserted = 0;
  var errors = 0;
  symbols.forEach(function(sym) {
    try {
      if (ingestNseShareholdingForSymbol_(ss, sym)) upserted++;
    } catch (e) {
      errors++;
      Logger.log('shareholding ' + sym + ': ' + e.message);
    }
  });
  return { symbols: symbols.length, upserted: upserted, errors: errors };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @return {boolean}
 */
function ingestNseShareholdingForSymbol_(ss, sym) {
  var json = nseApiGetJson_('/corporate-share-holdings', { index: 'equities', symbol: sym });
  var parsed = parseNseShareholdingJson_(json, sym);
  if (!parsed) return false;
  mergeShareholdingRow_(ss, parsed);
  mergeShareholdingIntoFundamentals_(ss, parsed);
  return true;
}

/**
 * @param {*} json
 * @param {string} sym
 * @return {Object|null}
 */
function parseNseShareholdingJson_(json, sym) {
  var categories = [];
  if (json && json.data && Array.isArray(json.data)) categories = json.data;
  else if (json && Array.isArray(json)) categories = json;
  else if (json && json.shareHoldings) categories = json.shareHoldings;
  if (!categories.length) return null;

  var out = {
    symbol: sym,
    asOfDate: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    fiiPct: 0,
    diiPct: 0,
    mfPct: 0,
    promoterPct: 0,
    publicPct: 0,
    source: 'nse:corporate-share-holdings'
  };

  var diiParts = 0;
  categories.forEach(function(c) {
    var label = String(c.category || c.name || c.holder || c.shareholder || '').toLowerCase();
    var pct = num_(c.percentage || c.percHolding || c.shareholding || c.value);
    if (label.indexOf('promoter') >= 0) out.promoterPct += pct;
    else if (label.indexOf('foreign') >= 0 || label.indexOf('fpi') >= 0 || label.indexOf('fii') >= 0) out.fiiPct += pct;
    else if (label.indexOf('mutual') >= 0) out.mfPct += pct;
    else if (label.indexOf('insurance') >= 0 || label.indexOf('bank') >= 0 && label.indexOf('mutual') < 0) {
      diiParts += pct;
    } else if (label.indexOf('public') >= 0 || label.indexOf('retail') >= 0) out.publicPct += pct;
    else if (label.indexOf('domestic') >= 0 && label.indexOf('institution') >= 0) diiParts += pct;
  });
  out.diiPct = diiParts || Math.max(0, 100 - out.promoterPct - out.fiiPct - out.mfPct - out.publicPct);

  if (json.asOnDate || json.asOfDate) {
    var d = normalizeDealDate_(json.asOnDate || json.asOfDate);
    if (d) out.asOfDate = d;
  }
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} row
 */
function mergeShareholdingRow_(ss, row) {
  var sheet = getOrCreateSheet_('24. SHAREHOLDING PATTERN');
  var headers = getSheetHeaders_('24. SHAREHOLDING PATTERN');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var existing = loadSheetData_(ss, '24. SHAREHOLDING PATTERN');
  var key = row.symbol + '|' + row.asOfDate;
  var outRows = [];
  var replaced = false;
  existing.forEach(function(r) {
    var k = normalizeSymbolKey_(r[0]) + '|' + normalizeDealDate_(r[1]);
    if (k === key) {
      outRows.push([
        row.symbol, row.asOfDate, row.fiiPct, row.diiPct, row.mfPct,
        row.promoterPct, row.publicPct, row.source, 'auto-ingest'
      ]);
      replaced = true;
    } else {
      outRows.push(r);
    }
  });
  if (!replaced) {
    outRows.push([
      row.symbol, row.asOfDate, row.fiiPct, row.diiPct, row.mfPct,
      row.promoterPct, row.publicPct, row.source, 'auto-ingest'
    ]);
  }
  clearDataBelowHeader_(sheet, headers.length);
  if (outRows.length) sheet.getRange(2, 1, outRows.length, headers.length).setValues(outRows);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} sh
 */
function mergeShareholdingIntoFundamentals_(ss, sh) {
  var sheet = ss.getSheetByName('6. FUNDAMENTALS');
  if (!sheet || sheet.getLastRow() < 2) return;
  var data = loadSheetData_(ss, '6. FUNDAMENTALS');
  var todayStr = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var changed = false;
  data.forEach(function(r) {
    if (normalizeSymbolKey_(r[0]) !== sh.symbol) return;
    if (sh.promoterPct > 0 && !num_(r[11])) { r[11] = sh.promoterPct; changed = true; }
    if (sh.fiiPct > 0 && !num_(r[12])) { r[12] = sh.fiiPct; changed = true; }
    r[23] = todayStr;
    r[24] = false;
  });
  if (changed) {
    sheet.getRange(2, 1, data.length, FUNDAMENTALS_NUM_COLS).setValues(data);
  }
}

// --- Tab 6: quarterly financial results (partial) ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} batchSize
 * @return {Object}
 */
function ingestNseFinancialResultsBatch_(ss, batchSize) {
  var symbols = nextIngestionSymbolBatch_(ss, batchSize);
  var updated = 0;
  symbols.forEach(function(sym) {
    try {
      if (ingestNseFinancialResultsForSymbol_(ss, sym)) updated++;
    } catch (e) {
      Logger.log('financials ' + sym + ': ' + e.message);
    }
  });
  return { symbols: symbols.length, updated: updated };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @return {boolean}
 */
function ingestNseFinancialResultsForSymbol_(ss, sym) {
  var json = nseApiGetJson_('/corporates-financial-results', { index: 'equities', symbol: sym });
  var latest = pickLatestFinancialResult_(json);
  if (!latest) return false;
  mergeFinancialResultIntoFundamentals_(ss, sym, latest);
  return true;
}

/**
 * @param {*} json
 * @return {Object|null}
 */
function pickLatestFinancialResult_(json) {
  var list = [];
  if (json && json.data && Array.isArray(json.data)) list = json.data;
  else if (json && Array.isArray(json)) list = json;
  if (!list.length) return null;
  list.sort(function(a, b) {
    var da = parseSheetDate_(a.periodEnd || a.toDate || a.date) || new Date(0);
    var db = parseSheetDate_(b.periodEnd || b.toDate || b.date) || new Date(0);
    return db - da;
  });
  var r = list[0];
  return {
    periodEnd: r.periodEnd || r.toDate || r.financialYearEnd || '',
    revenue: num_(r.revenue || r.netSales || r.totalIncome),
    pat: num_(r.profitAfterTax || r.netProfit || r.pat),
    revenueGrowth: num_(r.revenueGrowth || r.revGrowthPercent || r.yoyRevenue),
    patGrowth: num_(r.profitGrowth || r.patGrowthPercent || r.yoyProfit),
    roe: num_(r.roe || r.returnOnEquity),
    roce: num_(r.roce || r.returnOnCapital)
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @param {Object} fin
 */
function mergeFinancialResultIntoFundamentals_(ss, sym, fin) {
  var sheet = getOrCreateSheet_('6. FUNDAMENTALS');
  var headers = getSheetHeaders_('6. FUNDAMENTALS');
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var existing = {};
  if (sheet.getLastRow() >= 2) {
    loadSheetData_(ss, '6. FUNDAMENTALS').forEach(function(r) {
      var k = normalizeSymbolKey_(r[0]);
      if (k) existing[k] = r.slice();
    });
  }

  var row = existing[sym] ? existing[sym].slice() : new Array(FUNDAMENTALS_NUM_COLS);
  row[0] = sym;
  if (fin.roce && !num_(row[2])) row[2] = fin.roce;
  if (fin.roe && !num_(row[3])) row[3] = fin.roe;
  if (fin.revenueGrowth && !num_(row[4])) row[4] = fin.revenueGrowth;
  if (fin.patGrowth && !num_(row[5])) row[5] = fin.patGrowth;
  if (fin.periodEnd) row[22] = fin.periodEnd;
  row[23] = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  row[24] = false;
  existing[sym] = row;

  var allRows = Object.keys(existing).sort().map(function(k) { return existing[k]; });
  clearDataBelowHeader_(sheet, headers.length);
  if (allRows.length) sheet.getRange(2, 1, allRows.length, FUNDAMENTALS_NUM_COLS).setValues(allRows);
}

// --- Corporate actions → Tab 3 announcements ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} batchSize
 * @return {Object}
 */
function ingestNseCorporateActionsBatch_(ss, batchSize) {
  var symbols = nextIngestionSymbolBatch_(ss, batchSize);
  var added = 0;
  symbols.forEach(function(sym) {
    try {
      added += ingestNseCorporateActionsForSymbol_(ss, sym);
    } catch (e) {
      Logger.log('corp actions ' + sym + ': ' + e.message);
    }
  });
  return { symbols: symbols.length, added: added };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @return {number}
 */
function ingestNseCorporateActionsForSymbol_(ss, sym) {
  var json = nseApiGetJson_('/corporates-corporateActions', { index: 'equities', symbol: sym });
  var list = [];
  if (json && json.data && Array.isArray(json.data)) list = json.data;
  else if (json && Array.isArray(json)) list = json;
  if (!list.length) return 0;

  var sheet = getOrCreateSheet_('3. NSE/BSE ANNOUNCEMENTS');
  var headers = getSheetHeaders_('3. NSE/BSE ANNOUNCEMENTS');
  var existing = loadSheetData_(ss, '3. NSE/BSE ANNOUNCEMENTS');
  var keys = {};
  existing.forEach(function(r) {
    keys[String(r[0]) + '|' + r[1] + '|' + r[2]] = true;
  });

  var added = 0;
  var newRows = existing.slice();
  list.forEach(function(a) {
    var dateStr = normalizeDealDate_(a.exDate || a.recordDate || a.actionDate || a.date);
    var subject = String(a.subject || a.purpose || a.action || a.type || 'Corporate action').trim();
    var key = sym + '|' + dateStr + '|' + subject;
    if (keys[key]) return;
    keys[key] = true;
    newRows.push([
      sym, dateStr, subject, 'corporate_action', 'nse:corporateActions', true,
      String(a.details || a.description || '')
    ]);
    added++;
  });

  clearDataBelowHeader_(sheet, headers.length);
  if (newRows.length) sheet.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
  return added;
}

// --- Tab 8: FII/DII macro (market-level) ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function ingestNseFiiDiiMacro_(ss) {
  var json = nseApiGetJson_('/fiidiiTradeReact', {});
  var fiiNet = 0;
  var diiNet = 0;
  if (json && json.data && Array.isArray(json.data)) {
    json.data.forEach(function(r) {
      var cat = String(r.category || r.type || '').toLowerCase();
      var val = num_(r.netValue || r.net_value || r.netBuySell || r.value);
      if (cat.indexOf('fii') >= 0 || cat.indexOf('fpi') >= 0) fiiNet += val;
      if (cat.indexOf('dii') >= 0) diiNet += val;
    });
  }
  upsertMacroMetric_(ss, 'FII_NET', fiiNet, fiiNet >= 0 ? 'positive' : 'negative', 'nse:fiidiiTradeReact');
  upsertMacroMetric_(ss, 'DII_NET', diiNet, diiNet >= 0 ? 'positive' : 'negative', 'nse:fiidiiTradeReact');
  return { fiiNet: fiiNet, diiNet: diiNet };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} metric
 * @param {number} value
 * @param {string} bias
 * @param {string} notes
 */
function upsertMacroMetric_(ss, metric, value, bias, notes) {
  var sheet = getOrCreateSheet_('8. MACRO DASHBOARD');
  var headers = getSheetHeaders_('8. MACRO DASHBOARD');
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var data = loadSheetData_(ss, '8. MACRO DASHBOARD');
  var found = false;
  var rows = data.map(function(r) {
    if (String(r[0]).toUpperCase() === metric) {
      found = true;
      return [metric, value, r[2] || '', bias, today, notes];
    }
    return r;
  });
  if (!found) rows.push([metric, value, '', bias, today, notes]);
  clearDataBelowHeader_(sheet, headers.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

// --- Symbol queue (rotating batch) ---

/**
 * Priority: Tab 10 by conviction → Tab 11 lists → UNIVERSE eligible.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} batchSize
 * @return {string[]}
 */
function nextIngestionSymbolBatch_(ss, batchSize) {
  var queue = buildIngestionSymbolQueue_(ss);
  if (!queue.length) return [];
  var props = PropertiesService.getScriptProperties();
  var cursor = parseInt(props.getProperty(INGESTION_CURSOR_PROP_) || '0', 10);
  if (cursor >= queue.length) cursor = 0;
  var batch = [];
  for (var i = 0; i < batchSize && i < queue.length; i++) {
    batch.push(queue[(cursor + i) % queue.length]);
  }
  props.setProperty(INGESTION_CURSOR_PROP_, String((cursor + batchSize) % queue.length));
  return batch;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {string[]}
 */
function buildIngestionSymbolQueue_(ss) {
  var seen = {};
  var list = [];

  function add(sym) {
    sym = normalizeSymbolKey_(sym);
    if (!sym || seen[sym]) return;
    seen[sym] = true;
    list.push(sym);
  }

  loadSheetData_(ss, '10. SCORING MODEL')
    .sort(function(a, b) { return num_(b[12]) - num_(a[12]); })
    .forEach(function(r) { add(r[0]); });

  loadSheetData_(ss, '11. RANKED WATCHLIST').forEach(function(r) { add(r[2]); });

  var universe = loadSheetData_(ss, '1. UNIVERSE');
  universe.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    var mcap = num_(r[5]);
    if (mcap >= MIN_MARKET_CAP_CR || ALLOW_UNIVERSE_WITHOUT_MCAP) add(sym);
  });

  return list.slice(0, INGESTION_MAX_SYMBOL_QUEUE_);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @return {number}
 */
function countSheetDataRows_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getLastRow() - 1;
}

/**
 * @param {Date} d
 * @return {string} DD-MM-YYYY for NSE historical APIs
 */
function formatNseDateDdMmYyyy_(d) {
  return Utilities.formatDate(d, 'Asia/Kolkata', 'dd-MM-yyyy');
}
