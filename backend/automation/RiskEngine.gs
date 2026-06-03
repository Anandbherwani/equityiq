/**
 * Risk Engine v2 — six dimensions → risk_score, risk_grade, reward_risk_ratio.
 *
 * Dimensions: Debt, Governance, Pledge, Liquidity, Valuation, Cyclicality (danger 0–100 each).
 * risk_score = safety 0–100 (higher = lower risk). reward_risk_ratio = upside / danger.
 *
 * See docs/RISK_ENGINE.md
 */

var RISK_ENGINE_VERSION_ = '2.0';
var RISK_COL_SCORE_ = 59;
var RISK_COL_GRADE_ = 60;
var RISK_COL_REWARD_RISK_ = 66;
var RISK_SHEET_BREAKDOWN_ = '29. RISK BREAKDOWN';

/** Composite danger at or above → excluded from Tab 11 (safety = 100 − danger). */
var RISK_MAX_DANGER_TAB11_ = 65;
/** Minimum safety for top-list sort multiplier (below → penalized sort key). */
var RISK_MIN_SAFETY_TOP_SORT_ = 42;
/** Danger tier for hard rank cap. */
var RISK_RANK_CAP_DANGER_HIGH_ = 75;
var RISK_RANK_CAP_DANGER_MED_ = 65;
var RISK_RANK_CAP_DANGER_LOW_ = 55;

var RISK_DIMENSION_WEIGHTS_ = {
  debt: 0.20,
  governance: 0.18,
  pledge: 0.15,
  valuation: 0.17,
  cyclicality: 0.15,
  liquidity: 0.15
};

var RISK_CYCLICAL_SECTORS_HIGH_ = [
  'METALS & MINING', 'METALS', 'OIL & GAS', 'AUTOMOBILES', 'AUTO',
  'REAL ESTATE', 'CHEMICALS', 'TEXTILES', 'COMMODITIES'
];
var RISK_CYCLICAL_SECTORS_MED_ = [
  'INFRASTRUCTURE', 'CEMENT', 'POWER', 'INDUSTRIALS', 'CAPITAL GOODS'
];
var RISK_DEFENSIVE_SECTORS_ = [
  'IT SERVICES', 'PHARMACEUTICALS', 'CONSUMER', 'FMCG', 'INSURANCE', 'HEALTHCARE'
];

/**
 * @typedef {Object} RiskEngineResult
 * @property {number} risk_score safety 0–100 (100 = lowest risk)
 * @property {string} risk_grade A–F (A = safest)
 * @property {number} risk_danger composite danger 0–100
 * @property {Object} dimensions per-dimension danger 0–100
 * @property {Array<string>} flags
 * @property {string} summary
 */

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildRiskEngineContext_(ss) {
  return {
    fundamentals: buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS')),
    prices: buildPriceBySymbol_(loadSheetData_(ss, '2. PRICE & TECHNICALS')),
    universeBySym: buildUniverseBySymbol_(loadSheetData_(ss, '1. UNIVERSE')),
    pledgeBySym: buildLatestPledgeBySymbol_(loadSheetData_(ss, '18. PROMOTER ACTIVITY')),
    asOf: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')
  };
}

/**
 * @param {Array<Array>} rows Tab 18
 * @return {Object}
 */
function buildLatestPledgeBySymbol_(rows) {
  var map = {};
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    var d = parseSheetDate_(r[1]);
    var pct = num_(r[9]);
    var trend = String(r[10] || '').toLowerCase();
    if (!map[sym] || (d && (!map[sym].date || d > map[sym].date))) {
      map[sym] = { pledgePct: pct, trend: trend, date: d };
    }
  });
  return map;
}

/**
 * @param {Object} c scoring candidate
 * @param {Object|null} f fundamentals row
 * @param {Object|null} u universe row object
 * @param {Object} ctx buildRiskEngineContext_
 * @return {RiskEngineResult}
 */
