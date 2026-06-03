/**
 * Portfolio Construction Engine — capital tiers → allocation, sizing, sector exposure, DD, conviction.
 * Reads Tab 10 + Tab 11 only (no rescoring). See docs/PORTFOLIO_CONSTRUCTION_ENGINE.md
 */

var PORTFOLIO_ENGINE_VERSION_ = '1.0';
var PORTFOLIO_SHEET_ = '30. PORTFOLIO MODELS';

/** Supported capital inputs (INR). */
var PORTFOLIO_CAPITAL_TIERS_ = [100000, 500000, 1000000, 10000000];

/**
 * @typedef {Object} PortfolioTierConfig
 * @property {number} capital
 * @property {number} maxPositions
 * @property {number} maxSinglePct
 * @property {number} cashPct
 * @property {Object} bucketTargets core/growth/opportunistic pct
 * @property {Object} bucketSlots max names per bucket
 */

/** @type {Object<number, PortfolioTierConfig>} */
var PORTFOLIO_TIER_CONFIG_ = {
  100000: {
    capital: 100000,
    maxPositions: 10,
    maxSinglePct: 14,
    cashPct: 5,
    bucketTargets: { core: 55, growth: 30, opportunistic: 10 },
    bucketSlots: { core: 5, growth: 3, opportunistic: 2 }
  },
  500000: {
    capital: 500000,
    maxPositions: 14,
    maxSinglePct: 10,
    cashPct: 3,
    bucketTargets: { core: 60, growth: 28, opportunistic: 9 },
    bucketSlots: { core: 8, growth: 4, opportunistic: 2 }
  },
  1000000: {
    capital: 1000000,
    maxPositions: 18,
    maxSinglePct: 8,
    cashPct: 2,
    bucketTargets: { core: 65, growth: 25, opportunistic: 8 },
    bucketSlots: { core: 10, growth: 5, opportunistic: 3 }
  },
  10000000: {
    capital: 10000000,
    maxPositions: 25,
    maxSinglePct: 5,
    cashPct: 1,
    bucketTargets: { core: 70, growth: 22, opportunistic: 7 },
    bucketSlots: { core: 14, growth: 7, opportunistic: 4 }
  }
};

var PORTFOLIO_MAX_SECTOR_PCT_ = {
  100000: 28,
  500000: 25,
  1000000: 22,
  10000000: 18
};

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function buildPortfolioCandidatePool_(ss) {
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return [];

  var universeMap = buildUniverseLookup_(ss);
  var numRows = scoreSheet.getLastRow() - 1;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 61;
  var data = scoreSheet.getRange(2, 1, numRows, cols).getValues();
  var tab11Boost = buildTab11SymbolBoost_(ss);
  var pool = [];

  data.forEach(function(r) {
    var c = buildScoringCandidate_(r, universeMap);
    if (!c.symbol || c.excluded) return;
    if (typeof isExcessiveStockRisk_ === 'function' && isExcessiveStockRisk_(c)) return;
    if (String(c.convictionStage || '').toUpperCase() === 'REJECTED') return;
    var dq = num_(c.dataQualityPct);
    if (dq > 0 && dq < (typeof REC_FILTER_MIN_DATA_QUALITY_ !== 'undefined' ?
      REC_FILTER_MIN_DATA_QUALITY_ : 60)) return;

    c.portfolioBucket = classifyPortfolioBucket_(c, tab11Boost[c.symbol]);
    if (!c.portfolioBucket) return;
    c.portfolioPickScore = portfolioPickScore_(c, tab11Boost[c.symbol]);
    pool.push(c);
  });

  pool.sort(function(a, b) {
    return (b.portfolioPickScore || 0) - (a.portfolioPickScore || 0);
  });
  return pool;
}

