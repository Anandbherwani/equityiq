/**
 * Institutional 8 AM Morning Brief — nine sections, JSON + Telegram/Email/Dashboard.
 * Invoked from DailyAutomation.gs (dailyBriefing8am) and WebAppApi (?action=morning_brief).
 *
 * Script properties: see docs/MORNING_BRIEF_TEMPLATE.md
 */

var MORNING_BRIEF_VERSION_ = '2.0-institutional';
var TAB11_SNAPSHOT_PROP_ = 'MORNING_BRIEF_TAB11_SNAPSHOT';

/**
 * Full institutional brief payload (API + delivery).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildInstitutionalMorningBrief_(ss) {
  var dateIst = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  var sections = {
    market_outlook: buildMarketOutlookSection_(ss),
    top10_opportunities: buildTop10OpportunitiesSection_(ss),
    sector_winners: buildSectorWinnersSection_(ss, 5),
    sector_losers: buildSectorLosersSection_(ss, 5),
    government_themes: buildGovernmentThemesSection_(ss),
    investment_themes: typeof buildInvestmentThemesBriefSection_ === 'function' ?
      buildInvestmentThemesBriefSection_(ss) :
      { title: 'Investment Themes', status: 'empty', items: [] },
    theme_intelligence: typeof getThemeIntelligencePayload_ === 'function' ?
      getThemeIntelligencePayload_(ss) :
      { top10_themes: [], top_theme_stocks: [] },
    macro_themes: buildMacroThemesSection_(ss),
    risk_alerts: buildRiskAlertsSection_(ss),
    watchlist_changes: buildWatchlistChangesSection_(ss),
    portfolio_actions: buildPortfolioActionsSection_(ss)
  };

  return {
    version: MORNING_BRIEF_VERSION_,
    date_ist: dateIst,
    timezone: 'Asia/Kolkata',
    spreadsheet_name: ss.getName(),
    spreadsheet_url: ss.getUrl(),
    sections: sections,
    macro_outlook: sections.market_outlook,
    sector_themes: sections.sector_winners.items.concat(sections.sector_losers.items),
    top10_immediate: sections.top10_opportunities.immediate || [],
    acceptance_lists: sections.top10_opportunities.all_lists || [],
    top10_all_lists: sections.top10_opportunities.list_summary || []
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildMarketOutlookSection_(ss) {
  var macro = buildMacroOutlook_(ss);
  var breadth = inferMarketBreadth_(ss);
  return {
    title: 'Market Outlook',
    status: macro.status,
    headline: macro.headline,
    verdict: macro.verdict,
    metrics: macro.metrics || [],
    breadth: breadth,
    summary: buildMarketOutlookSummary_(macro, breadth)
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildTop10OpportunitiesSection_(ss) {
  var immediate = buildTop10Immediate_(ss, 10);
  var acceptance = typeof buildAcceptanceListsForBriefing_ === 'function' ?
    buildAcceptanceListsForBriefing_(ss) : [];
  var summary = typeof summarizeRecommendationLists_ === 'function' ?
    summarizeRecommendationLists_(ss) : [];

  return {
    title: 'Top 10 Opportunities',
    immediate: immediate,
    all_lists: acceptance,
    list_summary: summary,
    primary_list: 'Top 10 Immediate Opportunities'
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} limit
 * @return {Object}
 */
