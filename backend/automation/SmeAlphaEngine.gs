/**
 * SME Alpha Engine — sme_alpha_score + Top 10 SME Opportunities (four tracks).
 * Integrates Tab 11 + Tab 37 via recommendation_category sme_*.
 */

var SME_ALPHA_ENGINE_VERSION_ = '1.0';
var SME_LIST_NAME_ = 'Top 10 SME Opportunities';

var SME_TRACKS_ = [
  { id: 'sme_compounder', label: 'SME Compounders', filter: 'sme_compounder' },
  { id: 'sme_migration', label: 'SME Migration Candidates', filter: 'sme_migration' },
  { id: 'sme_export', label: 'SME Export Stories', filter: 'sme_export' },
  { id: 'sme_gov', label: 'SME Government Beneficiaries', filter: 'sme_gov' }
];

/**
 * @param {Object} candidate
 * @param {Object} universe
 * @return {number}
 */
function computeSmeAlphaScore_(candidate, universe) {
  var u = universe || {};
  var isSme = u.is_sme === true || u.is_sme === 'TRUE' ||
    String(u.cap_segment || u.market_cap_bucket || '').toUpperCase().indexOf('SME') >= 0;
  if (!isSme) return 0;

  var growth = num_(candidate.growth) || 0;
  var quality = num_(candidate.fundamentals) || 0;
  var moat = num_(candidate.businessMoat) || num_(candidate.business_moat) || 0;
  var flow = num_(candidate.institutionalFlow) || num_(candidate.institutional_flow) || 0;
  var dq = num_(candidate.dataQualityPct) || num_(candidate.data_quality_pct) || 50;
  var rank = num_(candidate.opportunityRank) || num_(candidate.opportunity_rank) || 0;

  var score = growth * 0.25 + quality * 0.2 + moat * 0.15 + flow * 0.1 + rank * 0.2 + dq * 0.1;
  return Math.min(100, Math.round(score * 10) / 10);
}

/**
 * @param {Object} candidate
 * @param {Object} macroRows
 * @return {string}
 */
function classifySmeTrack_(candidate, macroRows) {
  var themes = String(candidate.themeTags || candidate.primaryThemeId || '').toLowerCase();
  var sector = String(candidate.sector || '').toLowerCase();
  if (themes.indexOf('export') >= 0 || sector.indexOf('export') >= 0) return 'sme_export';
  if (themes.indexOf('gov') >= 0 || themes.indexOf('defence') >= 0 || themes.indexOf('infra') >= 0) {
    return 'sme_gov';
  }
  var mig = num_(candidate.vs_50dma) || 0;
  if (mig > 8 && num_(candidate.growth) >= 12) return 'sme_migration';
  return 'sme_compounder';
}

/**
 * Append Top 10 SME rows to Tab 11 output array.
 * @param {Array<Array>} out
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} refreshed
 */
function appendSmeOpportunitiesToTab11_(out, ss, refreshed) {
  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (!scoreSheet || scoreSheet.getLastRow() < 2) return;

  var universeMap = buildUniverseLookup_(ss);
  var numRows = scoreSheet.getLastRow() - 1;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 67;
  var data = scoreSheet.getRange(2, 1, numRows, cols).getValues();
  var picks = [];

  data.forEach(function(r) {
    var c = buildScoringCandidate_(r, universeMap);
    if (!c.symbol || c.excluded) return;
    var u = universeMap[c.symbol] || {};
    var smeScore = computeSmeAlphaScore_(c, u);
    if (smeScore < 45) return;
    c.sme_alpha_score = smeScore;
    c.sme_track = classifySmeTrack_(c, []);
    picks.push(c);
  });

  picks.sort(function(a, b) { return (b.sme_alpha_score || 0) - (a.sme_alpha_score || 0); });
  picks.slice(0, 10).forEach(function(c, idx) {
    var track = c.sme_track || 'sme_compounder';
    var evidence = JSON.stringify({
      sme_track: track,
      recommendation_category: track,
      sme_alpha_score: c.sme_alpha_score
    });
    var bull = 'SME alpha ' + c.sme_alpha_score + '/100 · Track: ' + track.replace('sme_', '') +
      ' · ' + (c.sector || '');
    out.push([
      SME_LIST_NAME_,
      idx + 1,
      c.symbol,
      c.companyName,
      c.sector,
      c.sme_alpha_score,
      bull,
      'SME liquidity and migration risk; size cap limits institutional depth',
      'Order wins / listing migration / export orders',
      '6-12m',
      Math.min(92, Math.round(c.sme_alpha_score)),
      evidence,
      refreshed
    ]);
  });
}

/**
 * @return {Object}
 */
function getSmeAlphaPayload_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  var items = [];
  if (sheet && sheet.getLastRow() >= 2) {
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
    data.forEach(function(r) {
      if (String(r[0]) !== SME_LIST_NAME_) return;
      var meta = typeof parseTab11EvidenceMeta_ === 'function' ?
        parseTab11EvidenceMeta_(String(r[11] || '')) : {};
      items.push({
        rank: num_(r[1]),
        symbol: String(r[2]),
        sme_alpha_score: num_(r[5]),
        sme_track: meta.sme_track || 'sme_compounder'
      });
    });
  }
  return { ok: true, engine_version: SME_ALPHA_ENGINE_VERSION_, list_name: SME_LIST_NAME_, items: items };
}