/**
 * Tab 11 list membership → bucket hint + score boost.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildTab11SymbolBoost_(ss) {
  var map = {};
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sheet || sheet.getLastRow() < 2) return map;

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 6).getValues();
  data.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[2]);
    if (!sym) return;
    var listName = String(r[0] || '').toLowerCase();
    var rank = num_(r[1]);
    var conv = num_(r[5]);
    if (!map[sym]) {
      map[sym] = { boost: 0, bucketHint: '', lists: [], bestRank: 99, conviction: conv };
    }
    map[sym].lists.push(String(r[0] || ''));
    if (rank > 0 && rank < map[sym].bestRank) map[sym].bestRank = rank;
    if (conv > map[sym].conviction) map[sym].conviction = conv;

    if (listName.indexOf('compound') >= 0 || listName.indexOf('monopoly') >= 0) {
      map[sym].bucketHint = 'core';
      map[sym].boost += 12 - Math.min(10, rank);
    } else if (listName.indexOf('3-month') >= 0) {
      if (!map[sym].bucketHint) map[sym].bucketHint = 'growth';
      map[sym].boost += 8 - Math.min(6, rank);
    } else if (listName.indexOf('immediate') >= 0 || listName.indexOf('turnaround') >= 0 ||
      listName.indexOf('theme') >= 0 || listName.indexOf('government') >= 0) {
      if (!map[sym].bucketHint) map[sym].bucketHint = 'opportunistic';
      map[sym].boost += 6 - Math.min(5, rank);
    }
  });
  return map;
}

/**
 * @param {Object} c
 * @param {Object=} tab11
 * @return {string|null} core|growth|opportunistic
 */
function classifyPortfolioBucket_(c, tab11) {
  tab11 = tab11 || {};
  if (tab11.bucketHint) return tab11.bucketHint;

  var q = num_(c.qualityScore);
  var rank = num_(c.opportunityRank) || num_(c.conviction);
  var safety = num_(c.riskScore);
  var grade = String(c.riskGrade || '').toUpperCase();
  var corePillars = num_(c.fundamentals) + num_(c.financialStrength) + num_(c.businessMoat);

  if ((q >= 55 || corePillars >= 40) &&
    (grade === 'A' || grade === 'B' || safety >= 68) &&
    c.dataGateFlag && rank >= 32) {
    return 'core';
  }
  if ((q >= 42 || num_(c.growth) >= 9 || num_(c.catalystScore) >= 35) &&
    rank >= 28 && (safety >= 52 || grade === 'C')) {
    return 'growth';
  }
  if (rank >= 22 && safety >= 42) {
    if (c.horizon1w || c.horizon1m || num_(c.orderbookSignals) > 0 ||
      num_(c.catalystScore) >= 38 || num_(c.themeConvictionScore) >= 38 ||
      num_(c.filingsSignals) > 0) {
      return 'opportunistic';
    }
  }
  return null;
}

/**
 * @param {Object} c
 * @param {Object=} tab11
 * @return {number}
 */
function portfolioPickScore_(c, tab11) {
  tab11 = tab11 || {};
  var rank = num_(c.opportunityRank) || num_(c.conviction);
  var safety = num_(c.riskScore) || 50;
  var dq = num_(c.dataQualityPct) || 55;
  var mult = typeof recommendationRiskSortMultiplier_ === 'function' ?
    recommendationRiskSortMultiplier_(c) : 1;
  return Math.round(rank * (safety / 100) * (dq / 100) * mult * 10) / 10 + (tab11.boost || 0);
}

/**
 * Build full portfolio model for one capital tier.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} capital
 * @return {Object}
 */
