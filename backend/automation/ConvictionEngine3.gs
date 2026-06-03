/**
 * Tiered Investment Framework (Conviction Engine 3.1) — five-stage funnel, not additive C–J.
 *
 * Stage 1: Reject bad businesses
 * Stage 2: Find quality businesses → quality_score
 * Stage 3: Undervalued quality → valuation_score
 * Stage 4: Catalysts → catalyst_score
 * Stage 5: Rank opportunities → opportunity_rank (= conviction_total M)
 *
 * alpha_score is hierarchical (quality×valuation timing), not legacy weighted sum.
 * Final rank uses geometric blend + bottleneck — see docs/CONVICTION_METHODOLOGY.md
 */

var USE_CONVICTION_ENGINE_3_ = true;
var CONVICTION_ENGINE_VERSION_ = '3.1';

var CE3_STAGE_REJECTED_ = 'REJECTED';
var CE3_STAGE_QUALITY_ = 'QUALITY';
var CE3_STAGE_VALUATION_ = 'VALUATION';
var CE3_STAGE_CATALYST_ = 'CATALYST';
var CE3_STAGE_RANKED_ = 'RANKED';

var CE3_COL_QUALITY_ = 45;
var CE3_COL_VALUATION_ = 46;
var CE3_COL_CATALYST_ = 47;
var CE3_COL_STAGE_ = 48;
var CE3_COL_OPPORTUNITY_ = 49;

var CE3_MIN_QUALITY_FOR_VALUATION_ = 50;
var CE3_MIN_QUALITY_FOR_CATALYST_ = 40;
var CE3_MIN_QUALITY_PASS_ = 35;

/**
 * @typedef {Object} ConvictionEngine3Result
 * @property {number} quality_score 0–100
 * @property {number} valuation_score 0–100
 * @property {number} catalyst_score 0–100
 * @property {number} alpha_score 0–100 hierarchical
 * @property {string} alpha_classification
 * @property {number} opportunity_rank 0–100 L5
 * @property {string} stage REJECTED|QUALITY|VALUATION|CATALYST|RANKED
 * @property {number} investment_stage 1–5 (maps to stages above)
 * @property {number} additive_pillar_sum C–K sum for transparency only (not M)
 * @property {Array<string>} reject_reasons
 * @property {string} why_now
 * @property {string} why_stock
 * @property {string} why_peers
 * @property {string} rationale
 */

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildConvictionEngine3Context_(ss) {
  var fundamentals = buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS'));
  var universeBySym = buildUniverseBySymbol_(loadSheetData_(ss, '1. UNIVERSE'));
  var sectorLookup = buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH'));
  var instCtx = typeof buildInstitutionalFlowContext_ === 'function' ?
    buildInstitutionalFlowContext_(ss) : null;
  var techCtx = typeof buildTechnicalMomentumContext_ === 'function' ?
    buildTechnicalMomentumContext_(ss) : null;
  return {
    asOf: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    fundamentals: fundamentals,
    universeBySym: universeBySym,
    sectorLookup: sectorLookup,
    instCtx: instCtx,
    techCtx: techCtx,
    sectorPeerStats: {}
  };
}

/**
 * Compute sector median pillar scores for peer comparison (L5 narratives).
 * @param {Array<Array>} data Tab 10 rows
 * @param {Object} universeBySym
 * @return {Object}
 */
function buildSectorPeerStats_(data, universeBySym) {
  var bySector = {};
  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    var u = universeBySym[sym] || {};
    var sk = u.sectorKey || normalizeSectorName_(u.sectorRaw || r[1] || '');
    if (!sk) return;
    if (!bySector[sk]) {
      bySector[sk] = { count: 0, fund: [], val: [], growth: [], conv: [] };
    }
    bySector[sk].count++;
    bySector[sk].fund.push(num_(r[2]) + num_(r[5]) + num_(r[10]));
    bySector[sk].val.push(num_(r[3]));
    bySector[sk].growth.push(num_(r[4]));
    bySector[sk].conv.push(num_(r[12]));
  });
  var out = {};
  Object.keys(bySector).forEach(function(sk) {
    var b = bySector[sk];
    out[sk] = {
      count: b.count,
      medianCore: median_(b.fund),
      medianValuation: median_(b.val),
      medianGrowth: median_(b.growth),
      medianConviction: median_(b.conv)
    };
  });
  return out;
}

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

