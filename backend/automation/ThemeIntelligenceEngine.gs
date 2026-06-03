/**
 * Theme Intelligence Engine v2 — 10 themes, per-stock exposure/strength/momentum.
 * Outputs: Top Themes, Theme Winners, Theme Conviction → Tab 11 + recommendations.
 *
 * Themes: Defense, Railways, Power, Data Centers, AI, EMS, Manufacturing,
 * China+1, Renewables, Capital Goods.
 *
 * See docs/THEME_INTELLIGENCE_ENGINE.md
 */

var THEME_INTEL_VERSION_ = '2.0';
var THEME_INTEL_SHEET_ = '27. THEME INTELLIGENCE';
var THEME_STOCK_SHEET_ = '28. STOCK THEME SCORES';
var LAST_THEME_INTEL_JSON_PROP_ = 'LAST_THEME_INTELLIGENCE_JSON';

var TI_COL_THEME_CONVICTION_ = 57;
var TI_COL_PRIMARY_THEME_ = 58;
var TI_COL_THEME_EXPOSURE_ = 61;
var TI_COL_THEME_STRENGTH_ = 62;
var TI_COL_THEME_MOMENTUM_ = 63;

var THEME_DIM_WEIGHTS_ = {
  theme_strength: 0.25,
  theme_momentum: 0.2,
  government_support: 0.2,
  capex_cycle: 0.2,
  order_momentum: 0.15
};

/** Themes with structurally high government / capex tailwinds. */
var THEME_GOV_BIAS_ = {
  DEFENSE: 15, RAILWAYS: 18, POWER: 12, RENEWABLES: 14, CHINA_PLUS_1: 10,
  MANUFACTURING: 8, DATA_CENTERS: 6, EMS: 8, AI: 4, CAPITAL_GOODS: 10
};

var THEME_CAPEX_BIAS_ = {
  RAILWAYS: 15, POWER: 14, RENEWABLES: 12, DATA_CENTERS: 12, DEFENSE: 10,
  MANUFACTURING: 8, EMS: 6, CHINA_PLUS_1: 5, AI: 4, CAPITAL_GOODS: 14
};

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildThemeIntelligenceContext_(ss) {
  if (typeof applyInvestmentThemeTagsToUniverse_ === 'function') {
    try { applyInvestmentThemeTagsToUniverse_(ss); } catch (e) { Logger.log(e); }
  }

  var universeMap = buildUniverseLookup_(ss);
  var candidates = [];
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (scoreSheet && scoreSheet.getLastRow() >= 2) {
    var n = scoreSheet.getLastRow() - 1;
    var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 59;
    scoreSheet.getRange(2, 1, n, cols).getValues().forEach(function(r) {
      var c = buildScoringCandidate_(r, universeMap);
      if (!c.symbol || c.excluded) return;
      c.themeTags = c.themeTags && c.themeTags.length ?
        c.themeTags :
        parseThemeTags_(universeMap[c.symbol] ? universeMap[c.symbol].themeTags : '');
      if (!c.themeTags.length && typeof inferInvestmentThemesForSymbol_ === 'function') {
        c.themeTags = inferInvestmentThemesForSymbol_(c.symbol, c.companyName, c.sectorKey, '');
      }
      candidates.push(c);
    });
  }

  return {
    asOf: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    universeMap: universeMap,
    candidates: candidates,
    sectorLookup: buildSectorStrengthLookup_(loadSheetData_(ss, '19. SECTOR STRENGTH')),
    macroRows: loadSheetData_(ss, '20. MACRO BENEFICIARIES'),
    orderRows: loadSheetData_(ss, '16. ORDER BOOK TRACKER'),
    announcementRows: loadSheetData_(ss, '3. NSE/BSE ANNOUNCEMENTS'),
    newsRows: loadSheetData_(ss, '7. NEWS FLOW'),
    orderBySym: buildOrderMomentumBySymbol_(loadSheetData_(ss, '16. ORDER BOOK TRACKER')),
    announceOrderBySym: buildAnnouncementOrderHitsBySymbol_(loadSheetData_(ss, '3. NSE/BSE ANNOUNCEMENTS'))
  };
}