function buildPortfolioModelForCapital_(ss, capital) {
  capital = num_(capital);
  var cfg = PORTFOLIO_TIER_CONFIG_[capital];
  if (!cfg) {
    return { ok: false, error: 'Unsupported capital. Use: ' + PORTFOLIO_CAPITAL_TIERS_.join(', ') };
  }

  var pool = buildPortfolioCandidatePool_(ss);
  if (!pool.length) {
    return {
      ok: false,
      error: 'No eligible Tab 10 symbols. Run Rebuild scoring pipeline first.',
      capital_inr: capital
    };
  }

  var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
  var byBucket = { core: [], growth: [], opportunistic: [] };
  pool.forEach(function(c) {
    var b = c.portfolioBucket;
    if (byBucket[b]) byBucket[b].push(c);
  });

  var positions = [];
  var usedSym = {};
  ['core', 'growth', 'opportunistic'].forEach(function(bucket) {
    var slots = cfg.bucketSlots[bucket] || 0;
    var picked = 0;
    for (var i = 0; i < byBucket[bucket].length && picked < slots; i++) {
      var c = byBucket[bucket][i];
      if (usedSym[c.symbol]) continue;
      usedSym[c.symbol] = true;
      positions.push({ candidate: c, bucket: bucket });
      picked++;
    }
  });

  if (positions.length < 3) {
    pool.slice(0, cfg.maxPositions).forEach(function(c) {
      if (usedSym[c.symbol]) return;
      usedSym[c.symbol] = true;
      positions.push({ candidate: c, bucket: c.portfolioBucket || 'growth' });
    });
  }

  var investable = cfg.capital * (1 - cfg.cashPct / 100);
  var bucketBudget = {
    core: investable * (cfg.bucketTargets.core / 100),
    growth: investable * (cfg.bucketTargets.growth / 100),
    opportunistic: investable * (cfg.bucketTargets.opportunistic / 100)
  };

  var bucketScores = { core: 0, growth: 0, opportunistic: 0 };
  positions.forEach(function(p) {
    bucketScores[p.bucket] += Math.max(1, p.candidate.portfolioPickScore || 1);
  });

  var sized = [];
  var sectorAmt = {};
  var maxSectorPct = PORTFOLIO_MAX_SECTOR_PCT_[capital] || 25;

  positions.forEach(function(p) {
    var c = p.candidate;
    var bucket = p.bucket;
    var bTotal = bucketScores[bucket] || 1;
    var rawWt = (c.portfolioPickScore || 1) / bTotal;
    var amount = bucketBudget[bucket] * rawWt;
    var maxAmt = cfg.capital * (cfg.maxSinglePct / 100);
    amount = Math.min(amount, maxAmt);
    amount = roundPortfolioAmount_(amount, capital);
    if (amount < 1000) return;

    var sector = String(c.sector || c.sectorKey || 'MISCELLANEOUS').trim() || 'MISCELLANEOUS';
    sectorAmt[sector] = (sectorAmt[sector] || 0) + amount;

    var price = prices[c.symbol] ? prices[c.symbol].price : 0;
    var shares = price > 0 ? Math.floor(amount / price) : 0;

    sized.push({
      symbol: c.symbol,
      company_name: c.companyName,
      sector: sector,
      bucket: bucket,
      amount_inr: amount,
      weight_pct: Math.round((amount / cfg.capital) * 1000) / 10,
      shares_estimate: shares,
      last_price: price > 0 ? price : null,
      opportunity_rank: num_(c.opportunityRank) || num_(c.conviction),
      risk_score: num_(c.riskScore),
      risk_grade: c.riskGrade || '',
      data_quality_pct: num_(c.dataQualityPct),
      portfolio_pick_score: c.portfolioPickScore,
      reward_risk_ratio: typeof buildRiskRewardMetrics_ === 'function' ?
        buildRiskRewardMetrics_(c).reward_risk_ratio : null
    });
  });

  normalizePortfolioWeights_(sized, investable, cfg);

  var deployed = sized.reduce(function(s, p) { return s + p.amount_inr; }, 0);
  var cashHold = Math.max(0, cfg.capital - deployed);
  var cashPct = Math.round((cashHold / cfg.capital) * 1000) / 10;

  var sectorExposure = buildSectorExposure_(sized, cfg.capital, maxSectorPct);
  var allocation = computeSuggestedAllocation_(sized, cfg, cashPct);
  var portfolioConviction = computePortfolioConvictionScore_(sized);
  var maxDrawdown = estimatePortfolioMaxDrawdown_(sized, allocation, sectorExposure);

  return {
    ok: true,
    engine_version: PORTFOLIO_ENGINE_VERSION_,
    capital_inr: capital,
    as_of: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    suggested_allocation: allocation,
    sector_exposure: sectorExposure,
    positions: sized,
    position_count: sized.length,
    deployed_inr: Math.round(deployed),
    cash_inr: Math.round(cashHold),
    cash_pct: cashPct,
    max_drawdown_estimate_pct: maxDrawdown,
    portfolio_conviction_score: portfolioConviction,
    constraints: {
      max_positions: cfg.maxPositions,
      max_single_pct: cfg.maxSinglePct,
      max_sector_pct: maxSectorPct
    },
    pool_size: pool.length
  };
}

/**
 * @param {number} amount
 * @param {number} capital
 * @return {number}
 */
function roundPortfolioAmount_(amount, capital) {
  var step = capital >= 10000000 ? 25000 : (capital >= 1000000 ? 5000 :
    (capital >= 500000 ? 2000 : 1000));
  return Math.max(step, Math.round(amount / step) * step);
}

/**
 * Rescale position amounts to fit investable budget.
 * @param {Array<Object>} positions
 * @param {number} investable
 * @param {Object} cfg
 */
