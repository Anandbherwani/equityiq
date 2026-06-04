/**
 * Phase 6 — Daily automation (IST)
 * 06:00 — News, events, prices, scores
 * 08:00 — Top 10, sector themes, macro outlook → Telegram + Email
 *
 * Script properties (Project settings → Script properties):
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *   BRIEFING_EMAIL_TO  (comma-separated)
 *   SEND_TELEGRAM      (default true if token set)
 *   SEND_EMAIL         (default true if BRIEFING_EMAIL_TO set)
 *   PERPLEXITY_API_KEY (optional — events at 6 AM)
 *   RUN_PERPLEXITY_DAILY (default true when key set)
 */

var LAST_MORNING_BRIEFING_JSON_PROP = 'LAST_MORNING_BRIEFING_JSON';
var AUTOMATION_LOG_PROP = 'LAST_AUTOMATION_RUN_JSON';

/** Five lists required for final acceptance (8 AM briefing). */
var ACCEPTANCE_LIST_NAMES_ = [
  'Top 10 Immediate Opportunities',
  'Top 10 3-Month Opportunities',
  'Top 10 12-Month Compounders',
  'Top 10 Government Beneficiaries',
  'Top 10 Turnarounds'
];

/**
 * 06:00 IST — refresh news, events, prices, conviction scores.
 */
function dailyDataRefresh6am() {
  var log = {
    phase: '6am_data',
    startedIst: istTimestamp_(),
    steps: []
  };

  try {
    log.steps.push(step_('rss', runStep_(function() {
      fetchNewsRss();
      tagNewsSymbols();
    })));

    log.steps.push(step_('announcements', runStep_(function() {
      return parseAnnouncementKeywordsInternal_();
    })));

    log.steps.push(step_('data_ingestion', runStep_(function() {
      if (typeof runDataIngestionPipeline_ !== 'function' &&
        typeof runDataIngestionPipelineRouted_ !== 'function') return 'skipped_no_engine';
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var run = typeof runDataIngestionPipelineRouted_ === 'function' ?
        runDataIngestionPipelineRouted_ : runDataIngestionPipeline_;
      var ing = run(ss, {
        dealsDays: 7,
        shareholdingBatch: true,
        financialsBatch: true,
        corporateActions: true,
        macroFiiDii: true
      });
      var cov = ing.coverage ? ing.coverage.weighted_coverage_pct + '%' : '';
      return (ing.ok ? 'ok' : 'partial') + (cov ? ' cov=' + cov : '');
    })));

    log.steps.push(step_('prices', runStep_(function() {
      refreshWatchlistPricesSilent_();
      return 'ok';
    })));

    log.steps.push(step_('events_scores', runStep_(function() {
      if (shouldRunPerplexityDaily_()) {
        var ok = runNewsIntelligencePipeline(true);
        if (ok) return 'perplexity_and_rebuild';
        rebuildScoringPipeline(true);
        return 'perplexity_skipped_rebuild_fallback';
      }
      rebuildScoringPipeline(true);
      return 'rebuild_no_perplexity';
    })));

    log.ok = true;
    appendAlert('', 'automation_6am', '6 AM data refresh completed', 'system');
  } catch (err) {
    log.ok = false;
    log.error = String(err.message || err);
    appendAlert('', 'automation_6am_error', log.error, 'system');
  }

  log.finishedIst = istTimestamp_();
  PropertiesService.getScriptProperties().setProperty(AUTOMATION_LOG_PROP, JSON.stringify(log));
  Logger.log('dailyDataRefresh6am: ' + JSON.stringify(log));
}

/**
 * 08:00 IST — morning briefing delivery.
 */
