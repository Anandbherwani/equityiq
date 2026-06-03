/**
 * Scoring Engine 2.1 — forensic validation (actual Tab 10 output).
 * Menu: Stock Tracker → Run Scoring Engine 2.1 validation
 * Property: SCORING_ENGINE_VALIDATION_JSON
 * Sheet: SCORING VALIDATION (summary rows)
 */

var SCORING_VALIDATION_JSON_PROP = 'SCORING_ENGINE_VALIDATION_JSON';
var SCORING_VALIDATION_SHEET = 'SCORING VALIDATION';

var PILLAR_COLS_ = [
  { key: 'C', col: 2, max: 15, name: 'Fundamentals' },
  { key: 'D', col: 3, max: 15, name: 'Valuation' },
  { key: 'E', col: 4, max: 15, name: 'Growth' },
  { key: 'F', col: 5, max: 15, name: 'Financial Strength' },
  { key: 'G', col: 6, max: 10, name: 'Sector Strength' },
  { key: 'H', col: 7, max: 10, name: 'News & Events' },
  { key: 'I', col: 8, max: 5, name: 'Price Momentum' },
  { key: 'J', col: 9, max: 5, name: 'Institutional Flow' },
  { key: 'K', col: 10, max: 10, name: 'Business Moat' }
];

/**
 * Full forensic scan of Tab 10 (all rows).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditScoringEngineForensic_(ss) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  var engineVersion = typeof SCORING_ENGINE_VERSION !== 'undefined' ? SCORING_ENGINE_VERSION : 'unknown';
  var engine3 = typeof USE_CONVICTION_ENGINE_3_ !== 'undefined' && USE_CONVICTION_ENGINE_3_;
  var empty = {
    engineVersion: engineVersion,
    timestampIst: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    tab10Rows: 0,
    conviction: {},
    pillars: [],
    diagnosis: {}
  };

  if (!sheet || sheet.getLastRow() < 2) return empty;

  var n = sheet.getLastRow() - 1;
  var block = sheet.getRange(2, 1, n, SCORING_NUM_COLS).getValues();
  var mList = [];
  var rowMeta = [];
  var staleM = 0;
  var pillarStats = {};

  PILLAR_COLS_.forEach(function(p) {
    pillarStats[p.key] = {
      key: p.key,
      name: p.name,
      col: p.col,
      max: p.max,
      nonZero: 0,
      missing: 0,
      sum: 0,
      confidenceSum: 0,
      confidenceN: 0,
      atCap: 0
    };
  });

  var confCol = 11;
  var tab6Rows = 0;
  var fundSheet = ss.getSheetByName('6. FUNDAMENTALS');
  if (fundSheet && fundSheet.getLastRow() >= 2) tab6Rows = fundSheet.getLastRow() - 1;
  var universeMap = buildUniverseLookup_(ss);

  var engine3Ranked = 0;
  var engine3MEqualsPillarSum = 0;

  block.forEach(function(r) {
    var sym = String(r[0] || '').trim();
    if (!sym) return;

    var ca = auditScoringConviction_(r);
    if (ca.m_stale) staleM++;
    mList.push(ca.m_effective);
    rowMeta.push({ symbol: sym, m: ca.m_effective });

    if (engine3 && String(r[48] || '').toUpperCase() === 'RANKED') {
      engine3Ranked++;
      var pillarSum = typeof computeAdditivePillarSum_ === 'function' ?
        computeAdditivePillarSum_(buildScoringCandidate_(r, universeMap)) :
        calculateConvictionFromRow_(r);
      var m = num_(r[12]);
      var opp = num_(r[49]);
      if (Math.abs(m - pillarSum) < 2 && Math.abs(m - opp) < 2 && pillarSum > 30) {
        engine3MEqualsPillarSum++;
      }
    }

    var rowConf = num_(r[confCol]);
    PILLAR_COLS_.forEach(function(p) {
      var v = num_(r[p.col]);
      var st = pillarStats[p.key];
      if (v > 0) {
        st.nonZero++;
        st.sum += v;
      } else {
        st.missing++;
      }
      if (v >= p.max) st.atCap++;
      if (rowConf > 0) {
        st.confidenceSum += rowConf;
        st.confidenceN++;
      }
    });
  });

  mList.sort(function(a, b) { return a - b; });

  function gt(t) {
    return mList.filter(function(x) { return x > t; }).length;
  }

  var sumM = 0;
  mList.forEach(function(x) { sumM += x; });

  var medianM = 0;
  if (mList.length) {
    var mid = Math.floor(mList.length / 2);
    medianM = mList.length % 2 ? mList[mid] : Math.round((mList[mid - 1] + mList[mid]) / 2);
  }

  var pillarArr = PILLAR_COLS_.map(function(p) {
    var st = pillarStats[p.key];
    var avg = st.nonZero ? Math.round((st.sum / st.nonZero) * 10) / 10 : 0;
    var avgConf = st.confidenceN ? Math.round(st.confidenceSum / st.confidenceN) : 0;
    return {
      key: st.key,
      name: st.name,
      max: st.max,
      non_zero_count: st.nonZero,
      non_zero_pct: mList.length ? Math.round((st.nonZero / mList.length) * 1000) / 10 : 0,
      missing_count: st.missing,
      average_score_nonzero: avg,
      average_score_all_rows: mList.length ? Math.round((st.sum / mList.length) * 100) / 100 : 0,
      total_points_contributed: st.sum,
      at_cap_count: st.atCap,
      avg_confidence_pct: avgConf
    };
  });

  pillarArr.sort(function(a, b) {
    return b.total_points_contributed - a.total_points_contributed;
  });

  var dominant = pillarArr.length ? pillarArr[0] : null;
  var never = pillarArr.filter(function(p) { return p.non_zero_count === 0; }).map(function(p) {
    return p.key + ' ' + p.name;
  });
  var weak = pillarArr.filter(function(p) {
    return p.non_zero_pct < 5 && p.max >= 10;
  }).map(function(p) { return p.key + ' (' + p.non_zero_pct + '%)'; });

  return {
    engineVersion: engineVersion,
    timestampIst: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    spreadsheetName: ss.getName(),
    tab10Rows: mList.length,
    tab6Rows: tab6Rows,
    stale_m_count: staleM,
    conviction: {
      count_gt0: gt(0),
      count_gt10: gt(10),
      count_gt20: gt(20),
      count_gt40: gt(40),
      count_gt60: gt(60),
      max: mList.length ? mList[mList.length - 1] : 0,
      min: mList.length ? mList[0] : 0,
      median: medianM,
      average: mList.length ? Math.round((sumM / mList.length) * 100) / 100 : 0,
      sum: sumM
    },
    pillars: pillarArr,
    top20: rowMeta.sort(function(a, b) { return b.m - a.m; }).slice(0, 20).map(function(x, i) {
      return { rank: i + 1, symbol: x.symbol, conviction_total: x.m };
    }),
    diagnosis: {
      dominant_pillar: dominant ? dominant.key + ' ' + dominant.name : 'none',
      dominant_total_points: dominant ? dominant.total_points_contributed : 0,
      never_contribute: never,
      weak_pillars: weak,
      pct_rows_m_gt0: mList.length ? Math.round((gt(0) / mList.length) * 1000) / 10 : 0,
      engine3_enabled: engine3,
      engine3_ranked_rows: engine3Ranked,
      engine3_m_equals_pillar_sum: engine3MEqualsPillarSum,
      engine3_tiered_ok: engine3 ? engine3MEqualsPillarSum < Math.max(1, Math.floor(engine3Ranked * 0.2)) : null
    }
  };
}

/**
 * Menu entry — writes JSON property + SCORING VALIDATION sheet + alert.
 */
