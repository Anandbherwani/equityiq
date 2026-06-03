/**
 * Quality pillar auto-scoring — increases Tab 10 conviction coverage across UNIVERSE.
 * Paste alongside Code.gs. See shared/scoring/QUALITY_PILLARS.md
 *
 * User pillar labels → Tab 10 columns (Engine 2.1):
 *   Business Moat (E*)     → K business_moat (0–10) + C fundamentals quality (0–15)
 *   Financial Strength (G*)→ F financial_strength (0–15)
 *   Valuation (H*)         → D valuation (0–15)
 *   Price Momentum (I)     → I technical_momentum (0–5)
 *   Institutional Flow (L*)→ J institutional_flow (0–5)
 * (* = legacy letter labels in docs; not Excel column E/G/H/L)
 */

/** @type {Object} */
var PILLAR_CAP = {
  fundamentals_quality: 15,
  business_moat: 10,
  valuation: 15,
  financial_strength: 15,
  technical_momentum: 5,
  institutional_flow: 5
};

/**
 * Apply all five pillars to one Tab 10 row (always runs — uses fallbacks when Tab 6 empty).
 * @param {Array} row Tab 10 row (mutated)
 * @param {Object} ctx
 * @param {Object|null} ctx.f Tab 6
 * @param {Object|null} ctx.p Tab 2
 * @param {Object|null} ctx.u Tab 1 universe
 * @param {Object|null} ctx.techCtx from buildTechnicalMomentumContext_
 * @param {Object|null} ctx.instFlowCtx from buildInstitutionalFlowContext_
 * @param {Object|null} ctx.bulk legacy Tab 4 aggregate
 * @param {number} ctx.fiiBias Tab 8 legacy
 * @param {Object} ctx.instExtra legacy
 * @param {string} ctx.capSegment
 * @return {Object} pillarMeta for missing_data_flags
 */
function applyFivePillarScoresToRow_(row, ctx) {
  ctx = ctx || {};
  var sym = normalizeSymbolKey_(row[0]);
  var staleMult = ctx.f ? fundamentalsStalenessMultiplier_(ctx.f) : 1;

  var moat = scoreBusinessMoatComponent_(ctx.f, ctx.u, ctx.capSegment, staleMult);
  var fin = scoreFinancialStrengthComponent_(ctx.f, ctx.u, staleMult);
  var val = scoreValuationComponent_(ctx.f, ctx.p, ctx.u, staleMult);
  var tech = scoreTechnicalMomentumComponent_(ctx.techCtx, ctx.p, ctx.u, sym);
  var inst = scoreInstitutionalFlowComponent_(ctx.instFlowCtx, ctx.bulk, ctx.fiiBias, ctx.f, ctx.u, ctx.instExtra, sym);

  var quality = 0;
  if (ctx.f && staleMult > 0) {
    quality = Math.round(scoreFundamentalsQualityOnly_(ctx.f, ctx.capSegment) * staleMult);
  } else if (ctx.u) {
    quality = scoreFundamentalsQualityUniverseFallback_(ctx.u, ctx.capSegment);
  }

  row[2] = Math.max(num_(row[2]), Math.min(PILLAR_CAP.fundamentals_quality, quality));
  row[10] = Math.max(num_(row[10]), moat.score);
  row[3] = Math.max(num_(row[3]), val.score);
  row[5] = Math.max(num_(row[5]), fin.score);
  row[8] = Math.max(num_(row[8]), tech.score);
  row[9] = Math.max(num_(row[9]), inst.score);

  var avgConf = Math.round((moat.confidence + fin.confidence + val.confidence + tech.confidence + inst.confidence) / 5);
  row[11] = Math.max(num_(row[11]), avgConf);

  return {
    moat: moat,
    financial: fin,
    valuation: val,
    technical: tech,
    institutional: inst,
    fundamentals_quality: quality,
    pillar_confidence_avg: avgConf
  };
}

/**
 * C quality slice (0–15) — ROCE/ROE/margin/promoter (moat in K).
 * @param {Object} f
 * @param {string} capSegment
 * @return {number}
 */
function scoreFundamentalsQualityOnly_(f, capSegment) {
  var pts = 0;
  if (f.roce >= 25) pts += 5;
  else if (f.roce >= 18) pts += 3;
  else if (f.roce >= 12) pts += 2;
  if (f.roe >= 20) pts += 3;
  else if (f.roe >= 15) pts += 2;
  if (f.ebitdaMargin >= 20) pts += 3;
  else if (f.ebitdaMargin >= 12) pts += 1;
  if (f.promoterHolding >= 50) pts += 2;
  if (capSegment === 'large') pts += 1;
  return Math.min(PILLAR_CAP.fundamentals_quality, pts);
}

