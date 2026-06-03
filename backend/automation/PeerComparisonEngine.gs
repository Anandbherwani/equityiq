/**
 * Peer Comparison Engine v2 — every stock vs sector peers on fundamentals.
 *
 * Compares: PE, PB, ROE, ROCE, Growth (rev/PAT YoY), Margins (EBITDA margin).
 * Outputs: relative_quality_score, relative_valuation_score, relative_growth_score.
 *
 * See docs/PEER_COMPARISON_ENGINE.md
 */

var PEER_ENGINE_VERSION_ = '2.0';
var PEER_SHEET_BENCHMARKS_ = '25. SECTOR PEER BENCHMARKS';
var PEER_STOCK_SHEET_ = '35. PEER STOCK COMPARISON';

var PEER_COL_REL_QUALITY_ = 50;
var PEER_COL_REL_VALUATION_ = 51;
var PEER_COL_REL_GROWTH_ = 52;
var PEER_COL_MEDIAN_PE_ = 53;
var PEER_COL_MEDIAN_PB_ = 54;
var PEER_COL_MEDIAN_ROCE_ = 55;
var PEER_COL_MEDIAN_GROWTH_ = 56;
var PEER_COL_MEDIAN_ROE_ = 64;
var PEER_COL_MEDIAN_MARGIN_ = 65;

/** @deprecated alias — use relative_growth_score (col 52) */
var PEER_COL_REL_STRENGTH_ = PEER_COL_REL_GROWTH_;

var PEER_MIN_SECTOR_SAMPLES_ = 3;

/**
 * @param {Array<number>} arr
 * @return {number}
 */
function median_(arr) {
  if (!arr || !arr.length) return 0;
  var s = arr.slice().sort(function(a, b) { return a - b; });
  var m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

var PEER_EXAMPLE_SYMBOLS_ = {
  'DEFENCE': ['BEL', 'HAL', 'BHEL', 'GRSE'],
  'AEROSPACE & DEFENCE': ['HAL', 'BEL'],
  'IT SERVICES': ['TCS', 'INFY', 'WIPRO', 'HCLTECH'],
  'BANKS': ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'AXISBANK'],
  'PRIVATE BANK': ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
  'FINANCIAL SERVICES': ['HDFCBANK', 'ICICIBANK', 'BAJFINANCE'],
  'NBFC': ['BAJFINANCE', 'CHOLAFIN'],
  'AUTO': ['MARUTI', 'TATAMOTORS', 'M&M'],
  'PHARMA': ['SUNPHARMA', 'DRREDDY', 'CIPLA'],
  'FMCG': ['HINDUNILVR', 'ITC', 'NESTLEIND'],
  'ENERGY': ['RELIANCE', 'ONGC', 'BPCL'],
  'METALS': ['TATASTEEL', 'HINDALCO', 'JSWSTEEL'],
  'RAILWAYS': ['IRCTC', 'IRCON', 'RVNL'],
  'CAPITAL GOODS': ['LT', 'BHEL', 'SIEMENS', 'ABB'],
  'AI': ['TCS', 'INFY', 'PERSISTENT'],
  'DATA_CENTERS': ['NETWEB', 'SIFY'],
  'EMS': ['DIXON', 'AMBER', 'KAYNES'],
  'CHINA_PLUS_1': ['DIXON', 'AMBER'],
  'RENEWABLES': ['ADANIGREEN', 'SUZLON', 'TATAPOWER']
};

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildPeerComparisonContext_(ss) {
  var fundamentals = buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS'));
  var universeBySym = buildUniverseBySymbol_(loadSheetData_(ss, '1. UNIVERSE'));
  var sectorLookup = buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH'));
  var sectorMedians = buildSectorFundamentalMedians_(fundamentals, universeBySym);
  return {
    version: PEER_ENGINE_VERSION_,
    asOf: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    fundamentals: fundamentals,
    universeBySym: universeBySym,
    sectorLookup: sectorLookup,
    sectorMedians: sectorMedians,
    techCtx: typeof buildTechnicalMomentumContext_ === 'function' ?
      buildTechnicalMomentumContext_(ss) : null
  };
}