/**
 * @param {Array<Array>} orderRows
 * @return {Object}
 */
function buildOrderMomentumBySymbol_(orderRows) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  var map = {};
  orderRows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d || d < cutoff) return;
    if (!map[sym]) map[sym] = { count: 0, valueCr: 0 };
    map[sym].count++;
    map[sym].valueCr += num_(r[2]);
  });
  return map;
}

/**
 * @param {Array<Array>} rows
 * @return {Object}
 */
function buildAnnouncementOrderHitsBySymbol_(rows) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);
  var map = {};
  var keys = ['order', 'contract', 'loa', 'work order', 'letter of award', 'bagged'];
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d || d < cutoff) return;
    var h = String(r[2] || '').toLowerCase();
    var hit = keys.some(function(k) { return h.indexOf(k) >= 0; });
    if (hit) map[sym] = (map[sym] || 0) + 1;
  });
  return map;
}

/**
 * @param {Object} def theme def
 * @param {Object} ctx
 * @param {Array<Object>} members candidates in theme
 * @return {Object}
 */
function scoreThemeDimensions_(def, ctx, members) {
  var strength = scoreThemeStrength_(def, ctx, members);
  var momentum = scoreThemeMomentum_(def, ctx, members);
  var gov = scoreThemeGovernmentSupport_(def, ctx, members);
  var capex = scoreThemeCapexCycle_(def, ctx, members);
  var order = scoreThemeOrderMomentum_(def, ctx, members);

  var conviction = Math.round(
    strength * THEME_DIM_WEIGHTS_.theme_strength +
    momentum * THEME_DIM_WEIGHTS_.theme_momentum +
    gov * THEME_DIM_WEIGHTS_.government_support +
    capex * THEME_DIM_WEIGHTS_.capex_cycle +
    order * THEME_DIM_WEIGHTS_.order_momentum
  );
  conviction = Math.max(0, Math.min(100, conviction));

  return {
    theme_id: def.id,
    theme_label: def.label,
    theme_strength: strength,
    theme_momentum: momentum,
    government_support: gov,
    capex_cycle: capex,
    order_momentum: order,
    theme_conviction_score: conviction,
    symbol_count: members.length
  };
}

/**
 * @param {Object} def
 * @param {Object} ctx
 * @param {Array<Object>} members
 * @return {number}
 */
function scoreThemeStrength_(def, ctx, members) {
  var scores = [];
  (def.linked_sectors || []).forEach(function(sec) {
    var info = ctx.sectorLookup[sec];
    if (!info || !info.rank) return;
    scores.push(Math.max(0, 100 - (info.rank - 1) * 8));
  });
  members.forEach(function(c) {
    scores.push(Math.min(100, num_(c.sectorStrength) * 10));
    scores.push(num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore) || num_(c.sectorStrength) * 8);
  });
  if (!scores.length) return 40;
  return Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length);
}

/**
 * @param {Object} def
 * @param {Object} ctx
 * @param {Array<Object>} members
 * @return {number}
 */
function scoreThemeMomentum_(def, ctx, members) {
  var scores = [];
  (def.linked_sectors || []).forEach(function(sec) {
    var info = ctx.sectorLookup[sec];
    if (!info) return;
    var m = String(info.momentum || '').toLowerCase();
    if (m.indexOf('up') >= 0 || m.indexOf('improv') >= 0) scores.push(75);
    else if (m.indexOf('down') >= 0) scores.push(35);
    else scores.push(50);
  });
  members.forEach(function(c) {
    scores.push(Math.min(100, num_(c.technicalMomentum) * 20));
    if (c.horizon1m || c.horizon3m) scores.push(65);
  });
  if (!scores.length) return 45;
  return Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length);
}

/**
 * @param {Object} def
 * @param {Object} ctx
 * @param {Array<Object>} members
 * @return {number}
 */