/**
 * K — Business moat (0–10).
 * Sources: Tab 6 (ROCE, ROE, margin, promoter, FII, earnings note), Tab 1 (cap, pledge, SME).
 * @return {{score:number, confidence:number, source:string, missing:Array<string>, formula:string}}
 */
function scoreBusinessMoatComponent_(f, u, capSegment, staleMult) {
  staleMult = staleMult > 0 ? staleMult : 0;
  var missing = [];
  var pts = 0;
  var source = 'universe_fallback';
  var fields = 0;
  var filled = 0;

  if (f && staleMult > 0) {
    source = 'tab6_fundamentals';
    if (f.roce >= 20) { pts += 3; filled++; }
    else if (f.roce >= 15) { pts += 2; filled++; }
    fields++;
    if (f.roe >= 18) { pts += 2; filled++; }
    fields++;
    if (f.ebitdaMargin >= 18) { pts += 2; filled++; }
    fields++;
    if (f.promoterHolding >= 55) { pts += 2; filled++; }
    fields++;
    if (f.fiiHolding >= 10 && f.fiiHolding <= 40) { pts += 1; filled++; }
    fields++;
    var note = String(f.earningsQualityNote || f.fcfTrend || '').toLowerCase();
    if (note.indexOf('leader') >= 0 || note.indexOf('monopoly') >= 0 || note.indexOf('dominant') >= 0) {
      pts += 2;
      filled++;
    }
    fields++;
    if (!f.roce && f.roe <= 0) missing.push('TAB6_ROCE_ROE');
  } else {
    pts = scoreMoatUniverseFallback_(u, capSegment);
    missing.push('TAB6_ROW');
    if (!u) missing.push('UNIVERSE_ROW');
  }

  if (u) {
    if (num_(u.pledgePct) > 0 && num_(u.pledgePct) < 15) pts += 1;
    if (u.isSme === true || u.isSme === 'TRUE') pts = Math.max(0, pts - 2);
    if (capSegment === 'large') pts += 1;
  }

  var score = Math.min(PILLAR_CAP.business_moat, Math.round(pts * (f ? staleMult : 0.65)));
  var confidence = computePillarConfidence_(filled, fields, source, missing.length);

  return {
    score: score,
    confidence: confidence,
    source: source,
    missing: missing,
    formula: 'moat=min(10, ROCE_tier+ROE_tier+margin+promoter+FII_band+note_keywords+universe_pledge_cap); conf=fields/available'
  };
}

function scoreMoatUniverseFallback_(u, capSegment) {
  if (!u) return 2;
  var pts = 2;
  if (capSegment === 'large') pts += 3;
  else if (capSegment === 'mid') pts += 2;
  else pts += 1;
  if (num_(u.pledgePct) > 0 && num_(u.pledgePct) < 20) pts += 1;
  if (num_(u.pledgePct) >= 50) pts -= 2;
  return Math.min(PILLAR_CAP.business_moat, pts);
}

function scoreFundamentalsQualityUniverseFallback_(u, capSegment) {
  return Math.min(PILLAR_CAP.fundamentals_quality, scoreMoatUniverseFallback_(u, capSegment));
}

/**
 * F — Financial strength (0–15).
 * Sources: Tab 6 D/E, current ratio, FCF, dividend; Tab 1 pledge.
 */
function scoreFinancialStrengthComponent_(f, u, staleMult) {
  staleMult = staleMult > 0 ? staleMult : 0;
  var missing = [];
  var source = 'universe_fallback';
  var filled = 0;
  var fields = 5;
  var pts = 0;

  if (f && staleMult > 0) {
    source = 'tab6_fundamentals';
    pts = scoreFinancialStrengthFromFundamentals_(f);
    if (f.debtEquity > 0) filled++;
    if (f.currentRatio > 0) filled++;
    if (f.fcfTrend) filled++;
  } else {
    pts = 3;
    missing.push('TAB6_ROW');
    if (u && num_(u.pledgePct) > 0) {
      if (num_(u.pledgePct) < 25) pts += 4;
      else if (num_(u.pledgePct) < 50) pts += 2;
      else pts += 0;
      filled++;
    }
  }

  var score = Math.min(PILLAR_CAP.financial_strength, Math.round(pts * (f && staleMult > 0 ? 1 : 0.7)));
  return {
    score: score,
    confidence: computePillarConfidence_(filled, fields, source, missing.length),
    source: source,
    missing: missing,
    formula: 'F=min(15, debt_equity_tier+current_ratio+fcf_trend+dividend OR pledge_fallback)'
  };
}