function evaluateStockRisk_(c, f, u, ctx) {
  c = c || {};
  u = u || {};
  ctx = ctx || {};
  var flags = [];
  var dims = {
    debt: scoreDebtRisk_(c, f, flags),
    governance: scoreGovernanceRisk_(c, f, u, flags),
    pledge: scorePledgeRisk_(c, u, ctx.pledgeBySym ? ctx.pledgeBySym[c.symbol] : null, flags),
    valuation: scoreValuationRisk_(c, f, flags),
    cyclicality: scoreCyclicalityRisk_(c, f, u, flags),
    liquidity: scoreLiquidityRisk_(c, u, ctx.prices ? ctx.prices[c.symbol] : null, flags)
  };

  var danger = 0;
  Object.keys(RISK_DIMENSION_WEIGHTS_).forEach(function(k) {
    danger += (dims[k] || 0) * RISK_DIMENSION_WEIGHTS_[k];
  });
  danger = Math.max(0, Math.min(100, Math.round(danger)));

  if (c.pumpFlag) {
    danger = Math.min(100, danger + 12);
    flags.push('PUMP_FLAG');
  }
  if (c.sebiInvestigation) {
    danger = Math.min(100, 95);
    flags.push('SEBI');
  }
  if (c.pledgeGt50) {
    danger = Math.min(100, Math.max(danger, 72));
    flags.push('PLEDGE_GT_50');
  }

  var safety = Math.max(0, Math.min(100, 100 - danger));
  var grade = riskGradeFromSafety_(safety);

  return {
    risk_score: safety,
    risk_grade: grade,
    risk_danger: danger,
    dimensions: dims,
    flags: flags,
    summary: buildRiskSummary_(dims, grade, danger)
  };
}

/**
 * @param {Object} c
 * @param {Object|null} f
 * @param {Array<string>} flags
 * @return {number}
 */
function scoreDebtRisk_(c, f, flags) {
  var risk = 18;
  if (!f) {
    flags.push('NO_FUNDAMENTALS_DEBT');
    return 42;
  }
  var de = num_(f.debtEquity);
  if (de > 0) {
    if (de >= 3) { risk = 82; flags.push('DE_GT_3'); }
    else if (de >= 2) { risk = 62; flags.push('DE_GT_2'); }
    else if (de >= 1) { risk = 48; }
    else if (de >= 0.5) { risk = 32; }
    else { risk = 18; }
  }
  var cr = num_(f.currentRatio);
  if (cr > 0 && cr < 0.8) { risk = Math.min(100, risk + 22); flags.push('CURRENT_RATIO_LOW'); }
  else if (cr > 0 && cr < 1) { risk = Math.min(100, risk + 12); }
  if (num_(c.financialStrength) > 0 && num_(c.financialStrength) < 5) {
    risk = Math.min(100, risk + 10);
  }
  return Math.max(0, Math.min(100, risk));
}

/**
 * @param {Object} c
 * @param {Object|null} f
 * @param {Object} u
 * @param {Array<string>} flags
 * @return {number}
 */
function scoreGovernanceRisk_(c, f, u, flags) {
  var risk = 15;
  if (c.sebiInvestigation) return 92;
  if (u.ncltFlag === 'yes' || u.ncltFlag === 'y' || u.ncltFlag === 'true') {
    flags.push('NCLT');
    return 98;
  }
  var aud = String(u.auditorFlag || '').toLowerCase();
  if (aud === 'qualified' || aud === 'bad' || aud === 'adverse') {
    flags.push('AUDITOR');
    return 88;
  }
  if (c.cfoPatDivergence) { risk = Math.max(risk, 55); flags.push('CFO_PAT'); }
  if (c.mgmtExits) { risk = Math.max(risk, 48); flags.push('MGMT_EXITS'); }
  if (f && f.earningsQualityNote) {
    var eq = String(f.earningsQualityNote).toLowerCase();
    if (eq.indexOf('fraud') >= 0 || eq.indexOf('qualified') >= 0 || eq.indexOf('weak') >= 0) {
      risk = Math.max(risk, 60);
      flags.push('EARNINGS_QUALITY');
    }
  }
  return Math.max(0, Math.min(100, risk));
}

/**
 * @param {Object} c
 * @param {Object} u
 * @param {Object|null} pledgeRow
 * @param {Array<string>} flags
 * @return {number}
 */