function dailyBriefing8am() {
  var log = {
    phase: '8am_briefing',
    startedIst: istTimestamp_(),
    delivery: {}
  };

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    generateRecommendations_();
    if (typeof snapshotRecommendationHistory_ === 'function') {
      snapshotRecommendationHistory_();
    }
    if (typeof snapshotAllBacktestLists_ === 'function') {
      snapshotAllBacktestLists_();
    } else if (typeof snapshotBacktestPicks === 'function') {
      snapshotBacktestPicks();
    }
    var report = typeof buildInstitutionalMorningBrief_ === 'function' ?
      buildInstitutionalMorningBrief_(ss) :
      buildMorningBriefingReport_(ss);
    PropertiesService.getScriptProperties().setProperty(
      LAST_MORNING_BRIEFING_JSON_PROP,
      JSON.stringify(report)
    );

    if (shouldSendTelegram_()) {
      log.delivery.telegram = sendTelegramBriefing_(report);
    } else {
      log.delivery.telegram = { skipped: true, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing' };
    }

    if (shouldSendEmail_()) {
      log.delivery.email = sendMorningBriefingEmail_(report);
    } else {
      log.delivery.email = { skipped: true, reason: 'BRIEFING_EMAIL_TO not set' };
    }

    log.ok = true;
    appendAlert('', 'automation_8am', '8 AM briefing sent', 'system');
  } catch (err) {
    log.ok = false;
    log.error = String(err.message || err);
    appendAlert('', 'automation_8am_error', log.error, 'system');
  }

  log.finishedIst = istTimestamp_();
  PropertiesService.getScriptProperties().setProperty(AUTOMATION_LOG_PROP, JSON.stringify(log));
  Logger.log('dailyBriefing8am: ' + JSON.stringify(log));
}

/** Backward-compatible alias for menu / legacy triggers. */
function dailyMaintenance() {
  dailyDataRefresh6am();
}

/**
 * Install weekday automation: 6 AM data + 8 AM briefing (Asia/Kolkata).
 */
