/**
 * Institutional Flow Engine — Tab 10 column J (0–5).
 * See docs/INSTITUTIONAL_FLOW_ENGINE.md
 *
 * Data: Tab 4 (bulk/block), Tab 24 (shareholding), Tab 5/18 (promoter),
 *       Tab 6 (FII snapshot), Tab 17 (analyst), Tab 8 (macro FII/DII).
 */

var INSTITUTIONAL_FLOW_CAP_ = 5;
var INSTIT_FLOW_LOOKBACK_DAYS_ = 90;
var SHAREHOLDING_COMPARE_DAYS_ = 180;

var INSTITUTIONAL_FLOW_SHEET_SHAREHOLDING_ = '24. SHAREHOLDING PATTERN';

/**
 * @typedef {Object} InstitutionalFlowResult
 * @property {number} score 0–5
 * @property {number} confidence 0–100
 * @property {string} source primary tab/source id
 * @property {string} date ISO date of latest signal (IST)
 * @property {string} rationale human-readable summary
 * @property {Array<Object>} signals
 * @property {Array<string>} missing
 */

/**
 * Build once per rebuild; pass to institutionalFlowScore(symbol, ctx).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildInstitutionalFlowContext_(ss) {
  var today = new Date();
  return {
    asOf: Utilities.formatDate(today, 'Asia/Kolkata', 'yyyy-MM-dd'),
    dealsBySym: buildDealsAggregateBySymbol_(loadSheetData_(ss, '4. BULK & LARGE DEALS'), today),
    shareholdingBySym: buildShareholdingDeltaBySymbol_(loadSheetData_(ss, INSTITUTIONAL_FLOW_SHEET_SHAREHOLDING_)),
    promoterBySym: buildPromoterFlowBySymbol_(ss, today),
    insiderBySym: buildInsiderFlowBySymbol_(loadSheetData_(ss, '5. INSIDER/PROMOTER'), today),
    fundamentals: buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS')),
    analystBySym: buildAnalystUpgradeBySymbol_(loadSheetData_(ss, '17. ANALYST REVISIONS'), today),
    macroFiiBias: readMacroFlowBias_(loadSheetData_(ss, '8. MACRO DASHBOARD'), 'fii'),
    macroDiiBias: readMacroFlowBias_(loadSheetData_(ss, '8. MACRO DASHBOARD'), 'dii'),
    tab4Rows: instFlowRowCount_(ss, '4. BULK & LARGE DEALS'),
    tab24Rows: instFlowRowCount_(ss, INSTITUTIONAL_FLOW_SHEET_SHAREHOLDING_)
  };
}

/**
 * Primary API — institutional flow score for one symbol.
 * @param {string} symbol
 * @param {Object=} ctx from buildInstitutionalFlowContext_(ss)
 * @return {InstitutionalFlowResult}
 */