function scorePledgeRisk_(c, u, pledgeRow, flags) {
  var pct = num_(u.pledgePct);
  if (isNaN(pct) && pledgeRow) pct = num_(pledgeRow.pledgePct);
  var risk = 12;
  if (c.pledgeGt50) {
    flags.push('PLEDGE_50');
    return 78;
  }
  if (!isNaN(pct) && pct > 0) {
    if (pct >= 70) risk = 88;
    else if (pct >= 50) risk = 72;
    else if (pct >= 30) risk = 52;
    else if (pct >= 15) risk = 35;
    else risk = 18;
  }
  if (pledgeRow && (pledgeRow.trend === 'up' || pledgeRow.trend === 'increasing')) {
    risk = Math.min(100, risk + 10);
    flags.push('PLEDGE_TREND_UP');
  }
  if (!isNaN(pct) && pct >= (typeof MAX_PLEDGE_PCT !== 'undefined' ? MAX_PLEDGE_PCT : 30)) {
    flags.push('PLEDGE_ABOVE_CAP');
  }
  return Math.max(0, Math.min(100, risk));
}

/**
 * @param {Object} c
 * @param {Object|null} f
 * @param {Array<string>} flags
 * @return {number}
 */
function scoreValuationRisk_(c, f, flags) {
  var risk = 22;
  if (num_(c.valuation) > 0 && num_(c.valuation) <= 5) {
    risk = Math.max(risk, 38);
    flags.push('LOW_VAL_PILLAR');
  }
  if (num_(c.relativeValuationScore) > 0 && num_(c.relativeValuationScore) < 35) {
    risk = Math.max(risk, 48);
    flags.push('EXPENSIVE_VS_PEERS');
  }
  if (f) {
    var pe = num_(f.pe);
    var medPe = num_(c.sectorMedianPe);
    if (pe > 0 && medPe > 0) {
      var prem = (pe - medPe) / medPe;
      if (prem > 1) { risk = Math.max(risk, 68); flags.push('PE_2X_SECTOR'); }
      else if (prem > 0.5) { risk = Math.max(risk, 52); flags.push('PE_PREMIUM'); }
      else if (prem < -0.25) { risk = Math.min(risk, 28); }
    }
    if (num_(f.peVs3y) > 1.35) {
      risk = Math.max(risk, 55);
      flags.push('PE_VS_3Y_HIGH');
    }
    var tag = String(f.valuationTag || '').toLowerCase();
    if (tag === 'expensive' || tag === 'overvalued') {
      risk = Math.max(risk, 58);
    }
  }
  if (num_(c.valuationScore) > 0 && num_(c.valuationScore) < 30) {
    risk = Math.max(risk, 45);
  }
  return Math.max(0, Math.min(100, risk));
}

/**
 * @param {Object} c
 * @param {Object|null} f
 * @param {Object} u
 * @param {Array<string>} flags
 * @return {number}
 */
function scoreCyclicalityRisk_(c, f, u, flags) {
  var sk = String(c.sectorKey || normalizeSectorName_(u.sector || c.sector || '')).toUpperCase();
  var risk = 28;
  if (RISK_CYCLICAL_SECTORS_HIGH_.some(function(s) { return sk.indexOf(s) >= 0; })) {
    risk = 58;
    flags.push('CYCLICAL_SECTOR');
  } else if (RISK_CYCLICAL_SECTORS_MED_.some(function(s) { return sk.indexOf(s) >= 0; })) {
    risk = 42;
  } else if (RISK_DEFENSIVE_SECTORS_.some(function(s) { return sk.indexOf(s) >= 0; })) {
    risk = 18;
  }
  if (f) {
    var pat = num_(f.patYoy);
    var rev = num_(f.revYoy);
    if (pat < -5 || rev < -8) {
      risk = Math.min(100, risk + 18);
      flags.push('NEGATIVE_GROWTH');
    }
  }
  if (num_(c.sectorRank) > 0 && num_(c.sectorRank) > 12) {
    risk = Math.min(100, risk + 8);
  }
  return Math.max(0, Math.min(100, risk));
}

/**
 * @param {Object} c
 * @param {Object} u
 * @param {Object|null} price
 * @param {Array<string>} flags
 * @return {number}
 */
