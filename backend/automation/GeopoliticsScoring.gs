/**
 * Tab 9 GEOPOLITICS FLAGS → Tab 10 news_events (H) boost.
 * See docs/GEOPOLITICS_SCORING.md
 */

/** Max age (days) for a flag row to contribute; blank last_updated = always eligible if active. */
var GEOPOLITICS_FLAG_MAX_DAYS_ = 120;
/** Points per active helped-sector (or direct symbol) hit before row cap. */
var GEOPOLITICS_H_BONUS_PER_HIT_ = 2;
/** Max H sub-score suggested from Tab 9 alone (merged via Math.max; H cap = 10). */
var GEOPOLITICS_H_BONUS_CAP_ = 4;

/**
 * @param {*} status
 * @return {boolean}
 */
function isGeopoliticsFlagActive_(status) {
  var s = String(status || '').trim().toLowerCase();
  if (!s) return true;
  if (/resolved|closed|inactive|archived|ended|expired|withdrawn/.test(s)) return false;
  return true;
}

/**
 * @param {*} val Tab 9 last_updated
 * @param {Date} today
 * @return {boolean}
 */
function isGeopoliticsFlagRecent_(val, today) {
  if (!val) return true;
  var d = parseSheetDate_(val);
  if (!d) return true;
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - GEOPOLITICS_FLAG_MAX_DAYS_);
  return d >= cutoff;
}

/**
 * Active Tab 9 rows → symbol hit counts + sector hit counts (sectors_helped only).
 * @param {Array<Array>} geoRows
 * @param {Object} universeBySym
 * @return {{symBoost: Object, sectorBoost: Object, activeRows: number}}
 */
function buildGeopoliticsBoostLookup_(geoRows, universeBySym) {
  var symBoost = {};
  var sectorBoost = {};
  var activeRows = 0;
  var today = new Date();

  (geoRows || []).forEach(function(r) {
    if (!isGeopoliticsFlagActive_(r[1])) return;
    if (!isGeopoliticsFlagRecent_(r[4], today)) return;
    activeRows++;

    parseBeneficiaryTokens_(r[2]).forEach(function(token) {
      var sym = normalizeSymbolKey_(token);
      if (universeBySym[sym]) {
        symBoost[sym] = (symBoost[sym] || 0) + 1;
        return;
      }
      var sec = normalizeSectorKey_(token);
      if (sec) sectorBoost[sec] = (sectorBoost[sec] || 0) + 1;
    });
  });

  return { symBoost: symBoost, sectorBoost: sectorBoost, activeRows: activeRows };
}

/**
 * @param {number} hits
 * @return {number} suggested H sub-score (0–GEOPOLITICS_H_BONUS_CAP_)
 */
function scoreGeopoliticsNewsBoost_(hits) {
  if (!hits || hits <= 0) return 0;
  return Math.min(GEOPOLITICS_H_BONUS_CAP_,
    hits * GEOPOLITICS_H_BONUS_PER_HIT_);
}

/**
 * Tab 9 sectors_helped (and direct symbols) → news_events (H) on Tab 10.
 * Preserves higher manual / Tab 7 / event scores via Math.max.
 * @param {Array<Array>} data Tab 10 rows
 * @param {Array<Array>} geoRows Tab 9 rows
 * @param {Object} universeBySym
 */
function applyGeopoliticsFlagsToData_(data, geoRows, universeBySym) {
  if (!geoRows || !geoRows.length) return;

  var lookup = buildGeopoliticsBoostLookup_(geoRows, universeBySym);
  if (!lookup.activeRows) return;

  var cap = CONVICTION_CAP.news_events;
  var matchedSyms = 0;
  var logSamples = [];

  for (var i = 0; i < data.length; i++) {
    var sym = normalizeSymbolKey_(data[i][0]);
    if (!sym) continue;

    var hits = lookup.symBoost[sym] || 0;
    var u = universeBySym[sym];
    if (!hits && u && u.sectorKey && lookup.sectorBoost[u.sectorKey]) {
      hits = lookup.sectorBoost[u.sectorKey];
    }
    if (!hits) continue;

    var geoBoost = Math.min(cap, scoreGeopoliticsNewsBoost_(hits));
    var before = num_(data[i][7]);
    if (geoBoost > before) data[i][7] = geoBoost;

    if (geoBoost > before) matchedSyms++;
    if (logSamples.length < 6 && geoBoost > before) {
      logSamples.push({
        symbol: sym,
        sector: (u && u.sectorKey) || '',
        hits: hits,
        H_before: before,
        H_after: data[i][7]
      });
    }
  }

  Logger.log('applyGeopoliticsFlagsToData_: activeFlags=' + lookup.activeRows +
    ' symbolHits=' + Object.keys(lookup.symBoost).length +
    ' sectorHits=' + Object.keys(lookup.sectorBoost).length +
    ' boosted=' + matchedSyms);
  if (logSamples.length) {
    Logger.log('applyGeopoliticsFlagsToData_: samples=' + JSON.stringify(logSamples));
  }
}
