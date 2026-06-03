/**
 * Sector intelligence — canonical taxonomy, join audit (Tab 1 / 19 / 20).
 * See docs/SECTOR_INTELLIGENCE_AUDIT.md
 */

var SECTOR_AUDIT_PROP_ = 'LAST_SECTOR_INTELLIGENCE_AUDIT_JSON';

/** Canonical sectors (single source — mirror shared/config/sector-taxonomy.json). */
var CANONICAL_SECTOR_TAXONOMY_ = [
  'BFSI', 'IT SERVICES', 'PHARMACEUTICALS', 'CONSUMER', 'AUTOMOBILES', 'INDUSTRIALS',
  'OIL & GAS', 'POWER', 'METALS & MINING', 'REAL ESTATE', 'TELECOM', 'MEDIA',
  'CHEMICALS', 'AGRICULTURE', 'DEFENCE', 'INFRASTRUCTURE', 'LOGISTICS',
  'HOSPITALITY', 'TEXTILES', 'RETAIL', 'INSURANCE', 'NBFC', 'CEMENT',
  'ELECTRICALS', 'MISCELLANEOUS'
];

/** Raw label → canonical sector. */
var SECTOR_ALIAS_MAP_ = {
  'IT': 'IT SERVICES',
  'I T': 'IT SERVICES',
  'TECH': 'IT SERVICES',
  'TECHNOLOGY': 'IT SERVICES',
  'INFORMATION TECHNOLOGY': 'IT SERVICES',
  'TECHNOLOGY SERVICES': 'IT SERVICES',
  'IT SERVICES': 'IT SERVICES',
  'SOFTWARE': 'IT SERVICES',
  'COMPUTER SOFTWARE': 'IT SERVICES',
  'IT & SOFTWARE': 'IT SERVICES',
  'IT-SERVICES': 'IT SERVICES',
  'BANK': 'BFSI',
  'BANKS': 'BFSI',
  'BANKING': 'BFSI',
  'FINANCIAL SERVICES': 'BFSI',
  'FINANCIALS': 'BFSI',
  'NBFC': 'NBFC',
  'INSURANCE': 'INSURANCE',
  'FMCG': 'CONSUMER',
  'CONSUMER GOODS': 'CONSUMER',
  'CONSUMER DURABLES': 'CONSUMER',
  'POWER UTILITIES': 'POWER',
  'UTILITIES': 'POWER',
  'ENERGY': 'OIL & GAS',
  'OIL AND GAS': 'OIL & GAS',
  'OIL & GAS': 'OIL & GAS',
  'PHARMA': 'PHARMACEUTICALS',
  'HEALTHCARE': 'PHARMACEUTICALS',
  'HOSPITAL': 'PHARMACEUTICALS',
  'AUTO': 'AUTOMOBILES',
  'AUTOMOBILE': 'AUTOMOBILES',
  'CAPITAL GOODS': 'INDUSTRIALS',
  'INDUSTRIAL': 'INDUSTRIALS',
  'INDUSTRIALS': 'INDUSTRIALS',
  'METALS': 'METALS & MINING',
  'MINING': 'METALS & MINING',
  'REALTY': 'REAL ESTATE',
  'TELECOMMUNICATIONS': 'TELECOM',
  'MEDIA & ENTERTAINMENT': 'MEDIA',
  'CHEMICAL': 'CHEMICALS',
  'AGRI': 'AGRICULTURE',
  'DEFENSE': 'DEFENCE',
  'DEFENCE': 'DEFENCE',
  'AEROSPACE': 'DEFENCE',
  'AEROSPACE & DEFENCE': 'DEFENCE',
  'INFRA': 'INFRASTRUCTURE',
  'LOGISTICS & TRANSPORT': 'LOGISTICS',
  'HOTELS': 'HOSPITALITY',
  'TEXTILE': 'TEXTILES',
  'RETAIL': 'RETAIL',
  'CEMENT & CONSTRUCTION': 'CEMENT',
  'ELECTRICAL EQUIPMENT': 'ELECTRICALS',
  'MISC': 'MISCELLANEOUS',
  'DIVERSIFIED': 'MISCELLANEOUS'
};

/**
 * Normalize any sector label to canonical taxonomy.
 * @param {*} raw
 * @return {string} canonical sector or '' if input empty
 */