function scoreLiquidityRisk_(c, u, price, flags) {
  var risk = 20;
  var mcap = num_(u.marketCapCr);
  var cap = String(u.capSegment || '').toLowerCase();
  if (u.isSme) {
    risk = Math.max(risk, 62);
    flags.push('SME');
  }
  if (cap === 'micro') {
    risk = Math.max(risk, 58);
    flags.push('MICRO_CAP');
  } else if (cap === 'small') {
    risk = Math.max(risk, 42);
  }
  if (!isNaN(mcap) && mcap > 0 && mcap < (typeof MIN_MARKET_CAP_CR !== 'undefined' ? MIN_MARKET_CAP_CR : 500)) {
    risk = Math.max(risk, 55);
    flags.push('LOW_MCAP');
  }
  var liq = String(u.liquidityFlag || '').toLowerCase();
  if (liq === 'low' || liq === 'illiquid') {
    risk = Math.max(risk, 52);
    flags.push('LOW_LIQUIDITY');
  } else if (liq !== 'high' && !isNaN(mcap) && mcap < (typeof HIGH_LIQUIDITY_MCAP_CR !== 'undefined' ?
    HIGH_LIQUIDITY_MCAP_CR : 5000)) {
    risk = Math.max(risk, 32);
  }
  if (price && num_(price.vol) > 0 && num_(price.vol) < 50000) {
    risk = Math.min(100, risk + 8);
  }
  if (String(c.staleFlags || '').toUpperCase().indexOf('TAB2') >= 0) {
    risk = Math.min(100, risk + 6);
  }
  return Math.max(0, Math.min(100, risk));
}

/**
 * Safety 0–100 → grade (A safest).
 * @param {number} safety
 * @return {string}
 */
function riskGradeFromSafety_(safety) {
  if (safety >= 82) return 'A';
  if (safety >= 68) return 'B';
  if (safety >= 54) return 'C';
  if (safety >= 40) return 'D';
  return 'F';
}

/**
 * @param {Object} dims
 * @param {string} grade
 * @param {number} danger
 * @return {string}
 */
function buildRiskSummary_(dims, grade, danger) {
  var top = Object.keys(dims).sort(function(a, b) {
    return (dims[b] || 0) - (dims[a] || 0);
  }).slice(0, 2).map(function(k) {
    return k + ' ' + Math.round(dims[k]) + '/100';
  });
  return 'Grade ' + grade + ' · danger ' + Math.round(danger) + ' · top: ' + top.join(', ');
}

/**
 * Cap opportunity rank when risk is excessive (cannot rank highly with high danger).
 * @param {number} rank
 * @param {number} danger
 * @param {number} safety
 * @return {number}
 */
function applyRiskCapToOpportunityRank_(rank, danger, safety) {
  rank = num_(rank);
  if (danger >= RISK_RANK_CAP_DANGER_HIGH_) return Math.min(rank, 22);
  if (danger >= RISK_RANK_CAP_DANGER_MED_) return Math.min(rank, 38);
  if (danger >= RISK_RANK_CAP_DANGER_LOW_) return Math.round(rank * 0.82);
  if (safety < RISK_MIN_SAFETY_TOP_SORT_) return Math.round(rank * 0.88);
  return rank;
}

/**
 * Upside / risk / reward-risk for Tab 11 and API (no rescoring).
 * @param {Object} c
 * @return {{upside_score:number, risk_danger:number, risk_grade:string, risk_label:string, reward_risk_ratio:number}}
 */
function buildRiskRewardMetrics_(c) {
  c = c || {};
  var upside = num_(c.opportunityRank) || num_(c.conviction) || 0;
  var safety = num_(c.riskScore);
  var danger = num_(c.riskDanger);
  if (!danger && safety > 0) danger = 100 - safety;
  if (!danger && !safety) danger = 50;
  if (!safety && danger) safety = 100 - danger;
  var grade = String(c.riskGrade || riskGradeFromSafety_(safety)).trim();
  var label = formatRiskDangerLabel_(danger, grade);
  var rr = upside / Math.max(8, danger);
  return {
    upside_score: Math.round(upside),
    risk_danger: Math.round(danger),
    risk_grade: grade,
    risk_label: label,
    reward_risk_ratio: Math.round(rr * 100) / 100
  };
}

