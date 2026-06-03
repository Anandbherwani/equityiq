# Recommendation History Engine — Audit Report

**Engine version:** 1.0 (`RecommendationHistoryEngine.gs`)  
**Audit date:** 2026-06-04  
**Scope:** Tab 37 persistence, 8 AM automation, deduplication, rebuild safety, validation math, category mapping, field capture, frontend parity  
**Method:** Static code review (no live spreadsheet execution in this audit)

---

## Executive summary

| # | Requirement | Verdict | Notes |
|---|-------------|---------|-------|
| 1 | Tab 37 snapshots at 8 AM automatically | **PASS** (conditional) | Wired in `dailyBriefing8am`; requires deployed `.gs` + installed trigger |
| 2 | No duplicate entries | **PASS** (scoped) | Dedup `date\|symbol\|list_name`; same-day re-run safe |
| 3 | History survives rebuilds | **PASS** | Tab 37 never cleared by pipeline rebuilds |
| 4 | Validation dashboard metrics | **PASS** | Hit rate, avg return, avg α Nifty, avg α sector, best/worst |
| 5 | Recommendation categories map correctly | **PASS** (six lists) | Theme Tab 11 lists get **empty** category |
| 6 | Thesis, target, confidence, risk captured | **PASS** (conditional) | From Tab 11 columns; empty if Tab 11 / analyst engine empty |

**Overall:** **PASS with gaps** — production-ready for the six core recommendation lists; tighten theme-list handling (M1). **H1 resolved** (2026-06-04): `average_alpha_vs_sector_pct` on scorecards + `/validation` UI.

---

## 1. Tab 37 snapshots at 8 AM

### Evidence

`dailyBriefing8am` runs in this order:

1. `generateRecommendations_()` — refreshes Tab 11  
2. `snapshotRecommendationHistory_()` — append Tab 37 (if engine deployed)  
3. `snapshotAllBacktestLists_()` — Tab 22  
4. Morning brief delivery  

```103:113:backend/automation/DailyAutomation.gs
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    generateRecommendations_();
    if (typeof snapshotRecommendationHistory_ === 'function') {
      snapshotRecommendationHistory_();
    }
    if (typeof snapshotAllBacktestLists_ === 'function') {
      snapshotAllBacktestLists_();
```

Triggers are installed at **08:00 Asia/Kolkata** via `installDailyAutomationTriggers`:

```176:182:backend/automation/DailyAutomation.gs
  ScriptApp.newTrigger('dailyBriefing8am')
    .timeBased()
    .atHour(8)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone('Asia/Kolkata')
    .create();
```

Manual equivalent: **Run 8 AM briefing now** → `run8amBriefingNow()` → `dailyBriefing8am()`.

### Preconditions (operational)

| Precondition | If missing |
|--------------|------------|
| `RecommendationHistoryEngine.gs` pasted in Apps Script project | Snapshot skipped silently (`typeof` guard) |
| **Install triggers — 6 AM + 8 AM IST** run once | No automatic 8 AM run |
| 8 AM handler completes without error | Entire block skipped; Tab 37 not updated that day |

### Caveats

- **6 AM** `rebuildScoringPipeline` refreshes Tab 11 but does **not** snapshot Tab 37 until **8 AM**. Picks can change between 6:00 and 8:00.
- Trigger runs **every calendar day** (including weekends), not weekdays-only.
- Snapshot runs **after** Tab 11 sync; if `generateRecommendations_` throws, history snapshot does not run.

**Verdict:** **PASS (conditional)** — code path is correct; ops must deploy engine + triggers.

---

## 2. Duplicate entries

### Mechanism

Before append, existing keys are loaded from Tab 37 columns A–E:

```117:125:backend/automation/RecommendationHistoryEngine.gs
function loadRecommendationHistoryKeys_(sheet) {
  var map = {};
  ...
  data.forEach(function(r) {
    var key = String(r[0]) + '|' + normalizeSymbolKey_(r[4]) + '|' + String(r[2]);
    map[key] = true;
  });
```

New rows skip if key exists:

```71:74:backend/automation/RecommendationHistoryEngine.gs
    var key = today + '|' + sym + '|' + p.list_name;
    if (existing[key]) return;
```

### Covered cases

| Scenario | Duplicate? |
|----------|------------|
| Second **Snapshot history → Tab 37** same day | No |
| Second **8 AM** run same day | No |
| Same symbol on **two lists** same day | No (different `list_name` in key) |
| Same symbol **different days** | No (intended — new evidence row) |

### Not prevented by code

| Scenario | Risk |
|----------|------|
| Manual row paste / duplicate delete+re-append | Low — operator error |
| `snapshot_date` edited in sheet | Key mismatch → possible duplicate |
| Same pick, **rank change** same day | No second row (by design — one issue per list per day) |

**Verdict:** **PASS** for automated paths.

---

## 3. History survives rebuilds

### Tab 37 is append-only

`snapshotRecommendationHistory_` only **appends** rows; never calls `clearDataBelowHeader_` on Tab 37.