function scoreThemeGovernmentSupport_(def, ctx, members) {
  var score = THEME_GOV_BIAS_[def.id] || 5;
  ctx.macroRows.forEach(function(r) {
    var metric = String(r[0] || '').toUpperCase();
    if (metric.indexOf('THEME:' + def.label.toUpperCase()) >= 0 ||
        metric.indexOf(def.id) >= 0) {
      var bias = String(r[3] || '').toLowerCase();
      if (bias.indexOf('pos') >= 0 || bias.indexOf('bull') >= 0) score += 25;
    }
    if (metric.indexOf('GOV') >= 0 || metric.indexOf('PLI') >= 0 || metric.indexOf('CAPEX') >= 0) {
      var ben = String(r[4] || '').toUpperCase();
      if (ben.indexOf(def.id) >= 0 || (def.linked_sectors || []).some(function(s) {
        return ben.indexOf(s) >= 0;
      })) score += 15;
    }
  });
  if (members.length >= 5) score += 8;
  return Math.max(0, Math.min(100, Math.round(score + 35)));
}

/**
 * @param {Object} def
 * @param {Object} ctx
 * @param {Array<Object>} members
 * @return {number}
 */
function scoreThemeCapexCycle_(def, ctx, members) {
  var score = THEME_CAPEX_BIAS_[def.id] || 5;
  members.forEach(function(c) {
    if (num_(c.orderbookSignals) > 0) score += 8;
  });
  var orderVal = 0;
  members.forEach(function(c) {
    var o = ctx.orderBySym[c.symbol];
    if (o) orderVal += o.valueCr;
  });
  if (orderVal > 500) score += 20;
  else if (orderVal > 100) score += 12;
  ctx.macroRows.forEach(function(r) {
    if (String(r[0] || '').toLowerCase().indexOf('capex') >= 0) {
      score += 10;
    }
  });
  return Math.max(0, Math.min(100, Math.round(score + 30)));
}

/**
 * @param {Object} def
 * @param {Object} ctx
 * @param {Array<Object>} members
 * @return {number}
 */
