/**
 * Analyst Note Engine — every Tab 11 recommendation must ship a full analyst write-up.
 * See docs/ANALYST_NOTE_ENGINE.md
 */

var ANALYST_NOTE_VERSION_ = '2.0';
var ANALYST_NOTE_MIN_SECTION_CHARS_ = 48;

/**
 * @param {Array<string>} items
 * @return {string}
 */
function analystFormatBullets_(items) {
  return (items || []).filter(function(s) {
    return String(s || '').trim().length > 0;
  }).map(function(s) {
    s = String(s).trim();
    return s.indexOf('•') === 0 ? s : '• ' + s;
  }).join('\n');
}

/**
 * @param {string} lead
 * @param {Array<string>} bullets
 * @return {string}
 */
function analystFormatSection_(lead, bullets) {
  var b = analystFormatBullets_(bullets);
  if (!b) return String(lead || '').trim();
  return String(lead || '').trim() + (lead ? '\n\n' : '') + b;
}

/**
 * @param {string} field
 * @param {Object} c
 * @return {string}
 */
function analystGenericSectionFallback_(field, c) {
  c = c || {};
  var sym = c.symbol || 'Name';
  var sector = c.sector || c.sectorKey || 'the sector';
  var rank = num_(c.opportunityRank) || num_(c.conviction) || 0;
  var map = {
    investment_thesis: sym + ' screens on composite opportunity rank ' + rank +
      '/100 within ' + sector + '. Maintain research coverage until the next earnings cycle confirms thesis drivers.',
    bull_case: 'Composite scoring supports a constructive stance pending confirmation from orders, earnings, or sector flows.',
    bear_case: 'Downside scenarios include earnings miss, multiple compression, governance headlines, or sector de-rating.',
    catalysts: 'Monitor Tab 7 news, Tab 15–18 corporate events, and order-book filings for the next re-rating trigger.',
    risks: 'Size positions for liquidity, pledge, and macro beta; review Risk Engine grade before adding exposure.',
    valuation: 'Valuation pillar ' + num_(c.valuation) + '/15; refresh Tab 6 for trailing P/E and peer-relative context.',
    peer_comparison: 'Compare ROE, growth, and margins to sector medians on Tab 25; relative scores on Tab 10 cols 50–52.',
    theme_exposure: 'Map UNIVERSE theme tags and Tab 28 theme intelligence for macro alignment.'
  };
  return map[field] || 'Further diligence required on ' + sym + '.';
}

/**
 * Ensure every publishable section meets minimum depth (professional analyst note).
 * @param {Object} note
 * @param {Object} c
 * @param {Object} ctx
 * @param {string} listLabel
 * @param {Object=} options
 * @return {Object}
 */
function finalizeAnalystNoteForPublish_(note, c, ctx, listLabel, options) {
  note = note || {};
  options = options || {};
  c = c || {};
  ctx = ctx || {};
  listLabel = listLabel || '';

  if (!options.themeListRow) {
    note.investment_thesis = padAnalystSection_('investment_thesis', note.investment_thesis, c, listLabel);
    note.bull_case = padAnalystSection_('bull_case', note.bull_case, c, listLabel);
    note.bear_case = padAnalystSection_('bear_case', note.bear_case, c, listLabel);
    note.catalysts = padAnalystSection_('catalysts', note.catalysts, c, listLabel);
    note.risks = padAnalystSection_('risks', note.risks, c, listLabel);
    note.valuation = padAnalystSection_('valuation', note.valuation, c, listLabel);
    note.peer_comparison = padAnalystSection_('peer_comparison', note.peer_comparison, c, listLabel);
    note.theme_exposure = padAnalystSection_('theme_exposure', note.theme_exposure, c, listLabel);
  } else {
    ['investment_thesis', 'bull_case', 'bear_case', 'catalysts', 'risks', 'valuation',
      'peer_comparison', 'theme_exposure'].forEach(function(f) {
      if (sectionLen_(note[f]) < 20) note[f] = (note[f] || '') + ' ' + analystGenericSectionFallback_(f, c);
    });
  }

  note.valuation_summary = note.valuation;
  if (sectionLen_(note.confidence_rationale) < 24 && !options.themeListRow) {
    note.confidence_rationale = buildConfidenceRationale_(c, num_(note.confidence), ctx);
  }
  if (sectionLen_(note.timeline) < 24) {
    note.timeline = buildTimelineSection_(c, listLabel, ctx);
  }
  if (!note.timeline_short) note.timeline_short = pickHorizonShort_(c, listLabel);
  note.version = ANALYST_NOTE_VERSION_;
  return note;
}

