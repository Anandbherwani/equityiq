/**
 * IPO Intelligence Engine — track upcoming/open/recent IPOs with subscribe verdicts.
 * Tab 38 + Tab 11 list "IPO Intelligence".
 */

var IPO_INTEL_ENGINE_VERSION_ = '1.0';
var IPO_SHEET_ = '38. IPO INTELLIGENCE';
var IPO_LIST_NAME_ = 'IPO Intelligence';

var IPO_HEADERS_ = [
  'symbol', 'company_name', 'status', 'issue_price', 'gmp_pct', 'subscription_x',
  'listing_date', 'sector', 'verdict', 'score', 'thesis', 'risks', 'last_updated'
];

var IPO_VERDICTS_ = ['Strong Subscribe', 'Subscribe', 'Watch', 'Avoid'];

/**
 * Ensure Tab 38.
 */
function ensureIpoIntelligenceSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetWithHeaders_(ss, IPO_SHEET_, IPO_HEADERS_);
}

/**
 * @param {Object} row
 * @return {string}
 */
function classifyIpoVerdict_(row) {
  var score = num_(row.score);
  var gmp = num_(row.gmp_pct);
  var sub = num_(row.subscription_x);
  if (score >= 75 && gmp >= 15 && sub >= 3) return 'Strong Subscribe';
  if (score >= 58 && gmp >= 0) return 'Subscribe';
  if (score >= 40) return 'Watch';
  return 'Avoid';
}

/**
 * @param {Object} ipo
 * @return {number}
 */
function scoreIpoCandidate_(ipo) {
  var s = 50;
  if (num_(ipo.gmp_pct) > 20) s += 15;
  else if (num_(ipo.gmp_pct) > 5) s += 8;
  if (num_(ipo.subscription_x) > 5) s += 12;
  else if (num_(ipo.subscription_x) > 1) s += 5;
  if (String(ipo.status).toLowerCase() === 'open') s += 5;
  return Math.min(100, Math.max(0, Math.round(s)));
}

/**
 * Load Tab 38 rows.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function loadIpoIntelligenceRows_(ss) {
  ensureIpoIntelligenceSheet_();
  var sheet = ss.getSheetByName(IPO_SHEET_);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, IPO_HEADERS_.length).getValues();
  return data.map(function(r) {
    var o = {
      symbol: normalizeSymbolKey_(r[0]),
      company_name: String(r[1] || ''),
      status: String(r[2] || 'watch'),
      issue_price: num_(r[3]),
      gmp_pct: num_(r[4]),
      subscription_x: num_(r[5]),
      listing_date: String(r[6] || ''),
      sector: String(r[7] || ''),
      verdict: String(r[8] || ''),
      score: num_(r[9]),
      thesis: String(r[10] || ''),
      risks: String(r[11] || '')
    };
    if (!o.score) o.score = scoreIpoCandidate_(o);
    if (!o.verdict) o.verdict = classifyIpoVerdict_(o);
    return o;
  }).filter(function(o) { return o.symbol || o.company_name; });
}

/**
 * Seed sample IPO rows if sheet empty (operator can replace with live data).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function seedIpoIntelligenceIfEmpty_(ss) {
  var sheet = ss.getSheetByName(IPO_SHEET_);
  if (!sheet || sheet.getLastRow() > 1) return;
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var rows = [
    ['IPO_SAMPLE1', 'Sample IPO A', 'open', 450, 18, 4.2, today, 'Industrials', 'Subscribe', 72,
      'Reasonable GMP with institutional interest', 'Valuation stretch risk', today],
    ['IPO_SAMPLE2', 'Sample IPO B', 'upcoming', 320, 0, 0, '', 'IT Services', 'Watch', 48,
      'Await subscription book', 'Market timing', today]
  ];
  sheet.getRange(2, 1, rows.length, IPO_HEADERS_.length).setValues(rows);
}

/**
 * Append IPO Intelligence picks to Tab 11.
 * @param {Array<Array>} out
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} refreshed
 */
function appendIpoIntelligenceToTab11_(out, ss, refreshed) {
  seedIpoIntelligenceIfEmpty_(ss);
  var ipos = loadIpoIntelligenceRows_(ss);
  ipos.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
  ipos.slice(0, 10).forEach(function(ipo, idx) {
    var evidence = JSON.stringify({
      recommendation_category: 'ipo',
      ipo_verdict: ipo.verdict,
      ipo_status: ipo.status
    });
    out.push([
      IPO_LIST_NAME_,
      idx + 1,
      ipo.symbol,
      ipo.company_name,
      ipo.sector || 'IPO',
      ipo.score,
      ipo.thesis || ('IPO verdict: ' + ipo.verdict + ' · ' + ipo.status),
      ipo.risks || 'Post-listing volatility; valuation vs peers',
      'Listing window',
      ipo.verdict,
      Math.min(95, ipo.score),
      evidence,
      refreshed
    ]);
  });
}

/**
 * @return {Object}
 */
function getIpoIntelligencePayload_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rows = loadIpoIntelligenceRows_(ss);
  var byVerdict = {};
  IPO_VERDICTS_.forEach(function(v) { byVerdict[v] = 0; });
  rows.forEach(function(r) {
    if (byVerdict[r.verdict] != null) byVerdict[r.verdict]++;
  });
  return {
    ok: true,
    engine_version: IPO_INTEL_ENGINE_VERSION_,
    total: rows.length,
    by_verdict: byVerdict,
    rows: rows
  };
}