function scoreThemeOrderMomentum_(def, ctx, members) {
  var hits = 0;
  var orders = 0;
  members.forEach(function(c) {
    orders += num_(c.orderbookSignals);
    hits += ctx.announceOrderBySym[c.symbol] || 0;
    var o = ctx.orderBySym[c.symbol];
    if (o && o.count > 0) hits += o.count;
  });
  var score = 35 + Math.min(40, orders * 6) + Math.min(25, hits * 5);
  if (members.length && orders / members.length >= 0.5) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Full engine run.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function runThemeIntelligenceEngine_(ss) {
  var ctx = buildThemeIntelligenceContext_(ss);
  var defs = typeof getInvestmentThemeDefs_ === 'function' ?
    getInvestmentThemeDefs_ : [];
  var themes = [];
  var stockThemeRows = [];

  defs.forEach(function(def) {
    var members = ctx.candidates.filter(function(c) {
      return c.themeTags.indexOf(def.id) >= 0;
    });
    var scored = scoreThemeDimensions_(def, ctx, members);
    scored.members = members;
    themes.push(scored);

    members.forEach(function(c) {
      var metrics = computeStockThemeMetrics_(c, scored);
      var stockThemeConv = computeStockThemeConviction_(c, scored, metrics);
      stockThemeRows.push({
        symbol: c.symbol,
        theme_id: def.id,
        theme_label: def.label,
        theme_exposure: metrics.theme_exposure,
        theme_strength: metrics.theme_strength,
        theme_momentum: metrics.theme_momentum,
        stock_theme_conviction: stockThemeConv,
        theme_conviction_score: stockThemeConv,
        theme_rank_score: scored.theme_conviction_score,
        opportunity_rank: num_(c.opportunityRank) || c.conviction
      });
    });
  });

  themes.sort(function(a, b) {
    return b.theme_conviction_score - a.theme_conviction_score;
  });
  themes.forEach(function(t, i) { t.rank = i + 1; });

  var stockBest = buildStockBestThemeMap_(stockThemeRows);
  writeThemeIntelligenceSheets_(ss, themes, stockThemeRows, ctx.asOf);
  applyThemeIntelligenceToTab10_(ss, stockBest, ctx.asOf);

  var top10Themes = themes.slice(0, 10);
  var topThemeStocks = buildTopThemeStocksList_(stockThemeRows, ctx.candidates, 10);
  var themeWinners = buildThemeWinnersList_(top10Themes, stockThemeRows, ctx.candidates, 10);
  var themeConvictionStocks = buildThemeConvictionStocksList_(ctx.candidates, stockBest, 10);

  var payload = {
    version: THEME_INTEL_VERSION_,
    as_of: ctx.asOf,
    top_themes: top10Themes,
    top10_themes: top10Themes,
    theme_winners: themeWinners,
    top_theme_stocks: topThemeStocks,
    theme_conviction: themeConvictionStocks,
    themes: themes,
    stock_theme_rows: stockThemeRows.length
  };
  try {
    PropertiesService.getScriptProperties().setProperty(
      LAST_THEME_INTEL_JSON_PROP_,
      JSON.stringify(payload).substring(0, 9000)
    );
  } catch (e) {
    Logger.log('theme intel json: ' + e);
  }

  return payload;
}

/**
 * Per-stock × per-theme: exposure %, strength, momentum.
 * @param {Object} c
 * @param {Object} themeScored
 * @return {{theme_exposure:number, theme_strength:number, theme_momentum:number}}
 */
function computeStockThemeMetrics_(c, themeScored) {
  var exposure = 70;
  if ((c.themeTags || []).indexOf(themeScored.theme_id) >= 0) exposure = 92;
  if (typeof inferInvestmentThemesForSymbol_ === 'function') {
    var inferred = inferInvestmentThemesForSymbol_(c.symbol, c.companyName, c.sectorKey, '');
    if (inferred.indexOf(themeScored.theme_id) >= 0) exposure = Math.max(exposure, 88);
  }
  if (num_(c.orderbookSignals) > 0 || num_(c.filingsSignals) > 0) exposure = Math.min(100, exposure + 6);

  var stockStrength = Math.round(
    themeScored.theme_strength * 0.55 +
    Math.min(100, num_(c.sectorStrength) * 10) * 0.25 +
    (num_(c.relativeStrengthScore) || num_(c.qualityScore) || 50) * 0.2
  );
  var stockMomentum = Math.round(
    themeScored.theme_momentum * 0.5 +
    Math.min(100, num_(c.technicalMomentum) * 20) * 0.2 +
    Math.min(100, num_(c.catalystScore) || num_(c.newsEvents) * 8) * 0.15 +
    (c.horizon1w || c.horizon1m ? 70 : 45) * 0.15
  );

  return {
    theme_exposure: Math.max(0, Math.min(100, exposure)),
    theme_strength: Math.max(0, Math.min(100, stockStrength)),
    theme_momentum: Math.max(0, Math.min(100, stockMomentum))
  };
}

/**
 * Stock-level theme conviction = geometric blend (not sum) of theme + stock + exposure.
 * @param {Object} c
 * @param {Object} themeScored
 * @param {Object=} metrics from computeStockThemeMetrics_
 * @return {number}
 */
function computeStockThemeConviction_(c, themeScored, metrics) {
  metrics = metrics || computeStockThemeMetrics_(c, themeScored);
  var themePart = themeScored.theme_conviction_score / 100;
  var stockPart = (num_(c.opportunityRank) || c.conviction) / 100;
  var rel = (num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore) || 50) / 100;
  var exp = metrics.theme_exposure / 100;
  var str = metrics.theme_strength / 100;
  var mom = metrics.theme_momentum / 100;
  var score = Math.round(100 * Math.pow(themePart, 0.32) * Math.pow(Math.max(0.15, stockPart), 0.28) *
    Math.pow(exp, 0.15) * Math.pow(str, 0.12) * Math.pow(mom, 0.08) * Math.pow(rel, 0.05));
  return Math.max(0, Math.min(100, score));
}

/**
 * Aggregate per-symbol theme fields for Tab 10.
 * @param {Array<Object>} themeRows for one symbol
 * @return {Object}
 */