/**
 * D — Valuation (0–15).
 * Sources: Tab 6 tags/PE/PB; fallback Tab 2 chg_pct moderation + cap segment.
 */
function scoreValuationComponent_(f, p, u, staleMult) {
  staleMult = staleMult > 0 ? staleMult : 0;
  var missing = [];
  var source = 'baseline_neutral';
  var filled = 0;
  var fields = 4;
  var pts = 5;

  if (f && staleMult > 0) {
    source = 'tab6_fundamentals';
    pts = scoreValuationFromFundamentals_(f);
    if (f.pe > 0) filled++;
    if (f.pb > 0) filled++;
    if (f.valuationTag) filled++;
    if (f.peVs3y > 0) filled++;
  } else if (p && p.chgPct !== 0) {
    source = 'tab2_price_momentum_proxy';
    if (p.chgPct >= -2 && p.chgPct <= 8) pts += 2;
    else if (p.chgPct < -15) pts -= 2;
    missing.push('TAB6_VALUATION');
    filled++;
  } else {
    missing.push('TAB6_ROW', 'TAB2_PRICE');
    if (u && u.marketCapBucket === 'large_cap') pts += 1;
  }

  var score = Math.min(PILLAR_CAP.valuation, Math.max(0, pts));
  return {
    score: score,
    confidence: computePillarConfidence_(filled, fields, source, missing.length),
    source: source,
    missing: missing,
    formula: 'D=valuation_tag+pe_vs_3y+pe+pb OR price_chg_proxy OR neutral_base_5'
  };
}

/**
 * I — Technical momentum (0–5) via technicalMomentumScore().
 */
function scoreTechnicalMomentumComponent_(techCtx, p, u, symbol) {
  var flow;
  if (typeof technicalMomentumScore === 'function') {
    flow = technicalMomentumScore(symbol, techCtx);
  } else if (p && p.price > 0) {
    flow = {
      score: scoreTechnicalMomentum_(p),
      classification: 'neutral',
      confidence: 40,
      source: 'legacy',
      date: '',
      rationale: 'TechnicalMomentumEngine.gs not loaded',
      missing: ['ENGINE'],
      signals: []
    };
  } else {
    var baseline = 2;
    var miss = ['TAB2_PRICE'];
    var src = 'universe_baseline';
    if (u && u.liquidityFlag === true) baseline += 1;
    flow = {
      score: Math.min(PILLAR_CAP.technical_momentum, baseline),
      classification: baseline >= 3 ? 'neutral' : 'bearish',
      confidence: 25,
      source: src,
      date: '',
      rationale: 'No Tab 2 price; universe baseline only',
      missing: miss,
      signals: []
    };
  }

  return {
    score: Math.min(PILLAR_CAP.technical_momentum, flow.score),
    confidence: flow.confidence,
    source: flow.source,
    missing: flow.missing || [],
    formula: 'technicalMomentumScore',
    rationale: flow.rationale,
    classification: flow.classification,
    as_of_date: flow.date,
    signals: flow.signals
  };
}

/**
 * J — Institutional flow (0–5) via institutionalFlowScore().
 */
function scoreInstitutionalFlowComponent_(instFlowCtx, bulk, fiiBias, f, u, instExtra, symbol) {
  var flow;
  if (typeof institutionalFlowScore === 'function') {
    flow = institutionalFlowScore(symbol, instFlowCtx);
  } else {
    flow = {
      score: scoreInstitutionalFlow_(bulk, fiiBias),
      confidence: 25,
      source: 'legacy',
      date: '',
      rationale: 'InstitutionalFlowEngine.gs not loaded',
      missing: ['ENGINE'],
      signals: []
    };
  }

  return {
    score: Math.min(PILLAR_CAP.institutional_flow, flow.score),
    confidence: flow.confidence,
    source: flow.source,
    missing: flow.missing || [],
    formula: 'institutionalFlowScore',
    rationale: flow.rationale,
    as_of_date: flow.date,
    signals: flow.signals
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object} sym -> {promoterBuy, revisionUp}
 */
function buildInstitutionalExtraBySymbol_(ss) {
  var out = {};
  var cutoffP = new Date();
  cutoffP.setDate(cutoffP.getDate() - 90);
  var cutoffA = new Date();
  cutoffA.setDate(cutoffA.getDate() - 60);

  loadSheetData_(ss, '18. PROMOTER ACTIVITY').forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d || d < cutoffP) return;
    var tx = String(r[5] || '').toLowerCase();
    if (tx.indexOf('buy') >= 0 || tx.indexOf('acq') >= 0) {
      if (!out[sym]) out[sym] = { promoterBuy: false, revisionUp: 0 };
      out[sym].promoterBuy = true;
    }
  });

  loadSheetData_(ss, '17. ANALYST REVISIONS').forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d || d < cutoffA) return;
    var oldR = String(r[3] || '').toLowerCase();
    var newR = String(r[4] || '').toLowerCase();
    if (ratingUpgrade_(oldR, newR) || num_(r[7]) > num_(r[6])) {
      if (!out[sym]) out[sym] = { promoterBuy: false, revisionUp: 0 };
      out[sym].revisionUp++;
    }
  });
  return out;
}