/**
 * Full hierarchical evaluation for one symbol.
 * @param {Object} c scoring candidate
 * @param {Object|null} f Tab 6 fundamentals
 * @param {Object} ctx
 * @return {ConvictionEngine3Result}
 */
function evaluateConvictionHierarchy_(c, f, ctx) {
  ctx = ctx || {};
  var reject = level1RejectBadBusiness_(c, f);
  if (!reject.pass) {
    return finalizeEngine3Result_({
      quality_score: 0,
      valuation_score: 0,
      catalyst_score: 0,
      alpha_score: 0,
      alpha_classification: typeof ALPHA_CLASS_AVOID_ !== 'undefined' ? ALPHA_CLASS_AVOID_ : 'Avoid',
      opportunity_rank: 0,
      stage: CE3_STAGE_REJECTED_,
      reject_reasons: reject.reasons
    }, c, f, ctx, null);
  }

  var quality = level2QualityScore_(c, f);
  if (quality < CE3_MIN_QUALITY_PASS_) {
    return finalizeEngine3Result_({
      quality_score: quality,
      valuation_score: 0,
      catalyst_score: 0,
      alpha_score: 0,
      alpha_classification: 'Avoid',
      opportunity_rank: Math.round(quality * 0.25),
      stage: CE3_STAGE_QUALITY_,
      reject_reasons: ['QUALITY_BELOW_' + CE3_MIN_QUALITY_PASS_]
    }, c, f, ctx, null);
  }

  var valuation = quality >= CE3_MIN_QUALITY_FOR_VALUATION_ ?
    level3ValuationScore_(c, f, quality) : 0;
  var catalyst = quality >= CE3_MIN_QUALITY_FOR_CATALYST_ ?
    level4CatalystScore_(c, ctx) : 0;

  var alpha = computeHierarchicalAlpha_(quality, valuation, catalyst, c, ctx);
  var rank = level5OpportunityRank_(quality, valuation, catalyst, alpha.alpha_score, c);
  var stage = CE3_STAGE_RANKED_;
  if (catalyst < 25) stage = CE3_STAGE_VALUATION_;
  if (catalyst >= 35 && quality >= 55) stage = CE3_STAGE_RANKED_;

  return finalizeEngine3Result_({
    quality_score: quality,
    valuation_score: valuation,
    catalyst_score: catalyst,
    alpha_score: alpha.alpha_score,
    alpha_classification: alpha.classification,
    opportunity_rank: rank,
    stage: stage,
    reject_reasons: []
  }, c, f, ctx, alpha);
}

/**
 * Level 1 — hard reject bad businesses / untradeable.
 * @param {Object} c
 * @param {Object|null} f
 * @return {{pass:boolean, reasons:Array<string>}}
 */
function level1RejectBadBusiness_(c, f) {
  var reasons = [];
  if (!c || !c.symbol) reasons.push('NO_SYMBOL');
  if (c.excluded) reasons.push('EXCLUDED');
  if (c.pumpFlag) reasons.push('PUMP_FLAG');
  if (c.sebiInvestigation) reasons.push('SEBI_INVESTIGATION');
  if (c.pledgeGt50) reasons.push('HIGH_PLEDGE');
  if (c.cfoPatDivergence) reasons.push('CFO_PAT_DIVERGENCE');
  if (c.mgmtExits) reasons.push('MGMT_EXITS');

  var core = num_(c.fundamentals) + num_(c.financialStrength) + num_(c.businessMoat);
  if (core < 6 && !c.dataGateFlag) reasons.push('WEAK_CORE_NO_DATA_GATE');
  if (f && num_(f.debtEquity) > 3) reasons.push('DEBT_EQUITY_GT_3');
  if (f && num_(f.roce) > 0 && num_(f.roce) < 5) reasons.push('ROCE_LT_5');
  if (typeof isExcessiveStockRisk_ === 'function' && isExcessiveStockRisk_(c)) {
    reasons.push('EXCESSIVE_RISK_' + String(c.riskGrade || '').toUpperCase());
  }

  return { pass: reasons.length === 0, reasons: reasons };
}