`ensureRecommendationHistorySheet_` / `ensureSheetWithHeaders_` set **row 1 headers only**; data rows are untouched.

### Rebuild paths that do **not** clear Tab 37

| Action | Tab 11 | Tab 37 |
|--------|--------|--------|
| `rebuildScoringPipeline` | Cleared + rewritten | Unchanged |
| `generateRecommendations_` | Cleared + rewritten | Unchanged |
| `setupAllSheets` | Headers fixed; data kept | Unchanged |
| `syncRankedWatchlist` | Regenerated | Unchanged |

```1567:1574:backend/automation/Code.gs
  var watchSheet = getOrCreateSheet_('11. RANKED WATCHLIST');
  ...
  clearDataBelowHeader_(watchSheet, headers.length);
  if (out.length) {
    watchSheet.getRange(2, 1, out.length, headers.length).setValues(out);
```

No `grep` hit for `clearDataBelowHeader_` on `37. RECOMMENDATION HISTORY`.

**Verdict:** **PASS** — permanent log design is sound.

---

## 4. Validation dashboard calculations

### Backend: `buildRecommendationScorecard_`

| Metric | Implemented | Formula / source |
|--------|-------------|------------------|
| Recommendations issued | Yes | `subset.length` (rows with matching `recommendation_category`) |
| Hit rate | Yes | % of rows with `live.hit === true` (`current_return_pct > 0`) among rows with non-null return |
| Average return | Yes | Mean `live.current_return_pct` |
| Average alpha vs Nifty | Yes | Mean `live.alpha_vs_nifty_pct` (rows with non-null alpha) |
| Average alpha vs sector | Yes | Mean `live.alpha_vs_sector_pct` (`average_alpha_vs_sector_pct`) |
| Best pick | Yes | Max `current_return_pct`; includes `alpha_vs_nifty_pct` |
| Worst pick | Yes | Min `current_return_pct`; includes `alpha_vs_nifty_pct` |

Live metrics (entry → today, paired benchmarks):

```260:275:backend/automation/RecommendationHistoryEngine.gs
  var currentReturn = entryPrice > 0 && currentPrice > 0 ?
    Math.round(((currentPrice - entryPrice) / entryPrice) * 10000) / 100 : null;
  var alphaNifty = currentReturn != null && niftyRet != null ?
    Math.round((currentReturn - niftyRet) * 100) / 100 : null;
  var alphaSector = currentReturn != null && sectorRet != null ?
    Math.round((currentReturn - sectorRet) * 100) / 100 : null;
  ...
    alpha_vs_nifty_pct: alphaNifty,
    alpha_vs_sector_pct: alphaSector,
    hit: currentReturn != null ? currentReturn > 0 : null
```

API: `getRecommendationValidationData_()` → `?action=recommendation_validation`.

### Frontend: `/validation`

Displays scorecard fields: issued, hit rate, avg return, **Average Alpha vs Nifty**, **Average Alpha vs Sector**, best/worst.

### History Explorer: `/history`

Per-row columns include **α Nifty** and **α Sector** — sector alpha is visible at row level.

### Dependencies for non-null returns

- Tab 37 has rows with valid `entry_price` or retrievable historical close  
- Tab 2 price or `GOOGLEFINANCE` for current price  
- `BacktestEngine.gs` symbols (`NIFTY_FINANCE_SYMBOLS_`, `resolveSectorBenchmarkSymbol_`) deployed  

**Verdict:** **PASS** — scorecard includes `average_alpha_vs_sector_pct` (H1 fix).

**Regression tests:** `python scripts/test_recommendation_history_scorecard.py`

---

## 5. Recommendation category mapping

### Source of truth

```289:296:backend/automation/Code.gs
var RECOMMENDATION_LIST_DEFS = [
  { name: 'Top 10 Immediate Opportunities', filter: 'immediate' },
  { name: 'Top 10 3-Month Opportunities', filter: 'three_month' },
  { name: 'Top 10 12-Month Compounders', filter: 'compounders' },
  { name: 'Top 10 Monopoly Businesses', filter: 'monopoly' },
  { name: 'Top 10 Government Beneficiaries', filter: 'gov_beneficiary' },
  { name: 'Top 10 Turnarounds', filter: 'turnaround' }
];
```

Snapshot uses `recommendationCategoryFromListName_` → `recommendationFilterFromListName_` (same loop as above).

Frontend `RECOMMENDATION_CATEGORY_LABELS` matches all six `filter` keys.

### Gap: theme Tab 11 lists

`appendThemeIntelligenceTab11Lists_` adds lists such as **Top Themes**, **Theme Winners**, **Top 10 Theme Stocks**. These are **not** in `RECOMMENDATION_LIST_DEFS`, so:

- `recommendation_category` stored as **empty string**  
- Still snapshotted to Tab 37 (all Tab 11 rows are read)  
- Scorecards may include an empty-category bucket or orphan rows  

**Verdict:** **PASS** for six core lists; **WARN** for theme lists.

---