function normalizePortfolioWeights_(positions, investable, cfg) {
  var total = positions.reduce(function(s, p) { return s + p.amount_inr; }, 0);
  if (total <= 0 || total <= investable) {
    positions.forEach(function(p) {
      p.weight_pct = Math.round((p.amount_inr / cfg.capital) * 1000) / 10;
    });
    return;
  }
  var scale = investable / total;
  positions.forEach(function(p) {
    p.amount_inr = roundPortfolioAmount_(p.amount_inr * scale, cfg.capital);
    p.weight_pct = Math.round((p.amount_inr / cfg.capital) * 1000) / 10;
  });
}

/**
 * @param {Array<Object>} positions
 * @param {number} capital
 * @param {number} maxSectorPct
 * @return {Array<Object>}
 */
function buildSectorExposure_(positions, capital, maxSectorPct) {
  var bySector = {};
  positions.forEach(function(p) {
    bySector[p.sector] = (bySector[p.sector] || 0) + p.amount_inr;
  });
  return Object.keys(bySector).sort(function(a, b) {
    return bySector[b] - bySector[a];
  }).map(function(sec) {
    var amt = bySector[sec];
    var pct = Math.round((amt / capital) * 1000) / 10;
    return {
      sector: sec,
      amount_inr: Math.round(amt),
      weight_pct: pct,
      over_limit: pct > maxSectorPct
    };
  });
}

/**
 * @param {Array<Object>} positions
 * @param {Object} cfg
 * @param {number} cashPct
 * @return {Object}
 */
function computeSuggestedAllocation_(positions, cfg, cashPct) {
  var bucketAmt = { core: 0, growth: 0, opportunistic: 0 };
  positions.forEach(function(p) {
    bucketAmt[p.bucket] = (bucketAmt[p.bucket] || 0) + p.amount_inr;
  });
  var deployed = positions.reduce(function(s, p) { return s + p.amount_inr; }, 0);
  var cap = cfg.capital;
  return {
    core: {
      target_pct: cfg.bucketTargets.core,
      actual_pct: Math.round((bucketAmt.core / cap) * 1000) / 10,
      amount_inr: Math.round(bucketAmt.core)
    },
    growth: {
      target_pct: cfg.bucketTargets.growth,
      actual_pct: Math.round((bucketAmt.growth / cap) * 1000) / 10,
      amount_inr: Math.round(bucketAmt.growth)
    },
    opportunistic: {
      target_pct: cfg.bucketTargets.opportunistic,
      actual_pct: Math.round((bucketAmt.opportunistic / cap) * 1000) / 10,
      amount_inr: Math.round(bucketAmt.opportunistic)
    },
    cash: {
      target_pct: cfg.cashPct,
      actual_pct: cashPct,
      amount_inr: Math.round(cap - deployed)
    },
    deployed_pct: Math.round((deployed / cap) * 1000) / 10
  };
}

/**
 * @param {Array<Object>} positions
 * @return {number}
 */
function computePortfolioConvictionScore_(positions) {
  if (!positions.length) return 0;
  var sum = 0;
  var wSum = 0;
  positions.forEach(function(p) {
    var w = p.amount_inr || 1;
    var rank = num_(p.opportunity_rank);
    var safety = num_(p.risk_score) || 50;
    var dq = num_(p.data_quality_pct) || 55;
    sum += w * rank * (safety / 100) * (dq / 100);
    wSum += w;
  });
  return Math.round(Math.min(100, Math.max(0, sum / wSum)));
}

/**
 * Heuristic max portfolio drawdown (not a backtest) — rises with risk & concentration.
 * @param {Array<Object>} positions
 * @param {Object} allocation
 * @param {Array<Object>} sectorExposure
 * @return {number}
 */
function estimatePortfolioMaxDrawdown_(positions, allocation, sectorExposure) {
  if (!positions.length) return 0;
  var avgDanger = 0;
  var wSum = 0;
  positions.forEach(function(p) {
    var w = p.amount_inr || 1;
    var safety = num_(p.risk_score) || 50;
    avgDanger += w * (100 - safety);
    wSum += w;
  });
  avgDanger = avgDanger / wSum;

  var oppPct = allocation.opportunistic ? allocation.opportunistic.actual_pct : 0;
  var topSector = sectorExposure.length ? sectorExposure[0].weight_pct : 0;
  var hhi = 0;
  sectorExposure.forEach(function(s) {
    var w = s.weight_pct / 100;
    hhi += w * w;
  });

  var dd = 6 + avgDanger * 0.22 + oppPct * 0.12 + topSector * 0.08 + hhi * 35;
  if (positions.length < 8) dd += 3;
  return Math.round(Math.min(38, Math.max(8, dd)) * 10) / 10;
}

