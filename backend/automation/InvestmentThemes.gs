/**
 * Investment themes — Defense, Railways, Power, AI, Data Centers, EMS,
 * Manufacturing, China+1, Renewables.
 * Tags UNIVERSE theme_tags; powers gov beneficiaries, morning brief, peer narratives.
 *
 * Mirror: shared/config/investment-themes.json
 */

var INVESTMENT_THEMES_SHEET_ = '26. INVESTMENT THEMES';

/** @type {Array<Object>} */
var INVESTMENT_THEME_DEFS_ = [
  { id: 'DEFENSE', label: 'Defense', linked_sectors: ['DEFENCE'],
    example_symbols: ['BEL', 'HAL', 'BHEL', 'GRSE'],
    keywords: ['defence', 'defense', 'aerospace', 'missile', 'radar'] },
  { id: 'RAILWAYS', label: 'Railways', linked_sectors: ['INFRASTRUCTURE', 'INDUSTRIALS'],
    example_symbols: ['IRCTC', 'IRCON', 'RVNL', 'IRFC', 'TITAGARH'],
    keywords: ['railway', 'railways', 'rail', 'locomotive', 'irfc', 'ircon'] },
  { id: 'POWER', label: 'Power', linked_sectors: ['POWER', 'ELECTRICALS'],
    example_symbols: ['NTPC', 'POWERGRID', 'TATAPOWER', 'ADANIPOWER'],
    keywords: ['power', 'electricity', 'transmission', 'ntpc', 'grid'] },
  { id: 'AI', label: 'AI', linked_sectors: ['IT SERVICES'],
    example_symbols: ['PERSISTENT', 'COFORGE', 'TCS', 'INFY', 'LTIM'],
    keywords: ['artificial intelligence', 'genai', 'machine learning'] },
  { id: 'DATA_CENTERS', label: 'Data Centers', linked_sectors: ['IT SERVICES', 'TELECOM', 'POWER'],
    example_symbols: ['NETWEB', 'SIFY', 'REDINGTON'],
    keywords: ['data center', 'datacenter', 'colocation', 'hyperscale'] },
  { id: 'EMS', label: 'EMS', linked_sectors: ['INDUSTRIALS', 'ELECTRICALS'],
    example_symbols: ['DIXON', 'AMBER', 'KAYNES', 'SYRMA'],
    keywords: ['ems', 'electronics manufacturing', 'contract manufacturing', 'pcb'] },
  { id: 'MANUFACTURING', label: 'Manufacturing', linked_sectors: ['INDUSTRIALS', 'AUTOMOBILES'],
    example_symbols: ['LT', 'BHEL', 'SIEMENS', 'ABB'],
    keywords: ['manufacturing', 'factory', 'capital goods', 'industrial'] },
  { id: 'CHINA_PLUS_1', label: 'China+1', linked_sectors: ['INDUSTRIALS', 'ELECTRICALS', 'TEXTILES'],
    example_symbols: ['DIXON', 'AMBER', 'KAYNES', 'HONASA'],
    keywords: ['china plus', 'china+1', 'pli', 'supply chain', 'import substitution'] },
  { id: 'RENEWABLES', label: 'Renewables', linked_sectors: ['POWER'],
    example_symbols: ['ADANIGREEN', 'SUZLON', 'TATAPOWER', 'JSWENERGY'],
    keywords: ['renewable', 'solar', 'wind energy', 'green hydrogen', 'clean energy'] },
  { id: 'CAPITAL_GOODS', label: 'Capital Goods', linked_sectors: ['INDUSTRIALS', 'INFRASTRUCTURE', 'ELECTRICALS'],
    example_symbols: ['LT', 'BHEL', 'SIEMENS', 'ABB', 'CUMMINSIND', 'THERMAX', 'AIAENG'],
    keywords: ['capital goods', 'heavy engineering', 'industrial equipment', 'turbine', 'boiler', 'switchgear'] }
];

/**
 * @return {Array<Object>}
 */
function getInvestmentThemeDefs_() {
  return INVESTMENT_THEME_DEFS_.slice();
}

/**
 * @param {string} themeId
 * @return {Object|null}
 */
function getInvestmentThemeById_(themeId) {
  var id = String(themeId || '').toUpperCase().replace(/\s+/g, '_');
  for (var i = 0; i < INVESTMENT_THEME_DEFS_.length; i++) {
    if (INVESTMENT_THEME_DEFS_[i].id === id) return INVESTMENT_THEME_DEFS_[i];
  }
  return null;
}