function canonicalSector_(raw) {
  var s = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
  s = s.replace(/&AMP;/gi, '&');
  if (!s) return '';

  if (SECTOR_ALIAS_MAP_[s]) return SECTOR_ALIAS_MAP_[s];
  if (CANONICAL_SECTOR_TAXONOMY_.indexOf(s) >= 0) return s;

  var i;
  for (i = 0; i < CANONICAL_SECTOR_TAXONOMY_.length; i++) {
    if (s.indexOf(CANONICAL_SECTOR_TAXONOMY_[i]) >= 0) return CANONICAL_SECTOR_TAXONOMY_[i];
  }
  for (var alias in SECTOR_ALIAS_MAP_) {
    if (SECTOR_ALIAS_MAP_.hasOwnProperty(alias) && s.indexOf(alias) >= 0) {
      return SECTOR_ALIAS_MAP_[alias];
    }
  }
  return 'MISCELLANEOUS';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildSectorIntelligenceAudit_(ss) {
  var tab1 = loadSheetData_(ss, '1. UNIVERSE');
  var tab19 = loadSheetData_(ss, '19. SECTOR STRENGTH');
  var tab20 = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  var sectorLookup = typeof buildSectorStrengthLookup_ === 'function' ?
    buildSectorStrengthLookup_(tab19) : {};

  var tab1Stats = auditTab1Sectors_(tab1, sectorLookup);
  var tab19Stats = auditTab19Sectors_(tab19);
  var tab20Stats = auditTab20Sectors_(tab20, tab1, sectorLookup);

  var joinRate = tab1Stats.total_symbols > 0 ?
    Math.round((tab1Stats.tab19_joined / tab1Stats.total_symbols) * 1000) / 10 : 0;

  return {
    generated_at: Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"),
    goal_join_rate_pct: 100,
    sector_join_rate_pct: joinRate,
    sector_coverage_pct: tab1Stats.coverage_pct,
    tab1: tab1Stats,
    tab19: tab19Stats,
    tab20: tab20Stats,
    missing_sectors: tab1Stats.missing_sector_symbols.slice(0, 50),
    duplicate_sectors: tab1Stats.duplicate_raw_groups.slice(0, 30),
    unmapped_tab19: tab19Stats.unmapped_sectors,
    unmapped_tab20_tokens: tab20Stats.unmapped_tokens.slice(0, 40),
    taxonomy: {
      canonical_count: CANONICAL_SECTOR_TAXONOMY_.length,
      alias_count: Object.keys(SECTOR_ALIAS_MAP_).length
    },
    pass: joinRate >= 100 && tab1Stats.coverage_pct >= 100
  };
}

/**
 * @param {Array<Array>} rows
 * @param {Object} sectorLookup
 * @return {Object}
 */
function auditTab1Sectors_(rows, sectorLookup) {
  var total = 0;
  var withRaw = 0;
  var withCanonical = 0;
  var tab19Joined = 0;
  var missingSymbols = [];
  var rawToCanonical = {};
  var canonicalCounts = {};

  rows.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (!sym) return;
    total++;
    var raw = String(r[3] || '').trim();
    if (raw) withRaw++;
    var canon = canonicalSector_(raw);
    if (canon) withCanonical++;
    if (!raw) {
      missingSymbols.push(sym + ':empty_sector');
    } else if (canon && sectorLookup[canon]) {
      tab19Joined++;
    } else if (canon) {
      missingSymbols.push(sym + ':no_tab19_' + canon);
    }

    if (!rawToCanonical[canon || '(empty)']) rawToCanonical[canon || '(empty)'] = {};
    rawToCanonical[canon || '(empty)'][raw || '(empty)'] = true;

    if (canon) canonicalCounts[canon] = (canonicalCounts[canon] || 0) + 1;
  });

  var duplicateGroups = [];
  Object.keys(rawToCanonical).forEach(function(canon) {
    var raws = Object.keys(rawToCanonical[canon]);
    if (raws.length > 1) {
      duplicateGroups.push({ canonical: canon, raw_variants: raws, symbol_count: canonicalCounts[canon] });
    }
  });

  return {
    total_symbols: total,
    with_sector_raw: withRaw,
    with_canonical: withCanonical,
    coverage_pct: total > 0 ? Math.round((withRaw / total) * 1000) / 10 : 0,
    canonical_pct: total > 0 ? Math.round((withCanonical / total) * 1000) / 10 : 0,
    tab19_joined: tab19Joined,
    tab19_join_rate_pct: total > 0 ? Math.round((tab19Joined / total) * 1000) / 10 : 0,
    missing_sector_symbols: missingSymbols,
    duplicate_raw_groups: duplicateGroups,
    canonical_distribution: canonicalCounts
  };
}