function institutionalFlowScore(symbol, ctx) {
  var sym = normalizeSymbolKey_(symbol);
  if (!sym) {
    return emptyInstitutionalFlowResult_('invalid_symbol');
  }
  if (!ctx) {
    ctx = buildInstitutionalFlowContext_(SpreadsheetApp.getActiveSpreadsheet());
  }

  var signals = [];
  var missing = [];
  var latestDate = null;
  var f = ctx.fundamentals[sym] || null;
  var deals = ctx.dealsBySym[sym];
  var sh = ctx.shareholdingBySym[sym];
  var prom = ctx.promoterBySym[sym];
  var ins = ctx.insiderBySym[sym];
  var ana = ctx.analystBySym[sym] || 0;

  function bumpDate(d) {
    if (!d) return;
    var ds = typeof d === 'string' ? d : Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
    if (!latestDate || ds > latestDate) latestDate = ds;
  }

  /* --- Bulk & block deals (Tab 4) --- */
  if (deals && deals.total > 0) {
    if (deals.bulkBuy > deals.bulkSell) {
      signals.push(sig_('bulk_buy', 1.2, deals.lastDate, 'Bulk buys ' + deals.bulkBuy + ' vs sells ' + deals.bulkSell + ' (90d)'));
      bumpDate(deals.lastDate);
    } else if (deals.bulkSell > deals.bulkBuy) {
      signals.push(sig_('bulk_sell', -0.8, deals.lastDate, 'Bulk sells dominate (' + deals.bulkSell + ' vs ' + deals.bulkBuy + ')'));
      bumpDate(deals.lastDate);
    }
    if (deals.blockBuy > 0) {
      signals.push(sig_('block_buy', 1.0, deals.lastDate, 'Block buy count ' + deals.blockBuy + ' (90d)'));
      bumpDate(deals.lastDate);
    }
    if (deals.blockSell > 0) {
      signals.push(sig_('block_sell', -0.7, deals.lastDate, 'Block sell count ' + deals.blockSell));
      bumpDate(deals.lastDate);
    }
    if (deals.fiiBuy > deals.fiiSell) {
      signals.push(sig_('fii_deal_buy', 0.6, deals.lastDate, 'FII-tagged deal buys ' + deals.fiiBuy));
      bumpDate(deals.lastDate);
    }
    if (deals.diiBuy > deals.diiSell) {
      signals.push(sig_('dii_deal_buy', 0.5, deals.lastDate, 'DII-tagged deal buys ' + deals.diiBuy));
      bumpDate(deals.lastDate);
    }
    if (deals.mfBuy > deals.mfSell) {
      signals.push(sig_('mf_deal_buy', 0.7, deals.lastDate, 'MF-tagged deal buys ' + deals.mfBuy));
      bumpDate(deals.lastDate);
    }
  } else if (ctx.tab4Rows === 0) {
    missing.push('TAB4_EMPTY');
  } else {
    missing.push('TAB4_NO_SYMBOL');
  }

  /* --- Shareholding pattern changes (Tab 24) --- */
  if (sh && sh.hasDelta) {
    if (sh.deltaFii >= 0.5) {
      signals.push(sig_('fii_pct_up', 0.8, sh.latestDate, 'FII holding +' + sh.deltaFii.toFixed(2) + 'pp'));
      bumpDate(sh.latestDate);
    } else if (sh.deltaFii <= -0.5) {
      signals.push(sig_('fii_pct_down', -0.6, sh.latestDate, 'FII holding ' + sh.deltaFii.toFixed(2) + 'pp'));
      bumpDate(sh.latestDate);
    }
    if (sh.deltaDii >= 0.5) {
      signals.push(sig_('dii_pct_up', 0.7, sh.latestDate, 'DII holding +' + sh.deltaDii.toFixed(2) + 'pp'));
      bumpDate(sh.latestDate);
    }
    if (sh.deltaMf >= 0.5) {
      signals.push(sig_('mf_pct_up', 0.8, sh.latestDate, 'MF holding +' + sh.deltaMf.toFixed(2) + 'pp'));
      bumpDate(sh.latestDate);
    }
    if (sh.deltaPromoter >= 0.3) {
      signals.push(sig_('promoter_pct_up', 0.5, sh.latestDate, 'Promoter holding +' + sh.deltaPromoter.toFixed(2) + 'pp'));
      bumpDate(sh.latestDate);
    } else if (sh.deltaPromoter <= -0.3) {
      signals.push(sig_('promoter_pct_down', -0.5, sh.latestDate, 'Promoter holding ' + sh.deltaPromoter.toFixed(2) + 'pp'));
      bumpDate(sh.latestDate);
    }
  } else if (ctx.tab24Rows === 0) {
    missing.push('TAB24_SHAREHOLDING');
  } else {
    missing.push('TAB24_NO_HISTORY');
  }

  /* --- Tab 6 FII level (snapshot, not flow) --- */
  if (f && f.fiiHolding > 0) {
    if (f.fiiHolding >= 20 && f.fiiHolding <= 45) {
      signals.push(sig_('fii_level_ok', 0.35, f.lastUpdated, 'FII holding ' + f.fiiHolding + '% (snapshot)'));
    } else if (f.fiiHolding > 45) {
      signals.push(sig_('fii_crowded', -0.2, f.lastUpdated, 'FII holding high ' + f.fiiHolding + '%'));
    }
  } else {
    missing.push('TAB6_FII');
  }

  /* --- Promoter purchases / sales (Tab 18 + Tab 5) --- */
  if (prom) {
    if (prom.buys > 0) {
      signals.push(sig_('promoter_buy', 1.3, prom.lastDate, 'Promoter buy x' + prom.buys + ' (90d)'));
      bumpDate(prom.lastDate);
    }
    if (prom.sells > 0) {
      signals.push(sig_('promoter_sell', -1.0, prom.lastDate, 'Promoter sell x' + prom.sells + ' (90d)'));
      bumpDate(prom.lastDate);
    }
  } else {
    missing.push('TAB18_PROMOTER');
  }
  if (ins) {
    if (ins.buys > 0) {
      signals.push(sig_('insider_buy', 0.5, ins.lastDate, 'Insider buy x' + ins.buys + ' (Tab 5)'));
      bumpDate(ins.lastDate);
    }
    if (ins.sells > 0) {
      signals.push(sig_('insider_sell', -0.4, ins.lastDate, 'Insider sell x' + ins.sells));
      bumpDate(ins.lastDate);
    }
  }

  /* --- Analyst upgrades (Tab 17) — secondary --- */
  if (ana > 0) {
    signals.push(sig_('analyst_upgrade', Math.min(0.6, ana * 0.2), ctx.asOf, 'Analyst upgrades x' + ana + ' (60d)'));
  }

  /* --- Macro FII/DII (Tab 8) — market-wide tilt --- */
  if (ctx.macroFiiBias > 0) {
    signals.push(sig_('macro_fii_positive', 0.25, ctx.asOf, 'Macro FII bias positive (Tab 8)'));
  }
  if (ctx.macroDiiBias > 0) {
    signals.push(sig_('macro_dii_positive', 0.2, ctx.asOf, 'Macro DII bias positive (Tab 8)'));
  }

  var rawPts = 0;
  signals.forEach(function(s) { rawPts += s.weight; });
  var score = Math.max(0, Math.min(INSTITUTIONAL_FLOW_CAP_, Math.round(rawPts)));

  var confidence = computeInstitutionalFlowConfidence_(signals, missing, ctx);
  var source = pickInstitutionalFlowSource_(signals, missing, ctx);
  var rationale = buildInstitutionalFlowRationale_(signals, missing, score, ctx);

  return {
    score: score,
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
 * @return {InstitutionalFlowResult}
 */
function emptyInstitutionalFlowResult_(reason) {
  return {
    score: 0,
    confidence: 10,
    source: 'none',
    date: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    rationale: 'No institutional flow inputs (' + reason + '). Import Tab 4 deals and Tab 24 shareholding snapshots.',
    signals: [],
    missing: ['ALL']
  };
}

/**
 * @param {string} type
 * @param {number} weight
 * @param {string|Date} date
 * @param {string} detail
 * @return {Object}
 */
function sig_(type, weight, date, detail) {
  return {
    type: type,
    weight: weight,
    date: date ? String(date) : '',
    detail: detail
  };
}

/**
 * Tab 4 rows → per-symbol deal aggregates (90d).
 * Columns: date, symbol, client_name, buy_sell, qty, price, pct_traded,
 *           deal_type, investor_category, value_cr, source_url (extended)
 * @param {Array<Array>} rows
 * @param {Date} today
 * @return {Object}
 */
function buildDealsAggregateBySymbol_(rows, today) {
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - INSTIT_FLOW_LOOKBACK_DAYS_);
  var map = {};

  rows.forEach(function(r) {
    var d = parseSheetDate_(r[0]);
    if (!d || d < cutoff) return;
    var sym = normalizeSymbolKey_(r[1]);
    if (!sym) return;
    if (!map[sym]) {
      map[sym] = newDealBucket_();
    }
    var b = map[sym];
    b.total++;
    var side = String(r[3] || '').toLowerCase();
    var isBuy = side.indexOf('buy') >= 0;
    var isSell = side.indexOf('sell') >= 0;
    var client = String(r[2] || '');
    var dealType = String(r[7] || '').toLowerCase() || inferDealTypeFromText_(client);
    var inv = String(r[8] || '').toLowerCase() || classifyInvestorCategory_(client);
    var ds = Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
    if (!b.lastDate || ds > b.lastDate) b.lastDate = ds;

    if (dealType.indexOf('block') >= 0) {
      if (isBuy) b.blockBuy++;
      if (isSell) b.blockSell++;
    } else {
      if (isBuy) b.bulkBuy++;
      if (isSell) b.bulkSell++;
    }
    if (inv === 'fii') { if (isBuy) b.fiiBuy++; if (isSell) b.fiiSell++; }
    if (inv === 'dii') { if (isBuy) b.diiBuy++; if (isSell) b.diiSell++; }
    if (inv === 'mf') { if (isBuy) b.mfBuy++; if (isSell) b.mfSell++; }
  });
  return map;
}

/**
 * @return {Object}
 */
function newDealBucket_() {
  return {
    total: 0, bulkBuy: 0, bulkSell: 0, blockBuy: 0, blockSell: 0,
    fiiBuy: 0, fiiSell: 0, diiBuy: 0, diiSell: 0, mfBuy: 0, mfSell: 0,
    lastDate: null
  };
}

/**
 * Tab 24 — compare latest two snapshots per symbol.
 * @param {Array<Array>} rows
 * @return {Object}
 */
function buildShareholdingDeltaBySymbol_(rows) {
  var bySym = {};
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d) return;
    if (!bySym[sym]) bySym[sym] = [];
    bySym[sym].push({
      date: d,
      fii: num_(r[2]),
      dii: num_(r[3]),
      mf: num_(r[4]),
      promoter: num_(r[5])
    });
  });

  var out = {};
  Object.keys(bySym).forEach(function(sym) {
    var list = bySym[sym].sort(function(a, b) { return b.date - a.date; });
    if (list.length < 2) {
      out[sym] = { hasDelta: false, latestDate: list.length ? fmtDate_(list[0].date) : null };
      return;
    }
    var latest = list[0];
    var prior = list[1];
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SHAREHOLDING_COMPARE_DAYS_);
    if (latest.date < cutoff) {
      out[sym] = { hasDelta: false, latestDate: fmtDate_(latest.date) };
      return;
    }
    out[sym] = {
      hasDelta: true,
      latestDate: fmtDate_(latest.date),
      deltaFii: latest.fii - prior.fii,
      deltaDii: latest.dii - prior.dii,
      deltaMf: latest.mf - prior.mf,
      deltaPromoter: latest.promoter - prior.promoter
    };
  });
  return out;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Date} today
 * @return {Object}
 */
