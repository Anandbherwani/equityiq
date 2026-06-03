/**
 * Technical Momentum Engine — Tab 10 column I (0–5).
 * See docs/TECHNICAL_MOMENTUM_ENGINE.md
 *
 * Data: Tab 2 PRICE & TECHNICALS (RSI, DMAs, volume, 52w high, relative strength vs Nifty).
 */

var TECHNICAL_MOMENTUM_CAP_ = 5;
var TECH_SHEET_NAME_ = '2. PRICE & TECHNICALS';
var NIFTY_SYMBOL_KEYS_ = ['NIFTY50', 'NIFTY', 'NIFTY 50', 'INDEXNSE:NIFTY 50'];

/**
 * @typedef {Object} TechnicalMomentumResult
 * @property {number} score 0–5
 * @property {string} classification bullish|neutral|bearish
 * @property {number} confidence 0–100
 * @property {string} source
 * @property {string} date
 * @property {string} rationale
 * @property {Array<Object>} signals
 * @property {Array<string>} missing
 */

/**
 * Build once per rebuild; pass to technicalMomentumScore(symbol, ctx).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildTechnicalMomentumContext_(ss) {
  var rows = loadSheetData_(ss, TECH_SHEET_NAME_);
  var pricesBySym = buildTechnicalPriceBySymbol_(rows);
  var niftyChg = readNiftyChgPctFromPrices_(pricesBySym, rows);
  var asOf = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

  Object.keys(pricesBySym).forEach(function(sym) {
    enrichTechnicalPriceRow_(pricesBySym[sym], niftyChg);
  });

  return {
    asOf: asOf,
    pricesBySym: pricesBySym,
    niftyChgPct: niftyChg,
    tab2Rows: techMomRowCount_(ss, TECH_SHEET_NAME_)
  };
}

/**
 * Primary API — technical momentum score for one symbol.
 * @param {string} symbol
 * @param {Object=} ctx from buildTechnicalMomentumContext_(ss)
 * @return {TechnicalMomentumResult}
 */