/**
 * @param {Array<Array>} rows
 * @return {Object}
 */
function auditTab19Sectors_(rows) {
  var rawSet = {};
  var canonSet = {};
  var unmapped = [];
  var duplicateRows = {};
  var rowCount = 0;

  rows.forEach(function(r) {
    var raw = String(r[1] || '').trim();
    if (!raw) return;
    rowCount++;
    rawSet[raw] = true;
    var canon = canonicalSector_(raw);
    canonSet[canon] = true;
    if (canon === 'MISCELLANEOUS' && raw.toUpperCase() !== 'MISCELLANEOUS' &&
        raw.toUpperCase() !== 'MISC') {
      unmapped.push(raw);
    }
    if (!duplicateRows[canon]) duplicateRows[canon] = [];
    duplicateRows[canon].push(raw);
  });

  var dupCanon = [];
  Object.keys(duplicateRows).forEach(function(c) {
    var uniq = {};
    duplicateRows[c].forEach(function(x) { uniq[x] = true; });
    var variants = Object.keys(uniq);
    if (variants.length > 1) {
      dupCanon.push({ canonical: c, raw_variants: variants, row_count: duplicateRows[c].length });
    }
  });

  return {
    row_count: rowCount,
    unique_raw_sectors: Object.keys(rawSet).length,
    unique_canonical_sectors: Object.keys(canonSet).length,
    canonical_sectors: Object.keys(canonSet).sort(),
    unmapped_sectors: unmapped,
    duplicate_canonical_rows: dupCanon
  };
}

/**
 * @param {Array<Array>} rows
 * @param {Array<Array>} tab1
 * @param {Object} sectorLookup
 * @return {Object}
 */
function auditTab20Sectors_(rows, tab1, sectorLookup) {
  var universeBySym = {};
  tab1.forEach(function(r) {
    var sym = normalizeSymbolKey_(r[0]);
    if (sym) {
      universeBySym[sym] = {
        sectorKey: canonicalSector_(r[3])
      };
    }
  });

  var tokensTotal = 0;
  var symHits = 0;
  var sectorHits = 0;
  var unmapped = [];

  rows.forEach(function(r) {
    [4, 5].forEach(function(col) {
      parseBeneficiaryTokens_(r[col]).forEach(function(token) {
        tokensTotal++;
        var sym = normalizeSymbolKey_(token);
        if (sym && universeBySym[sym]) {
          symHits++;
          return;
        }
        var sec = canonicalSector_(token);
        if (sectorLookup[sec]) {
          sectorHits++;
          return;
        }
        if (sec === 'MISCELLANEOUS' && token.toUpperCase() !== 'MISCELLANEOUS') {
          unmapped.push(token);
        } else if (!sectorLookup[sec]) {
          unmapped.push(token + '→' + sec);
        }
      });
    });
  });

  return {
    row_count: rows.length,
    tokens_parsed: tokensTotal,
    symbol_join_hits: symHits,
    sector_join_hits: sectorHits,
    join_rate_pct: tokensTotal > 0 ?
      Math.round(((symHits + sectorHits) / tokensTotal) * 1000) / 10 : 0,
    unmapped_tokens: unmapped
  };
}

/**
 * Menu — audit + sheet + script property.
 * @return {Object}
 */
function runSectorIntelligenceAudit() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = buildSectorIntelligenceAudit_(ss);
  writeSectorAuditSheet_(ss, report);
  try {
    PropertiesService.getScriptProperties().setProperty(SECTOR_AUDIT_PROP_,
      JSON.stringify(report).substring(0, 9000));
  } catch (e) {
    Logger.log('runSectorIntelligenceAudit: ' + e);
  }
  return report;
}

/**
 * Menu wrapper.
 */
function auditSectorMapping() {
  var report = runSectorIntelligenceAudit();
  var msg = 'Sector intelligence audit\n\n' +
    'Tab 1 coverage: ' + report.sector_coverage_pct + '%\n' +
    'Tab 1 → Tab 19 join rate: ' + report.sector_join_rate_pct + '% (goal 100%)\n' +
    'Tab 20 token join rate: ' + report.tab20.join_rate_pct + '%\n' +
    'Missing/problem symbols: ' + report.missing_sectors.length + '\n' +
    'Duplicate raw groups: ' + report.duplicate_sectors.length + '\n\n' +
    'See sheet **SECTOR AUDIT** and docs/SECTOR_INTELLIGENCE_AUDIT.md';
  SpreadsheetApp.getUi().alert(msg.substring(0, 1800));
}

