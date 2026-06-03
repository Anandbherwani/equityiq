/**
 * Alpha Engine — likelihood of outperforming Nifty (0–100).
 * See docs/ALPHA_ENGINE.md
 *
 * Factors: fundamentals, growth, valuation, sector, momentum, institutional, news.
 */

var ALPHA_SCORE_MAX_ = 100;

var ALPHA_FACTOR_WEIGHTS_ = {
  fundamentals: 0.22,
  growth: 0.14,
  valuation: 0.12,
  sector_strength: 0.12,
  momentum: 0.18,
  institutional_flow: 0.12,
  news: 0.10
};

var ALPHA_CLASS_STRONG_BUY_ = 'Strong Buy';
var ALPHA_CLASS_BUY_ = 'Buy';
var ALPHA_CLASS_WATCH_ = 'Watch';
var ALPHA_CLASS_AVOID_ = 'Avoid';

/**
 * @typedef {Object} AlphaScoreResult
 * @property {number} alpha_score 0–100
 * @property {string} classification Strong Buy|Buy|Watch|Avoid
 * @property {Object} factors 0–100 per factor
 * @property {number} confidence 0–100
 * @property {string} rationale
 * @property {Array<string>} missing
 */

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildAlphaContext_(ss) {
  var fundamentals = buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS'));
  var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
  var universeBySym = buildUniverseBySymbol_(loadSheetData_(ss, '1. UNIVERSE'));
  var sectorLookup = buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH'));
  var rowBySym = {};

  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (scoreSheet && scoreSheet.getLastRow() >= 2) {
    var numRows = scoreSheet.getLastRow() - 1;
    var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 43;
    var data = scoreSheet.getRange(2, 1, numRows, cols).getValues();
    data.forEach(function(r) {
      var sym = normalizeSymbolKey_(r[0]);
      if (!sym) return;
      rowBySym[sym] = buildScoringCandidate_(r, universeBySym);
    });
  }

  var techCtx = typeof buildTechnicalMomentumContext_ === 'function' ?
    buildTechnicalMomentumContext_(ss) : null;
  var instCtx = typeof buildInstitutionalFlowContext_ === 'function' ?
    buildInstitutionalFlowContext_(ss) : null;

  return {
    asOf: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    fundamentals: fundamentals,
    prices: prices,
    universeBySym: universeBySym,
    sectorLookup: sectorLookup,
    rowBySym: rowBySym,
    techCtx: techCtx,
    instCtx: instCtx
  };
}

/**
 * Primary API — alpha score vs Nifty benchmark thesis.
 * @param {string} symbol
 * @param {Object=} ctx from buildAlphaContext_(ss)
 * @return {AlphaScoreResult}
 */
function alphaScore(symbol, ctx) {
  var sym = normalizeSymbolKey_(symbol);
  if (!sym) {
    return emptyAlphaResult_('invalid_symbol');
  }
  if (!ctx) {
    ctx = buildAlphaContext_(SpreadsheetApp.getActiveSpreadsheet());
  }

  var c = ctx.rowBySym[sym];
  if (!c) {
    c = buildAlphaCandidateFromParts_(sym, ctx);
  }

  if (c.excluded) {
    return {
      alpha_score: 0,
      classification: ALPHA_CLASS_AVOID_,
      factors: {},
      confidence: 10,
      rationale: 'Excluded from watchlist — alpha not computed.',
      missing: ['EXCLUDED']
    };
  }

  var missing = [];
  var factors = {
    fundamentals: scoreAlphaFundamentals_(c, missing),
    growth: scoreAlphaGrowth_(c, missing),
    valuation: scoreAlphaValuation_(c, missing),
    sector_strength: scoreAlphaSector_(c, ctx, missing),
    momentum: scoreAlphaMomentum_(sym, c, ctx, missing),
    institutional_flow: scoreAlphaInstitutional_(sym, c, ctx, missing),
    news: scoreAlphaNews_(c, missing)
  };

  var raw = 0;
  Object.keys(ALPHA_FACTOR_WEIGHTS_).forEach(function(key) {
    raw += (factors[key] || 0) * ALPHA_FACTOR_WEIGHTS_[key];
  });

  var alpha_score = Math.max(0, Math.min(ALPHA_SCORE_MAX_, Math.round(raw)));
  var penalties = computeAlphaPenalties_(c, ctx, sym);
  alpha_score = Math.max(0, Math.min(ALPHA_SCORE_MAX_, alpha_score - penalties.total));

  var classification = classifyAlpha_(alpha_score, factors, c, penalties);
  var confidence = computeAlphaConfidence_(factors, missing, c, ctx);
  var rationale = buildAlphaRationale_(alpha_score, classification, factors, penalties, c);

  return {
    alpha_score: alpha_score,
    classification: classification,
    factors: factors,
    confidence: confidence,
    rationale: rationale,
    missing: missing
  };
}

/**
 * @param {string} sym
 * @param {Object} ctx
 * @return {Object}
 */
