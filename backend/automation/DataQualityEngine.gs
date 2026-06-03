/**
 * Data Quality Engine — Tab 10 data_quality_pct + quality_grade (A–F).
 * See docs/DATA_QUALITY_ENGINE.md
 *
 * Tab 11 gate: quality_score < DATA_QUALITY_TAB11_MIN_SCORE_ (60) → excluded.
 */

var DATA_QUALITY_TAB11_MIN_SCORE_ = 60;

var DATA_QUALITY_WEIGHTS_ = {
  fundamentals_coverage: 0.25,
  sector_mapping: 0.10,
  valuation_availability: 0.15,
  momentum_availability: 0.15,
  news_availability: 0.10,
  institutional_availability: 0.15,
  freshness: 0.10
};

/**
 * @typedef {Object} DataQualityResult
 * @property {number} quality_score 0–100
 * @property {string} quality_grade A|B|C|D|F
 * @property {Object} components dimension scores 0–100
 * @property {Array<string>} missing
 * @property {Array<string>} stale
 * @property {boolean} data_gate_flag
 * @property {string} rationale
 */

/**
 * Build once per rebuild batch.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildDataQualityContext_(ss) {
  var fundamentals = buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS'));
  var prices = buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS'));
  var universeBySym = buildUniverseBySymbol_(loadSheetData_(ss, '1. UNIVERSE'));
  return {
    fundamentals: fundamentals,
    prices: prices,
    universeBySym: universeBySym,
    newsCount30d: buildNewsArticleCountBySymbol_(ss, 30),
    dealsBySym: buildSymbolSetFromSheet_(ss, '4. BULK & LARGE DEALS', 1),
    shareholdingBySym: buildSymbolSetFromSheet_(ss, '24. SHAREHOLDING PATTERN', 0),
    promoterBySym: buildSymbolSetFromSheet_(ss, '18. PROMOTER ACTIVITY', 0),
    tab4Rows: dqRowCount_(ss, '4. BULK & LARGE DEALS'),
    tab24Rows: dqRowCount_(ss, '24. SHAREHOLDING PATTERN'),
    tab7Rows: dqRowCount_(ss, '7. NEWS FLOW')
  };
}

/**
 * Primary API — data quality for one symbol.
 * @param {string} symbol
 * @param {Object=} ctx from buildDataQualityContext_(ss)
 * @param {Object=} rowOpts optional Tab 10 row hints { newsEvents, filingsN, orderN, sectorRank }
 * @return {DataQualityResult}
 */
function dataQualityScore(symbol, ctx, rowOpts) {
  var sym = normalizeSymbolKey_(symbol);
  if (!sym) {
    return emptyDataQualityResult_('invalid_symbol');
  }
  if (!ctx) {
    ctx = buildDataQualityContext_(SpreadsheetApp.getActiveSpreadsheet());
  }
  rowOpts = rowOpts || {};

  var f = ctx.fundamentals[sym] || null;
  var p = ctx.prices[sym] || null;
  var u = ctx.universeBySym[sym] || null;
  var missing = [];
  var stale = [];

  var components = {
    fundamentals_coverage: scoreFundamentalsCoverage_(f, missing),
    sector_mapping: scoreSectorMapping_(f, u, missing),
    valuation_availability: scoreValuationAvailability_(f, missing),
    momentum_availability: scoreMomentumAvailability_(p, missing, stale),
    news_availability: scoreNewsAvailability_(sym, ctx, rowOpts, missing),
    institutional_availability: scoreInstitutionalAvailability_(sym, ctx, f, missing),
    freshness: scoreDataFreshness_(f, p, missing, stale)
  };

  var quality_score = 0;
  Object.keys(DATA_QUALITY_WEIGHTS_).forEach(function(key) {
    quality_score += (components[key] || 0) * DATA_QUALITY_WEIGHTS_[key];
  });
  quality_score = Math.max(0, Math.min(100, Math.round(quality_score)));

  var quality_grade = qualityGradeFromScore_(quality_score);
  var data_gate_flag = computeDataGateFlag_(f);
  var rationale = buildDataQualityRationale_(quality_score, quality_grade, components, missing, stale);

  return {
    quality_score: quality_score,
    quality_grade: quality_grade,
    components: components,
    missing: missing,
    stale: stale,
    data_gate_flag: data_gate_flag,
    fundamentals_age_days: f ? f.ageDays : '',
    rationale: rationale,
    tab11_eligible: quality_score >= DATA_QUALITY_TAB11_MIN_SCORE_
  };
}