/**
 * API payload — one tier or all tiers.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet=} ss
 * @param {number=} capital
 * @return {Object}
 */
function getPortfolioConstructionPayload_(ss, capital) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  if (capital != null && capital !== '') {
    var model = buildPortfolioModelForCapital_(ss, num_(capital));
    if (model.ok === false) {
      return { ok: false, error: model.error, tiers: [model], default_capital: num_(capital) };
    }
    return {
      ok: true,
      engine_version: PORTFOLIO_ENGINE_VERSION_,
      tiers: [model],
      default_capital: num_(capital),
      capital_tiers: PORTFOLIO_CAPITAL_TIERS_,
      as_of: model.as_of
    };
  }
  var tiers = PORTFOLIO_CAPITAL_TIERS_.map(function(cap) {
    return buildPortfolioModelForCapital_(ss, cap);
  });
  return {
    ok: tiers.some(function(t) { return t.ok; }),
    engine_version: PORTFOLIO_ENGINE_VERSION_,
    capital_tiers: PORTFOLIO_CAPITAL_TIERS_,
    tiers: tiers,
    default_capital: 1000000,
    as_of: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')
  };
}

/**
 * Write Tab 30 summary + position rows for all tiers.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet=} ss
 * @return {Object}
 */
function runPortfolioConstructionEngine_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var payload = getPortfolioConstructionPayload_(ss);
  writePortfolioConstructionSheet_(ss, payload);
  return payload;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} payload
 */
function writePortfolioConstructionSheet_(ss, payload) {
  var headers = [
    'capital_inr', 'bucket', 'symbol', 'company_name', 'sector',
    'amount_inr', 'weight_pct', 'shares_estimate', 'opportunity_rank',
    'risk_score', 'risk_grade', 'portfolio_conviction', 'max_dd_pct', 'as_of_date'
  ];
  var sheet = getOrCreateSheet_(PORTFOLIO_SHEET_);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  clearDataBelowHeader_(sheet, headers.length);

  var rows = [];
  (payload.tiers || []).forEach(function(tier) {
    if (!tier.ok) return;
    (tier.positions || []).forEach(function(p) {
      rows.push([
        tier.capital_inr,
        p.bucket,
        p.symbol,
        p.company_name,
        p.sector,
        p.amount_inr,
        p.weight_pct,
        p.shares_estimate,
        p.opportunity_rank,
        p.risk_score,
        p.risk_grade,
        tier.portfolio_conviction_score,
        tier.max_drawdown_estimate_pct,
        tier.as_of
      ]);
    });
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Menu — build all four capital models → Tab 30.
 */
function runPortfolioConstructionMenu() {
  var payload = runPortfolioConstructionEngine_();
  var ok = (payload.tiers || []).filter(function(t) { return t.ok; }).length;
  SpreadsheetApp.getUi().alert(
    'Portfolio Construction Engine',
    'Built ' + ok + ' / ' + PORTFOLIO_CAPITAL_TIERS_.length + ' capital tiers.\n' +
      'Tab 30 PORTFOLIO MODELS updated.\n\n' +
      'API: ?action=portfolio&capital=1000000',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Menu — preview ₹10L model in dialog.
 */
function previewPortfolioConstruction() {
  var model = buildPortfolioModelForCapital_(SpreadsheetApp.getActiveSpreadsheet(), 1000000);
  if (!model.ok) {
    SpreadsheetApp.getUi().alert(model.error || 'Build failed');
    return;
  }
  var lines = [
    '₹' + model.capital_inr.toLocaleString('en-IN') + ' model',
    'Conviction ' + model.portfolio_conviction_score + '/100',
    'Est. max DD ' + model.max_drawdown_estimate_pct + '%',
    'Core ' + model.suggested_allocation.core.actual_pct + '% · Growth ' +
      model.suggested_allocation.growth.actual_pct + '% · Opp ' +
      model.suggested_allocation.opportunistic.actual_pct + '%',
    '',
    'Top positions:'
  ];
  (model.positions || []).slice(0, 6).forEach(function(p) {
    lines.push(p.symbol + ' ' + p.bucket + ' ₹' + p.amount_inr + ' (' + p.weight_pct + '%)');
  });
  SpreadsheetApp.getUi().alert(lines.join('\n').substring(0, 1800));
}