function buildAlphaCandidateFromParts_(sym, ctx) {
  var u = ctx.universeBySym[sym] || {};
  return {
    symbol: sym,
    fundamentals: 0,
    valuation: 0,
    growth: 0,
    financialStrength: 0,
    sectorStrength: 0,
    newsEvents: 0,
    technicalMomentum: 0,
    institutional: 0,
    businessMoat: 0,
    conviction: 0,
    sectorRank: 0,
    pumpFlag: false,
    excluded: false,
    dataGateFlag: false,
    dataQualityPct: 0,
    sectorKey: u.sectorKey || ''
  };
}

/**
 * Fundamentals = quality (C) + financial strength (F) + moat (K).
 * @param {Object} c
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreAlphaFundamentals_(c, missing) {
  var cPts = num_(c.fundamentals);
  var fPts = num_(c.financialStrength);
  var kPts = num_(c.businessMoat);
  if (cPts <= 0 && fPts <= 0) missing.push('TAB10_FUNDAMENTALS');
  var score = (cPts / 15) * 40 + (fPts / 15) * 40 + (kPts / 10) * 20;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * @param {Object} c
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreAlphaGrowth_(c, missing) {
  var g = num_(c.growth);
  if (g <= 0) missing.push('TAB10_GROWTH');
  return Math.max(0, Math.min(100, Math.round((g / 15) * 100)));
}

/**
 * Valuation pillar — higher Tab 10 D = better risk/reward in engine.
 * @param {Object} c
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreAlphaValuation_(c, missing) {
  var v = num_(c.valuation);
  if (v <= 0) missing.push('TAB10_VALUATION');
  return Math.max(0, Math.min(100, Math.round((v / 15) * 100)));
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreAlphaSector_(c, ctx, missing) {
  var g = num_(c.sectorStrength);
  var score = Math.round((g / 10) * 100);
  if (num_(c.sectorRank) > 0 && num_(c.sectorRank) <= 5) {
    score = Math.min(100, score + 15);
  } else if (num_(c.sectorRank) > 0 && num_(c.sectorRank) <= 10) {
    score = Math.min(100, score + 8);
  }
  if (c.sectorKey && ctx.sectorLookup && ctx.sectorLookup[c.sectorKey]) {
    score = Math.min(100, score + 5);
  } else if (c.sectorKey) {
    missing.push('TAB19_SECTOR_JOIN');
  }
  if (g <= 0 && !c.sectorKey) missing.push('TAB10_SECTOR');
  return Math.max(0, Math.min(100, score));
}

/**
 * @param {string} sym
 * @param {Object} c
 * @param {Object} ctx
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreAlphaMomentum_(sym, c, ctx, missing) {
  var score = 0;
  if (typeof technicalMomentumScore === 'function' && ctx.techCtx) {
    var t = technicalMomentumScore(sym, ctx.techCtx);
    score = Math.round((t.score / 5) * 70);
    if (t.classification === 'bullish') score = Math.min(100, score + 20);
    else if (t.classification === 'bearish') score = Math.max(0, score - 25);
    var p = ctx.techCtx.pricesBySym[sym];
    if (p && isFinite(p.rsVsNifty)) {
      if (p.rsVsNifty >= 2) score = Math.min(100, score + 15);
      else if (p.rsVsNifty <= -2) score = Math.max(0, score - 12);
    }
    return Math.max(0, Math.min(100, score));
  }
  var i = num_(c.technicalMomentum);
  if (i <= 0) missing.push('TAB10_MOMENTUM');
  return Math.max(0, Math.min(100, Math.round((i / 5) * 100)));
}

/**
 * @param {string} sym
 * @param {Object} c
 * @param {Object} ctx
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreAlphaInstitutional_(sym, c, ctx, missing) {
  if (typeof institutionalFlowScore === 'function' && ctx.instCtx) {
    var inst = institutionalFlowScore(sym, ctx.instCtx);
    var score = Math.round((inst.score / 5) * 100);
    if (inst.confidence < 35) missing.push('INST_LOW_CONF');
    return Math.max(0, Math.min(100, score));
  }
  var j = num_(c.institutional);
  if (j <= 0) missing.push('TAB10_INSTITUTIONAL');
  if (c.promoterBuy) return Math.min(100, Math.round((j / 5) * 100) + 15);
  return Math.max(0, Math.min(100, Math.round((j / 5) * 100)));
}

/**
 * @param {Object} c
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreAlphaNews_(c, missing) {
  var h = num_(c.newsEvents);
  var score = Math.round((h / 10) * 100);
  if (num_(c.orderbookSignals) > 0) score = Math.min(100, score + 10);
  if (num_(c.filingsSignals) > 0) score = Math.min(100, score + 5);
  if (h <= 0 && num_(c.orderbookSignals) <= 0) missing.push('TAB10_NEWS');
  if (typeof isNewsOnlyRecommendation_ === 'function' && isNewsOnlyRecommendation_(c)) {
    score = Math.max(0, Math.round(score * 0.5));
    missing.push('NEWS_ONLY_PENALTY');
  }
  return Math.max(0, Math.min(100, score));
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @param {string} sym
 * @return {{total:number, notes:Array<string>}}
 */