function buildPromoterFlowBySymbol_(ss, today) {
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - INSTIT_FLOW_LOOKBACK_DAYS_);
  var map = {};
  loadSheetData_(ss, '18. PROMOTER ACTIVITY').forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d || d < cutoff) return;
    if (!map[sym]) map[sym] = { buys: 0, sells: 0, lastDate: null };
    var tx = String(r[5] || '').toLowerCase();
    var ds = fmtDate_(d);
    if (tx.indexOf('buy') >= 0 || tx.indexOf('acq') >= 0 || tx.indexOf('purchase') >= 0) {
      map[sym].buys++;
    } else if (tx.indexOf('sell') >= 0 || tx.indexOf('disposal') >= 0) {
      map[sym].sells++;
    }
    if (!map[sym].lastDate || ds > map[sym].lastDate) map[sym].lastDate = ds;
  });
  return map;
}

/**
 * @param {Array<Array>} rows
 * @param {Date} today
 * @return {Object}
 */
function buildInsiderFlowBySymbol_(rows, today) {
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - INSTIT_FLOW_LOOKBACK_DAYS_);
  var map = {};
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d || d < cutoff) return;
    if (!map[sym]) map[sym] = { buys: 0, sells: 0, lastDate: null };
    var tx = String(r[3] || '').toLowerCase();
    var ds = fmtDate_(d);
    if (tx.indexOf('buy') >= 0) map[sym].buys++;
    else if (tx.indexOf('sell') >= 0) map[sym].sells++;
    if (!map[sym].lastDate || ds > map[sym].lastDate) map[sym].lastDate = ds;
  });
  return map;
}