function technicalMomentumScore(symbol, ctx) {
  var sym = normalizeSymbolKey_(symbol);
  if (!sym) {
    return emptyTechnicalMomentumResult_('invalid_symbol');
  }
  if (!ctx) {
    ctx = buildTechnicalMomentumContext_(SpreadsheetApp.getActiveSpreadsheet());
  }

  var p = ctx.pricesBySym[sym];
  var signals = [];
  var missing = [];
  var latestDate = ctx.asOf;

  if (!p || p.price <= 0) {
    missing.push('TAB2_PRICE');
    return finalizeTechnicalMomentum_(signals, missing, 0, ctx, latestDate, 'none');
  }

  if (p.asOfDate) latestDate = p.asOfDate;

  /* --- RSI --- */
  var rsi = p.rsiEffective;
  if (p.rsi > 0) {
    if (rsi >= 55 && rsi <= 70) {
      signals.push(techSig_('rsi_bull_zone', 0.85, latestDate, 'RSI ' + rsi.toFixed(1) + ' in 55–70 zone'));
    } else if (rsi > 75) {
      signals.push(techSig_('rsi_overbought', -0.55, latestDate, 'RSI overbought ' + rsi.toFixed(1)));
    } else if (rsi < 35) {
      signals.push(techSig_('rsi_oversold', -0.35, latestDate, 'RSI oversold ' + rsi.toFixed(1)));
    } else if (rsi >= 40 && rsi < 55 && p.chgPct > 0) {
      signals.push(techSig_('rsi_recovery', 0.45, latestDate, 'RSI recovering ' + rsi.toFixed(1) + ' with positive day'));
    }
  } else {
    missing.push('TAB2_RSI');
    if (rsi > 0) {
      signals.push(techSig_('rsi_estimated', 0.25, latestDate, 'RSI estimated ' + rsi.toFixed(1) + ' from DMA/chg'));
    }
  }

  /* --- 50 / 200 DMA --- */
  if (p.vs50 > 2) {
    signals.push(techSig_('above_50dma', 0.75, latestDate, 'Price ' + p.vs50.toFixed(1) + '% above 50 DMA'));
  } else if (p.vs50 < -3) {
    signals.push(techSig_('below_50dma', -0.55, latestDate, 'Price ' + p.vs50.toFixed(1) + '% below 50 DMA'));
  }
  if (p.vs200 > 2) {
    signals.push(techSig_('above_200dma', 0.75, latestDate, 'Price ' + p.vs200.toFixed(1) + '% above 200 DMA'));
  } else if (p.vs200 < -5) {
    signals.push(techSig_('below_200dma', -0.6, latestDate, 'Price ' + p.vs200.toFixed(1) + '% below 200 DMA'));
  }
  if (p.dma50 <= 0 && p.dma200 <= 0) missing.push('TAB2_DMA');

  /* --- Price trend (stack + momentum) --- */
  if (p.trendUp) {
    signals.push(techSig_('price_trend_up', 0.85, latestDate, 'Uptrend: price above 50/200 DMA stack'));
  }
  if (p.trendDown) {
    signals.push(techSig_('price_trend_down', -0.85, latestDate, 'Downtrend: price below key DMAs'));
  }
  if (p.chgPct >= 3) {
    signals.push(techSig_('chg_strong', 0.5, latestDate, 'Day change +' + p.chgPct.toFixed(2) + '%'));
  } else if (p.chgPct <= -5) {
    signals.push(techSig_('chg_weak', -0.55, latestDate, 'Day change ' + p.chgPct.toFixed(2) + '%'));
  }

  /* --- Relative strength vs Nifty --- */
  if (ctx.niftyChgPct !== null && isFinite(p.rsVsNifty)) {
    if (p.rsVsNifty >= 2) {
      signals.push(techSig_('rs_outperform', 0.9, latestDate,
        'RS vs Nifty +' + p.rsVsNifty.toFixed(2) + 'pp (stock ' + p.chgPct.toFixed(1) + '% vs ' +
        ctx.niftyChgPct.toFixed(1) + '%)'));
    } else if (p.rsVsNifty <= -2) {
      signals.push(techSig_('rs_underperform', -0.7, latestDate,
        'RS vs Nifty ' + p.rsVsNifty.toFixed(2) + 'pp'));
    }
  } else {
    missing.push('NIFTY_BENCHMARK');
  }

  /* --- 52-week breakout --- */
  if (p.high52 > 0) {
    if (p.breakout52) {
      signals.push(techSig_('breakout_52w', 1.15, latestDate,
        'Near/above 52w high (price ' + p.price + ' vs high ' + p.high52 + ')'));
    } else if (p.price < p.high52 * 0.85) {
      signals.push(techSig_('far_below_52w', -0.35, latestDate, 'Price >15% below 52w high'));
    }
  } else {
    missing.push('TAB2_HIGH52');
  }

  /* --- Volume surge --- */
  if (p.vol > 0 && p.volAvg20 > 0) {
    var volRatio = p.vol / p.volAvg20;
    if (volRatio >= 1.5) {
      signals.push(techSig_('volume_surge', 0.65, latestDate,
        'Volume surge ' + volRatio.toFixed(2) + 'x 20d avg'));
    } else if (volRatio <= 0.6) {
      signals.push(techSig_('volume_dry', -0.3, latestDate,
        'Light volume ' + volRatio.toFixed(2) + 'x avg'));
    }
  } else if (p.vol > 0) {
    missing.push('TAB2_VOL_AVG');
  } else {
    missing.push('TAB2_VOLUME');
  }

  var rawPts = 0;
  signals.forEach(function(s) { rawPts += s.weight; });
  var score = Math.max(0, Math.min(TECHNICAL_MOMENTUM_CAP_, Math.round(rawPts)));

  return finalizeTechnicalMomentum_(signals, missing, score, ctx, latestDate,
    pickTechnicalMomentumSource_(signals, missing));
}

/**
 * @param {Array<Object>} signals
 * @param {Array<string>} missing
 * @param {number} score
 * @param {Object} ctx
 * @param {string} latestDate
 * @param {string} source
 * @return {TechnicalMomentumResult}
 */
function finalizeTechnicalMomentum_(signals, missing, score, ctx, latestDate, source) {
  var classification = classifyTechnicalMomentum_(score, signals);
  var confidence = computeTechnicalMomentumConfidence_(signals, missing, ctx);
  var rationale = buildTechnicalMomentumRationale_(signals, missing, score, classification);

  return {
    score: score,
    classification: classification,
    confidence: confidence,
    source: source,
    date: latestDate || ctx.asOf,
    rationale: rationale,
    signals: signals,
    missing: missing
  };
}

/**
 * @param {string} reason
 * @return {TechnicalMomentumResult}
 */