function aggregateStockThemeFields_(themeRows) {
  if (!themeRows || !themeRows.length) {
    return { theme_exposure: '', theme_strength: 0, theme_momentum: 0, primary: '', best: 0 };
  }
  var expMap = {};
  var strSum = 0;
  var momSum = 0;
  var wSum = 0;
  var best = 0;
  var primary = '';
  themeRows.forEach(function(row) {
    var w = num_(row.theme_exposure) / 100;
    if (w <= 0) w = 0.5;
    expMap[row.theme_id] = Math.round(num_(row.theme_exposure));
    strSum += num_(row.theme_strength) * w;
    momSum += num_(row.theme_momentum) * w;
    wSum += w;
    if (num_(row.theme_conviction_score) > best) {
      best = num_(row.theme_conviction_score);
      primary = row.theme_id;
    }
  });
  return {
    theme_exposure: JSON.stringify(expMap),
    theme_strength: wSum ? Math.round(strSum / wSum) : 0,
    theme_momentum: wSum ? Math.round(momSum / wSum) : 0,
    primary: primary,
    best: best
  };
}

/**
 * @param {Array<Object>} stockThemeRows
 * @return {Object} sym → { theme_conviction_score, primary_theme_id, themes[] }
 */
function buildStockBestThemeMap_(stockThemeRows) {
  var bySym = {};
  stockThemeRows.forEach(function(row) {
    var sym = row.symbol;
    if (!bySym[sym]) bySym[sym] = { themes: [] };
    bySym[sym].themes.push(row);
  });
  Object.keys(bySym).forEach(function(sym) {
    var agg = aggregateStockThemeFields_(bySym[sym].themes);
    bySym[sym].best = agg.best;
    bySym[sym].primary = agg.primary;
    bySym[sym].theme_exposure = agg.theme_exposure;
    bySym[sym].theme_strength = agg.theme_strength;
    bySym[sym].theme_momentum = agg.theme_momentum;
  });
  return bySym;
}

/**
 * Best stock per top theme (Theme Winners).
 * @param {Array<Object>} topThemes
 * @param {Array<Object>} stockRows
 * @param {Array<Object>} candidates
 * @param {number} limit
 * @return {Array<Object>}
 */
function buildThemeWinnersList_(topThemes, stockRows, candidates, limit) {
  var candMap = {};
  candidates.forEach(function(c) { candMap[c.symbol] = c; });
  var out = [];
  (topThemes || []).forEach(function(t) {
    if (out.length >= limit) return;
    var inTheme = stockRows.filter(function(r) { return r.theme_id === t.theme_id; });
    inTheme.sort(function(a, b) {
      return b.theme_conviction_score - a.theme_conviction_score;
    });
    if (!inTheme.length) return;
    var row = inTheme[0];
    var c = candMap[row.symbol] || { symbol: row.symbol };
    out.push({
      symbol: row.symbol,
      company_name: c.companyName || row.symbol,
      sector: c.sector || '',
      primary_theme: t.theme_id,
      theme_label: t.theme_label,
      theme_exposure: row.theme_exposure,
      theme_strength: row.theme_strength,
      theme_momentum: row.theme_momentum,
      theme_conviction_score: row.theme_conviction_score,
      theme_rank: t.rank,
      opportunity_rank: row.opportunity_rank
    });
  });
  return out;
}

/**
 * Top stocks by Tab-10 theme conviction (Theme Conviction list).
 * @param {Array<Object>} candidates
 * @param {Object} stockBest
 * @param {number} limit
 * @return {Array<Object>}
 */
function buildThemeConvictionStocksList_(candidates, stockBest, limit) {
  var rows = [];
  candidates.forEach(function(c) {
    var b = stockBest[c.symbol];
    if (!b || !b.best) return;
    rows.push({
      symbol: c.symbol,
      company_name: c.companyName,
      sector: c.sector,
      primary_theme: b.primary,
      theme_exposure: b.theme_exposure,
      theme_strength: b.theme_strength,
      theme_momentum: b.theme_momentum,
      theme_conviction_score: b.best,
      opportunity_rank: num_(c.opportunityRank) || c.conviction
    });
  });
  rows.sort(function(a, b) { return b.theme_conviction_score - a.theme_conviction_score; });
  return rows.slice(0, limit);
}

/**
 * @param {Array<Object>} stockThemeRows
 * @param {Array<Object>} candidates
 * @param {number} limit
 * @return {Array<Object>}
 */