/**
 * Sector medians: PE, PB, ROE, ROCE, growth %, EBITDA margin %.
 * @param {Object} fundamentals
 * @param {Object} universeBySym
 * @return {Object}
 */
function buildSectorFundamentalMedians_(fundamentals, universeBySym) {
  var bySector = {};
  Object.keys(fundamentals).forEach(function(sym) {
    var f = fundamentals[sym];
    var u = universeBySym[sym] || {};
    var sk = u.sectorKey || normalizeSectorKey_(f.sectorNormalized || f.sectorRaw || u.sectorRaw || '');
    if (!sk) sk = 'MISCELLANEOUS';
    if (!bySector[sk]) {
      bySector[sk] = { pe: [], pb: [], roe: [], roce: [], growth: [], margin: [], symbols: [] };
    }
    bySector[sk].symbols.push(sym);
    if (f.pe > 0 && f.pe < 250) bySector[sk].pe.push(f.pe);
    if (f.pb > 0 && f.pb < 50) bySector[sk].pb.push(f.pb);
    if (f.roe > 0 && f.roe < 80) bySector[sk].roe.push(f.roe);
    if (f.roce > 0 && f.roce < 80) bySector[sk].roce.push(f.roce);
    var g = pickFundamentalGrowthPct_(f);
    if (g > -80 && g < 200) bySector[sk].growth.push(g);
    if (f.ebitdaMargin > 0 && f.ebitdaMargin < 60) bySector[sk].margin.push(f.ebitdaMargin);
  });

  var out = {};
  Object.keys(bySector).forEach(function(sk) {
    var b = bySector[sk];
    out[sk] = {
      sectorKey: sk,
      symbolCount: b.symbols.length,
      medianPe: median_(b.pe),
      medianPb: median_(b.pb),
      medianRoe: median_(b.roe),
      medianRoce: median_(b.roce),
      medianGrowth: median_(b.growth),
      medianMargin: median_(b.margin),
      sampleSymbols: b.symbols.slice(0, 12),
      hasEnoughData: b.symbols.length >= PEER_MIN_SECTOR_SAMPLES_ &&
        (b.pe.length >= 2 || b.roce.length >= 2 || b.roe.length >= 2)
    };
  });
  return out;
}

/**
 * @param {Object} f
 * @return {number}
 */
function pickFundamentalGrowthPct_(f) {
  if (!f) return 0;
  if (f.revYoy > 0) return f.revYoy;
  if (f.patYoy > 0) return f.patYoy;
  return f.ebitdaYoy || 0;
}

/**
 * Ratio score 0–100 (stock vs median).
 * @param {number} stockVal
 * @param {number} medianVal
 * @param {boolean} higherIsBetter
 * @return {number|null}
 */
function scoreMetricVsMedian_(stockVal, medianVal, higherIsBetter) {
  if (!stockVal || stockVal <= 0 || !medianVal || medianVal <= 0) return null;
  var ratio = stockVal / medianVal;
  if (!higherIsBetter) ratio = medianVal / stockVal;
  if (ratio >= 1.3) return 90;
  if (ratio >= 1.15) return 80;
  if (ratio >= 1.05) return 70;
  if (ratio >= 0.95) return 55;
  if (ratio >= 0.85) return 42;
  if (ratio >= 0.7) return 30;
  return 18;
}

/**
 * @param {Object|null} f
 * @param {Object} med
 * @return {number}
 */
function scoreRelativeQuality_(f, med) {
  if (!f) return 40;
  var scores = [];
  var roceS = scoreMetricVsMedian_(f.roce, med.medianRoce, true);
  if (roceS !== null) scores.push(roceS);
  var roeS = scoreMetricVsMedian_(f.roe, med.medianRoe, true);
  if (roeS !== null) scores.push(roeS);
  var margin = f.ebitdaMargin || 0;
  if (margin > 0 && med.medianMargin > 0) {
    scores.push(scoreMetricVsMedian_(margin, med.medianMargin, true));
  }
  if (!scores.length) return 45;
  var blended = scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
  if (f.roe >= 18 && f.roce >= med.medianRoce) blended = Math.min(100, blended + 5);
  return Math.max(0, Math.min(100, Math.round(blended)));
}

