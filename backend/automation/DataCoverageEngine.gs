/**
 * Data Coverage Engine — pillar scorecards for live sheet quality (80%+ target).
 * See docs/LIVE_DATA_COVERAGE_REPORT.md
 */

var DATA_COVERAGE_ENGINE_VERSION_ = '1.0';
var DATA_COVERAGE_TARGET_PCT_ = 80;

/** Tab 10 column indices (0-based) for conviction pillars. */
var PILLAR_SCORECARD_DEFS_ = [
  { id: 'fundamentals', label: 'Fundamentals', col: 2 },
  { id: 'valuation', label: 'Valuation', col: 3 },
  { id: 'growth', label: 'Growth', col: 4 },
  { id: 'financial_strength', label: 'Financial Strength', col: 5 },
  { id: 'sector_strength', label: 'Sector Strength', col: 6 },
  { id: 'news', label: 'News', col: 7 },
  { id: 'momentum', label: 'Momentum', col: 8 },
  { id: 'institutional_flow', label: 'Institutional Flow', col: 9 },
  { id: 'business_moat', label: 'Business Moat', col: 10, confidenceCol: 11 }
];

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function computePillarCoverageScorecards_(ss) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) {
    return {
      ok: false,
      error: 'Tab 10 empty',
      target_pct: DATA_COVERAGE_TARGET_PCT_,
      pillars: []
    };
  }

  var numRows = sheet.getLastRow() - 1;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 67;
  var data = sheet.getRange(2, 1, numRows, cols).getValues();
  var n = data.length || 1;
  var pillars = [];

  PILLAR_SCORECARD_DEFS_.forEach(function(def) {
    var populated = 0;
    var stale = 0;
    var nullCount = 0;
    var confSum = 0;
    var confN = 0;

    data.forEach(function(r) {
      var v = num_(r[def.col]);
      var age = num_(r[33]);
      var dq = num_(r[40]);
      if (v == null || v === '' || isNaN(v) || v <= 0) {
        nullCount++;
      } else {
        populated++;
        if (age > 90 || r[36] === true || r[36] === 'TRUE') stale++;
        if (def.confidenceCol != null) {
          var c = num_(r[def.confidenceCol]);
          if (c > 0) { confSum += c; confN++; }
        } else if (dq > 0) {
          confSum += dq;
          confN++;
        }
      }
    });

    var coveragePct = Math.round((populated / n) * 1000) / 10;
    var stalePct = Math.round((stale / n) * 1000) / 10;
    var nullPct = Math.round((nullCount / n) * 1000) / 10;
    var confidencePct = confN ? Math.round((confSum / confN) * 10) / 10 : 0;

    pillars.push({
      pillar: def.id,
      label: def.label,
      coverage_pct: coveragePct,
      stale_pct: stalePct,
      null_pct: nullPct,
      confidence_pct: confidencePct,
      meets_target: coveragePct >= DATA_COVERAGE_TARGET_PCT_
    });
  });

  var meetsAll = pillars.every(function(p) { return p.meets_target; });
  var avgCoverage = pillars.length ?
    Math.round(pillars.reduce(function(s, p) { return s + p.coverage_pct; }, 0) / pillars.length * 10) / 10 :
    0;

  return {
    ok: true,
    engine_version: DATA_COVERAGE_ENGINE_VERSION_,
    generated_at: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    universe_rows: n,
    target_pct: DATA_COVERAGE_TARGET_PCT_,
    average_coverage_pct: avgCoverage,
    meets_target_all_pillars: meetsAll,
    pillars: pillars,
    ingestion: typeof computeIngestionUniverseCoverage_ === 'function' ?
      computeIngestionUniverseCoverage_(ss) : null
  };
}

/**
 * Web API payload.
 * @return {Object}
 */
function getDataCoverageReport_() {
  return computePillarCoverageScorecards_(SpreadsheetApp.getActiveSpreadsheet());
}

/**
 * Menu — write LIVE_DATA_COVERAGE summary to log.
 */
/**
 * System audit stage — pillar coverage vs 80% target.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function auditStagePillarCoverage_(ss) {
  var report = computePillarCoverageScorecards_(ss);
  if (!report.ok) {
    return { status: 'FAIL', note: report.error || 'Tab 10 empty' };
  }
  var below = (report.pillars || []).filter(function(p) { return !p.meets_target; });
  var status = below.length === 0 ? 'PASS' : (below.length <= 3 ? 'PARTIAL' : 'FAIL');
  return {
    status: status,
    averageCoveragePct: report.average_coverage_pct,
    targetPct: report.target_pct,
    meetsTargetAll: report.meets_target_all_pillars,
    pillarsBelowTarget: below.map(function(p) { return p.label + ':' + p.coverage_pct + '%' }),
    ingestionWeightedPct: report.ingestion ? report.ingestion.weighted_coverage_pct : null,
    note: below.length ? below.length + ' pillars below ' + report.target_pct + '% coverage' : ''
  };
}

function previewDataCoverageReport() {
  var report = getDataCoverageReport_();
  Logger.log(JSON.stringify(report));
  var lines = ['Pillar coverage (target ' + DATA_COVERAGE_TARGET_PCT_ + '%):'];
  (report.pillars || []).forEach(function(p) {
    lines.push(p.label + ': cov ' + p.coverage_pct + '% · stale ' + p.stale_pct +
      '% · null ' + p.null_pct + '% · conf ' + p.confidence_pct + '%');
  });
  SpreadsheetApp.getUi().alert('Data coverage', lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}