/**
 * @param {number} danger
 * @param {string} grade
 * @return {string}
 */
function formatRiskDangerLabel_(danger, grade) {
  var tier = danger >= 70 ? 'High' : (danger >= 50 ? 'Medium' : 'Low');
  return tier + ' (grade ' + (grade || '—') + ', danger ' + Math.round(danger) + '/100)';
}

/**
 * @param {Object} c
 * @return {boolean}
 */
function isExcessiveStockRisk_(c) {
  if (!c) return true;
  if (c.pumpFlag || c.sebiInvestigation) return true;
  var danger = num_(c.riskDanger);
  if (!danger && num_(c.riskScore) > 0) danger = 100 - num_(c.riskScore);
  if (danger >= RISK_MAX_DANGER_TAB11_) return true;
  var g = String(c.riskGrade || '').toUpperCase();
  if (g === 'F') return true;
  if (g === 'D' && danger >= 58) return true;
  return false;
}

/**
 * Sort-key multiplier — penalize excessive risk so names cannot rank at top.
 * @param {Object} c
 * @return {number}
 */
function recommendationRiskSortMultiplier_(c) {
  var safety = num_(c.riskScore);
  var danger = num_(c.riskDanger) || (safety > 0 ? 100 - safety : 50);
  var mult = 1;
  if (danger >= 70) mult = 0.52;
  else if (danger >= 60) mult = 0.68;
  else if (danger >= 55) mult = 0.78;
  else if (safety >= 75) mult = 1.04;
  else if (safety >= 65) mult = 1.0;
  else mult = 0.92;
  var rr = num_(c.rewardRiskRatio);
  if (rr >= 2.5) mult = Math.min(1.12, mult * 1.06);
  else if (rr > 0 && rr < 0.8) mult = mult * 0.88;
  return mult;
}

/**
 * Prefer names with strong reward/risk when sorting thematic lists.
 * @param {Object} c
 * @return {number}
 */
function recommendationRewardRiskSortBoost_(c) {
  var rr = num_(c.rewardRiskRatio);
  if (rr <= 0 && typeof buildRiskRewardMetrics_ === 'function') {
    rr = buildRiskRewardMetrics_(c).reward_risk_ratio;
  }
  if (rr >= 3) return 8;
  if (rr >= 2) return 5;
  if (rr >= 1.2) return 2;
  return 0;
}

/**
 * Write Tab 10 risk columns + cap rank; optional Tab 29 breakdown.
 * @param {Array<Array>} data Tab 10 rows
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function applyRiskEngineBatch_(data, ss) {
  var ctx = buildRiskEngineContext_(ss);
  var universeMap = buildUniverseLookup_(ss);
  var breakdownRows = [];

  for (var i = 0; i < data.length; i++) {
    while (data[i].length < SCORING_NUM_COLS) data[i].push('');
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;
    var c = buildScoringCandidate_(data[i], universeMap);
    c.cfoPatDivergence = data[i][27] === true || data[i][27] === 'TRUE';
    c.mgmtExits = data[i][28] === true || data[i][28] === 'TRUE';
    var u = universeMap[sym] || ctx.universeBySym[sym] || {};
    var f = ctx.fundamentals[sym] || null;
    var ev = evaluateStockRisk_(c, f, u, ctx);

    data[i][RISK_COL_SCORE_] = ev.risk_score;
    data[i][RISK_COL_GRADE_] = ev.risk_grade;

    var rank = num_(data[i][49]) || num_(data[i][12]);
    var capped = applyRiskCapToOpportunityRank_(rank, ev.risk_danger, ev.risk_score);
    if (capped !== rank) {
      data[i][49] = capped;
      data[i][12] = capped;
    }
    var rrMetrics = buildRiskRewardMetrics_({
      opportunityRank: capped,
      conviction: capped,
      riskScore: ev.risk_score,
      riskGrade: ev.risk_grade,
      riskDanger: ev.risk_danger
    });
    data[i][RISK_COL_REWARD_RISK_] = rrMetrics.reward_risk_ratio;

    breakdownRows.push([
      sym,
      ev.risk_score,
      ev.risk_grade,
      ev.risk_danger,
      ev.dimensions.debt,
      ev.dimensions.governance,
      ev.dimensions.pledge,
      ev.dimensions.valuation,
      ev.dimensions.cyclicality,
      ev.dimensions.liquidity,
      buildRiskRewardMetrics_({
        opportunityRank: capped,
        conviction: capped,
        riskScore: ev.risk_score,
        riskGrade: ev.risk_grade,
        riskDanger: ev.risk_danger
      }).reward_risk_ratio,
      ev.flags.join(', '),
      ctx.asOf
    ]);
  }

  writeRiskBreakdownSheet_(ss, breakdownRows, ctx.asOf);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Array<Array>} rows
 * @param {string} asOf
 */