/**
 * @param {Object|null} f
 * @param {Object} med
 * @return {number}
 */
function scoreRelativeGrowth_(f, med) {
  if (!f) return 45;
  var g = pickFundamentalGrowthPct_(f);
  if (!g || med.medianGrowth <= 0) return 45;
  var growthScore = scoreMetricVsMedian_(Math.max(g, 0.1), Math.max(med.medianGrowth, 0.1), true);
  if (growthScore === null) return 45;
  if (g < 0 && med.medianGrowth > 5) growthScore = Math.max(10, growthScore - 25);
  if (f.patYoy > 0 && f.revYoy > 0 && f.patYoy >= med.medianGrowth) {
    growthScore = Math.min(100, growthScore + 6);
  }
  return Math.max(0, Math.min(100, Math.round(growthScore)));
}

/**
 * PE + PB vs sector median (cheaper = higher when quality OK).
 * @param {Object|null} f
 * @param {Object} med
 * @param {number} relQuality
 * @return {number}
 */
function scoreRelativeValuation_(f, med, relQuality) {
  if (!f) return 45;
  var scores = [];
  if (f.pe > 0 && med.medianPe > 0) {
    scores.push(scoreMetricVsMedian_(f.pe, med.medianPe, false));
  }
  if (f.pb > 0 && med.medianPb > 0) {
    scores.push(scoreMetricVsMedian_(f.pb, med.medianPb, false));
  }
  if (!scores.length) return 45;
  var blended = Math.round(
    scores.reduce(function(a, b) { return a + b; }, 0) / scores.length
  );
  if (relQuality < 45) blended = Math.min(blended, 55);
  if (f.pe > 0 && med.medianPe > 0 && f.pe > med.medianPe * 1.35 && relQuality < 60) {
    blended = Math.max(12, blended - 18);
  }
  return Math.max(0, Math.min(100, blended));
}

/**
 * Momentum overlay (sector rank + technical) — not written to Tab 10; used in narratives only.
 */