function buildSectorWinnersSection_(ss, limit) {
  var ranked = loadLatestSectorRows_(ss);
  var winners = ranked.slice().sort(function(a, b) {
    if (a.rank && b.rank) return a.rank - b.rank;
    return (b.narrative + b.macro + b.flow) - (a.narrative + a.macro + a.flow);
  }).slice(0, limit || 5);

  return {
    title: 'Sector Winners',
    week_ending: ranked.length ? ranked[0].week_ending : '',
    items: winners,
    status: winners.length ? 'ok' : 'empty'
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} limit
 * @return {Object}
 */
function buildSectorLosersSection_(ss, limit) {
  var ranked = loadLatestSectorRows_(ss);
  var losers = ranked.slice().sort(function(a, b) {
    if (a.rank && b.rank) return b.rank - a.rank;
    return (a.narrative + a.macro + a.flow) - (b.narrative + b.macro + b.flow);
  }).slice(0, limit || 5);

  return {
    title: 'Sector Losers',
    week_ending: ranked.length ? ranked[0].week_ending : '',
    items: losers,
    status: losers.length ? 'ok' : 'empty'
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildGovernmentThemesSection_(ss) {
  var themes = [];
  var govList = [];
  if (typeof buildAcceptanceListsForBriefing_ === 'function') {
    var lists = buildAcceptanceListsForBriefing_(ss);
    lists.forEach(function(list) {
      if (String(list.name).toLowerCase().indexOf('government') >= 0) {
        govList = list.items || [];
      }
    });
  }

  if (govList.length) {
    themes.push({
      theme: 'Government beneficiaries (Tab 11)',
      bias: 'positive',
      symbols: govList.slice(0, 5).map(function(t) { return t.symbol; }),
      note: govList[0] ? govList[0].symbol + ' leads at score ' + govList[0].score : ''
    });
  }

  var tab20 = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  tab20.forEach(function(r) {
    var metric = String(r[0] || '').trim();
    if (!metric) return;
    var beneficiaries = String(r[4] || '').trim();
    if (!beneficiaries) return;
    var lower = metric.toLowerCase();
    if (lower.indexOf('gov') >= 0 || lower.indexOf('policy') >= 0 ||
        lower.indexOf('budget') >= 0 || lower.indexOf('pli') >= 0 ||
        lower.indexOf('capex') >= 0 || lower.indexOf('infra') >= 0) {
      themes.push({
        theme: metric,
        bias: String(r[3] || ''),
        beneficiaries: beneficiaries.substring(0, 200),
        losers: String(r[5] || '').substring(0, 120),
        trend: String(r[2] || ''),
        note: String(r[7] || '').substring(0, 120)
      });
    }
  });

  if (!themes.length && govList.length) {
    themes.push({
      theme: 'Policy-linked equities',
      bias: 'monitor',
      symbols: govList.map(function(t) { return t.symbol; }),
      note: 'From Top 10 Government Beneficiaries'
    });
  }

  return {
    title: 'Government Themes',
    status: themes.length ? 'ok' : 'empty',
    items: themes,
    top_picks: govList.slice(0, 10)
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildMacroThemesSection_(ss) {
  var items = [];
  var tab20 = loadSheetData_(ss, '20. MACRO BENEFICIARIES');
  tab20.forEach(function(r) {
    var metric = String(r[0] || '').trim();
    if (!metric) return;
    items.push({
      metric: metric,
      value: r[1],
      trend: String(r[2] || ''),
      bias: String(r[3] || ''),
      beneficiaries: String(r[4] || '').substring(0, 160),
      losers: String(r[5] || '').substring(0, 120),
      as_of: String(r[6] || ''),
      notes: String(r[7] || '').substring(0, 120)
    });
  });

  var macro = buildMacroOutlook_(ss);
  (macro.metrics || []).forEach(function(m) {
    if (String(m.metric).toUpperCase().indexOf('MACRO_VERDICT') >= 0) return;
    items.push({
      metric: m.metric,
      value: m.value,
      trend: m.trend,
      bias: m.bias,
      notes: m.notes,
      source_tab: '8. MACRO DASHBOARD'
    });
  });

  return {
    title: 'Macro Themes',
    status: items.length ? 'ok' : 'empty',
    headline: macro.headline,
    items: items.slice(0, 12)
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildRiskAlertsSection_(ss) {
  var alerts = loadRecentAlerts_(ss, 48);
  var scoringRisks = loadScoringRiskFlags_(ss, 8);

  return {
    title: 'Risk Alerts',
    status: alerts.length || scoringRisks.length ? 'ok' : 'clear',
    alert_count: alerts.length,
    sheet_alerts: alerts,
    scoring_flags: scoringRisks,
    summary: alerts.length ?
      alerts.length + ' alert(s) in last 48h — review Tab 12' :
      'No material Tab 12 alerts in lookback window'
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildWatchlistChangesSection_(ss) {
  var current = snapshotTab11Immediate_(ss);
  var prevJson = PropertiesService.getScriptProperties().getProperty(TAB11_SNAPSHOT_PROP_);
  var prev = null;
  try {
    prev = prevJson ? JSON.parse(prevJson) : null;
  } catch (e1) { prev = null; }

  var changes = diffTab11Snapshots_(prev, current);
  PropertiesService.getScriptProperties().setProperty(
    TAB11_SNAPSHOT_PROP_,
    JSON.stringify(current)
  );

  return {
    title: 'Watchlist Changes',
    status: changes.has_changes ? 'changed' : 'unchanged',
    current_symbols: current.symbols,
    added: changes.added,
    removed: changes.removed,
    rank_moves: changes.rank_moves,
    note: prev ? '' : 'First run — baseline snapshot stored for tomorrow diff'
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildPortfolioActionsSection_(ss) {
  var immediate = buildTop10Immediate_(ss, 10);
  var actions = immediate.map(function(row) {
    var conviction = row.conviction_total || 0;
    var action = 'Monitor';
    var rationale = 'Conviction ' + conviction + '/100';
    if (conviction >= 70) {
      action = 'Overweight / add on dips';
      rationale = 'High conviction immediate opportunity';
    } else if (conviction >= 50) {
      action = 'Hold / scale in';
      rationale = 'Meets immediate list threshold';
    } else if (conviction >= 35) {
      action = 'Watch — confirm catalyst';
      rationale = 'Lower conviction — verify data quality';
    } else {
      action = 'No action — review thesis';
      rationale = 'Below typical sizing threshold';
    }
    if (row.data_quality_pct != null && row.data_quality_pct < 60) {
      action = 'Hold — data gate';
      rationale = 'Data quality ' + row.data_quality_pct + '% below 60% gate';
    }
    return {
      symbol: row.symbol,
      rank: row.rank,
      action: action,
      rationale: rationale,
      catalyst: row.catalyst,
      horizon: row.target_horizon
    };
  });

  return {
    title: 'Portfolio Actions',
    status: actions.length ? 'ok' : 'empty',
    disclaimer: 'Sheet-ranked actions only — not personalized portfolio advice',
    items: actions
  };
}

/**
 * API: return cached brief or build fresh.
 * @param {boolean} fresh
 * @return {Object}
 */
function getMorningBriefData_(fresh) {
  if (!fresh) {
    var cached = PropertiesService.getScriptProperties().getProperty(
      typeof LAST_MORNING_BRIEFING_JSON_PROP !== 'undefined' ?
        LAST_MORNING_BRIEFING_JSON_PROP : 'LAST_MORNING_BRIEFING_JSON'
    );
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        return { ok: true, cached: true, brief: parsed };
      } catch (e1) { /* rebuild */ }
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var brief = buildInstitutionalMorningBrief_(ss);
  return { ok: true, cached: false, brief: brief };
}

// --- Sector helpers ---

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function loadLatestSectorRows_(ss) {
  var rows = loadSheetData_(ss, '19. SECTOR STRENGTH');
  if (!rows.length) return [];

  var latestWeek = '';
  rows.forEach(function(r) {
    var wk = weekEndingKey_(r[0]);
    if (wk > latestWeek) latestWeek = wk;
  });

  return rows.filter(function(r) {
    return weekEndingKey_(r[0]) === latestWeek;
  }).map(function(r) {
    return {
      week_ending: String(r[0] || ''),
      sector: String(r[1] || ''),
      narrative: num_(r[2]),
      macro: num_(r[3]),
      flow: num_(r[4]),
      rank: num_(r[5]),
      momentum: String(r[6] || ''),
      note: String(r[7] || '').substring(0, 100)
    };
  });
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function inferMarketBreadth_(ss) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) {
    return { status: 'unknown', above_50: 0, sample: 0 };
  }

  var numRows = Math.min(sheet.getLastRow() - 1, 300);
  var data = sheet.getRange(2, 1, numRows, 13).getValues();
  var above = 0;
  var sample = 0;
  data.forEach(function(r) {
    var c = num_(r[12]);
    if (!r[0]) return;
    sample++;
    if (c >= 50) above++;
  });

  var pct = sample ? Math.round((above / sample) * 100) : 0;
  return {
    status: 'ok',
    conviction_above_50_pct: pct,
    above_50: above,
    sample: sample,
    label: pct >= 55 ? 'Broad participation' : pct >= 40 ? 'Mixed breadth' : 'Narrow / weak breadth'
  };
}

/**
 * @param {Object} macro
 * @param {Object} breadth
 * @return {string}
 */
function buildMarketOutlookSummary_(macro, breadth) {
  var parts = [];
  if (macro.headline) parts.push(macro.headline);
  if (breadth && breadth.label) parts.push(breadth.label + ' (' + breadth.conviction_above_50_pct + '% ≥50/100)');
  return parts.join(' · ') || 'Populate Tab 8 MACRO_VERDICT and run 6 AM scoring refresh.';
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} hours
 * @return {Array<Object>}
 */
function loadRecentAlerts_(ss, hours) {
  var sheet = ss.getSheetByName('12. ALERTS LOG');
  if (!sheet || sheet.getLastRow() < 2) return [];

  hours = hours || 48;
  var cutoff = new Date().getTime() - hours * 3600 * 1000;
  var numRows = Math.min(sheet.getLastRow() - 1, 200);
  var data = sheet.getRange(sheet.getLastRow() - numRows + 1, 1, numRows, 5).getValues();
  var out = [];

  data.forEach(function(r) {
    var ts = parseAlertTimestamp_(r[0]);
    if (ts && ts.getTime() < cutoff) return;
    var trigger = String(r[2] || '');
    if (trigger.indexOf('automation_') === 0 && trigger.indexOf('error') < 0) return;
    out.push({
      timestamp: String(r[0] || ''),
      symbol: String(r[1] || ''),
      trigger_type: trigger,
      detail: String(r[3] || '').substring(0, 200),
      source_tab: String(r[4] || '')
    });
  });

  return out.reverse().slice(0, 15);
}

/**
 * @param {*} val
 * @return {Date|null}
 */
function parseAlertTimestamp_(val) {
  if (val instanceof Date) return val;
  var s = String(val || '').trim();
  if (!s) return null;
  try {
    return new Date(s);
  } catch (e1) {
    return null;
  }
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} limit
 * @return {Array<Object>}
 */
function loadScoringRiskFlags_(ss, limit) {
  var sheet = ss.getSheetByName('10. SCORING MODEL');
  if (!sheet || sheet.getLastRow() < 2) return [];

  limit = limit || 8;
  var numRows = sheet.getLastRow() - 1;
  var cols = typeof SCORING_NUM_COLS !== 'undefined' ? SCORING_NUM_COLS : 38;
  var data = sheet.getRange(2, 1, numRows, cols).getValues();
  var flags = [];

  data.forEach(function(r) {
    var sym = String(r[0] || '').trim();
    if (!sym) return;
    var pump = r[25] === true || String(r[25] || '').toUpperCase() === 'TRUE';
    var gate = r[32];
    var conviction = num_(r[12]);
    if (pump) {
      flags.push({ symbol: sym, flag: 'pump_detected', detail: 'Pump flag on Tab 10' });
    }
    if (gate === false || gate === 'FALSE') {
      flags.push({ symbol: sym, flag: 'data_gate_fail', detail: 'Fundamentals gate failed' });
    }
    if (conviction >= 60 && (pump || gate === false || gate === 'FALSE')) {
      /* already captured */
    }
  });

  return flags.slice(0, limit);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function snapshotTab11Immediate_(ss) {
  var rows = buildTop10Immediate_(ss, 10);
  return {
    date: Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'),
    symbols: rows.map(function(r) { return r.symbol; }),
    ranks: rows.map(function(r) { return { symbol: r.symbol, rank: r.rank }; })
  };
}

/**
 * @param {Object|null} prev
 * @param {Object} current
 * @return {Object}
 */
function diffTab11Snapshots_(prev, current) {
  if (!prev || !prev.symbols) {
    return {
      has_changes: false,
      added: [],
      removed: [],
      rank_moves: []
    };
  }

  var prevSet = {};
  (prev.symbols || []).forEach(function(s) { prevSet[s] = true; });
  var curSet = {};
  (current.symbols || []).forEach(function(s) { curSet[s] = true; });

  var added = (current.symbols || []).filter(function(s) { return !prevSet[s]; });
  var removed = (prev.symbols || []).filter(function(s) { return !curSet[s]; });

  var rankMoves = [];
  var prevRank = {};
  (prev.ranks || []).forEach(function(r) { prevRank[r.symbol] = r.rank; });
  (current.ranks || []).forEach(function(r) {
    if (prevRank[r.symbol] != null && prevRank[r.symbol] !== r.rank) {
      rankMoves.push({
        symbol: r.symbol,
        from_rank: prevRank[r.symbol],
        to_rank: r.rank
      });
    }
  });

  return {
    has_changes: added.length > 0 || removed.length > 0 || rankMoves.length > 0,
    added: added,
    removed: removed,
    rank_moves: rankMoves
  };
}

// --- Formatting (Telegram / Email / plain) ---

/**
 * @param {Object} report
 * @return {string}
 */
function formatInstitutionalBriefPlain_(report) {
  var s = report.sections || {};
  var lines = [];
  lines.push('INDIAN EQUITY INTELLIGENCE — MORNING BRIEF');
  lines.push(report.date_ist + ' IST · Nifty context');
  lines.push('');

  lines.push('1. MARKET OUTLOOK');
  lines.push('   ' + (s.market_outlook && s.market_outlook.summary || '—'));
  lines.push('');

  lines.push('2. TOP 10 OPPORTUNITIES (Immediate)');
  var imm = (s.top10_opportunities && s.top10_opportunities.immediate) || report.top10_immediate || [];
  if (!imm.length) {
    lines.push('   (Tab 11 empty — run Rebuild scoring pipeline)');
  } else {
    imm.forEach(function(t) {
      lines.push('   ' + t.rank + '. ' + t.symbol + ' · ' + t.conviction_total + '/100 · ' +
        (t.catalyst || '—'));
    });
  }
  lines.push('');

  lines.push('3. SECTOR WINNERS');
  formatSectorLines_(lines, s.sector_winners);
  lines.push('');
  lines.push('4. SECTOR LOSERS');
  formatSectorLines_(lines, s.sector_losers);
  lines.push('');

  lines.push('5. GOVERNMENT THEMES');
  ((s.government_themes && s.government_themes.items) || []).slice(0, 5).forEach(function(g) {
    lines.push('   • ' + g.theme + (g.bias ? ' [' + g.bias + ']' : ''));
    if (g.symbols && g.symbols.length) lines.push('     ' + g.symbols.join(', '));
    if (g.beneficiaries) lines.push('     ' + g.beneficiaries);
  });
  if (!(s.government_themes && s.government_themes.items && s.government_themes.items.length)) {
    lines.push('   (Tab 11 Gov list / Tab 20 empty)');
  }
  lines.push('');

  lines.push('6. MACRO THEMES');
  lines.push('   ' + ((s.macro_themes && s.macro_themes.headline) || '—'));
  ((s.macro_themes && s.macro_themes.items) || []).slice(0, 5).forEach(function(m) {
    lines.push('   • ' + m.metric + ': ' + m.value + ' (' + m.bias + ')');
  });
  lines.push('');

  lines.push('7. RISK ALERTS');
  lines.push('   ' + ((s.risk_alerts && s.risk_alerts.summary) || '—'));
  ((s.risk_alerts && s.risk_alerts.sheet_alerts) || []).slice(0, 5).forEach(function(a) {
    lines.push('   • ' + (a.symbol || '—') + ' ' + a.trigger_type + ': ' + a.detail);
  });
  lines.push('');

  lines.push('8. WATCHLIST CHANGES');
  var wc = s.watchlist_changes || {};
  if (wc.added && wc.added.length) lines.push('   Added: ' + wc.added.join(', '));
  if (wc.removed && wc.removed.length) lines.push('   Removed: ' + wc.removed.join(', '));
  if (wc.rank_moves && wc.rank_moves.length) {
    wc.rank_moves.forEach(function(m) {
      lines.push('   ' + m.symbol + ': #' + m.from_rank + ' → #' + m.to_rank);
    });
  }
  if (!wc.added || !wc.added.length) {
    if (!wc.removed || !wc.removed.length) {
      if (!wc.rank_moves || !wc.rank_moves.length) {
        lines.push('   ' + (wc.note || 'No changes vs prior snapshot'));
      }
    }
  }
  lines.push('');

  lines.push('9. PORTFOLIO ACTIONS');
  ((s.portfolio_actions && s.portfolio_actions.items) || []).slice(0, 10).forEach(function(p) {
    lines.push('   ' + p.symbol + ': ' + p.action + ' — ' + p.rationale);
  });
  lines.push('');
  lines.push('Sheet: ' + report.spreadsheet_url);
  lines.push('Probability ranking only — not investment advice.');
  return lines.join('\n');
}

/**
 * @param {Array<string>} lines
 * @param {Object} section
 */
function formatSectorLines_(lines, section) {
  var items = (section && section.items) || [];
  if (!items.length) {
    lines.push('   (Tab 19 empty)');
    return;
  }
  items.forEach(function(s, i) {
    lines.push('   ' + (i + 1) + '. ' + s.sector + ' · rank ' + s.rank +
      (s.momentum ? ' · ' + s.momentum : ''));
  });
}

/**
 * @param {Object} report
 * @return {string}
 */
function formatInstitutionalBriefHtml_(report) {
  var esc = escapeHtml_;
  var s = report.sections || {};
  var html = [];
  html.push('<div style="font-family:system-ui,sans-serif;max-width:720px;color:#0f172a;">');
  html.push('<h1 style="color:#0e7490;margin:0;">Morning Brief — Indian Equity Intelligence</h1>');
  html.push('<p style="color:#64748b;">' + esc(report.date_ist) + ' IST</p>');

  html.push('<h2>1. Market Outlook</h2><p>' + esc(s.market_outlook && s.market_outlook.summary) + '</p>');
  if (s.market_outlook && s.market_outlook.breadth) {
    html.push('<p><em>' + esc(s.market_outlook.breadth.label) + '</em></p>');
  }

  html.push('<h2>2. Top 10 Opportunities</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">');
  html.push('<tr><th>#</th><th>Symbol</th><th>Score</th><th>Catalyst</th><th>Horizon</th></tr>');
  var imm = (s.top10_opportunities && s.top10_opportunities.immediate) || [];
  imm.forEach(function(t) {
    html.push('<tr><td>' + t.rank + '</td><td>' + esc(t.symbol) + '</td><td>' +
      t.conviction_total + '</td><td>' + esc(t.catalyst) + '</td><td>' +
      esc(t.target_horizon) + '</td></tr>');
  });
  if (!imm.length) html.push('<tr><td colspan="5"><em>Tab 11 empty</em></td></tr>');
  html.push('</table>');

  html.push('<h2>3. Sector Winners</h2><ul>');
  ((s.sector_winners && s.sector_winners.items) || []).forEach(function(x) {
    html.push('<li><strong>' + esc(x.sector) + '</strong> — rank ' + x.rank + '</li>');
  });
  html.push('</ul><h2>4. Sector Losers</h2><ul>');
  ((s.sector_losers && s.sector_losers.items) || []).forEach(function(x) {
    html.push('<li><strong>' + esc(x.sector) + '</strong> — rank ' + x.rank + '</li>');
  });
  html.push('</ul>');

  html.push('<h2>5. Government Themes</h2><ul>');
  ((s.government_themes && s.government_themes.items) || []).forEach(function(g) {
    html.push('<li>' + esc(g.theme) + (g.bias ? ' — ' + esc(g.bias) : '') + '</li>');
  });
  html.push('</ul>');

  html.push('<h2>6. Macro Themes</h2><p>' + esc(s.macro_themes && s.macro_themes.headline) + '</p><ul>');
  ((s.macro_themes && s.macro_themes.items) || []).slice(0, 8).forEach(function(m) {
    html.push('<li>' + esc(m.metric) + ': <strong>' + esc(String(m.value)) + '</strong></li>');
  });
  html.push('</ul>');

  html.push('<h2>7. Risk Alerts</h2><p>' + esc(s.risk_alerts && s.risk_alerts.summary) + '</p><ul>');
  ((s.risk_alerts && s.risk_alerts.sheet_alerts) || []).slice(0, 8).forEach(function(a) {
    html.push('<li>' + esc(a.symbol || '—') + ' — ' + esc(a.trigger_type) + ': ' + esc(a.detail) + '</li>');
  });
  html.push('</ul>');

  html.push('<h2>8. Watchlist Changes</h2>');
  var wc = s.watchlist_changes || {};
  if (wc.added && wc.added.length) html.push('<p>Added: ' + esc(wc.added.join(', ')) + '</p>');
  if (wc.removed && wc.removed.length) html.push('<p>Removed: ' + esc(wc.removed.join(', ')) + '</p>');
  if (!wc.added || !wc.added.length) {
    if (!wc.removed || !wc.removed.length) {
      html.push('<p><em>' + esc(wc.note || 'No changes') + '</em></p>');
    }
  }

  html.push('<h2>9. Portfolio Actions</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">');
  html.push('<tr><th>Symbol</th><th>Action</th><th>Rationale</th></tr>');
  ((s.portfolio_actions && s.portfolio_actions.items) || []).forEach(function(p) {
    html.push('<tr><td>' + esc(p.symbol) + '</td><td>' + esc(p.action) +
      '</td><td>' + esc(p.rationale) + '</td></tr>');
  });
  html.push('</table>');

  html.push('<p style="margin-top:24px;font-size:12px;color:#64748b;">Not investment advice.<br/>');
  html.push('<a href="' + esc(report.spreadsheet_url) + '">Open Google Sheet</a></p></div>');
  return html.join('');
}

/**
 * @param {Object} report
 * @return {Array<string>}
 */
function splitInstitutionalBriefForTelegram_(report) {
  var messages = [];
  var s = report.sections || {};
  var header = [];
  header.push('📊 Indian Equity Intelligence');
  header.push(report.date_ist + ' IST');
  header.push('');
  header.push('OUTLOOK: ' + briefField_(s.market_outlook && s.market_outlook.summary, 280));
  if (s.market_outlook && s.market_outlook.breadth) {
    header.push('Breadth: ' + s.market_outlook.breadth.label);
  }
  header.push('');
  header.push('SECTOR WINNERS: ' + ((s.sector_winners && s.sector_winners.items) || []).slice(0, 3)
    .map(function(x) { return x.sector; }).join(', ') || '—');
  header.push('SECTOR LOSERS: ' + ((s.sector_losers && s.sector_losers.items) || []).slice(0, 3)
    .map(function(x) { return x.sector; }).join(', ') || '—');
  header.push('MACRO: ' + briefField_(s.macro_themes && s.macro_themes.headline, 120));
  header.push('GOV: ' + (((s.government_themes && s.government_themes.items) || [])[0] || {}).theme || '—');
  messages.push(header.join('\n'));

  var oppLines = ['TOP 10 IMMEDIATE'];
  ((s.top10_opportunities && s.top10_opportunities.immediate) || []).forEach(function(t) {
    oppLines.push(t.rank + '. ' + t.symbol + ' ' + t.conviction_total + '/100 · ' +
      briefField_(t.catalyst, 80));
  });
  if (oppLines.length === 1) oppLines.push('(Tab 11 empty)');
  messages.push(oppLines.join('\n'));

  var riskLines = ['RISK & WATCHLIST'];
  riskLines.push(briefField_(s.risk_alerts && s.risk_alerts.summary, 200));
  var wc = s.watchlist_changes || {};
  if (wc.added && wc.added.length) riskLines.push('Added: ' + wc.added.join(', '));
  if (wc.removed && wc.removed.length) riskLines.push('Removed: ' + wc.removed.join(', '));
  ((s.portfolio_actions && s.portfolio_actions.items) || []).slice(0, 5).forEach(function(p) {
    riskLines.push(p.symbol + ': ' + p.action);
  });
  riskLines.push('');
  riskLines.push('Sheet: ' + report.spreadsheet_url);
  riskLines.push('Not investment advice.');
  messages.push(riskLines.join('\n'));

  return messages;
}