function writeRiskBreakdownSheet_(ss, rows, asOf) {
  var headers = [
    'symbol', 'risk_score', 'risk_grade', 'risk_danger',
    'debt_risk', 'governance_risk', 'pledge_risk', 'valuation_risk',
    'cyclicality_risk', 'liquidity_risk', 'reward_risk_ratio', 'flags', 'as_of_date'
  ];
  var sheet = getOrCreateSheet_(RISK_SHEET_BREAKDOWN_);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  clearDataBelowHeader_(sheet, headers.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Refresh risk on existing Tab 10 (after theme intelligence, etc.).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet=} ss
 */
function applyRiskEngineToScoreSheet_(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return 0;
  var numRows = scoreSheet.getLastRow() - 1;
  var data = scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).getValues();
  applyRiskEngineBatch_(data, ss);
  scoreSheet.getRange(2, 1, numRows, SCORING_NUM_COLS).setValues(data);
  applyConvictionFormulas_(scoreSheet, numRows);
  return numRows;
}

/**
 * Narrative block for recommendations.
 * @param {Object} c
 * @return {string}
 */
function buildRiskRecommendationBlock_(c) {
  var m = buildRiskRewardMetrics_(c);
  return 'Upside: ' + m.upside_score + '/100 · Risk: ' + m.risk_label +
    ' · Reward/Risk: ' + m.reward_risk_ratio + ':1';
}

/** Menu — refresh Tab 10 risk columns + Tab 29 breakdown. */
function runRiskEngineMenu() {
  var n = applyRiskEngineToScoreSheet_();
  SpreadsheetApp.getUi().alert(
    'Risk Engine v2',
    'Updated ' + (n || 0) + ' symbols on Tab 10.\n' +
      'Cols: risk_score (59), risk_grade (60), reward_risk_ratio (67).\nTab 29 RISK BREAKDOWN written.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Menu — preview risk for watchlist symbols.
 */
function previewRiskEngine() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = buildRiskEngineContext_(ss);
  var universeMap = buildUniverseLookup_(ss);
  var syms = collectWatchlistSymbols_(ss).slice(0, 5);
  var lines = ['Risk Engine ' + RISK_ENGINE_VERSION_];
  syms.forEach(function(sym) {
    var sheet = ss.getSheetByName('10. SCORING MODEL');
    var c = { symbol: sym };
    if (sheet && sheet.getLastRow() >= 2) {
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, SCORING_NUM_COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (normalizeSymbolKey_(data[i][0]) === sym) {
          c = buildScoringCandidate_(data[i], universeMap);
          break;
        }
      }
    }
    var u = ctx.universeBySym[sym] || {};
    var ev = evaluateStockRisk_(c, ctx.fundamentals[sym], u, ctx);
    var m = buildRiskRewardMetrics_({
      opportunityRank: c.opportunityRank,
      riskScore: ev.risk_score,
      riskGrade: ev.risk_grade,
      riskDanger: ev.risk_danger
    });
    lines.push(sym + ': safety ' + ev.risk_score + ' grade ' + ev.risk_grade +
      ' · R/R ' + m.reward_risk_ratio);
    lines.push('  ' + ev.summary);
  });
  SpreadsheetApp.getUi().alert(lines.join('\n\n').substring(0, 1800));
}