/**
 * @param {*} raw comma-separated or single
 * @return {string[]}
 */
function parseThemeTags_(raw) {
  return String(raw || '').split(/[,;|]/).map(function(t) {
    return String(t).trim().toUpperCase().replace(/\s+/g, '_');
  }).filter(function(t) { return t; });
}

/**
 * Infer themes for a symbol from sector, name, existing tags, example lists.
 * @param {string} sym
 * @param {string} companyName
 * @param {string} sectorKey canonical
 * @param {string} existingTags
 * @return {string[]}
 */
function inferInvestmentThemesForSymbol_(sym, companyName, sectorKey, existingTags) {
  var found = {};
  parseThemeTags_(existingTags).forEach(function(t) { found[t] = true; });

  var blob = (sym + ' ' + companyName).toLowerCase();
  INVESTMENT_THEME_DEFS_.forEach(function(def) {
    if (def.linked_sectors && def.linked_sectors.indexOf(sectorKey) >= 0) {
      found[def.id] = true;
    }
    (def.example_symbols || []).forEach(function(ex) {
      if (normalizeSymbolKey_(ex) === sym) found[def.id] = true;
    });
    (def.keywords || []).forEach(function(kw) {
      if (kw && blob.indexOf(kw.toLowerCase()) >= 0) found[def.id] = true;
    });
  });

  return Object.keys(found).sort();
}

/**
 * Write theme_tags on Tab 1 UNIVERSE (column theme_tags).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {number}
 */
function applyInvestmentThemeTagsToUniverse_(ss) {
  var sheet = ss.getSheetByName('1. UNIVERSE');
  if (!sheet || sheet.getLastRow() < 2) return 0;

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 18).getValues();
  var updated = 0;

  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;
    var companyName = String(data[i][2] || '');
    var sectorRaw = String(data[i][3] || '');
    var sectorKey = typeof canonicalSector_ === 'function' ?
      canonicalSector_(sectorRaw) : normalizeSectorName_(sectorRaw);
    var themes = inferInvestmentThemesForSymbol_(sym, companyName, sectorKey, data[i][4]);
    var tagStr = themes.join(', ');
    if (tagStr !== String(data[i][4] || '').trim()) {
      data[i][4] = tagStr;
      updated++;
    }
  }

  sheet.getRange(2, 1, numRows, 18).setValues(data);
  writeInvestmentThemesTrackerSheet_(ss);
  appendAlert('', 'theme_tags', 'Updated theme_tags on ' + updated + ' UNIVERSE rows', '1. UNIVERSE');
  return updated;
}

/**
 * Tab 26 — one row per theme with top symbols from Tab 10.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function writeInvestmentThemesTrackerSheet_(ss) {
  var headers = [
    'theme_id', 'theme_label', 'rank', 'symbol', 'opportunity_rank', 'quality_score',
    'sector', 'as_of_date', 'notes'
  ];
  var sheet = getOrCreateSheet_(INVESTMENT_THEMES_SHEET_);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var brief = buildInvestmentThemesBrief_(ss);
  var rows = [];
  brief.themes.forEach(function(th) {
    (th.top_symbols || []).forEach(function(item, idx) {
      rows.push([
        th.id, th.label, idx + 1, item.symbol, item.opportunity_rank, item.quality_score,
        item.sector || '', brief.as_of, item.note || ''
      ]);
    });
  });

  clearDataBelowHeader_(sheet, headers.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Rank symbols per theme for brief / API.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildInvestmentThemesBrief_(ss) {
  var asOf = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var universeMap = buildUniverseLookup_(ss);
  var candidates = [];

  var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
  if (scoreSheet && scoreSheet.getLastRow() >= 2) {
    var n = scoreSheet.getLastRow() - 1;
    var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 57;
    scoreSheet.getRange(2, 1, n, cols).getValues().forEach(function(r) {
      var c = buildScoringCandidate_(r, universeMap);
      if (!c.symbol || c.excluded) return;
      c.themeTags = parseThemeTags_(universeMap[c.symbol] ? universeMap[c.symbol].themeTags : '');
      if (!c.themeTags.length) {
        c.themeTags = inferInvestmentThemesForSymbol_(c.symbol, c.companyName, c.sectorKey, '');
      }
      candidates.push(c);
    });
  }

  var themes = INVESTMENT_THEME_DEFS_.map(function(def) {
    var matched = candidates.filter(function(c) {
      return c.themeTags.indexOf(def.id) >= 0;
    });
    matched.sort(function(a, b) {
      return (num_(b.opportunityRank) || b.conviction) - (num_(a.opportunityRank) || a.conviction);
    });
    var top = matched.slice(0, 5).map(function(c) {
      return {
        symbol: c.symbol,
        company_name: c.companyName,
        opportunity_rank: num_(c.opportunityRank) || c.conviction,
        quality_score: num_(c.qualityScore),
        sector: c.sector,
        note: def.label + ' theme'
      };
    });
    return {
      id: def.id,
      label: def.label,
      symbol_count: matched.length,
      example_symbols: def.example_symbols,
      top_symbols: top,
      status: matched.length ? 'ok' : 'empty'
    };
  });

  return {
    as_of: asOf,
    theme_count: themes.length,
    themes: themes
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildInvestmentThemesBriefSection_(ss) {
  var brief = buildInvestmentThemesBrief_(ss);
  return {
    title: 'Investment Themes',
    status: brief.themes.some(function(t) { return t.symbol_count > 0; }) ? 'ok' : 'empty',
    items: brief.themes,
    summary: brief.themes.map(function(t) {
      return t.label + '(' + t.symbol_count + ')';
    }).join(', ')
  };
}

/**
 * Symbols/sectors matching thematic beneficiaries (gov list + Tab 20).
 * @param {Array<Object>} candidates
 * @param {Array<Array>} macroRows
 * @return {Object}
 */