function installDailyAutomationTriggers() {
  var handlers = [
    'dailyDataRefresh6am',
    'dailyBriefing8am',
    'dailyMaintenance',
    'fetchNewsRss'
  ];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (handlers.indexOf(t.getHandlerFunction()) >= 0) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('dailyDataRefresh6am')
    .timeBased()
    .atHour(6)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone('Asia/Kolkata')
    .create();

  ScriptApp.newTrigger('dailyBriefing8am')
    .timeBased()
    .atHour(8)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone('Asia/Kolkata')
    .create();

  SpreadsheetApp.getUi().alert(
    'Phase 6 triggers installed',
    '06:00 IST → dailyDataRefresh6am (news, events, prices, scores)\n' +
      '08:00 IST → dailyBriefing8am (9-section institutional brief → Telegram + email)\n\n' +
      'Set Script properties: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, BRIEFING_EMAIL_TO',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** @deprecated Use installDailyAutomationTriggers */
function installDailyTriggers() {
  installDailyAutomationTriggers();
}

function showAutomationSetupHelp() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var hasTg = !!(props.TELEGRAM_BOT_TOKEN && props.TELEGRAM_CHAT_ID);
  var hasEmail = !!String(props.BRIEFING_EMAIL_TO || '').trim();
  var hasPplx = !!props.PERPLEXITY_API_KEY;

  SpreadsheetApp.getUi().alert(
    'Phase 6 automation',
    'Triggers: Stock Tracker → Install daily automation (IST)\n\n' +
      '06:00 — RSS news, optional Perplexity events, prices, full scoring rebuild\n' +
      '08:00 — 9-section morning brief (Tab 8/11/19/20/12) → Telegram & email\n\n' +
      'Script properties:\n' +
      '  TELEGRAM_BOT_TOKEN — ' + (hasTg ? 'set' : 'MISSING') + '\n' +
      '  TELEGRAM_CHAT_ID — ' + (hasTg ? 'set' : 'MISSING') + '\n' +
      '  BRIEFING_EMAIL_TO — ' + (hasEmail ? 'set' : 'MISSING') + '\n' +
      '  PERPLEXITY_API_KEY — ' + (hasPplx ? 'set (6 AM events)' : 'optional') + '\n\n' +
      'Test: Run 6 AM refresh now / Run 8 AM briefing now',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Runs the primary Stock Tracker workflow in dependency order (IST log in Script properties).
 * For sheets that already have UNIVERSE rows. May take several minutes; watch Executions.
 */
function runStockTrackerFullPipelineMenu() {
  var log = runStockTrackerFullPipeline_(false);
  var lines = (log.steps || []).map(function(s) {
    return s.step + ': ' + JSON.stringify(s.result);
  }).join('\n');
  SpreadsheetApp.getUi().alert(
    log.ok ? 'Full pipeline complete' : 'Full pipeline finished with errors',
    (log.ok ? 'OK' : 'ERROR: ' + (log.error || '')) + '\n\n' + lines.substring(0, 3500),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * @param {boolean=} silent Skip UI alert when true.
 * @return {Object}
 */
function runStockTrackerFullPipeline_(silent) {
  var log = {
    phase: 'full_pipeline',
    startedIst: istTimestamp_(),
    steps: [],
    ok: true
  };

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var universe = ss.getSheetByName('1. UNIVERSE');
    if (!universe || universe.getLastRow() < 2) {
      log.ok = false;
      log.error = 'UNIVERSE empty — import NSE EQ or sample universe first.';
      log.finishedIst = istTimestamp_();
      PropertiesService.getScriptProperties().setProperty(
        'LAST_FULL_PIPELINE_JSON',
        JSON.stringify(log)
      );
      if (!silent) {
        SpreadsheetApp.getUi().alert('Pipeline stopped', log.error, SpreadsheetApp.getUi().ButtonSet.OK);
      }
      return log;
    }

    log.steps.push(step_('classify_cap_segments', runStep_(function() {
      if (typeof classifyCapSegments !== 'function') return 'skipped';
      classifyCapSegments();
      return 'ok';
    })));

    log.steps.push(step_('theme_tags', runStep_(function() {
      if (typeof applyInvestmentThemeTagsToUniverse_ !== 'function') return 'skipped';
      applyInvestmentThemeTagsToUniverse_(ss);
      return 'ok';
    })));

    log.steps.push(step_('data_ingestion_v2', runStep_(function() {
      if (typeof runDataIngestionPipelineV2_ !== 'function') return 'skipped_no_v2';
      var ing = runDataIngestionPipelineV2_(ss, {});
      var cov = ing.coverage ? ing.coverage.weighted_coverage_pct + '%' : '';
      return (ing.ok ? 'ok' : 'partial') + (cov ? ' cov=' + cov : '');
    })));

    log.steps.push(step_('news_sources', runStep_(function() {
      if (typeof syncNewsSourcesToSheet !== 'function') return 'skipped';
      syncNewsSourcesToSheet();
      return 'ok';
    })));

    log.steps.push(step_('rss_and_tags', runStep_(function() {
      fetchNewsRss();
      tagNewsSymbols();
      return 'ok';
    })));

    log.steps.push(step_('announcements', runStep_(function() {
      if (typeof parseAnnouncementKeywordsInternal_ === 'function') {
        return parseAnnouncementKeywordsInternal_();
      }
      if (typeof parseAnnouncementKeywords === 'function') {
        parseAnnouncementKeywords();
        return 'ok';
      }
      return 'skipped';
    })));

    log.steps.push(step_('scoring_rebuild', runStep_(function() {
      rebuildScoringPipeline(true);
      return 'ok';
    })));

    log.steps.push(step_('peer_comparison', runStep_(function() {
      if (typeof applyPeerComparisonBatch_ !== 'function') return 'skipped';
      var scoreSheet = ss.getSheetByName('10. SCORING MODEL');
      if (!scoreSheet || scoreSheet.getLastRow() < 2) return 'skipped_no_tab10';
      var n = scoreSheet.getLastRow() - 1;
      var scoreData = scoreSheet.getRange(2, 1, n, SCORING_NUM_COLS).getValues();
      applyPeerComparisonBatch_(scoreData, ss);
      scoreSheet.getRange(2, 1, n, SCORING_NUM_COLS).setValues(scoreData);
      return 'ok';
    })));

    log.steps.push(step_('risk_engine', runStep_(function() {
      if (typeof applyRiskEngineToScoreSheet_ !== 'function') return 'skipped';
      applyRiskEngineToScoreSheet_(ss);
      return 'ok';
    })));

    log.steps.push(step_('theme_intelligence', runStep_(function() {
      if (typeof runThemeIntelligenceEngine_ !== 'function') return 'skipped';
      runThemeIntelligenceEngine_(ss);
      return 'ok';
    })));

    log.steps.push(step_('recommendations', runStep_(function() {
      if (typeof generateRecommendations_ === 'function') {
        generateRecommendations_();
        return 'ok';
      }
      if (typeof syncRankedWatchlist === 'function') {
        syncRankedWatchlist();
        return 'syncRankedWatchlist';
      }
      return 'skipped';
    })));

    log.steps.push(step_('history_snapshot', runStep_(function() {
      if (typeof snapshotRecommendationHistory_ !== 'function') return 'skipped';
      snapshotRecommendationHistory_();
      return 'ok';
    })));

    log.steps.push(step_('backtest_snapshots', runStep_(function() {
      if (typeof snapshotAllBacktestLists_ === 'function') {
        snapshotAllBacktestLists_();
        return 'ok';
      }
      return 'skipped';
    })));

    appendAlert('', 'full_pipeline', 'Stock Tracker full pipeline completed', 'system');
  } catch (err) {
    log.ok = false;
    log.error = String(err.message || err);
    appendAlert('', 'full_pipeline_error', log.error, 'system');
  }

  log.finishedIst = istTimestamp_();
  PropertiesService.getScriptProperties().setProperty('LAST_FULL_PIPELINE_JSON', JSON.stringify(log));
  Logger.log('runStockTrackerFullPipeline_: ' + JSON.stringify(log));
  return log;
}

function run6amRefreshNow() {
  dailyDataRefresh6am();
  SpreadsheetApp.getUi().alert('6 AM data refresh finished. Check ALERTS LOG and Executions.');
}

function run8amBriefingNow() {
  dailyBriefing8am();
  SpreadsheetApp.getUi().alert('8 AM briefing finished. Check email/Telegram and Script property LAST_MORNING_BRIEFING_JSON.');
}

function previewMorningBriefing() {
  var report = typeof buildInstitutionalMorningBrief_ === 'function' ?
    buildInstitutionalMorningBrief_(SpreadsheetApp.getActiveSpreadsheet()) :
    buildMorningBriefingReport_(SpreadsheetApp.getActiveSpreadsheet());
  var text = typeof formatInstitutionalBriefPlain_ === 'function' ?
    formatInstitutionalBriefPlain_(report) :
    formatBriefingPlainText_(report);
  SpreadsheetApp.getUi().alert(
    'Morning brief preview (9 sections)',
    text.substring(0, 1800),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Menu — preview institutional JSON (truncated). */
function previewMorningBriefJson() {
  var report = typeof buildInstitutionalMorningBrief_ === 'function' ?
    buildInstitutionalMorningBrief_(SpreadsheetApp.getActiveSpreadsheet()) :
    buildMorningBriefingReport_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getUi().alert(
    'Morning brief JSON',
    JSON.stringify(report).substring(0, 1800),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildMorningBriefingReport_(ss) {
  if (typeof buildInstitutionalMorningBrief_ === 'function') {
    return buildInstitutionalMorningBrief_(ss);
  }
  var dateIst = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  return {
    date_ist: dateIst,
    spreadsheet_name: ss.getName(),
    spreadsheet_url: ss.getUrl(),
    macro_outlook: buildMacroOutlook_(ss),
    sector_themes: buildTopSectorThemes_(ss, 5),
    top10_immediate: buildTop10Immediate_(ss, 10),
    top10_all_lists: summarizeRecommendationLists_(ss),
    acceptance_lists: buildAcceptanceListsForBriefing_(ss)
  };
}

/**
 * All five acceptance Top 10 lists with Score, Thesis, Catalyst, Risk, Target, Confidence.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function buildAcceptanceListsForBriefing_(ss) {
  var top = typeof getTop10Data_ === 'function' ? getTop10Data_() : { ok: false };
  if (!top.ok) return [];

  var byName = {};
  (top.lists || []).forEach(function(list) {
    byName[list.name] = list.items || [];
  });

  return ACCEPTANCE_LIST_NAMES_.map(function(name) {
    var items = (byName[name] || []).slice(0, 10).map(function(t) {
      return {
        rank: t.rank,
        symbol: t.symbol,
        company_name: t.company_name,
        score: t.score != null ? t.score : t.conviction_total,
        thesis: (t.thesis || t.bull_case || '').substring(0, 200),
        catalyst: (t.catalyst || '').substring(0, 120),
        risk: (t.risk || t.bear_case || '').substring(0, 120),
        target: t.target || t.target_horizon || '',
        target_price: t.target_price,
        confidence: t.confidence
      };
    });
    return { name: name, items: items };
  });
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function buildMacroOutlook_(ss) {
  var sheet = ss.getSheetByName('8. MACRO DASHBOARD');
  if (!sheet || sheet.getLastRow() < 2) {
    return { status: 'empty', headline: 'Tab 8 empty — add macro rows', metrics: [] };
  }

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 6).getValues();
  var metrics = [];
  var verdict = null;

  data.forEach(function(r) {
    var metric = String(r[0] || '').trim();
    if (!metric) return;
    var row = {
      metric: metric,
      value: r[1],
      trend: String(r[2] || ''),
      bias: String(r[3] || ''),
      notes: String(r[5] || '').substring(0, 120)
    };
    metrics.push(row);
    if (metric.toUpperCase().indexOf('MACRO_VERDICT') >= 0) verdict = row;
  });

  var headline = verdict ?
    (verdict.bias || verdict.trend || verdict.notes || 'See Tab 8') :
    (metrics.length ? metrics[0].metric + ': ' + metrics[0].bias : 'No macro verdict row');

  return {
    status: 'ok',
    headline: headline,
    verdict: verdict,
    metrics: metrics.slice(0, 8)
  };
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} limit
 * @return {Array<Object>}
 */
function buildTopSectorThemes_(ss, limit) {
  limit = limit || 5;
  var rows = loadSheetData_(ss, '19. SECTOR STRENGTH');
  if (!rows.length) return [];

  var latestWeek = '';
  rows.forEach(function(r) {
    var wk = weekEndingKey_(r[0]);
    if (wk > latestWeek) latestWeek = wk;
  });

  var sectors = rows.filter(function(r) {
    return weekEndingKey_(r[0]) === latestWeek;
  }).map(function(r) {
    return {
      sector: String(r[1] || ''),
      rank: num_(r[5]),
      narrative: num_(r[2]),
      macro: num_(r[3]),
      flow: num_(r[4]),
      momentum: String(r[6] || ''),
      note: String(r[7] || '').substring(0, 80)
    };
  });

  sectors.sort(function(a, b) {
    if (a.rank && b.rank) return a.rank - b.rank;
    return (b.narrative + b.macro) - (a.narrative + a.macro);
  });

  return sectors.slice(0, limit);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} limit
 * @return {Array<Object>}
 */
function buildTop10Immediate_(ss, limit) {
  var sheet = ss.getSheetByName('11. RANKED WATCHLIST');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var target = 'Top 10 Immediate Opportunities';
  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 12).getValues();
  var dqMap = buildDataQualityPctBySymbol_(ss);
  var out = [];

  data.forEach(function(r) {
    if (String(r[0] || '').trim() !== target) return;
    var sym = String(r[2] || '').trim();
    out.push({
      rank: num_(r[1]),
      symbol: sym,
      company_name: String(r[3] || ''),
      sector: String(r[4] || ''),
      conviction_total: num_(r[5]),
      catalyst: String(r[8] || '').substring(0, 100),
      target_horizon: String(r[9] || ''),
      data_quality_pct: dqMap[normalizeSymbolKey_(sym)] || null
    });
  });

  out.sort(function(a, b) { return a.rank - b.rank; });
  return out.slice(0, limit);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Array<Object>}
 */
function summarizeRecommendationLists_(ss) {
  var top = getTop10Data_();
  if (!top.ok) return [];
  return (top.lists || []).map(function(list) {
    return {
      name: list.name,
      count: (list.items || []).length,
      top_symbol: list.items && list.items[0] ? list.items[0].symbol : ''
    };
  });
}

/**
 * @param {Object} report
 * @return {string}
 */
function formatBriefingPlainText_(report) {
  if (report.sections && typeof formatInstitutionalBriefPlain_ === 'function') {
    return formatInstitutionalBriefPlain_(report);
  }
  var lines = [];
  lines.push('Indian Equity Intelligence');
  lines.push(report.date_ist + ' IST');
  lines.push('');
  lines.push('MACRO OUTLOOK');
  lines.push(report.macro_outlook.headline || '—');
  (report.macro_outlook.metrics || []).slice(0, 5).forEach(function(m) {
    lines.push('  • ' + m.metric + ': ' + m.value + ' (' + m.bias + ')');
  });
  lines.push('');
  lines.push('TOP SECTOR THEMES');
  if (!report.sector_themes.length) {
    lines.push('  (Tab 19 empty)');
  } else {
    report.sector_themes.forEach(function(s, i) {
      lines.push('  ' + (i + 1) + '. ' + s.sector + ' — rank ' + s.rank + ' | ' + s.note);
    });
  }
  lines.push('');
  lines.push('TOP 10 LISTS (acceptance)');
  var lists = report.acceptance_lists || [];
  if (!lists.length) {
    lines.push('  (Rebuild Tab 11 — run generateRecommendations at 8 AM)');
  } else {
    lists.forEach(function(list) {
      lines.push('');
      lines.push(list.name.toUpperCase());
      if (!list.items.length) {
        lines.push('  (empty)');
        return;
      }
      list.items.forEach(function(t) {
        lines.push(
          t.rank + '. ' + t.symbol + ' | Score ' + t.score + ' | Conf ' + t.confidence + '%' +
            ' | Target ' + (t.target || '—') +
            (t.target_price ? ' @ ₹' + t.target_price : '')
        );
        if (t.thesis) lines.push('   Thesis: ' + t.thesis);
        if (t.catalyst) lines.push('   Catalyst: ' + t.catalyst);
        if (t.risk) lines.push('   Risk: ' + t.risk);
      });
    });
  }
  lines.push('');
  lines.push('Sheet: ' + report.spreadsheet_url);
  lines.push('Not investment advice.');
  return lines.join('\n');
}

/**
 * @param {string} listName
 * @param {Array<Object>} items
 * @return {string}
 */
function formatBriefingListPlain_(listName, items) {
  var lines = [String(listName).toUpperCase()];
  if (!items.length) {
    lines.push('  (Rebuild Tab 11 — Stock Tracker → Rebuild scoring pipeline)');
    return lines.join('\n');
  }
  items.forEach(function(t) {
    var score = t.score != null ? t.score : t.conviction_total;
    var conf = t.confidence != null ? t.confidence : Math.min(100, Math.round(score * 0.95));
    lines.push(
      t.rank + '. ' + t.symbol + ' | Score ' + score + ' | Conf ' + conf + '% | Target ' +
        (t.target || t.target_horizon || '—')
    );
    lines.push('   Thesis: ' + briefField_(t.thesis || t.bull_case, 120));
    lines.push('   Catalyst: ' + briefField_(t.catalyst, 100));
    lines.push('   Risk: ' + briefField_(t.risk || t.bear_case, 100));
  });
  return lines.join('\n');
}

/**
 * @param {string} s
 * @param {number} max
 * @return {string}
 */
function briefField_(s, max) {
  var t = String(s || '—').trim();
  if (!t) return '—';
  return t.length > max ? t.substring(0, max - 1) + '…' : t;
}

/**
 * @param {Object} report
 * @return {string}
 */
function formatBriefingHtml_(report) {
  if (report.sections && typeof formatInstitutionalBriefHtml_ === 'function') {
    return formatInstitutionalBriefHtml_(report);
  }
  var esc = escapeHtml_;
  var html = [];
  html.push('<div style="font-family:system-ui,sans-serif;max-width:640px;color:#111;">');
  html.push('<h1 style="color:#0e7490;">Indian Equity Intelligence</h1>');
  html.push('<p><strong>' + esc(report.date_ist) + '</strong> IST</p>');

  html.push('<h2>Macro outlook</h2><p>' + esc(report.macro_outlook.headline || '—') + '</p><ul>');
  (report.macro_outlook.metrics || []).slice(0, 6).forEach(function(m) {
    html.push('<li>' + esc(m.metric) + ': <strong>' + esc(String(m.value)) + '</strong> (' +
      esc(m.bias) + ')</li>');
  });
  html.push('</ul>');

  html.push('<h2>Top sector themes</h2><ol>');
  report.sector_themes.forEach(function(s) {
    html.push('<li><strong>' + esc(s.sector) + '</strong> — rank ' + s.rank +
      (s.note ? ' — ' + esc(s.note) : '') + '</li>');
  });
  if (!report.sector_themes.length) html.push('<li><em>Tab 19 empty</em></li>');
  html.push('</ol>');

  (report.acceptance_lists || []).forEach(function(list) {
    html.push('<h2>' + esc(list.name) + '</h2>');
    html.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">');
    html.push('<tr><th>#</th><th>Symbol</th><th>Score</th><th>Conf%</th><th>Target</th><th>Thesis</th><th>Catalyst</th><th>Risk</th></tr>');
    list.items.forEach(function(t) {
      html.push('<tr><td>' + t.rank + '</td><td>' + esc(t.symbol) + '</td><td>' + t.score +
        '</td><td>' + t.confidence + '</td><td>' + esc(t.target) +
        (t.target_price ? ' (₹' + t.target_price + ')' : '') + '</td><td>' + esc(t.thesis) +
        '</td><td>' + esc(t.catalyst) + '</td><td>' + esc(t.risk) + '</td></tr>');
    });
    if (!list.items.length) html.push('<tr><td colspan="8"><em>empty</em></td></tr>');
    html.push('</table>');
  });

  html.push('<p style="margin-top:24px;font-size:12px;color:#666;">Probability ranking only — not investment advice.<br/>');
  html.push('<a href="' + esc(report.spreadsheet_url) + '">Open Google Sheet</a></p></div>');
  return html.join('');
}

/**
 * @param {Object} report
 * @return {Object}
 */
function sendTelegramBriefing_(report) {
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
  }

  var messages = splitBriefingForTelegram_(report);
  var sent = 0;
  var lastError = null;

  messages.forEach(function(text) {
    if (text.length > 4000) text = text.substring(0, 3990) + '\n…(truncated)';
    var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId,
        text: text,
        disable_web_page_preview: true
      }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      sent++;
    } else {
      lastError = 'HTTP ' + code + ': ' + resp.getContentText().substring(0, 200);
    }
  });

  if (sent === messages.length) {
    return { ok: true, messages: sent };
  }
  return { ok: sent > 0, messages: sent, error: lastError || 'Partial send failure' };
}

/**
 * Split long briefing into Telegram-safe chunks (header + one list per message).
 * @param {Object} report
 * @return {Array<string>}
 */
function splitBriefingForTelegram_(report) {
  if (report.sections && typeof splitInstitutionalBriefForTelegram_ === 'function') {
    return splitInstitutionalBriefForTelegram_(report);
  }
  var messages = [];
  var header = [];
  header.push('Indian Equity Intelligence');
  header.push(report.date_ist + ' IST');
  header.push('');
  header.push('MACRO: ' + (report.macro_outlook.headline || '—'));
  if (report.sector_themes.length) {
    header.push('SECTORS: ' + report.sector_themes.slice(0, 3).map(function(s) {
      return s.sector;
    }).join(', '));
  }
  messages.push(header.join('\n'));

  (report.acceptance_lists || []).forEach(function(list) {
    messages.push(formatBriefingListPlain_(list.name, list.items || []));
  });

  if (!(report.acceptance_lists || []).length) {
    messages.push(formatBriefingListPlain_('TOP 10 IMMEDIATE OPPORTUNITIES', report.top10_immediate || []));
  }

  messages.push('Sheet: ' + report.spreadsheet_url + '\nNot investment advice.');
  return messages;
}

/**
 * @param {Object} report
 * @return {Object}
 */
function sendMorningBriefingEmail_(report) {
  var to = String(PropertiesService.getScriptProperties().getProperty('BRIEFING_EMAIL_TO') || '').trim();
  if (!to) {
    return { ok: false, error: 'BRIEFING_EMAIL_TO not set' };
  }

  var outlook = report.sections && report.sections.market_outlook ?
    report.sections.market_outlook :
    report.macro_outlook;
  var subject = '[India Stocks] Morning Brief — ' +
    Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd') + ' — ' +
    String(outlook.headline || outlook.summary || 'Briefing').substring(0, 60);

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: formatBriefingPlainText_(report),
    htmlBody: formatBriefingHtml_(report),
    name: 'Indian Equity Intelligence'
  });

  return { ok: true, to: to };
}

function shouldSendTelegram_() {
  var props = PropertiesService.getScriptProperties();
  var flag = String(props.getProperty('SEND_TELEGRAM') || '').toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  return !!(props.getProperty('TELEGRAM_BOT_TOKEN') && props.getProperty('TELEGRAM_CHAT_ID'));
}

function shouldSendEmail_() {
  var props = PropertiesService.getScriptProperties();
  var flag = String(props.getProperty('SEND_EMAIL') || '').toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  return !!String(props.getProperty('BRIEFING_EMAIL_TO') || '').trim();
}

/**
 * @param {string} s
 * @return {string}
 */
function escapeHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @return {string}
 */
function istTimestamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * @param {string} name
 * @param {*} result
 * @return {Object}
 */
function step_(name, result) {
  return { step: name, result: result, at: istTimestamp_() };
}

/**
 * @param {Function} fn
 * @return {*}
 */
function runStep_(fn) {
  return fn();
}