function buildTopThemeStocksList_(stockThemeRows, candidates, limit) {
  var candMap = {};
  candidates.forEach(function(c) { candMap[c.symbol] = c; });
  var sorted = stockThemeRows.slice().sort(function(a, b) {
    return b.theme_conviction_score - a.theme_conviction_score;
  });
  var seen = {};
  var out = [];
  sorted.forEach(function(row) {
    if (seen[row.symbol]) return;
    seen[row.symbol] = true;
    var c = candMap[row.symbol] || { symbol: row.symbol };
    out.push({
      symbol: row.symbol,
      company_name: c.companyName || row.symbol,
      sector: c.sector || '',
      primary_theme: row.theme_id,
      theme_label: row.theme_label,
      theme_conviction_score: row.theme_conviction_score,
      opportunity_rank: row.opportunity_rank,
      conviction_total: num_(c.opportunityRank) || c.conviction
    });
    if (out.length >= limit) return;
  });
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Array<Object>} themes
 * @param {Array<Object>} stockRows
 * @param {string} asOf
 */
function writeThemeIntelligenceSheets_(ss, themes, stockRows, asOf) {
  var h1 = [
    'rank', 'theme_id', 'theme_label', 'theme_strength', 'theme_momentum',
    'government_support', 'capex_cycle', 'order_momentum', 'theme_conviction_score',
    'symbol_count', 'as_of_date'
  ];
  var sh1 = getOrCreateSheet_(THEME_INTEL_SHEET_);
  sh1.getRange(1, 1, 1, h1.length).setValues([h1]);
  var rows1 = themes.map(function(t) {
    return [
      t.rank, t.theme_id, t.theme_label, t.theme_strength, t.theme_momentum,
      t.government_support, t.capex_cycle, t.order_momentum, t.theme_conviction_score,
      t.symbol_count, asOf
    ];
  });
  clearDataBelowHeader_(sh1, h1.length);
  if (rows1.length) sh1.getRange(2, 1, rows1.length, h1.length).setValues(rows1);

  var h2 = [
    'symbol', 'theme_id', 'theme_label', 'theme_exposure', 'theme_strength', 'theme_momentum',
    'stock_theme_conviction', 'theme_conviction_score', 'opportunity_rank', 'as_of_date'
  ];
  var sh2 = getOrCreateSheet_(THEME_STOCK_SHEET_);
  sh2.getRange(1, 1, 1, h2.length).setValues([h2]);
  var rows2 = stockRows.map(function(r) {
    return [
      r.symbol, r.theme_id, r.theme_label,
      r.theme_exposure, r.theme_strength, r.theme_momentum,
      r.stock_theme_conviction || r.theme_conviction_score, r.theme_conviction_score,
      r.opportunity_rank, asOf
    ];
  });
  clearDataBelowHeader_(sh2, h2.length);
  if (rows2.length) sh2.getRange(2, 1, rows2.length, h2.length).setValues(rows2);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} stockBest
 * @param {string} asOf
 */
function applyThemeIntelligenceToTab10_(ss, stockBest, asOf) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) return;
  var n = sheet.getLastRow() - 1;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 59;
  var data = sheet.getRange(2, 1, n, cols).getValues();
  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    var b = stockBest[sym];
    if (!b) {
      data[i][TI_COL_THEME_CONVICTION_] = 0;
      data[i][TI_COL_PRIMARY_THEME_] = '';
      data[i][TI_COL_THEME_EXPOSURE_] = '';
      data[i][TI_COL_THEME_STRENGTH_] = 0;
      data[i][TI_COL_THEME_MOMENTUM_] = 0;
      continue;
    }
    data[i][TI_COL_THEME_CONVICTION_] = b.best;
    data[i][TI_COL_PRIMARY_THEME_] = b.primary;
    data[i][TI_COL_THEME_EXPOSURE_] = b.theme_exposure || '';
    data[i][TI_COL_THEME_STRENGTH_] = b.theme_strength || 0;
    data[i][TI_COL_THEME_MOMENTUM_] = b.theme_momentum || 0;
  }
  sheet.getRange(2, 1, n, cols).setValues(data);
}