/**
 * Normalize sector text on Tab 1 (col D), Tab 19 (col B), Tab 20 beneficiaries/losers.
 * @return {Object}
 */
function repairSectorMapping() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stats = { tab1_updated: 0, tab19_updated: 0, tab20_tokens_updated: 0 };

  var sh1 = ss.getSheetByName('1. UNIVERSE');
  if (sh1 && sh1.getLastRow() >= 2) {
    var n1 = sh1.getLastRow() - 1;
    var vals1 = sh1.getRange(2, 4, n1, 1).getValues();
    for (var i = 0; i < vals1.length; i++) {
      var raw = String(vals1[i][0] || '');
      var canon = canonicalSector_(raw);
      if (canon && canon !== raw.toUpperCase().replace(/\s+/g, ' ').trim()) {
        vals1[i][0] = canon;
        stats.tab1_updated++;
      } else if (!raw && canon) {
        vals1[i][0] = canon;
        stats.tab1_updated++;
      }
    }
    sh1.getRange(2, 4, n1, 1).setValues(vals1);
  }

  var sh19 = ss.getSheetByName('19. SECTOR STRENGTH');
  if (sh19 && sh19.getLastRow() >= 2) {
    var n19 = sh19.getLastRow() - 1;
    var vals19 = sh19.getRange(2, 2, n19, 1).getValues();
    for (var j = 0; j < vals19.length; j++) {
      var raw19 = String(vals19[j][0] || '');
      var c19 = canonicalSector_(raw19);
      if (c19 !== raw19) {
        vals19[j][0] = c19;
        stats.tab19_updated++;
      }
    }
    sh19.getRange(2, 2, n19, 1).setValues(vals19);
  }

  var sh20 = ss.getSheetByName('20. MACRO BENEFICIARIES');
  if (sh20 && sh20.getLastRow() >= 2) {
    var n20 = sh20.getLastRow() - 1;
    var range20 = sh20.getRange(2, 1, n20, 7).getValues();
    for (var k = 0; k < range20.length; k++) {
      [4, 5].forEach(function(col) {
        var parts = parseBeneficiaryTokens_(range20[k][col]);
        if (!parts.length) return;
        var out = parts.map(function(t) {
          var sym = normalizeSymbolKey_(t);
          if (sym && sh1) return sym;
          return canonicalSector_(t);
        });
        var joined = out.join(', ');
        if (joined !== String(range20[k][col] || '')) {
          range20[k][col] = joined;
          stats.tab20_tokens_updated++;
        }
      });
    }
    sh20.getRange(2, 1, n20, 7).setValues(range20);
  }

  var audit = runSectorIntelligenceAudit();
  SpreadsheetApp.getUi().alert(
    'Sector repair complete',
    'Tab 1 sectors updated: ' + stats.tab1_updated + '\n' +
      'Tab 19 sectors updated: ' + stats.tab19_updated + '\n' +
      'Tab 20 token fields updated: ' + stats.tab20_tokens_updated + '\n\n' +
      'Post-repair Tab 1→19 join rate: ' + audit.sector_join_rate_pct + '%\n' +
      'Run **Rebuild scoring pipeline** if join rate improved.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return { stats: stats, audit: audit };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} report
 */
function writeSectorAuditSheet_(ss, report) {
  var name = 'SECTOR AUDIT';
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  var rows = [
    ['metric', 'value'],
    ['generated_at', report.generated_at],
    ['sector_coverage_pct', report.sector_coverage_pct],
    ['sector_join_rate_pct', report.sector_join_rate_pct],
    ['goal_join_rate_pct', report.goal_join_rate_pct],
    ['tab1_total', report.tab1.total_symbols],
    ['tab1_tab19_joined', report.tab1.tab19_joined],
    ['tab19_rows', report.tab19.row_count],
    ['tab19_canonical_unique', report.tab19.unique_canonical_sectors],
    ['tab20_token_join_pct', report.tab20.join_rate_pct],
    ['pass_100pct_join', report.pass]
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  if (report.missing_sectors.length) {
    var start = rows.length + 2;
    sh.getRange(start, 1).setValue('missing_or_unjoined_symbols');
    var missRows = report.missing_sectors.map(function(s) { return [s]; });
    sh.getRange(start + 1, 1, missRows.length, 1).setValues(missRows);
  }
}