/**
 * @param {Array<Array>} rows
 * @param {Date} today
 * @return {Object}
 */
function buildAnalystUpgradeBySymbol_(rows, today) {
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - 60);
  var map = {};
  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    var d = parseSheetDate_(r[1]);
    if (!sym || !d || d < cutoff) return;
    var oldR = String(r[3] || '').toLowerCase();
    var newR = String(r[4] || '').toLowerCase();
    if (typeof ratingUpgrade_ === 'function' && ratingUpgrade_(oldR, newR)) {
      map[sym] = (map[sym] || 0) + 1;
    } else if (num_(r[7]) > num_(r[6])) {
      map[sym] = (map[sym] || 0) + 1;
    }
  });
  return map;
}

/**
 * @param {Array<Array>} rows
 * @param {string} kind fii|dii
 * @return {number} 0 or 1
 */
function readMacroFlowBias_(rows, kind) {
  kind = kind || 'fii';
  for (var i = 0; i < rows.length; i++) {
    var metric = String(rows[i][0] || '').toLowerCase();
    if (kind === 'fii' && metric.indexOf('fii') < 0 && metric.indexOf('foreign') < 0) continue;
    if (kind === 'dii' && metric.indexOf('dii') < 0 && metric.indexOf('domestic') < 0) continue;
    var bias = String(rows[i][3] || '').toLowerCase();
    if (bias === 'positive' || bias === 'bullish') return 1;
  }
  return 0;
}