function runScoringEngineForensicValidation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = auditScoringEngineForensic_(ss);
  var json = JSON.stringify(report);
  PropertiesService.getScriptProperties().setProperty(SCORING_VALIDATION_JSON_PROP, json);
  Logger.log('SCORING_ENGINE_FORENSIC\n' + json);
  writeScoringValidationSheet_(ss, report);
  showScoringValidationAlert_(report);
  return report;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 */
function writeScoringValidationSheet_(ss, report) {
  var sheet = ss.getSheetByName(SCORING_VALIDATION_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SCORING_VALIDATION_SHEET);
  }
  sheet.clear();
  var rows = [
    ['metric', 'value'],
    ['timestamp_ist', report.timestampIst],
    ['engine_version', report.engineVersion],
    ['tab10_rows', report.tab10Rows],
    ['tab6_rows', report.tab6Rows],
    ['stale_m_count', report.stale_m_count],
    ['M_count_gt0', report.conviction.count_gt0],
    ['M_count_gt10', report.conviction.count_gt10],
    ['M_count_gt20', report.conviction.count_gt20],
    ['M_count_gt40', report.conviction.count_gt40],
    ['M_count_gt60', report.conviction.count_gt60],
    ['M_max', report.conviction.max],
    ['M_median', report.conviction.median],
    ['M_average', report.conviction.average],
    ['dominant_pillar', report.diagnosis.dominant_pillar],
    ['never_contribute', (report.diagnosis.never_contribute || []).join('; ')],
    ['weak_pillars', (report.diagnosis.weak_pillars || []).join('; ')]
  ];
  (report.pillars || []).forEach(function(p) {
    rows.push([
      'pillar_' + p.key,
      'nz=' + p.non_zero_count + ' miss=' + p.missing_count + ' avg_nz=' + p.average_score_nonzero +
        ' total=' + p.total_points_contributed + ' conf=' + p.avg_confidence_pct + '%'
    ]);
  });
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
}

/**
 * @param {Object} report
 */
function showScoringValidationAlert_(report) {
  var c = report.conviction;
  var lines = [
    'Scoring Engine ' + report.engineVersion + ' forensic',
    'Tab 10 rows: ' + report.tab10Rows + ' | Tab 6: ' + report.tab6Rows,
    'M>0: ' + c.count_gt0 + ' | >10: ' + c.count_gt10 + ' | >20: ' + c.count_gt20 +
      ' | >40: ' + c.count_gt40 + ' | >60: ' + c.count_gt60,
    'Max: ' + c.max + ' | Median: ' + c.median + ' | Avg: ' + c.average,
    'Dominant: ' + report.diagnosis.dominant_pillar,
    'Never contribute: ' + (report.diagnosis.never_contribute.join(', ') || 'none'),
    '',
    'Full JSON → SCORING_ENGINE_VALIDATION_JSON',
    'Summary → tab "' + SCORING_VALIDATION_SHEET + '"'
  ];
  SpreadsheetApp.getUi().alert('Scoring validation', lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}