/**
 * Map engine output to legacy computeDataQualityReport_ shape for Tab 10 columns.
 * @param {DataQualityResult} dq
 * @return {Object}
 */
function mapDataQualityToLegacyReport_(dq) {
  var comp = dq.components || {};
  var dimAvg = Math.round(
    (num_(comp.fundamentals_coverage) + num_(comp.sector_mapping) +
      num_(comp.valuation_availability) + num_(comp.momentum_availability) +
      num_(comp.news_availability) + num_(comp.institutional_availability)) / 6
  );
  var penalty = 0;
  if (num_(comp.freshness) < 50) penalty = 0.15;
  if (num_(comp.freshness) < 30) penalty = 0.2;
  if (dq.stale && dq.stale.length) penalty = Math.max(penalty, 0.2);

  return {
    missing: dq.missing || [],
    stale: dq.stale || [],
    completenessPct: dimAvg,
    freshnessPct: num_(comp.freshness),
    sourceReliabilityPct: Math.round(
      (num_(comp.fundamentals_coverage) + num_(comp.institutional_availability) +
        num_(comp.sector_mapping)) / 3
    ),
    dataQualityPct: dq.quality_score,
    qualityGrade: dq.quality_grade,
    dataGateFlag: dq.data_gate_flag,
    fundamentalsAgeDays: dq.fundamentals_age_days,
    stalenessPenalty: penalty,
    keyFields: dq.data_gate_flag ? 3 : 0,
    rationale: dq.rationale,
    components: comp,
    tab11Eligible: dq.tab11_eligible
  };
}

/**
 * @param {string} reason
 * @return {DataQualityResult}
 */
function emptyDataQualityResult_(reason) {
  return {
    quality_score: 0,
    quality_grade: 'F',
    components: {},
    missing: ['ALL', reason],
    stale: [],
    data_gate_flag: false,
    fundamentals_age_days: '',
    rationale: 'No data quality inputs (' + reason + ')',
    tab11_eligible: false
  };
}

/**
 * @param {number} score
 * @return {string}
 */