/**
 * @param {string} field
 * @param {string} text
 * @param {Object} c
 * @param {string} listLabel
 * @return {string}
 */
function padAnalystSection_(field, text, c, listLabel) {
  text = String(text || '').trim();
  while (sectionLen_(text) < ANALYST_NOTE_MIN_SECTION_CHARS_) {
    var extra = analystGenericSectionFallback_(field, c);
    if (text.indexOf(extra) >= 0) break;
    text = text ? text + ' ' + extra : extra;
  }
  return text;
}

/**
 * @typedef {Object} AnalystNote
 * @property {string} investment_thesis
 * @property {string} bull_case
 * @property {string} bear_case
 * @property {string} catalysts
 * @property {string} risks
 * @property {string} valuation
 * @property {string} peer_comparison
 * @property {string} theme_exposure
 * @property {number} confidence
 * @property {string} confidence_rationale
 * @property {string} timeline
 * @property {string} timeline_short
 */

/**
 * Build full analyst note from Tab 10 + fundamentals + peer + theme + risk (no rescoring).
 * @param {Object} c scoring candidate
 * @param {string} filter list filter id
 * @param {number} sortKey
 * @param {string} listName Tab 11 list name
 * @param {GoogleAppsScript.Spreadsheet=} ss
 * @return {AnalystNote}
 */
function buildAnalystRecommendationNote_(c, filter, sortKey, listName, ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  c = c || {};
  listName = listName || '';
  filter = filter || '';

  var ctx = buildAnalystNoteContext_(ss, c);
  var rank = num_(c.opportunityRank) || num_(c.conviction);
  var listLabel = listName || filter || 'Recommendation';
  var whyRanked = typeof buildWhyRanked_ === 'function' ?
    buildWhyRanked_(c, filter, sortKey) : '';

  var investmentThesis = buildInvestmentThesisSection_(c, listLabel, rank, whyRanked, ctx);
  var bullCase = buildBullCaseSection_(c, ctx);
  var bearCase = buildBearCaseSection_(c, ctx);
  var catalysts = buildCatalystsSection_(c, ctx);
  var risks = buildRisksSection_(c, ctx);
  var valuation = buildValuationSection_(c, ctx);
  var peerComparison = buildPeerComparisonSection_(c, ctx);
  var themeExposure = buildThemeExposureSection_(c, ctx);
  var confidence = typeof computeRecommendationConfidence_ === 'function' ?
    computeRecommendationConfidence_(c) : Math.min(100, Math.round(rank * 0.9));
  var confidenceRationale = buildConfidenceRationale_(c, confidence, ctx);
  var timeline = buildTimelineSection_(c, listName, ctx);
  var timelineShort = pickHorizonShort_(c, listName);

  var note = {
    version: ANALYST_NOTE_VERSION_,
    investment_thesis: investmentThesis,
    bull_case: bullCase,
    bear_case: bearCase,
    catalysts: catalysts,
    risks: risks,
    valuation: valuation,
    valuation_summary: valuation,
    peer_comparison: peerComparison,
    theme_exposure: themeExposure,
    confidence: confidence,
    confidence_rationale: confidenceRationale,
    timeline: timeline,
    timeline_short: timelineShort
  };
  return finalizeAnalystNoteForPublish_(note, c, ctx, listLabel);
}

/**
 * @param {GoogleAppsScript.Spreadsheet} ss
 * @param {Object} c
 * @return {Object}
 */
function buildAnalystNoteContext_(ss, c) {
  var sym = c.symbol;
  var fundamentals = null;
  if (typeof buildFundamentalsBySymbol_ === 'function') {
    fundamentals = buildFundamentalsBySymbol_(loadSheetData_(ss, '6. FUNDAMENTALS'))[sym] || null;
  }
  var instNarr = typeof buildRecommendationNarrative_ === 'function' ?
    buildRecommendationNarrative_(ss, c) : { bear: '', catalyst: '' };
  var engine3 = null;
  if (typeof evaluateConvictionHierarchy_ === 'function') {
    var ctx3 = buildConvictionEngine3Context_(ss);
    engine3 = evaluateConvictionHierarchy_(c, ctx3.fundamentals[sym], ctx3);
  }
  return {
    fundamentals: fundamentals,
    baseNarrative: instNarr,
    engine3: engine3,
    breakdown: typeof buildScoreBreakdown_ === 'function' ? buildScoreBreakdown_(c) : ''
  };
}

/**
 * @param {Object} c
 * @param {string} listLabel
 * @param {number} rank
 * @param {string} whyRanked
 * @param {Object} ctx
 * @return {string}
 */