function scoreRelativeMomentum_(c, sectorLookup, sk, sym, techCtx) {
  var score = 50;
  var sec = sectorLookup[sk];
  if (sec && sec.rank > 0) {
    if (sec.rank <= 3) score = 85;
    else if (sec.rank <= 7) score = 72;
    else if (sec.rank <= 12) score = 58;
    else score = 42;
  }
  if (techCtx && typeof technicalMomentumScore === 'function') {
    var t = technicalMomentumScore(sym, techCtx);
    if (t.score >= 4) score = Math.min(100, score + 12);
    else if (t.score <= 1) score = Math.max(0, score - 10);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * @param {string} sym
 * @param {Object|null} f
 * @param {Object} u
 * @param {Object} sectorMedians
 * @param {Object} sectorLookup
 * @param {Object} c
 * @param {Object|null} techCtx
 * @return {Object}
 */
function computePeerRelativeScores_(sym, f, u, sectorMedians, sectorLookup, c, techCtx) {
  var sk = u.sectorKey || normalizeSectorKey_((f && f.sectorNormalized) || u.sectorRaw || c.sectorKey || '');
  if (!sk) sk = 'MISCELLANEOUS';
  var med = sectorMedians[sk] || null;

  var empty = {
    sectorKey: sk,
    relative_quality_score: 50,
    relative_valuation_score: 50,
    relative_growth_score: 50,
    relative_strength_score: 50,
    sector_median_pe: 0,
    sector_median_pb: 0,
    sector_median_roe: 0,
    sector_median_roce: 0,
    sector_median_growth: 0,
    sector_median_margin: 0,
    pe_vs_median: 0,
    pb_vs_median: 0,
    roce_vs_median: 0,
    roe_vs_median: 0,
    growth_vs_median: 0,
    margin_vs_median: 0,
    peer_rationale: 'Insufficient sector peer data',
    named_peers: getNamedPeersForSector_(sk)
  };

  if (!med || !med.hasEnoughData) return empty;

  var relQuality = scoreRelativeQuality_(f, med);
  var relGrowth = scoreRelativeGrowth_(f, med);
  var relValuation = scoreRelativeValuation_(f, med, relQuality);
  var relMomentum = scoreRelativeMomentum_(c, sectorLookup, sk, sym, techCtx);

  return {
    sectorKey: sk,
    relative_quality_score: relQuality,
    relative_valuation_score: relValuation,
    relative_growth_score: relGrowth,
    relative_strength_score: relGrowth,
    sector_median_pe: med.medianPe,
    sector_median_pb: med.medianPb,
    sector_median_roe: med.medianRoe,
    sector_median_roce: med.medianRoce,
    sector_median_growth: med.medianGrowth,
    sector_median_margin: med.medianMargin,
    pe_vs_median: ratioVsMedian_(f && f.pe, med.medianPe),
    pb_vs_median: ratioVsMedian_(f && f.pb, med.medianPb),
    roe_vs_median: ratioVsMedian_(f && f.roe, med.medianRoe),
    roce_vs_median: ratioVsMedian_(f && f.roce, med.medianRoce),
    growth_vs_median: ratioVsMedian_(pickFundamentalGrowthPct_(f), med.medianGrowth),
    margin_vs_median: ratioVsMedian_(f && f.ebitdaMargin, med.medianMargin),
    relative_momentum_score: relMomentum,
    peer_rationale: buildPeerRationale_(sym, f, med, relQuality, relValuation, relGrowth),
    named_peers: getNamedPeersForSector_(sk)
  };
}

/**
 * @param {number} stockVal
 * @param {number} medianVal
 * @return {number}
 */
function ratioVsMedian_(stockVal, medianVal) {
  if (!stockVal || stockVal <= 0 || !medianVal || medianVal <= 0) return 0;
  return Math.round((stockVal / medianVal) * 1000) / 1000;
}

/**
 * @param {string} sk
 * @return {string[]}
 */
function getNamedPeersForSector_(sk) {
  var key = String(sk || '').toUpperCase();
  if (PEER_EXAMPLE_SYMBOLS_[key]) return PEER_EXAMPLE_SYMBOLS_[key].slice();
  var keys = Object.keys(PEER_EXAMPLE_SYMBOLS_);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (key.indexOf(k) >= 0 || k.indexOf(key) >= 0) return PEER_EXAMPLE_SYMBOLS_[k].slice();
  }
  return [];
}

/**
 * @param {string} sym
 * @param {Object|null} f
 * @param {Object} med
 * @param {number} rq
 * @param {number} rv
 * @param {number} rg
 * @return {string}
 */
function buildPeerRationale_(sym, f, med, rq, rv, rg) {
  var lines = [];
  lines.push(sym + ' vs ' + med.sectorKey + ' (' + med.symbolCount + ' peers)');
  if (med.medianPe > 0 && f && f.pe > 0) {
    lines.push('PE ' + f.pe.toFixed(1) + ' vs med ' + med.medianPe.toFixed(1));
  }
  if (med.medianPb > 0 && f && f.pb > 0) {
    lines.push('PB ' + f.pb.toFixed(2) + ' vs med ' + med.medianPb.toFixed(2));
  }
  if (med.medianRoe > 0 && f && f.roe > 0) {
    lines.push('ROE ' + f.roe.toFixed(1) + '% vs med ' + med.medianRoe.toFixed(1) + '%');
  }
  if (med.medianRoce > 0 && f && f.roce > 0) {
    lines.push('ROCE ' + f.roce.toFixed(1) + '% vs med ' + med.medianRoce.toFixed(1) + '%');
  }
  if (med.medianGrowth > 0) {
    var g = pickFundamentalGrowthPct_(f);
    lines.push('Growth ' + (g ? g.toFixed(1) : '—') + '% vs med ' + med.medianGrowth.toFixed(1) + '%');
  }
  if (med.medianMargin > 0 && f && f.ebitdaMargin > 0) {
    lines.push('EBITDA margin ' + f.ebitdaMargin.toFixed(1) + '% vs med ' + med.medianMargin.toFixed(1) + '%');
  }
  lines.push('Rel Q/V/G ' + rq + '/' + rv + '/' + rg);
  return lines.join(' · ');
}

/**
 * @param {Array<Array>} data Tab 10
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function applyPeerComparisonBatch_(data, ss) {
  var ctx = buildPeerComparisonContext_(ss);
  var universeMap = buildUniverseLookup_(ss);
  writeSectorPeerBenchmarksSheet_(ss, ctx.sectorMedians, ctx.asOf);
  var stockRows = [];

  for (var i = 0; i < data.length; i++) {
    while (data[i].length < SCORING_NUM_COLS) data[i].push('');
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;
    var c = buildScoringCandidate_(data[i], universeMap);
    var u = ctx.universeBySym[sym] || {};
    var f = ctx.fundamentals[sym] || null;
    if (f && !f.ebitdaMargin && f.ebitda_margin) f.ebitdaMargin = f.ebitda_margin;
    var peer = computePeerRelativeScores_(sym, f, u, ctx.sectorMedians, ctx.sectorLookup, c, ctx.techCtx);

    data[i][PEER_COL_REL_QUALITY_] = peer.relative_quality_score;
    data[i][PEER_COL_REL_VALUATION_] = peer.relative_valuation_score;
    data[i][PEER_COL_REL_GROWTH_] = peer.relative_growth_score;
    data[i][PEER_COL_MEDIAN_PE_] = peer.sector_median_pe;
    data[i][PEER_COL_MEDIAN_PB_] = peer.sector_median_pb;
    data[i][PEER_COL_MEDIAN_ROCE_] = peer.sector_median_roce;
    data[i][PEER_COL_MEDIAN_GROWTH_] = peer.sector_median_growth;
    data[i][PEER_COL_MEDIAN_ROE_] = peer.sector_median_roe;
    data[i][PEER_COL_MEDIAN_MARGIN_] = peer.sector_median_margin;

    stockRows.push([
      sym, peer.sectorKey,
      f && f.pe > 0 ? f.pe : '', f && f.pb > 0 ? f.pb : '',
      f && f.roe > 0 ? f.roe : '', f && f.roce > 0 ? f.roce : '',
      pickFundamentalGrowthPct_(f), f && f.ebitdaMargin > 0 ? f.ebitdaMargin : '',
      peer.sector_median_pe, peer.sector_median_pb,
      peer.sector_median_roe, peer.sector_median_roce,
      peer.sector_median_growth, peer.sector_median_margin,
      peer.pe_vs_median, peer.pb_vs_median, peer.roe_vs_median,
      peer.roce_vs_median, peer.growth_vs_median, peer.margin_vs_median,
      peer.relative_quality_score, peer.relative_valuation_score, peer.relative_growth_score,
      ctx.asOf
    ]);
  }
  writePeerStockComparisonSheet_(ss, stockRows);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} sectorMedians
 * @param {string} asOf
 */
function writeSectorPeerBenchmarksSheet_(ss, sectorMedians, asOf) {
  var headers = [
    'sector_key', 'symbol_count', 'median_pe', 'median_pb', 'median_roe', 'median_roce',
    'median_growth_pct', 'median_ebitda_margin_pct', 'as_of_date', 'sample_symbols', 'notes'
  ];
  var sheet = getOrCreateSheet_(PEER_SHEET_BENCHMARKS_);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var rows = Object.keys(sectorMedians).sort().map(function(sk) {
    var m = sectorMedians[sk];
    return [
      sk, m.symbolCount, m.medianPe, m.medianPb, m.medianRoe, m.medianRoce,
      m.medianGrowth, m.medianMargin, asOf, (m.sampleSymbols || []).slice(0, 8).join(', '),
      m.hasEnoughData ? 'ok' : 'sparse'
    ];
  });
  clearDataBelowHeader_(sheet, headers.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Array<Array>} rows
 */
function writePeerStockComparisonSheet_(ss, rows) {
  var headers = [
    'symbol', 'sector_key', 'pe', 'pb', 'roe_pct', 'roce_pct', 'growth_pct', 'ebitda_margin_pct',
    'median_pe', 'median_pb', 'median_roe', 'median_roce', 'median_growth', 'median_margin',
    'pe_vs_median', 'pb_vs_median', 'roe_vs_median', 'roce_vs_median', 'growth_vs_median', 'margin_vs_median',
    'relative_quality_score', 'relative_valuation_score', 'relative_growth_score', 'as_of_date'
  ];
  var sheet = getOrCreateSheet_(PEER_STOCK_SHEET_);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  clearDataBelowHeader_(sheet, headers.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Ranking boost from Q + V + G (not additive sum of raw metrics).
 * @param {Object} c
 * @return {number}
 */
function peerComparisonSortBoostFromCandidate_(c) {
  var q = num_(c.relativeQualityScore);
  var v = num_(c.relativeValuationScore);
  var g = num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore);
  if (!q && !v && !g) return 0;
  return Math.round((q * 0.38 + v * 0.32 + g * 0.30) * 0.38);
}

/**
 * @param {Object} c
 * @param {Object} peer
 * @param {Object|null=} f
 * @return {string}
 */
function buildWhyBetterThanPeers_(c, peer, f) {
  peer = peer || {};
  f = f || null;
  var sym = c.symbol;
  var peers = peer.named_peers || getNamedPeersForSector_(peer.sectorKey || c.sectorKey);
  var others = peers.filter(function(p) { return p !== sym; }).slice(0, 3);
  var peerLabel = others.length ? others.join(', ') : 'sector peers';

  var parts = [];
  parts.push(sym + ' vs ' + peerLabel + ' (' + (peer.sectorKey || c.sector || 'sector') + ').');

  if (peer.sector_median_pe > 0 && f && f.pe > 0) {
    parts.push('PE ' + f.pe.toFixed(1) + ' vs peer median ' + peer.sector_median_pe.toFixed(1));
  }
  if (peer.sector_median_roe > 0 && f && f.roe > 0) {
    parts.push('ROE ' + f.roe.toFixed(1) + '% vs median ' + peer.sector_median_roe.toFixed(1) + '%');
  }
  if (peer.sector_median_roce > 0 && f && f.roce > 0) {
    parts.push('ROCE ' + f.roce.toFixed(1) + '% vs median ' + peer.sector_median_roce.toFixed(1) + '%');
  }
  if (num_(c.relativeQualityScore) >= 65) {
    parts.push('Relative quality ' + num_(c.relativeQualityScore) + '/100 (ROCE/ROE/margins vs peers)');
  }
  if (num_(c.relativeGrowthScore) >= 65) {
    parts.push('Relative growth ' + num_(c.relativeGrowthScore) + '/100 vs sector revenue/PAT trend');
  }
  if (num_(c.relativeValuationScore) >= 65) {
    parts.push('Relative valuation ' + num_(c.relativeValuationScore) + '/100 (PE/PB vs peers)');
  }
  if (peer.peer_rationale) parts.push(peer.peer_rationale);
  return parts.join(' ');
}

/** Menu */
function runPeerComparisonEngineMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No Tab 10 rows — rebuild pipeline first.');
    return;
  }
  var n = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, n, SCORING_NUM_COLS).getValues();
  applyPeerComparisonBatch_(data, ss);
  sheet.getRange(2, 1, n, SCORING_NUM_COLS).setValues(data);
  SpreadsheetApp.getUi().alert(
    'Peer Comparison v2',
    'Updated ' + n + ' symbols.\nTabs 25 + 35 written.\nCols: relative_quality, relative_valuation, relative_growth.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Menu */
function previewPeerComparison() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = buildPeerComparisonContext_(ss);
  var samples = ['BEL', 'HAL', 'TCS', 'INFY', 'ICICIBANK', 'HDFCBANK', 'RELIANCE', 'LT'];
  var lines = ['Peer Comparison Engine v2'];
  samples.forEach(function(sym) {
    sym = normalizeSymbolKey_(sym);
    var f = ctx.fundamentals[sym];
    var u = ctx.universeBySym[sym] || { sectorKey: '' };
    var peer = computePeerRelativeScores_(sym, f, u, ctx.sectorMedians, ctx.sectorLookup, { symbol: sym }, ctx.techCtx);
    lines.push(sym + ': Q' + peer.relative_quality_score + ' V' + peer.relative_valuation_score +
      ' G' + peer.relative_growth_score);
  });
  SpreadsheetApp.getUi().alert(lines.join('\n').substring(0, 1800));
}