function computeAlphaPenalties_(c, ctx, sym) {
  var total = 0;
  var notes = [];
  if (c.pumpFlag) {
    total += 18;
    notes.push('pump_flag');
  }
  if (!c.dataGateFlag) {
    total += 8;
    notes.push('no_data_gate');
  }
  var dq = num_(c.dataQualityPct);
  if (dq > 0 && dq < 60) {
    total += 12;
    notes.push('low_dq');
  }
  if (ctx.techCtx && ctx.techCtx.pricesBySym[sym]) {
    var p = ctx.techCtx.pricesBySym[sym];
    if (p.rsVsNifty <= -4) {
      total += 8;
      notes.push('rs_vs_nifty_weak');
    }
  }
  return { total: total, notes: notes };
}

/**
 * @param {number} score
 * @param {Object} factors
 * @param {Object} c
 * @param {Object} penalties
 * @return {string}
 */
function classifyAlpha_(score, factors, c, penalties) {
  if (c.pumpFlag || score < 25) return ALPHA_CLASS_AVOID_;
  if (score >= 78 && factors.momentum >= 55 && factors.fundamentals >= 50) {
    return ALPHA_CLASS_STRONG_BUY_;
  }
  if (score >= 62) return ALPHA_CLASS_BUY_;
  if (score >= 42) return ALPHA_CLASS_WATCH_;
  return ALPHA_CLASS_AVOID_;
}

/**
 * @param {Object} factors
 * @param {Array<string>} missing
 * @param {Object} c
 * @param {Object} ctx
 * @return {number}
 */
function computeAlphaConfidence_(factors, missing, c, ctx) {
  var filled = 0;
  Object.keys(factors).forEach(function(k) {
    if (factors[k] > 0) filled++;
  });
  var base = Math.min(95, 28 + filled * 9);
  if (num_(c.dataQualityPct) >= 60) base += 8;
  if (num_(c.conviction) >= 25) base += 5;
  if (ctx.techCtx && ctx.techCtx.tab2Rows > 0) base += 3;
  if (missing.length > 4) base -= 15;
  if (missing.indexOf('NEWS_ONLY_PENALTY') >= 0) base -= 10;
  return Math.max(10, Math.min(100, base));
}

/**
 * @param {number} score
 * @param {string} classification
 * @param {Object} factors
 * @param {Object} penalties
 * @param {Object} c
 * @return {string}
 */
function buildAlphaRationale_(score, classification, factors, penalties, c) {
  var tops = Object.keys(factors).sort(function(a, b) {
    return factors[b] - factors[a];
  }).slice(0, 3).map(function(k) {
    return k.replace(/_/g, ' ') + ' ' + factors[k];
  });
  var tail = 'Alpha ' + score + '/100 vs Nifty — ' + classification + '. Top: ' + tops.join(', ') + '.';
  if (penalties.notes.length) tail += ' Penalties: ' + penalties.notes.join(', ') + '.';
  if (num_(c.conviction) > 0) tail += ' Conviction M=' + num_(c.conviction) + '.';
  return tail;
}

/**
 * @param {string} reason
 * @return {AlphaScoreResult}
 */
function emptyAlphaResult_(reason) {
  return {
    alpha_score: 0,
    classification: ALPHA_CLASS_AVOID_,
    factors: {},
    confidence: 10,
    rationale: 'Alpha unavailable (' + reason + ')',
    missing: ['ALL']
  };
}

/**
 * Write alpha_score + alpha_classification to Tab 10 rows.
 * @param {Array<Array>} data
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function applyAlphaScoresBatch_(data, ss) {
  if (typeof USE_CONVICTION_ENGINE_3_ !== 'undefined' && USE_CONVICTION_ENGINE_3_) return;
  if (typeof alphaScore !== 'function') return;
  var ctx = buildAlphaContext_(ss);
  ctx.rowBySym = {};
  var universeBySym = ctx.universeBySym;
  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;
    var c = buildScoringCandidate_(data[i], universeBySym);
    ctx.rowBySym[sym] = c;
    var a = alphaScore(sym, ctx);
    data[i][43] = a.alpha_score;
    data[i][44] = a.classification;
  }
}

/**
 * Menu — preview alpha for watchlist symbols.
 */
function previewAlphaScores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = buildAlphaContext_(ss);
  var syms = collectWatchlistSymbols_(ss).slice(0, 8);
  var lines = ['Alpha engine preview (vs Nifty)'];
  syms.forEach(function(sym) {
    var r = alphaScore(sym, ctx);
    lines.push(sym + ': alpha=' + r.alpha_score + ' [' + r.classification + '] conf=' +
      r.confidence + '% — ' + r.rationale.substring(0, 120));
  });
  SpreadsheetApp.getUi().alert(lines.join('\n\n').substring(0, 1800));
}