/**
 * @param {string} oldR
 * @param {string} newR
 * @return {boolean}
 */
function ratingUpgrade_(oldR, newR) {
  var ranks = { sell: 1, under: 2, hold: 3, neutral: 3, buy: 4, outperform: 5 };
  var o = 0;
  var n = 0;
  Object.keys(ranks).forEach(function(k) {
    if (oldR.indexOf(k) >= 0) o = Math.max(o, ranks[k]);
    if (newR.indexOf(k) >= 0) n = Math.max(n, ranks[k]);
  });
  return n > o && n > 0;
}

/**
 * @param {number} filled
 * @param {number} fields
 * @param {string} source
 * @param {number} missingCount
 * @return {number} 0–100
 */
function computePillarConfidence_(filled, fields, source, missingCount) {
  var base = fields > 0 ? Math.round((filled / fields) * 100) : 25;
  if (source === 'tab6_fundamentals' || source === 'tab4_bulk_deals') base = Math.min(100, base + 15);
  if (source === 'tab2_price_technicals') base = Math.min(100, base + 10);
  if (source.indexOf('fallback') >= 0 || source === 'universe_baseline' || source === 'baseline_neutral') {
    base = Math.min(base, 45);
  }
  base -= missingCount * 5;
  return Math.max(10, Math.min(100, base));
}

/**
 * Serialize pillar meta into Tab 10 missing_data_flags suffix.
 * @param {Object} meta
 * @return {string}
 */
function formatPillarMetaFlags_(meta) {
  if (!meta) return '';
  var parts = ['PILLARS'];
  ['moat', 'financial', 'valuation', 'technical', 'institutional'].forEach(function(key) {
    var p = meta[key];
    if (!p) return;
    var extra = '';
    if ((key === 'institutional' || key === 'technical') && p.rationale) {
      extra = ':' + String(p.rationale).substring(0, 36);
    }
    if (key === 'technical' && p.classification) {
      extra = '[' + p.classification + ']' + extra;
    }
    parts.push(key.charAt(0) + '=' + p.score + '@' + p.confidence + '%' + p.source + extra);
  });
  return parts.join('|');
}

/**
 * Batch-apply five pillars to all Tab 10 rows.
 * @param {Array<Array>} data
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} fundamentals map
 * @param {Object} prices map
 * @param {Object} universeBySym map
 * @param {Object} techCtx
 * @param {Object} instFlowCtx
 * @param {Object} bulkBias legacy
 * @param {number} fiiBias legacy
 */
function applyFivePillarScoresBatch_(data, ss, fundamentals, prices, universeBySym, techCtx, instFlowCtx, bulkBias, fiiBias) {
  if (!techCtx && typeof buildTechnicalMomentumContext_ === 'function') {
    techCtx = buildTechnicalMomentumContext_(ss);
  }
  if (!instFlowCtx && typeof buildInstitutionalFlowContext_ === 'function') {
    instFlowCtx = buildInstitutionalFlowContext_(ss);
  }
  var capBySym = {};
  loadSheetData_(ss, '1. UNIVERSE').forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (sym) capBySym[sym] = String(r[6] || '').toLowerCase();
  });

  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;
    var meta = applyFivePillarScoresToRow_(data[i], {
      f: fundamentals[sym] || null,
      p: prices[sym] || null,
      u: universeBySym[sym] || null,
      techCtx: techCtx,
      instFlowCtx: instFlowCtx,
      bulk: bulkBias ? bulkBias[sym] : null,
      fiiBias: fiiBias,
      instExtra: null,
      capSegment: capBySym[sym] || ''
    });
    var existing = String(data[i][38] || '').trim();
    var pillarStr = formatPillarMetaFlags_(meta);
    data[i][38] = existing ? (existing + ';' + pillarStr) : pillarStr;
  }
}