function emptyTechnicalMomentumResult_(reason) {
  return {
    score: 0,
    classification: 'bearish',
    confidence: 10,
    source: 'none',
    date: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    rationale: 'No technical data (' + reason + '). Run Refresh watchlist prices.',
    signals: [],
    missing: ['ALL']
  };
}

/**
 * @param {string} type
 * @param {number} weight
 * @param {string} date
 * @param {string} detail
 * @return {Object}
 */
function techSig_(type, weight, date, detail) {
  return { type: type, weight: weight, date: String(date || ''), detail: detail };
}

/**
 * @param {number} score
 * @param {Array<Object>} signals
 * @return {string} bullish|neutral|bearish
 */
function classifyTechnicalMomentum_(score, signals) {
  var pos = 0;
  var neg = 0;
  signals.forEach(function(s) {
    if (s.weight > 0.2) pos++;
    if (s.weight < -0.2) neg++;
  });

  if (score >= 4 || (score >= 3 && pos >= neg + 2)) return 'bullish';
  if (score <= 1 || (score <= 2 && neg > pos + 1)) return 'bearish';
  if (pos > neg + 1 && score >= 2) return 'bullish';
  if (neg > pos + 1 && score <= 3) return 'bearish';
  return 'neutral';
}

/**
 * @param {Array<Array>} rows
 * @return {Object}
 */
function buildTechnicalPriceBySymbol_(rows) {
  var map = {};
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    var asOf = parseSheetDate_(r.length > 15 ? r[15] : r[13]);
    var high52 = num_(r.length > 12 ? r[12] : 0);
    var volAvg = num_(r.length > 13 ? r[13] : 0);
    map[sym] = {
      price: num_(r[1]),
      chgPct: num_(r[2]),
      vol: num_(r[3]),
      dma20: num_(r[4]),
      dma50: num_(r[5]),
      dma200: num_(r[6]),
      rsi: num_(r[7]),
      vs50: num_(r[10]),
      vs200: num_(r[11]),
      high52: high52,
      volAvg20: volAvg,
      techSetup: String(r.length > 14 ? r[14] : r[12] || '').trim(),
      asOfDate: asOf ? Utilities.formatDate(asOf, 'Asia/Kolkata', 'yyyy-MM-dd') : '',
      ageDays: priceAgeDays_(asOf)
    };
  });
  return map;
}

/**
 * @param {Object} p
 * @param {number|null} niftyChg
 */
function enrichTechnicalPriceRow_(p, niftyChg) {
  p.rsiEffective = p.rsi > 0 ? p.rsi : estimateRsiFromTechnicals_(p);
  p.rsVsNifty = niftyChg !== null ? p.chgPct - niftyChg : NaN;
  p.breakout52 = p.high52 > 0 && p.price >= p.high52 * 0.99;
  p.trendUp = isPriceTrendUp_(p);
  p.trendDown = isPriceTrendDown_(p);
}

/**
 * Proxy RSI when Tab 2 rsi14 empty (DMA + day change).
 * @param {Object} p
 * @return {number}
 */
function estimateRsiFromTechnicals_(p) {
  var est = 50 + (p.vs50 || 0) * 0.85 + (p.vs200 || 0) * 0.35 + (p.chgPct || 0) * 3.5;
  if (p.price > 0 && p.dma50 > 0 && p.price > p.dma50) est += 5;
  if (p.price > 0 && p.dma200 > 0 && p.price < p.dma200) est -= 8;
  return Math.max(5, Math.min(95, est));
}

/**
 * @param {Object} p
 * @return {boolean}
 */
function isPriceTrendUp_(p) {
  if (p.price <= 0) return false;
  var stack = p.dma50 > 0 && p.dma200 > 0 && p.price > p.dma50 && p.dma50 >= p.dma200 * 0.98;
  return stack || (p.vs50 > 1 && p.vs200 > 0 && p.chgPct >= 1);
}

/**
 * @param {Object} p
 * @return {boolean}
 */
function isPriceTrendDown_(p) {
  if (p.price <= 0) return false;
  return (p.vs50 < -2 && p.chgPct < 0) ||
    (p.dma50 > 0 && p.price < p.dma50 && p.dma200 > 0 && p.price < p.dma200);
}

/**
 * @param {Object} pricesBySym
 * @param {Array<Array>} rows
 * @return {number|null}
 */