/**
 * Enrich candidates with theme intelligence fields.
 * @param {Array<Object>} candidates
 * @param {Object} ctx
 */
function enrichCandidatesWithThemeIntelligence_(candidates, ctx) {
  var payload = runThemeIntelligenceEngine_(SpreadsheetApp.getActiveSpreadsheet());
  var stockRows = payload.stock_theme_rows || [];
  var map = buildStockBestThemeMap_(
    typeof stockRows[0] === 'object' && stockRows[0].symbol ?
      stockRows :
      rebuildStockRowsFromEngine_(payload, candidates)
  );
  candidates.forEach(function(c) {
    var b = map[c.symbol];
    if (b) {
      c.themeConvictionScore = b.best;
      c.primaryThemeId = b.primary;
      c.themeExposure = b.theme_exposure || '';
      c.themeStrength = b.theme_strength || 0;
      c.themeMomentum = b.theme_momentum || 0;
      c.themeMemberships = b.themes;
    }
  });
}

/**
 * @param {Object} payload
 * @param {Array<Object>} candidates
 * @return {Array<Object>}
 */
function rebuildStockRowsFromEngine_(payload, candidates) {
  var rows = [];
  var topStocks = payload.top_theme_stocks || [];
  topStocks.forEach(function(s) {
    rows.push({
      symbol: s.symbol,
      theme_id: s.primary_theme,
      theme_conviction_score: s.theme_conviction_score
    });
  });
  return rows;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function getThemeIntelligencePayload_(ss) {
  var raw = PropertiesService.getScriptProperties().getProperty(LAST_THEME_INTEL_JSON_PROP_);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return runThemeIntelligenceEngine_(ss);
}

/**
 * Append Top 10 Themes + Top 10 Theme Stocks rows to Tab 11 output.
 * @param {Array<Array>} out
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} refreshed
 */
function appendThemeIntelligenceTab11Lists_(out, ss, refreshed) {
  var intel = getThemeIntelligencePayload_(ss);
  var universeMap = buildUniverseLookup_(ss);

  appendThemeTab11ListRows_(out, intel.top_themes || intel.top10_themes, 'Top Themes', refreshed, universeMap, ss, true);
  appendThemeTab11ListRows_(out, intel.theme_winners, 'Theme Winners', refreshed, universeMap, ss, false);
  appendThemeTab11ListRows_(out, intel.theme_conviction, 'Theme Conviction', refreshed, universeMap, ss, false);
  appendThemeTab11ListRows_(out, intel.top_theme_stocks, 'Top 10 Theme Stocks', refreshed, universeMap, ss, false);
}

/**
 * @param {Array<Array>} out
 * @param {Array<Object>} items
 * @param {string} listName
 * @param {string} refreshed
 * @param {Object} universeMap
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {boolean} isThemeRow
 */
function appendThemeTab11ListRows_(out, items, listName, refreshed, universeMap, ss, isThemeRow) {
  (items || []).slice(0, 10).forEach(function(t, idx) {
    if (isThemeRow) {
    var themeNote = typeof buildThemeListAnalystNote_ === 'function' ?
      buildThemeListAnalystNote_(t, idx + 1) : null;
    var themeNar = themeNote && typeof mapAnalystNoteToNarrative_ === 'function' ?
      mapAnalystNoteToNarrative_(themeNote, { symbol: t.theme_id }, { pass: true, confidence: themeNote.confidence, reasons: [] }) :
      null;
    out.push([
      listName,
      idx + 1,
      t.theme_id,
      t.theme_label,
      'THEME',
      t.theme_conviction_score,
      themeNar ? themeNar.bull : ('Theme conviction ' + t.theme_conviction_score + '/100 · S' +
        t.theme_strength + ' M' + t.theme_momentum),
      themeNar ? themeNar.bear : 'Macro/flow reversal; single-theme concentration',
      themeNar ? themeNar.catalyst : 'Capex/order pipeline; policy headlines',
      themeNar ? themeNar.horizon : '3-12m',
      themeNar ? themeNar.confidence : Math.min(95, t.theme_conviction_score),
      themeNar ? themeNar.evidence : (listName + ' rank #' + (idx + 1)),
      refreshed
    ]);
      return;
    }

    var sym = t.symbol;
    if (!sym) return;
    var c = buildScoringCandidateFromSymbol_(ss, sym, universeMap);
    c.themeConvictionScore = t.theme_conviction_score || c.themeConvictionScore;
    c.primaryThemeId = t.primary_theme || t.theme_id || c.primaryThemeId;
    c.themeStrength = t.theme_strength || c.themeStrength;
    c.themeMomentum = t.theme_momentum || c.themeMomentum;
    c.themeExposure = t.theme_exposure || c.themeExposure;

    var narrative = typeof buildInstitutionalRecommendationNarrative_ === 'function' ?
      buildInstitutionalRecommendationNarrative_(c, 'theme_stocks', t.theme_conviction_score, listName) :
      null;
    if (!narrative) return;
    var exposureNote = t.theme_exposure ?
      ' Exposure: ' + (typeof t.theme_exposure === 'string' ? t.theme_exposure : t.theme_exposure + '%') : '';
    out.push([
      listName,
      idx + 1,
      sym,
      t.company_name || sym,
      t.sector || '',
      t.theme_conviction_score || num_(c.opportunityRank) || c.conviction,
      narrative.bull + exposureNote,
      narrative.bear,
      narrative.catalyst + ' · Theme strength ' + (t.theme_strength || c.themeStrength) +
        ' · momentum ' + (t.theme_momentum || c.themeMomentum),
      narrative.horizon || '3m',
      narrative.confidence,
      narrative.evidence,
      refreshed
    ]);
  });
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sym
 * @param {Object} universeMap
 * @return {Object}
 */
function buildScoringCandidateFromSymbol_(ss, sym, universeMap) {
  sym = normalizeSymbolKey_(sym);
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (sheet && sheet.getLastRow() >= 2) {
    var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 59;
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (normalizeSymbolKey_(data[i][0]) === sym) {
        return buildScoringCandidate_(data[i], universeMap);
      }
    }
  }
  var u = universeMap[sym] || {};
  return {
    symbol: sym,
    companyName: u.companyName || sym,
    sector: u.sector || '',
    sectorKey: u.sectorKey || '',
    conviction: 0,
    themeTags: parseThemeTags_(u.themeTags || ''),
    themeConvictionScore: 0
  };
}

/** Menu */
function runThemeIntelligenceEngineMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var r = runThemeIntelligenceEngine_(ss);
  SpreadsheetApp.getUi().alert(
    'Theme Intelligence v2 complete',
    'Top theme: ' + (r.top10_themes[0] ? r.top10_themes[0].theme_label + ' (' +
      r.top10_themes[0].theme_conviction_score + ')' : '—') +
      '\nTheme Winners: ' + (r.theme_winners ? r.theme_winners.length : 0) +
      '\nTheme Conviction picks: ' + (r.theme_conviction ? r.theme_conviction.length : 0) +
      '\nTabs 27/28 + Tab 10 theme columns updated.\nSync recommendations for Tab 11 lists.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Menu */
function previewThemeIntelligence() {
  var r = runThemeIntelligenceEngine_(SpreadsheetApp.getActiveSpreadsheet());
  var lines = ['Top Themes'];
  (r.top10_themes || []).forEach(function(t) {
    lines.push('#' + t.rank + ' ' + t.theme_label + ' conv=' + t.theme_conviction_score +
      ' [S' + t.theme_strength + ' M' + t.theme_momentum + ']');
  });
  lines.push('', 'Theme Winners');
  (r.theme_winners || []).forEach(function(s, i) {
    lines.push((i + 1) + '. ' + s.symbol + ' · ' + s.theme_label + ' exp=' + s.theme_exposure +
      ' conv=' + s.theme_conviction_score);
  });
  lines.push('', 'Theme Conviction');
  (r.theme_conviction || []).forEach(function(s, i) {
    lines.push((i + 1) + '. ' + s.symbol + ' · ' + s.primary_theme + ' · conv=' + s.theme_conviction_score);
  });
  SpreadsheetApp.getUi().alert(lines.join('\n').substring(0, 1800));
}