function buildThematicBeneficiarySet_(candidates, macroRows) {
  var set = typeof buildMacroBeneficiarySymbolSet_ === 'function' ?
    buildMacroBeneficiarySymbolSet_(macroRows, candidates) : {};

  var themeIds = {};
  INVESTMENT_THEME_DEFS_.forEach(function(d) {
    themeIds[d.id] = true;
    themeIds[d.label.toUpperCase().replace(/\s+/g, '_')] = true;
  });

  candidates.forEach(function(c) {
    var tags = c.themeTags || [];
    if (!tags.length && c.symbol) {
      tags = inferInvestmentThemesForSymbol_(c.symbol, c.companyName, c.sectorKey, '');
    }
    tags.forEach(function(t) {
      if (themeIds[t]) set[c.symbol] = true;
    });
    INVESTMENT_THEME_DEFS_.forEach(function(def) {
      if (tags.indexOf(def.id) >= 0 && def.linked_sectors) {
        def.linked_sectors.forEach(function(sec) { set[sec] = true; });
      }
    });
  });

  return set;
}

/**
 * Seed Tab 20 rows for thematic macro beneficiaries (idempotent by metric name).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function seedThematicMacroBeneficiaries_(ss) {
  var sheet = getOrCreateSheet_('20. MACRO BENEFICIARIES');
  var headers = getSheetHeaders_('20. MACRO BENEFICIARIES');
  var existing = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  var metrics = {};
  existing.forEach(function(r) {
    metrics[String(r[0] || '').toUpperCase()] = true;
  });

  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var newRows = existing.slice();

  INVESTMENT_THEME_DEFS_.forEach(function(def) {
    var metric = 'THEME:' + def.label;
    if (metrics[metric.toUpperCase()]) return;
    newRows.push([
      metric,
      (def.example_symbols || []).length,
      'rising',
      'positive',
      (def.example_symbols || []).join(', '),
      '',
      today,
      'Auto-seeded investment theme — run Apply theme tags'
    ]);
  });

  clearDataBelowHeader_(sheet, headers.length);
  if (newRows.length) sheet.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
}

/** Menu */
function applyInvestmentThemeTagsMenu() {
  var n = applyInvestmentThemeTagsToUniverse_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getUi().alert('Theme tags applied to ' + n + ' UNIVERSE rows.\nTab 26 refreshed.');
}

/** Menu */
function previewInvestmentThemes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var brief = buildInvestmentThemesBrief_(ss);
  var lines = ['Investment themes (' + brief.as_of + ')'];
  brief.themes.forEach(function(t) {
    var tops = (t.top_symbols || []).map(function(x) { return x.symbol; }).join(', ');
    lines.push(t.label + ': ' + t.symbol_count + ' names' + (tops ? ' · top ' + tops : ''));
  });
  SpreadsheetApp.getUi().alert(lines.join('\n').substring(0, 1800));
}

/** Menu */
function seedInvestmentThemesTab20() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  seedThematicMacroBeneficiaries_(ss);
  SpreadsheetApp.getUi().alert('Tab 20 thematic rows seeded (THEME:* metrics).');
}