/**
 * Level 2 — quality business score 0–100 (not additive with L5).
 * @param {Object} c
 * @param {Object|null} f
 * @return {number}
 */
function level2QualityScore_(c, f) {
  var fund = Math.min(15, num_(c.fundamentals)) / 15;
  var fin = Math.min(15, num_(c.financialStrength)) / 15;
  var moat = Math.min(10, num_(c.businessMoat)) / 10;
  var sector = Math.min(10, num_(c.sectorStrength)) / 10;
  var dq = Math.min(100, num_(c.dataQualityPct)) / 100;

  var score = (fund * 0.32 + fin * 0.28 + moat * 0.22 + sector * 0.12 + dq * 0.06) * 100;

  if (f) {
    if (num_(f.roce) >= 18) score = Math.min(100, score + 6);
    else if (num_(f.roce) >= 12) score = Math.min(100, score + 3);
    if (num_(f.roe) >= 15) score = Math.min(100, score + 4);
    if (num_(f.debtEquity) > 0 && num_(f.debtEquity) < 0.5) score = Math.min(100, score + 3);
  }
  if (num_(c.sectorRank) > 0 && num_(c.sectorRank) <= 5) score = Math.min(100, score + 5);
  if (num_(c.relativeQualityScore) > 0) {
    score = Math.round(score * 0.68 + num_(c.relativeQualityScore) * 0.22 +
      (num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore) || 50) * 0.1);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Level 3 — undervalued quality (gated: requires L2 quality).
 * @param {Object} c
 * @param {Object|null} f
 * @param {number} quality
 * @return {number}
 */
function level3ValuationScore_(c, f, quality) {
  var valPillar = Math.min(15, num_(c.valuation)) / 15;
  var growth = Math.min(15, num_(c.growth)) / 15;
  var base = valPillar * 0.55 + growth * 0.25;
  var gate = quality / 100;
  var score = base * gate * 100;
  if (num_(c.relativeValuationScore) > 0) {
    score = score * 0.62 + num_(c.relativeValuationScore) * 0.33 +
      (num_(c.relativeGrowthScore) || 50) * 0.05;
  }

  if (f) {
    if (String(f.valuationTag || '').toLowerCase().indexOf('underv') >= 0) {
      score = Math.min(100, score + 12);
    }
    if (num_(f.peVs3y) > 0 && num_(f.peVs3y) < 0.9) score = Math.min(100, score + 8);
    if (num_(f.pe) > 0 && num_(f.pe) < 22 && num_(f.roe) > 12) score = Math.min(100, score + 5);
  }
  if (num_(c.valuation) >= 10 && num_(c.growth) >= 8) score = Math.min(100, score + 6);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Level 4 — catalysts / why now (gated on minimum quality).
 * @param {Object} c
 * @param {Object} ctx
 * @return {number}
 */
function level4CatalystScore_(c, ctx) {
  var news = Math.min(10, num_(c.newsEvents)) / 10;
  var filings = Math.min(5, num_(c.filingsSignals)) * 0.2;
  var orders = Math.min(5, num_(c.orderbookSignals)) * 0.2;
  var rev = Math.min(3, num_(c.revisionUpgrades)) * 0.15;
  var promo = c.promoterBuy ? 0.15 : 0;
  var tech = 0;
  if (ctx.techCtx && typeof technicalMomentumScore === 'function') {
    var t = technicalMomentumScore(c.symbol, ctx.techCtx);
    tech = (t.score / 5) * 0.2;
  }
  var inst = 0;
  if (ctx.instCtx && typeof institutionalFlowScore === 'function') {
    var instR = institutionalFlowScore(c.symbol, ctx.instCtx);
    inst = (instR.score / 5) * 0.15;
  }

  var raw = (news * 0.35 + filings + orders + rev + promo + tech + inst) * 100;
  if (c.horizon1w || c.horizon1m) raw = Math.min(100, raw + 8);
  if (num_(c.newsArticleCount30d) >= 3) raw = Math.min(100, raw + 5);

  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Level 5 — rank via gated geometric blend (not sum of C–J).
 * @param {number} quality
 * @param {number} valuation
 * @param {number} catalyst
 * @param {number} alpha
 * @param {Object} c
 * @return {number}
 */
function level5OpportunityRank_(quality, valuation, catalyst, alpha, c) {
  if (quality < CE3_MIN_QUALITY_PASS_) {
    return Math.max(0, Math.min(25, Math.round(quality * 0.22)));
  }

  var q = Math.max(0, quality) / 100;
  var v = Math.max(25, valuation) / 100;
  var cat = Math.max(15, catalyst) / 100;
  var a = Math.max(10, alpha) / 100;

  var geo = Math.pow(q, 0.38) * Math.pow(v, 0.28) * Math.pow(cat, 0.22) * Math.pow(a, 0.12);
  var geoRank = geo * 100;

  var bottleneck = Math.min(
    quality,
    Math.max(valuation, 20) * 1.05,
    Math.max(catalyst, 12) * 1.15,
    Math.max(alpha, 15) * 1.1
  );

  var rank = Math.round(geoRank * 0.72 + bottleneck * 0.28);

  if (valuation < 35) rank = Math.round(rank * 0.88);
  if (catalyst < 20) rank = Math.round(rank * 0.9);
  if (quality < 50) rank = Math.round(rank * 0.85);

  if (num_(c.relativeQualityScore) > 0) {
    var relG = num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore) || 50;
    var peerGeo = Math.pow(num_(c.relativeQualityScore) / 100, 0.14) *
      Math.pow(Math.max(30, num_(c.relativeValuationScore)) / 100, 0.12) *
      Math.pow(Math.max(30, relG) / 100, 0.1);
    rank = Math.round(rank * peerGeo);
  }
  if (num_(c.sectorRank) > 0 && num_(c.sectorRank) <= 3) rank = Math.min(100, rank + 4);
  return Math.max(0, Math.min(100, rank));
}

/**
 * Alpha from hierarchy — not weighted sum of legacy factors.
 * @param {number} quality
 * @param {number} valuation
 * @param {number} catalyst
 * @param {Object} c
 * @param {Object} ctx
 * @return {{alpha_score:number, classification:string}}
 */
function computeHierarchicalAlpha_(quality, valuation, catalyst, c, ctx) {
  if (quality < CE3_MIN_QUALITY_PASS_) {
    return { alpha_score: 0, classification: 'Avoid' };
  }
  var core = Math.sqrt((quality / 100) * (Math.max(20, valuation) / 100)) * 100;
  var timing = catalyst * 0.35;
  var momentum = 0;
  if (ctx.techCtx && typeof technicalMomentumScore === 'function') {
    momentum = (technicalMomentumScore(c.symbol, ctx.techCtx).score / 5) * 100 * 0.2;
  }
  var flow = 0;
  if (ctx.instCtx && typeof institutionalFlowScore === 'function') {
    flow = (institutionalFlowScore(c.symbol, ctx.instCtx).score / 5) * 100 * 0.15;
  }
  var alpha = Math.round(core * 0.55 + timing * 0.25 + momentum + flow);
  if (c.pumpFlag) alpha = Math.max(0, alpha - 25);
  alpha = Math.max(0, Math.min(100, alpha));

  var classification = 'Watch';
  if (typeof classifyAlpha_ === 'function') {
    classification = classifyAlpha_(alpha, {}, c, { total: 0 });
  } else {
    if (alpha >= 72) classification = 'Strong Buy';
    else if (alpha >= 58) classification = 'Buy';
    else if (alpha < 35) classification = 'Avoid';
  }
  return { alpha_score: alpha, classification: classification };
}

/**
 * @param {Object} partial
 * @param {Object} c
 * @param {Object|null} f
 * @param {Object} ctx
 * @param {Object|null} alphaDetail
 * @return {ConvictionEngine3Result}
 */
function finalizeEngine3Result_(partial, c, f, ctx, alphaDetail) {
  partial.investment_stage = mapConvictionStageToInvestmentStage_(partial.stage);
  partial.additive_pillar_sum = computeAdditivePillarSum_(c);
  var peer = (ctx.sectorPeerStats || {})[c.sectorKey] || null;
  var narratives = buildEngine3Narratives_(c, f, partial, peer, ctx);
  partial.why_now = narratives.why_now;
  partial.why_stock = narratives.why_stock;
  partial.why_peers = narratives.why_peers;
  partial.rationale = narratives.rationale;
  return partial;
}

/**
 * Alias for tiered framework documentation / external callers.
 * @param {Object} c
 * @param {Object|null} f
 * @param {Object=} ctx
 * @return {ConvictionEngine3Result}
 */
function evaluateTieredInvestmentFramework_(c, f, ctx) {
  return evaluateConvictionHierarchy_(c, f, ctx);
}

/**
 * @param {string} stage
 * @return {number}
 */
function mapConvictionStageToInvestmentStage_(stage) {
  var s = String(stage || '').toUpperCase();
  if (s === CE3_STAGE_REJECTED_) return 1;
  if (s === CE3_STAGE_QUALITY_) return 2;
  if (s === CE3_STAGE_VALUATION_) return 3;
  if (s === CE3_STAGE_CATALYST_) return 4;
  if (s === CE3_STAGE_RANKED_) return 5;
  return 2;
}

/**
 * Legacy additive sum — displayed for transparency; never written to M when Engine 3 is on.
 * @param {Object} c
 * @return {number}
 */
function computeAdditivePillarSum_(c) {
  var cap = typeof CONVICTION_CAP !== 'undefined' ? CONVICTION_CAP : {
    fundamentals: 15, valuation: 15, growth: 15, financial_strength: 15,
    sector_strength: 10, news_events: 10, technical_momentum: 5, institutional_flow: 5, business_moat: 10
  };
  return Math.round(
    Math.min(num_(c.fundamentals), cap.fundamentals) +
    Math.min(num_(c.businessMoat), cap.business_moat) +
    Math.min(num_(c.valuation), cap.valuation) +
    Math.min(num_(c.growth), cap.growth) +
    Math.min(num_(c.financialStrength), cap.financial_strength) +
    Math.min(num_(c.sectorStrength), cap.sector_strength) +
    Math.min(num_(c.newsEvents), cap.news_events) +
    Math.min(num_(c.technicalMomentum), cap.technical_momentum) +
    Math.min(num_(c.institutional), cap.institutional_flow)
  );
}

/**
 * @param {Object} c
 * @param {Object|null} f
 * @param {Object} result
 * @param {Object|null} peer
 * @param {Object} ctx
 * @return {{why_now:string, why_stock:string, why_peers:string, rationale:string}}
 */
function buildEngine3Narratives_(c, f, result, peer, ctx) {
  var whyNow = [];
  if (result.catalyst_score >= 40) {
    whyNow.push('Catalyst score ' + result.catalyst_score + '/100 — near-term setup is active');
  } else if (result.catalyst_score >= 20) {
    whyNow.push('Developing catalysts (' + result.catalyst_score + '/100) — confirm before sizing');
  } else {
    whyNow.push('Limited near-term catalyst — patience until filings/orders/news upgrade');
  }
  if (c.filingsSignals > 0) whyNow.push(c.filingsSignals + ' filing(s) in 30d');
  if (c.orderbookSignals > 0) whyNow.push(c.orderbookSignals + ' order-book signal(s) in 90d');
  if (c.promoterBuy) whyNow.push('Promoter buying in last 90d');
  if (c.horizon1w) whyNow.push('1-week horizon flag on scoring model');
  if (c.revisionUpgrades > 0) whyNow.push(c.revisionUpgrades + ' analyst upgrade(s) in 60d');

  var whyStock = [];
  whyStock.push('Quality ' + result.quality_score + '/100 after L1 reject + L2 business screen');
  if (num_(c.fundamentals) >= 10) whyStock.push('Fundamentals pillar ' + num_(c.fundamentals) + '/15');
  if (num_(c.businessMoat) >= 5) whyStock.push('Moat ' + num_(c.businessMoat) + '/10');
  if (num_(c.financialStrength) >= 10) whyStock.push('Financial strength ' + num_(c.financialStrength) + '/15');
  if (f && num_(f.roce) > 0) whyStock.push('ROCE ' + num_(f.roce) + '%');
  if (result.valuation_score >= 50) {
    whyStock.push('Valuation score ' + result.valuation_score + '/100 — quality at reasonable price');
  }

  var whyPeers = [];
  if (typeof buildWhyBetterThanPeers_ === 'function') {
    var peerObj = {
      sectorKey: c.sectorKey,
      sector_median_pe: num_(c.sectorMedianPe),
      sector_median_pb: num_(c.sectorMedianPb),
      sector_median_roce: num_(c.sectorMedianRoce),
      sector_median_growth: num_(c.sectorMedianGrowth),
      relative_quality_score: num_(c.relativeQualityScore),
      relative_valuation_score: num_(c.relativeValuationScore),
      relative_growth_score: num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore),
      peer_rationale: '',
      named_peers: getNamedPeersForSector_(c.sectorKey)
    };
    whyPeers.push(buildWhyBetterThanPeers_(c, peerObj, f));
  } else if (peer && peer.count >= 3) {
    var core = num_(c.fundamentals) + num_(c.financialStrength) + num_(c.businessMoat);
    if (core > peer.medianCore + 2) {
      whyPeers.push('Core quality above sector median (' + peer.medianCore.toFixed(1) + ')');
    } else if (core < peer.medianCore - 2) {
      whyPeers.push('Core quality below sector median — prefer stronger peer');
    } else {
      whyPeers.push('Core quality in line with sector peers');
    }
    if (result.opportunity_rank > peer.medianConviction + 5) {
      whyPeers.push('Opportunity rank beats sector median conviction');
    }
  } else {
    whyPeers.push('Insufficient peer sample in sector — compare manually to Tab 19 leaders');
  }
  if (num_(c.sectorRank) > 0 && num_(c.sectorRank) <= 5) {
    whyPeers.push('Top-quintile sector momentum vs other sectors (Tab 19)');
  }

  var rationale = 'Tiered ' + CONVICTION_ENGINE_VERSION_ + ' S' + (result.investment_stage || '?') +
    ' ' + result.stage + ': Q' + result.quality_score +
    ' V' + result.valuation_score + ' C' + result.catalyst_score +
    ' α' + result.alpha_score + ' → rank ' + result.opportunity_rank +
    ' (pillar sum ' + (result.additive_pillar_sum || computeAdditivePillarSum_(c)) + ' ≠ M)';

  return {
    why_now: whyNow.join('. ') + '.',
    why_stock: whyStock.join('. ') + '.',
    why_peers: whyPeers.join('. ') + '.',
    rationale: rationale
  };
}

/**
 * Write Engine 3 columns + conviction_total + alpha to Tab 10 rows.
 * @param {Array<Array>} data
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function applyConvictionEngine3Batch_(data, ss) {
  if (!USE_CONVICTION_ENGINE_3_) return;
  var ctx = buildConvictionEngine3Context_(ss);
  ctx.sectorPeerStats = buildSectorPeerStats_(data, ctx.universeBySym);
  var universeMap = buildUniverseLookup_(ss);

  for (var i = 0; i < data.length; i++) {
    while (data[i].length < SCORING_NUM_COLS) data[i].push('');
    var c = buildScoringCandidate_(data[i], universeMap);
    c.sebiInvestigation = data[i][27] === true || data[i][27] === 'TRUE';
    c.pledgeGt50 = data[i][25] === true || data[i][25] === 'TRUE';
    var sym = c.symbol;
    if (!sym) continue;
    var f = ctx.fundamentals[sym] || null;
    var r = evaluateConvictionHierarchy_(c, f, ctx);

    data[i][CE3_COL_QUALITY_] = r.quality_score;
    data[i][CE3_COL_VALUATION_] = r.valuation_score;
    data[i][CE3_COL_CATALYST_] = r.catalyst_score;
    data[i][CE3_COL_STAGE_] = r.stage;
    data[i][CE3_COL_OPPORTUNITY_] = r.opportunity_rank;
    data[i][12] = r.opportunity_rank;
    data[i][43] = r.alpha_score;
    data[i][44] = r.alpha_classification;
    data[i][24] = mapOpportunityToActionLabel_(r);
  }
}

/**
 * @param {ConvictionEngine3Result} r
 * @return {string}
 */
function mapOpportunityToActionLabel_(r) {
  if (r.stage === CE3_STAGE_REJECTED_) return 'avoid';
  if (r.opportunity_rank >= 65) return 'overweight';
  if (r.opportunity_rank >= 45) return 'accumulate';
  if (r.opportunity_rank >= 30) return 'watch';
  return 'monitor';
}

/**
 * @param {Array} row
 * @return {number|null}
 */
function getConvictionEngine3Opportunity_(row) {
  if (!USE_CONVICTION_ENGINE_3_ || !row || row.length <= CE3_COL_STAGE_) return null;
  var stage = String(row[CE3_COL_STAGE_] || '');
  if (!stage) return null;
  if (stage === CE3_STAGE_REJECTED_) return 0;
  return num_(row[CE3_COL_OPPORTUNITY_] || row[12]);
}

/**
 * @param {Object} c enriched candidate with engine3 fields
 * @param {string} filter
 * @param {number} sortKey
 * @return {Object}
 */
function buildInstitutionalRecommendationNarrative_(c, filter, sortKey, listName) {
  if (typeof buildAnalystRecommendationNote_ === 'function') {
    listName = listName || (typeof recommendationListNameFromFilter_ === 'function' ?
      recommendationListNameFromFilter_(filter) : '');
    var note = buildAnalystRecommendationNote_(c, filter, sortKey, listName);
    if (typeof finalizeAnalystNoteForPublish_ === 'function') {
      note = finalizeAnalystNoteForPublish_(note, c, null, listName);
    }
    if (!isAnalystNoteComplete_(note)) return null;
    var ev = typeof evaluateRecommendationQuality_ === 'function' ?
      evaluateRecommendationQuality_(c, filter) : { pass: true, confidence: note.confidence, reasons: [] };
    return mapAnalystNoteToNarrative_(note, c, ev);
  }

  var base = typeof buildRecommendationNarrativeV2_ === 'function' ?
    buildRecommendationNarrativeV2_(c, filter, sortKey, evaluateRecommendationQuality_(c, filter)) :
    { bull: '', bear: '', catalyst: '', horizon: '3m', confidence: 50, evidence: '' };
  return base;
}

/**
 * Menu — preview hierarchical scores for watchlist symbols.
 */
function previewConvictionEngine3() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = buildConvictionEngine3Context_(ss);
  var universeMap = buildUniverseLookup_(ss);
  var syms = collectWatchlistSymbols_(ss).slice(0, 6);
  var lines = ['Conviction Engine 3.0 preview'];
  syms.forEach(function(sym) {
    var sheet = ss.getSheetByName('10. SCORING MODEL');
    var c = { symbol: sym, conviction: 0 };
    if (sheet && sheet.getLastRow() >= 2) {
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, SCORING_NUM_COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (normalizeSymbolKey_(data[i][0]) === sym) {
          c = buildScoringCandidate_(data[i], universeMap);
          break;
        }
      }
    }
    var r = evaluateConvictionHierarchy_(c, ctx.fundamentals[sym], ctx);
    lines.push(sym + ': S' + r.investment_stage + ' ' + r.stage + ' Q' + r.quality_score +
      ' V' + r.valuation_score + ' C' + r.catalyst_score + ' α' + r.alpha_score +
      ' rank=' + r.opportunity_rank + ' (pillars=' + r.additive_pillar_sum + ')');
    lines.push('  Now: ' + r.why_now.substring(0, 90));
  });
  SpreadsheetApp.getUi().alert(lines.join('\n\n').substring(0, 1800));
}