function qualityGradeFromScore_(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * @param {Object|null} f
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreFundamentalsCoverage_(f, missing) {
  if (!f) {
    missing.push('TAB6_ROW');
    return 0;
  }
  var pts = 0;
  if (f.roce > 0) pts += 18;
  else missing.push('TAB6_ROCE');
  if (f.roe > 0) pts += 18;
  else missing.push('TAB6_ROE');
  if (f.revYoy !== 0) pts += 14;
  else missing.push('TAB6_REV_YOY');
  if (f.patYoy !== 0) pts += 14;
  else missing.push('TAB6_PAT_YOY');
  if (f.pe > 0) pts += 12;
  else missing.push('TAB6_PE');
  if (f.pb > 0) pts += 12;
  else missing.push('TAB6_PB');
  if (f.debtEquity > 0) pts += 12;
  else missing.push('TAB6_DEBT');
  return Math.min(100, pts);
}

/**
 * @param {Object|null} f
 * @param {Object|null} u
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreSectorMapping_(f, u, missing) {
  var pts = 0;
  if (u && (u.sectorKey || u.sectorRaw)) pts += 40;
  else missing.push('UNIVERSE_SECTOR');
  if (f && f.sectorNormalized) pts += 35;
  else if (f) missing.push('TAB6_SECTOR_NORM');
  if (u && u.marketCapCr > 0) pts += 25;
  else missing.push('UNIVERSE_MCAP');
  return Math.min(100, pts);
}

/**
 * @param {Object|null} f
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreValuationAvailability_(f, missing) {
  if (!f) {
    missing.push('TAB6_VALUATION');
    return 0;
  }
  var pts = 0;
  if (f.pe > 0) pts += 30;
  else missing.push('TAB6_PE');
  if (f.pb > 0) pts += 25;
  else missing.push('TAB6_PB');
  if (f.peVs3y > 0) pts += 25;
  if (f.valuationTag) pts += 20;
  return Math.min(100, pts);
}

/**
 * @param {Object|null} p
 * @param {Array<string>} missing
 * @param {Array<string>} stale
 * @return {number}
 */
function scoreMomentumAvailability_(p, missing, stale) {
  if (!p || p.price <= 0) {
    missing.push('TAB2_PRICE');
    return 0;
  }
  var pts = 25;
  if (p.dma50 > 0) pts += 20;
  else missing.push('TAB2_DMA50');
  if (p.dma200 > 0) pts += 20;
  else missing.push('TAB2_DMA200');
  if (p.vs50 !== 0 || p.dma50 > 0) pts += 15;
  if (p.vs200 !== 0 || p.dma200 > 0) pts += 10;
  if (p.rsi > 0) pts += 10;
  else missing.push('TAB2_RSI');
  if (p.high52 > 0) pts += 5;
  if (p.ageDays >= (typeof PRICE_STALE_WARN_DAYS !== 'undefined' ? PRICE_STALE_WARN_DAYS : 7)) {
    stale.push('TAB2_AGE_' + p.ageDays + 'D');
  }
  return Math.min(100, pts);
}

/**
 * @param {string} sym
 * @param {Object} ctx
 * @param {Object} rowOpts
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreNewsAvailability_(sym, ctx, rowOpts, missing) {
  var count = (ctx.newsCount30d && ctx.newsCount30d[sym]) || 0;
  var newsEvents = num_(rowOpts.newsEvents);
  var pts = 15;
  if (count >= 5) pts = 100;
  else if (count >= 2) pts = 70;
  else if (count === 1) pts = 45;
  else {
    missing.push('TAB7_NEWS');
    if (ctx.tab7Rows === 0) missing.push('TAB7_EMPTY');
  }
  if (newsEvents >= 4) pts = Math.min(100, pts + 15);
  if (num_(rowOpts.filingsN) > 0 || num_(rowOpts.orderN) > 0) pts = Math.min(100, pts + 10);
  return pts;
}

/**
 * @param {string} sym
 * @param {Object} ctx
 * @param {Object|null} f
 * @param {Array<string>} missing
 * @return {number}
 */
function scoreInstitutionalAvailability_(sym, ctx, f, missing) {
  var pts = 10;
  if (ctx.dealsBySym && ctx.dealsBySym[sym]) pts += 30;
  else if (ctx.tab4Rows === 0) missing.push('TAB4_EMPTY');
  else missing.push('TAB4_NO_SYMBOL');
  if (ctx.shareholdingBySym && ctx.shareholdingBySym[sym]) pts += 25;
  else if (ctx.tab24Rows === 0) missing.push('TAB24_EMPTY');
  else missing.push('TAB24_NO_SYMBOL');
  if (ctx.promoterBySym && ctx.promoterBySym[sym]) pts += 20;
  else missing.push('TAB18_NO_SYMBOL');
  if (f && f.fiiHolding > 0) pts += 15;
  else if (f) missing.push('TAB6_FII');
  return Math.min(100, pts);
}

/**
 * @param {Object|null} f
 * @param {Object|null} p
 * @param {Array<string>} missing
 * @param {Array<string>} stale
 * @return {number}
 */
function scoreDataFreshness_(f, p, missing, stale) {
  var pts = 100;
  if (!f) {
    missing.push('TAB6_ROW');
    pts -= 50;
  } else {
    if (f.ageDays >= (typeof FUNDAMENTALS_STALE_ZERO_DAYS !== 'undefined' ?
      FUNDAMENTALS_STALE_ZERO_DAYS : 180) || f.staleFlag) {
      stale.push('TAB6_STALE_FLAG');
      pts -= 50;
    } else if (f.ageDays >= (typeof FUNDAMENTALS_STALE_SCORE_DAYS !== 'undefined' ?
      FUNDAMENTALS_STALE_SCORE_DAYS : 90)) {
      stale.push('TAB6_AGE_' + f.ageDays + 'D');
      pts -= 25;
    }
  }
  if (!p || p.price <= 0) {
    pts -= 25;
  } else if (p.ageDays >= (typeof PRICE_STALE_ZERO_DAYS !== 'undefined' ?
    PRICE_STALE_ZERO_DAYS : 30)) {
    stale.push('TAB2_STALE');
    pts -= 30;
  } else if (p.ageDays >= (typeof PRICE_STALE_WARN_DAYS !== 'undefined' ?
    PRICE_STALE_WARN_DAYS : 7)) {
    stale.push('TAB2_AGE_' + p.ageDays + 'D');
    pts -= 15;
  }
  return Math.max(0, pts);
}

/**
 * @param {Object|null} f
 * @return {boolean}
 */
function computeDataGateFlag_(f) {
  if (!f) return false;
  var keyFields = 0;
  if (f.roce > 0) keyFields++;
  if (f.roe > 0) keyFields++;
  if (f.revYoy !== 0) keyFields++;
  if (f.debtEquity > 0) keyFields++;
  if (f.pe > 0) keyFields++;
  return keyFields >= 3;
}

/**
 * @param {number} score
 * @param {string} grade
 * @param {Object} components
 * @param {Array<string>} missing
 * @param {Array<string>} stale
 * @return {string}
 */
function buildDataQualityRationale_(score, grade, components, missing, stale) {
  var weak = [];
  Object.keys(components).forEach(function(k) {
    if (num_(components[k]) < 50) weak.push(k.replace(/_/g, ' ') + '=' + components[k]);
  });
  var parts = ['Grade ' + grade + ' (' + score + '/100)'];
  if (weak.length) parts.push('Weak: ' + weak.slice(0, 3).join(', '));
  if (score < DATA_QUALITY_TAB11_MIN_SCORE_) {
    parts.push('Below Tab 11 minimum (' + DATA_QUALITY_TAB11_MIN_SCORE_ + ')');
  }
  if (stale.length) parts.push('Stale: ' + stale.slice(0, 2).join(','));
  if (missing.length && score < 40) parts.push('Missing: ' + missing.slice(0, 3).join(','));
  return parts.join('. ') + '.';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @param {number} symCol
 * @return {Object}
 */
function buildSymbolSetFromSheet_(ss, sheetName, symCol) {
  var set = {};
  loadSheetData_(ss, sheetName).forEach(function(r) {
    var sym = normalizeSymbolKey_(r[symCol]);
    if (sym) set[sym] = true;
  });
  return set;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @return {number}
 */
function dqRowCount_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getLastRow() - 1;
}

/**
 * Menu — preview grades for watchlist symbols.
 */
function previewDataQualityScores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = buildDataQualityContext_(ss);
  var syms = collectWatchlistSymbols_(ss).slice(0, 8);
  var lines = ['Data quality preview (Engine)'];
  syms.forEach(function(sym) {
    var r = dataQualityScore(sym, ctx);
    lines.push(sym + ': ' + r.quality_score + '% grade ' + r.quality_grade +
      (r.tab11_eligible ? ' Tab11 OK' : ' NO Tab11') + ' — ' + r.rationale);
  });
  SpreadsheetApp.getUi().alert(lines.join('\n\n').substring(0, 1800));
}