function readNiftyChgPctFromPrices_(pricesBySym, rows) {
  var i;
  for (i = 0; i < NIFTY_SYMBOL_KEYS_.length; i++) {
    var k = normalizeSymbolKey_(NIFTY_SYMBOL_KEYS_[i]);
    if (pricesBySym[k] && isFinite(pricesBySym[k].chgPct)) {
      return pricesBySym[k].chgPct;
    }
  }
  for (i = 0; i < rows.length; i++) {
    var sym = String(rows[i][0] || '').toUpperCase();
    if (sym.indexOf('NIFTY') >= 0) {
      var chg = num_(rows[i][2]);
      if (isFinite(chg)) return chg;
    }
  }
  return null;
}

/**
 * @param {Array<Object>} signals
 * @param {Array<string>} missing
 * @param {Object} ctx
 * @return {number}
 */
function computeTechnicalMomentumConfidence_(signals, missing, ctx) {
  if (!signals.length) return Math.max(10, 28 - missing.length * 4);
  var filled = 0;
  var core = 0;
  signals.forEach(function(s) {
    filled++;
    if (s.type.indexOf('rsi') >= 0 && s.type !== 'rsi_estimated') core++;
    if (s.type.indexOf('dma') >= 0 || s.type.indexOf('50') >= 0 || s.type.indexOf('200') >= 0) core++;
    if (s.type.indexOf('breakout') >= 0 || s.type.indexOf('volume') >= 0) core++;
    if (s.type.indexOf('rs_') >= 0) core++;
  });
  var base = Math.min(95, 32 + filled * 10 + core * 6);
  if (ctx.tab2Rows > 0) base += 5;
  if (missing.indexOf('TAB2_RSI') >= 0) base -= 8;
  if (missing.indexOf('NIFTY_BENCHMARK') >= 0) base -= 5;
  if (missing.indexOf('TAB2_HIGH52') >= 0 && missing.indexOf('TAB2_VOL_AVG') >= 0) base -= 10;
  if (signals.length === 1) base = Math.min(base, 40);
  return Math.max(10, Math.min(100, base));
}

/**
 * @param {Array<Object>} signals
 * @param {Array<string>} missing
 * @return {string}
 */
function pickTechnicalMomentumSource_(signals, missing) {
  if (!signals.length) {
    return missing.indexOf('TAB2_PRICE') >= 0 ? 'missing_tab2' : 'none';
  }
  var priority = ['breakout_52w', 'rs_outperform', 'price_trend_up', 'above_50dma', 'above_200dma',
    'rsi_bull_zone', 'volume_surge', 'price_trend_down', 'below_50dma', 'rsi_overbought'];
  var i;
  for (i = 0; i < priority.length; i++) {
    var j;
    for (j = 0; j < signals.length; j++) {
      if (signals[j].type === priority[i]) return 'tab2_technicals';
    }
  }
  return 'tab2_composite';
}

/**
 * @param {Array<Object>} signals
 * @param {Array<string>} missing
 * @param {number} score
 * @param {string} classification
 * @return {string}
 */
function buildTechnicalMomentumRationale_(signals, missing, score, classification) {
  if (!signals.length) {
    return 'No technical momentum signals. ' +
      (missing.length ? 'Missing: ' + missing.slice(0, 4).join(', ') + '. ' : '') +
      'Refresh Tab 2 prices (RSI, DMAs, 52w high, volume).';
  }
  var sorted = signals.slice().sort(function(a, b) {
    return Math.abs(b.weight) - Math.abs(a.weight);
  });
  var parts = sorted.slice(0, 4).map(function(s) { return s.detail; });
  return classification.charAt(0).toUpperCase() + classification.slice(1) +
    ' technical setup (I=' + score + '/5). ' + parts.join('; ') + '.';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @return {number}
 */
function techMomRowCount_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getLastRow() - 1;
}

/**
 * Menu — preview technicalMomentumScore for watchlist symbols.
 */
function previewTechnicalMomentumScores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = buildTechnicalMomentumContext_(ss);
  var syms = collectWatchlistSymbols_(ss).slice(0, 8);
  var lines = ['Technical momentum preview (Engine)'];
  syms.forEach(function(sym) {
    var r = technicalMomentumScore(sym, ctx);
    lines.push(sym + ': I=' + r.score + ' [' + r.classification + '] conf=' + r.confidence +
      '% ' + r.source + ' — ' + r.rationale);
  });
  SpreadsheetApp.getUi().alert(lines.join('\n\n').substring(0, 1800));
}