## 6. Thesis, target, confidence, risk capture

### Tab 11 → Tab 37 mapping

| Required field | Tab 11 source | Tab 37 column | Snapshot code |
|----------------|---------------|---------------|---------------|
| Thesis | `bull_case` (col 6) | `thesis` | `truncateHistoryText_(p.thesis \|\| p.bull_case)` |
| Target | `target_horizon` (col 9) | `target` | `p.target \|\| p.target_horizon` |
| Confidence | `confidence` header | `confidence` | Dynamic `confIdx` |
| Risk | `bear_case` (col 7) | `risk` | `truncateHistoryText_(p.risk \|\| p.bear_case)` |

```83:100:backend/automation/RecommendationHistoryEngine.gs
    rows.push([
      today,
      category,
      p.list_name,
      ...
      truncateHistoryText_(p.thesis || p.bull_case),
      String(p.target || p.target_horizon || ''),
      p.confidence != null && p.confidence !== '' ? p.confidence : '',
      truncateHistoryText_(p.risk || p.bear_case),
```

Also stored: `conviction`, `entry_price`, `risk_score` (Tab 10 when available), `data_quality_pct`.

### Limits

- Text fields capped at **4500** characters (`REC_HISTORY_MAX_TEXT_`).  
- If analyst note engine fails for a list, `generateRecommendations_` may write **zero rows** for that list → nothing to snapshot.  
- Confidence empty when column missing or narrative has no score.

**Verdict:** **PASS (conditional)** — fields mapped correctly when Tab 11 is populated.

---

## 7. Live verification checklist (spreadsheet)

Run after deploy:

| Step | Expected |
|------|----------|
| 1. Paste `RecommendationHistoryEngine.gs`, Save | No compile errors |
| 2. **Setup all sheet tabs** | Tab **37. RECOMMENDATION HISTORY** exists |
| 3. **Sync recommendations (Tab 11)** | Six lists + optional theme rows |
| 4. **Snapshot history → Tab 37** | New rows; `source` = `tab11_daily_snapshot` |
| 5. Run step 4 again same day | **0** new rows (dedup) |
| 6. **Rebuild scoring pipeline** | Tab 37 row count unchanged |
| 7. Web App `?action=recommendation_history` | `entries[].live` with returns/alpha when prices available |
| 8. Web App `?action=recommendation_validation` | Six scorecards (if only core lists snapshotted) |
| 9. **Install triggers** + next 8 AM | ALERTS LOG `rec_history_snapshot` |

### Sample dedup test (manual)

```
key = yyyy-MM-dd|SYMBOL|list_name
Run snapshot twice → second append count = 0
```

---

## 8. Findings and recommendations

### High

| ID | Finding | Status |
|----|---------|--------|
| H1 | Scorecard lacks **average alpha vs sector** | **Resolved** — `average_alpha_vs_sector_pct` in engine, API, `/validation`, audit tests |

### Medium

| ID | Finding | Recommendation |
|----|---------|----------------|
| M1 | Theme Tab 11 lists snapshot with **empty** `recommendation_category` | **Resolved** — see [M1_THEME_CATEGORIES_COMPLETE.md](./M1_THEME_CATEGORIES_COMPLETE.md) |
| M2 | 6 AM rebuild updates Tab 11 without history until 8 AM | Document ops expectation; optional: snapshot after 6 AM rebuild |
| M3 | `typeof snapshotRecommendationHistory_` guard fails silently if file not deployed | **Resolved** — see [M3_HISTORY_MONITOR_COMPLETE.md](./M3_HISTORY_MONITOR_COMPLETE.md) |

### Low

| ID | Finding | Recommendation |
|----|---------|----------------|
| L1 | Best/worst picks omit sector alpha on card | Include `alpha_vs_sector_pct` on best/worst objects |
| L2 | Weekend 8 AM runs when markets closed | Optional weekday-only trigger |
| L3 | Theme rows use non-equity `symbol` values | Exclude theme-only rows from return math |

---

## 9. File traceability

| Component | Path |
|-----------|------|
| Engine | `backend/automation/RecommendationHistoryEngine.gs` |
| 8 AM wire | `backend/automation/DailyAutomation.gs` |
| Sheet def | `backend/automation/Code.gs` (`SHEET_DEFS` Tab 37) |
| API | `backend/automation/WebAppApi.gs` |
| History UI | `frontend/src/app/history/` |
| Validation UI | `frontend/src/app/validation/` |
| Types | `frontend/src/lib/types.ts` |
| Ops doc | `docs/RECOMMENDATION_HISTORY.md` |

---

## 10. Sign-off

| Role | Result |
|------|--------|
| Architecture (append-only Tab 37) | Approved |
| Automation (8 AM chain) | Approved with deploy preconditions |
| Data integrity (dedup + rebuild) | Approved |
| Analytics (validation API) | Approved |
| Category / field capture | Approved for six core lists |

**Next engineering task (optional):** Close **M1** (filter theme Tab 11 lists from Tab 37 snapshots).