/**
 * @param {string} text
 * @return {string} bulk|block|large
 */
function inferDealTypeFromText_(text) {
  var t = String(text || '').toLowerCase();
  if (t.indexOf('block') >= 0) return 'block';
  if (t.indexOf('bulk') >= 0) return 'bulk';
  return 'bulk';
}

/**
 * @param {string} clientName
 * @return {string} fii|dii|mf|promoter|other
 */
function classifyInvestorCategory_(clientName) {
  var t = String(clientName || '').toLowerCase();
  if (!t) return 'other';
  if (t.indexOf('mutual') >= 0 || t.indexOf('mf ') >= 0 || t.indexOf('fund') >= 0 && t.indexOf('mutual') >= 0) return 'mf';
  if (t.indexOf('nippon') >= 0 || t.indexOf('hdfc mf') >= 0 || t.indexOf('sbi mf') >= 0 ||
      t.indexOf('icici prudential') >= 0 || t.indexOf('uti ') >= 0) return 'mf';
  if (t.indexOf('fii') >= 0 || t.indexOf('foreign') >= 0 || t.indexOf('portfolio') >= 0 &&
      (t.indexOf('singapore') >= 0 || t.indexOf('mauritius') >= 0 || t.indexOf('cayman') >= 0)) return 'fii';
  if (t.indexOf('dii') >= 0 || t.indexOf('lic') >= 0 || t.indexOf('insurance') >= 0 ||
      t.indexOf('sbi life') >= 0) return 'dii';
  if (t.indexOf('promoter') >= 0) return 'promoter';
  return 'other';
}

/**
 * @param {Array<Object>} signals
 * @param {Array<string>} missing
 * @param {Object} ctx
 * @return {number}
 */