function buildInvestmentThesisSection_(c, listLabel, rank, whyRanked, ctx) {
  var name = c.companyName || c.symbol;
  var sector = c.sector || c.sectorKey || 'sector TBD';
  var lead = 'Investment view (' + listLabel + '): We highlight ' + name + ' (' + c.symbol +
    ') in ' + sector + ' with opportunity rank ' + rank + '/100' +
    (num_(c.alphaScore) > 0 ? ' and alpha classification ' + (c.alphaClassification || 'n/a') +
      ' (score ' + num_(c.alphaScore) + ')' : '') + '.';
  var bullets = [];
  if (whyRanked) bullets.push('Selection drivers: ' + whyRanked);
  if (ctx.engine3 && ctx.engine3.stage) {
    bullets.push('Conviction framework: stage ' + ctx.engine3.stage + ' — quality ' +
      num_(c.qualityScore) + '/100, valuation ' + num_(c.valuationScore) + '/100, catalyst ' +
      num_(c.catalystScore) + '/100');
  }
  bullets.push(c.dataGateFlag ?
    'Data gate passed on Tab 6 — fundamentals suitable for sized research.' :
    'Data gate incomplete — maintain watchlist sizing until Tab 6 coverage improves.');
  bullets.push(analystListActionThesis_(listLabel, rank, c));
  return analystFormatSection_(lead, bullets);
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @return {string}
 */
function buildBullCaseSection_(c, ctx) {
  var bullets = [];
  if (ctx.engine3 && ctx.engine3.why_stock) {
    bullets.push(ctx.engine3.why_stock);
  }
  if (num_(c.qualityScore) >= 40) {
    bullets.push('Quality score ' + num_(c.qualityScore) + '/100 — pillars fundamentals ' +
      num_(c.fundamentals) + '/15, financial strength ' + num_(c.financialStrength) + '/10, moat ' +
      num_(c.businessMoat) + '/10');
  }
  if (num_(c.growth) >= 8) bullets.push('Growth pillar ' + num_(c.growth) + '/15 supports earnings momentum.');
  if (num_(c.relativeQualityScore) >= 52) {
    bullets.push('Peer-relative quality ' + num_(c.relativeQualityScore) + '/100' +
      (num_(c.relativeGrowthScore) > 0 ? ', growth ' + num_(c.relativeGrowthScore) + '/100' : ''));
  }
  if (c.promoterBuy) bullets.push('Promoter purchases in the last 90 days — insider alignment signal.');
  if (num_(c.orderbookSignals) > 0) {
    bullets.push('Order-book / LOA wins ×' + num_(c.orderbookSignals) + ' (90d) — demand visibility.');
  }
  if (num_(c.sectorRank) > 0 && num_(c.sectorRank) <= 5) {
    bullets.push('Sector momentum rank #' + num_(c.sectorRank) + ' on Tab 19 — favourable macro bucket.');
  }
  if (typeof buildRiskRewardMetrics_ === 'function' && c.symbol) {
    var rr = buildRiskRewardMetrics_(c);
    if (rr.reward_risk_ratio >= 1.5) {
      bullets.push('Reward/risk ' + rr.reward_risk_ratio + ':1 with upside score ' + rr.upside_score + '/100.');
    }
  }
  if (!bullets.length) {
    bullets.push('Composite scoring supports selective overweight pending catalyst confirmation (see Catalysts).');
  }
  return analystFormatSection_('Bull case — key upside drivers:', bullets);
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @return {string}
 */
function buildBearCaseSection_(c, ctx) {
  var bullets = [];
  if (ctx.baseNarrative && ctx.baseNarrative.bear) {
    String(ctx.baseNarrative.bear).split(';').forEach(function(p) {
      if (p.trim()) bullets.push(p.trim());
    });
  }
  if (c.pumpFlag) bullets.push('Pump-risk flag active — cut sizing until 30d price/volume normalises.');
  if (c.pledgeGt50) bullets.push('Promoter pledge >50% — refinancing and collateral overhang.');
  if (c.sebiInvestigation) bullets.push('SEBI investigation flag — avoid material weight until resolution.');
  if (!c.dataGateFlag) bullets.push('Incomplete Tab 6 fundamentals — thesis may reset when data gate passes.');
  if (num_(c.valuation) <= 5 && num_(c.financialStrength) < 6) {
    bullets.push('Weak quality vs valuation — earnings miss could trigger sharp multiple compression.');
  }
  if (num_(c.riskScore) > 0 && num_(c.riskScore) < 50) {
    bullets.push('Risk grade ' + (c.riskGrade || '—') + ' (safety ' + num_(c.riskScore) + '/100) limits upside skew.');
  }
  if (!bullets.length) {
    bullets.push('Sector rotation, policy shifts, or earnings miss could invalidate the investment case.');
  }
  return analystFormatSection_('Bear case — what could go wrong:', bullets);
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @return {string}
 */
function buildCatalystsSection_(c, ctx) {
  var bullets = [];
  if (ctx.engine3 && ctx.engine3.why_now) bullets.push('Near-term: ' + ctx.engine3.why_now);
  if (ctx.baseNarrative && ctx.baseNarrative.catalyst) {
    String(ctx.baseNarrative.catalyst).split(';').forEach(function(p) {
      if (p.trim()) bullets.push(p.trim());
    });
  }
  if (num_(c.catalystScore) >= 30) {
    bullets.push('Catalyst score ' + num_(c.catalystScore) + '/100 (news, filings, corporate events).');
  }
  if (num_(c.orderbookSignals) > 0) bullets.push('Order-book wins ×' + num_(c.orderbookSignals) + ' in 90d.');
  if (num_(c.filingsSignals) > 0) bullets.push('Material filings ×' + num_(c.filingsSignals) + ' in 30d.');
  if (c.revisionUpgrades > 0) bullets.push('Street EPS/rating upgrades ×' + c.revisionUpgrades + ' (60d).');
  if (num_(c.newsEvents) >= 5) bullets.push('News/events pillar ' + num_(c.newsEvents) + '/10 — track Tab 7 headlines.');
  if (c.horizon1w || c.horizon1m) bullets.push('Tab 10 short horizon flag — potential re-rating within weeks.');
  if (!bullets.length) {
    bullets.push('No single dominant catalyst — thesis rests on quality/valuation mean-reversion; watch Tab 15–18.');
  }
  return analystFormatSection_('Catalyst calendar — triggers to monitor:', bullets);
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @return {string}
 */
function buildRisksSection_(c, ctx) {
  var bullets = [];
  if (typeof buildRiskRecommendationBlock_ === 'function') {
    bullets.push(buildRiskRecommendationBlock_(c));
  }
  if (num_(c.riskGrade)) {
    bullets.push('Risk Engine: grade ' + c.riskGrade + ', safety score ' + num_(c.riskScore) + '/100.');
  }
  if (c.staleFlags && String(c.staleFlags).length > 2) {
    bullets.push('Stale flags (' + String(c.staleFlags) + ') — refresh prices and fundamentals pre-trade.');
  }
  if (num_(c.dataQualityPct) > 0 && num_(c.dataQualityPct) < 65) {
    bullets.push('Data quality ' + Math.round(num_(c.dataQualityPct)) + '% — reduce size until DQ ≥ 65%.');
  }
  if (num_(c.fundamentalsAgeDays) >= 90) {
    bullets.push('Fundamentals age ' + num_(c.fundamentalsAgeDays) + 'd — re-import Tab 6.');
  }
  bullets.push('Monitor: pledge trend, auditor/NCLT, sector policy, and liquidity in risk-off markets.');
  return analystFormatSection_('Risk assessment:', bullets);
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @return {string}
 */
function buildValuationSection_(c, ctx) {
  var f = ctx.fundamentals;
  var bullets = [];
  bullets.push('Engine valuation score ' + num_(c.valuationScore) + '/100; legacy pillar D ' +
    num_(c.valuation) + '/15.');
  if (num_(c.relativeValuationScore) > 0) {
    var relTag = num_(c.relativeValuationScore) >= 55 ? 'discount vs peers' : 'premium vs peers';
    bullets.push('Relative valuation ' + num_(c.relativeValuationScore) + '/100 — ' + relTag + '.');
  }
  if (f) {
    if (f.pe > 0) {
      bullets.push('Trailing P/E ' + f.pe.toFixed(1) +
        (num_(c.sectorMedianPe) > 0 ? ' vs sector median ' + num_(c.sectorMedianPe).toFixed(1) : ''));
    }
    if (f.pb > 0) {
      bullets.push('P/B ' + f.pb.toFixed(2) +
        (num_(c.sectorMedianPb) > 0 ? ' vs sector median ' + num_(c.sectorMedianPb).toFixed(2) : ''));
    }
    if (num_(f.peVs3y) > 0) bullets.push('P/E vs 3-year band ratio ' + num_(f.peVs3y).toFixed(2));
    if (f.valuationTag) bullets.push('Screener classification: ' + f.valuationTag);
  } else {
    bullets.push('Tab 6 fundamentals missing — import for P/E, P/B, and historical bands.');
  }
  return analystFormatSection_('Valuation summary:', bullets);
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @return {string}
 */
function buildPeerComparisonSection_(c, ctx) {
  var bullets = [];
  if (ctx.engine3 && ctx.engine3.why_peers) bullets.push(ctx.engine3.why_peers);
  if (typeof buildWhyBetterThanPeers_ === 'function' && num_(c.relativeQualityScore) > 0) {
    var peerN = {
      sectorKey: c.sectorKey || c.sector,
      sector_median_pe: c.sectorMedianPe,
      sector_median_roce: c.sectorMedianRoce,
      relative_quality_score: c.relativeQualityScore,
      relative_valuation_score: c.relativeValuationScore,
      relative_growth_score: c.relativeGrowthScore || c.relativeStrengthScore,
      named_peers: typeof getNamedPeersForSector_ === 'function' ?
        getNamedPeersForSector_(c.sectorKey) : []
    };
    bullets.push(buildWhyBetterThanPeers_(c, peerN, ctx.fundamentals));
  }
  if (num_(c.relativeQualityScore) > 0) {
    bullets.push('Relative scores (0–100): Quality ' + num_(c.relativeQualityScore) +
      ', Valuation ' + num_(c.relativeValuationScore) + ', Growth ' +
      (num_(c.relativeGrowthScore) || num_(c.relativeStrengthScore)));
  }
  if (num_(c.sectorMedianRoce) > 0 && ctx.fundamentals && ctx.fundamentals.roce > 0) {
    bullets.push('ROCE ' + ctx.fundamentals.roce.toFixed(1) + '% vs sector median ' +
      num_(c.sectorMedianRoce).toFixed(1) + '% (Tab 25).');
  }
  if (!bullets.length) {
    bullets.push('Limited peer sample — benchmark vs sector leaders on Tab 19 and Tab 25 medians.');
  }
  return analystFormatSection_('Peer comparison vs sector:', bullets);
}

/**
 * @param {Object} c
 * @param {Object} ctx
 * @return {string}
 */
function buildThemeExposureSection_(c, ctx) {
  var tags = c.themeTags && c.themeTags.length ? c.themeTags.join(', ') :
    (c.primaryThemeId || '');
  var bullets = [];
  if (tags) bullets.push('UNIVERSE themes: ' + tags);
  if (c.themeExposure) bullets.push('Exposure map: ' + String(c.themeExposure));
  if (num_(c.themeStrength) > 0 || num_(c.themeMomentum) > 0) {
    bullets.push('Theme strength ' + num_(c.themeStrength) + '/100 · momentum ' +
      num_(c.themeMomentum) + '/100 (exposure-weighted).');
  }
  if (num_(c.themeConvictionScore) > 0) {
    bullets.push('Theme conviction ' + num_(c.themeConvictionScore) + '/100' +
      (c.primaryThemeId ? ' · primary theme ' + c.primaryThemeId : ''));
  }
  if (num_(c.sectorStrength) >= 6) {
    bullets.push('Sector strength pillar ' + num_(c.sectorStrength) + '/10 — supportive macro bucket.');
  }
  if (!bullets.length) {
    bullets.push('No explicit theme tag — thesis driven by sector fundamentals and idiosyncratic drivers.');
  }
  return analystFormatSection_('Theme exposure:', bullets);
}

/**
 * @param {Object} c
 * @param {number} confidence
 * @param {Object} ctx
 * @return {string}
 */
function buildConfidenceRationale_(c, confidence, ctx) {
  var bullets = [];
  bullets.push('Model confidence ' + confidence + '/100 blends opportunity rank ' +
    (num_(c.opportunityRank) || num_(c.conviction)) + ' with data quality ' +
    Math.round(num_(c.dataQualityPct) || 50) + '%.');
  if (c.dataGateFlag) bullets.push('Data gate pass supports institutional sizing.');
  if (num_(c.newsArticleCount30d) >= 3) {
    bullets.push(num_(c.newsArticleCount30d) + ' news articles (30d) deepen narrative coverage.');
  }
  if (num_(c.riskScore) >= 65) bullets.push('Risk grade ' + (c.riskGrade || '—') + ' — acceptable safety skew.');
  if (ctx && ctx.breakdown) bullets.push('Pillar breakdown: ' + ctx.breakdown);
  return analystFormatBullets_(bullets);
}

/**
 * @param {Object} c
 * @param {string} listName
 * @param {Object} ctx
 * @return {string}
 */
function buildTimelineSection_(c, listName, ctx) {
  var shortH = pickHorizonShort_(c, listName);
  var label = typeof decisionTimelineLabel_ === 'function' ?
    decisionTimelineLabel_(shortH, c, listName) :
    shortH;
  return label + ' — ' + analystListHorizonGuidance_(listName, c) +
    ' Revisit after earnings, material filings, or risk-grade change.';
}

/**
 * @param {Object} c
 * @param {string} listName
 * @return {string}
 */
function pickHorizonShort_(c, listName) {
  if (c.horizon1w) return '1w';
  if (c.horizon1m) return '1m';
  if (c.horizon3m) return '3m';
  if (c.horizonLong) return '12m';
  var ln = String(listName || '').toLowerCase();
  if (ln.indexOf('immediate') >= 0) return '1m';
  if (ln.indexOf('compounder') >= 0 || ln.indexOf('monopoly') >= 0) return '12m';
  return '3m';
}

/**
 * @param {string} listName
 * @param {number} rank
 * @param {Object} c
 * @return {string}
 */
function analystListActionThesis_(listName, rank, c) {
  if (typeof decisionActionThesis_ === 'function') {
    return decisionActionThesis_(listName, rank, c);
  }
  return 'Action: research overweight with risk-managed sizing.';
}

/**
 * @param {string} listName
 * @param {Object} c
 * @return {string}
 */
function analystListHorizonGuidance_(listName, c) {
  var ln = String(listName || '').toLowerCase();
  if (ln.indexOf('immediate') >= 0) return 'Trade the catalyst window; cut if event fades.';
  if (ln.indexOf('3-month') >= 0) return 'Swing holding period aligned to earnings and sector rank.';
  if (ln.indexOf('compounder') >= 0) return 'Multi-quarter compounder hold; add on quality confirmation.';
  if (ln.indexOf('turnaround') >= 0) return 'Recovery timeline — prove balance sheet before scaling.';
  if (ln.indexOf('theme') >= 0) return 'Thematic window 3–12 months tied to policy/capex cycle.';
  return 'Default 3-month research horizon unless catalyst accelerates.';
}

/**
 * @param {AnalystNote} note
 * @param {Object=} options
 * @return {boolean}
 */
function isAnalystNoteComplete_(note, options) {
  if (!note) return false;
  options = options || {};
  if (options.themeListRow) {
    return sectionLen_(note.investment_thesis) >= 20 && sectionLen_(note.bull_case) >= 20;
  }
  var fields = [
    'investment_thesis', 'bull_case', 'bear_case', 'catalysts', 'risks',
    'peer_comparison', 'theme_exposure', 'timeline'
  ];
  for (var i = 0; i < fields.length; i++) {
    if (sectionLen_(note[fields[i]]) < ANALYST_NOTE_MIN_SECTION_CHARS_) return false;
  }
  var valText = note.valuation_summary || note.valuation;
  if (sectionLen_(valText) < ANALYST_NOTE_MIN_SECTION_CHARS_) return false;
  if (num_(note.confidence) < 1) return false;
  if (sectionLen_(note.confidence_rationale) < 20) return false;
  return true;
}

/**
 * @param {string} s
 * @return {number}
 */
function sectionLen_(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().length;
}

/**
 * Formatted analyst document for Tab 11 bull_case column.
 * @param {AnalystNote} note
 * @return {string}
 */
function formatAnalystNoteDocument_(note) {
  return [
    'INVESTMENT THESIS',
    note.investment_thesis,
    '',
    'BULL CASE',
    note.bull_case,
    '',
    'BEAR CASE',
    note.bear_case,
    '',
    'CATALYSTS',
    note.catalysts,
    '',
    'RISKS',
    note.risks,
    '',
    'VALUATION SUMMARY',
    note.valuation_summary || note.valuation,
    '',
    'PEER COMPARISON',
    note.peer_comparison,
    '',
    'THEME EXPOSURE',
    note.theme_exposure,
    '',
    'CONFIDENCE',
    note.confidence + '/100 — ' + note.confidence_rationale,
    '',
    'TIMELINE',
    note.timeline
  ].join('\n');
}

/**
 * @param {AnalystNote} note
 * @param {string} breakdown
 * @return {string}
 */
function serializeAnalystNoteEvidence_(note, breakdown) {
  var payload = {
    v: ANALYST_NOTE_VERSION_,
    analyst_note: {
      investment_thesis: note.investment_thesis,
      bull_case: note.bull_case,
      bear_case: note.bear_case,
      catalysts: note.catalysts,
      risks: note.risks,
      valuation: note.valuation,
      valuation_summary: note.valuation_summary || note.valuation,
      peer_comparison: note.peer_comparison,
      theme_exposure: note.theme_exposure,
      confidence: note.confidence,
      confidence_rationale: note.confidence_rationale,
      timeline: note.timeline
    },
    score_breakdown: breakdown || ''
  };
  var s = JSON.stringify(payload);
  return s.length > 48000 ? s.substring(0, 48000) : s;
}

/**
 * @param {string} evidence
 * @return {Object|null}
 */
function parseAnalystNoteFromEvidence_(evidence) {
  if (!evidence) return null;
  var raw = String(evidence).trim();
  try {
    var j = JSON.parse(raw);
    if (j.analyst_note) return j.analyst_note;
    if (j.investment_thesis) return j;
  } catch (e1) { /* legacy plain text */ }
  return null;
}

/**
 * Map analyst note → legacy narrative + API fields.
 * @param {AnalystNote} note
 * @param {Object} c
 * @param {Object} qualityEval
 * @return {Object}
 */
function mapAnalystNoteToNarrative_(note, c, qualityEval) {
  qualityEval = qualityEval || { pass: true, confidence: note.confidence, reasons: [] };
  return {
    bull: formatAnalystNoteDocument_(note),
    bear: note.bear_case,
    catalyst: note.catalysts,
    horizon: note.timeline_short || '3m',
    confidence: note.confidence,
    evidence: serializeAnalystNoteEvidence_(note,
      typeof buildScoreBreakdown_ === 'function' ? buildScoreBreakdown_(c) : ''),
    analyst_note: note,
    investment_thesis: note.investment_thesis,
    why_now: note.catalysts.substring(0, 500),
    why_stock: note.bull_case.substring(0, 500),
    why_peers: note.peer_comparison.substring(0, 500),
    filter_pass: qualityEval.pass,
    filter_reasons: qualityEval.reasons
  };
}

/**
 * Pick up to `limit` symbols with complete analyst notes; backfill from pool if needed.
 * @param {Array<Object>} picked
 * @param {Array<Object>} pool
 * @param {Object} listDef
 * @param {Array<Array>} macroRows
 * @param {Object} sectorLookup
 * @param {number} limit
 * @return {Array<{candidate:Object, note:Object, narrative:Object}>}
 */
function finalizeRecommendationPicksWithAnalystNotes_(picked, pool, listDef, macroRows, sectorLookup, limit) {
  limit = limit || 10;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var used = {};
  var out = [];
  var filter = listDef.filter;
  var listName = listDef.name;

  function tryAdd(c) {
    if (!c || !c.symbol || used[c.symbol]) return false;
    if (typeof passesRecommendationQualityGate_ === 'function' &&
      !passesRecommendationQualityGate_(c, filter)) return false;
    var sortKey = recommendationSortKey_(c, filter);
    var note = buildAnalystRecommendationNote_(c, filter, sortKey, listName, ss);
    note = finalizeAnalystNoteForPublish_(note, c, buildAnalystNoteContext_(ss, c), listName);
    if (!isAnalystNoteComplete_(note)) return false;
    var ev = typeof evaluateRecommendationQuality_ === 'function' ?
      evaluateRecommendationQuality_(c, filter) : { pass: true, confidence: note.confidence, reasons: [] };
    used[c.symbol] = true;
    out.push({
      candidate: c,
      note: note,
      narrative: mapAnalystNoteToNarrative_(note, c, ev)
    });
    return true;
  }

  picked.forEach(function(c) {
    if (out.length >= limit) return;
    tryAdd(c);
  });

  if (out.length < limit) {
    var sortedPool = pool.slice().sort(function(a, b) {
      return recommendationSortKey_(b, filter) - recommendationSortKey_(a, filter);
    });
    for (var i = 0; i < sortedPool.length && out.length < limit; i++) {
      var c = sortedPool[i];
      if (typeof passesListFilterLoose_ === 'function' &&
        !passesListFilterLoose_(c, filter, macroRows, sectorLookup)) continue;
      tryAdd(c);
    }
  }

  return out;
}

/**
 * Theme list row (non-equity) — shorter note requirement.
 * @param {Object} themeObj
 * @param {number} rank
 * @return {Object}
 */
function buildThemeListAnalystNote_(themeObj, rank) {
  var t = themeObj || {};
  var score = num_(t.theme_conviction_score);
  var label = t.theme_label || t.theme_id || 'Theme';
  var note = {
    version: ANALYST_NOTE_VERSION_,
    investment_thesis: analystFormatSection_(
      'Thematic view: ' + label + ' ranks #' + rank + ' with conviction ' + score + '/100 across ' +
        (t.symbol_count || 0) + ' UNIVERSE constituents.',
      ['Overweight the theme basket for policy/capex alignment over 3–12 months.']
    ),
    bull_case: analystFormatSection_('Bull case — theme drivers:', [
      'Strength ' + num_(t.theme_strength) + '/100 · momentum ' + num_(t.theme_momentum) + '/100',
      'Government support score ' + num_(t.government_support) + ' · capex cycle ' + num_(t.capex_cycle),
      'Order momentum ' + num_(t.order_momentum) + ' from corporate event pipeline'
    ]),
    bear_case: analystFormatSection_('Bear case:', [
      'Macro reversal or commodity shock deflates the basket',
      'Execution delays on capex/policy translate to estimate cuts'
    ]),
    catalysts: analystFormatSection_('Catalysts:', [
      'Policy headlines and budget/capex announcements',
      'Order-book momentum across theme constituents'
    ]),
    risks: analystFormatSection_('Risks:', [
      'Single-theme concentration — diversify across uncorrelated names',
      'Crowded thematic trades amplify drawdowns on de-rating'
    ]),
    valuation: analystFormatSection_('Valuation summary:', [
      'Aggregate basket valued via median P/E of Tab 10 theme leaders',
      'Compare vs other themes on Tab 27 THEME INTELLIGENCE'
    ]),
    valuation_summary: '',
    peer_comparison: analystFormatSection_('Peer comparison:', [
      'Rank theme vs other themes on conviction, strength, and momentum scores'
    ]),
    theme_exposure: 'Primary expression: ' + (t.theme_id || '') +
      ' — drill into Top 10 Theme Stocks for single-name weights.',
    confidence: Math.min(95, Math.max(40, score)),
    confidence_rationale: 'Theme Intelligence Engine composite (strength × momentum × policy support).',
    timeline: '3–12 month thematic horizon — align position sizing with capex/policy cycle.',
    timeline_short: '3m'
  };
  note.valuation_summary = note.valuation;
  return finalizeAnalystNoteForPublish_(note, { symbol: t.theme_id }, {}, 'Top Themes', { themeListRow: true });
}

/**
 * @param {string} filter
 * @return {string}
 */
function recommendationListNameFromFilter_(filter) {
  if (typeof RECOMMENDATION_LIST_DEFS === 'undefined') return '';
  for (var i = 0; i < RECOMMENDATION_LIST_DEFS.length; i++) {
    if (RECOMMENDATION_LIST_DEFS[i].filter === filter) return RECOMMENDATION_LIST_DEFS[i].name;
  }
  return '';
}

/**
 * @param {string} listName
 * @return {string}
 */
function recommendationFilterFromListName_(listName) {
  if (typeof RECOMMENDATION_LIST_DEFS === 'undefined') return '';
  for (var i = 0; i < RECOMMENDATION_LIST_DEFS.length; i++) {
    if (RECOMMENDATION_LIST_DEFS[i].name === listName) return RECOMMENDATION_LIST_DEFS[i].filter;
  }
  return '';
}

/** Menu — preview v2 analyst note for first watchlist symbol. */
function previewAnalystNoteEngine() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var syms = collectWatchlistSymbols_(ss).slice(0, 1);
  if (!syms.length) {
    SpreadsheetApp.getUi().alert('Add symbols to the watchlist first.');
    return;
  }
  var sym = syms[0];
  var universeMap = buildUniverseLookup_(ss);
  var c = buildScoringCandidateFromSymbol_(ss, sym, universeMap);
  var note = buildAnalystRecommendationNote_(c, 'compounders', null, 'Top 10 Compounders', ss);
  SpreadsheetApp.getUi().alert(
    'Analyst Note v2 — ' + sym,
    formatAnalystNoteDocument_(note).substring(0, 1800),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * API / UI decision block from analyst note.
 * @param {Object|null} note
 * @param {Object} c
 * @param {Object} item
 * @param {string} listName
 * @return {Object}
 */
function buildDecisionFromAnalystNote_(note, c, item, listName) {
  if (note && sectionLen_(note.investment_thesis) >= ANALYST_NOTE_MIN_SECTION_CHARS_) {
    return {
      why: note.investment_thesis,
      what: typeof decisionActionThesis_ === 'function' ?
        decisionActionThesis_(listName, num_(item.conviction_total), c) :
        'See investment thesis.',
      risk: note.risks,
      catalyst: note.catalysts,
      timeline: note.timeline,
      why_now: note.catalysts,
      why_stock: note.bull_case,
      why_peers: note.peer_comparison,
      upside: typeof buildRiskRewardMetrics_ === 'function' && c && c.symbol ?
        ('Upside ' + buildRiskRewardMetrics_(c).upside_score + '/100') : '',
      reward_risk: typeof buildRiskRewardMetrics_ === 'function' && c && c.symbol ?
        ('Reward/Risk ' + buildRiskRewardMetrics_(c).reward_risk_ratio + ':1') : '',
      analyst_note: note
    };
  }
  return typeof buildDecisionNarrativeFromScores_ === 'function' ?
    buildDecisionNarrativeFromScores_(c, item, listName) :
    { why: '', what: '', risk: '', catalyst: '', timeline: '' };
}