function computeInstitutionalFlowConfidence_(signals, missing, ctx) {
  if (!signals.length) return Math.max(10, 25 - missing.length * 3);
  var filled = 0;
  var high = 0;
  signals.forEach(function(s) {
    if (s.type.indexOf('bulk') >= 0 || s.type.indexOf('block') >= 0) high++;
    if (s.type.indexOf('promoter') >= 0) high++;
    if (s.type.indexOf('pct_up') >= 0 || s.type.indexOf('pct_down') >= 0) high++;
    filled++;
  });
  var base = Math.min(95, 30 + filled * 12 + high * 8);
  if (ctx.tab4Rows > 0) base += 5;
  if (ctx.tab24Rows > 0) base += 10;
  if (missing.indexOf('TAB6_FII') >= 0) base -= 5;
  if (signals.length === 1 && signals[0].type.indexOf('macro') >= 0) base = Math.min(base, 35);
  return Math.max(10, Math.min(100, base));
}

/**
 * @param {Array<Object>} signals
 * @param {Array<string>} missing
 * @param {Object} ctx
 * @return {string}
 */
function pickInstitutionalFlowSource_(signals, missing, ctx) {
  if (!signals.length) {
    if (ctx.tab4Rows === 0 && ctx.tab24Rows === 0) return 'missing_all';
    return 'none';
  }
  var priority = ['block_buy', 'bulk_buy', 'promoter_buy', 'mf_pct_up', 'fii_pct_up', 'dii_pct_up',
    'mf_deal_buy', 'fii_deal_buy', 'bulk_sell', 'promoter_sell'];
  for (var i = 0; i < priority.length; i++) {
    for (var j = 0; j < signals.length; j++) {
      if (signals[j].type === priority[i]) {
        if (signals[j].type.indexOf('block') >= 0 || signals[j].type.indexOf('bulk') >= 0) return 'tab4_deals';
        if (signals[j].type.indexOf('pct') >= 0) return 'tab24_shareholding';
        if (signals[j].type.indexOf('promoter') >= 0) return 'tab18_promoter';
        if (signals[j].type.indexOf('deal') >= 0) return 'tab4_deals';
      }
    }
  }
  if (signals[0].type.indexOf('macro') >= 0) return 'tab8_macro';
  return 'composite';
}

/**
 * @param {Array<Object>} signals
 * @param {Array<string>} missing
 * @param {number} score
 * @param {Object} ctx
 * @return {string}
 */
function buildInstitutionalFlowRationale_(signals, missing, score, ctx) {
  if (!signals.length) {
    return 'No institutional flow signals in lookback window. ' +
      (missing.length ? 'Missing: ' + missing.slice(0, 4).join(', ') + '. ' : '') +
      'Paste NSE bulk/block deals (Tab 4) and quarterly shareholding rows (Tab 24).';
  }
  var sorted = signals.slice().sort(function(a, b) {
    return Math.abs(b.weight) - Math.abs(a.weight);
  });
  var parts = sorted.slice(0, 4).map(function(s) { return s.detail; });
  var tone = score >= 3 ? 'Net institutional support' : (score <= 1 ? 'Weak or negative flow' : 'Mixed flow');
  return tone + ' (J=' + score + '/5). ' + parts.join('; ') + '.';
}

/**
 * @param {Date} d
 * @return {string}
 */
function fmtDate_(d) {
  return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @return {number}
 */
function instFlowRowCount_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getLastRow() - 1;
}

function previewInstitutionalFlowScores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = buildInstitutionalFlowContext_(ss);
  var syms = collectWatchlistSymbols_(ss).slice(0, 8);
  var lines = ['Institutional flow preview (Engine)'];
  syms.forEach(function(sym) {
    var r = institutionalFlowScore(sym, ctx);
    lines.push(sym + ': J=' + r.score + ' conf=' + r.confidence + '% ' + r.source + ' — ' + r.rationale);
  });
  SpreadsheetApp.getUi().alert(lines.join('\n\n').substring(0, 1800));
}
