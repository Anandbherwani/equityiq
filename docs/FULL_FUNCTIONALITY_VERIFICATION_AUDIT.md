# Full Functionality Verification Audit

**Date:** 2026-06-03  
**Evidence types:** **CODE-VERIFIED** = static trace in `backend/automation/Code.gs` / `backend/workflows/workflow-indian-equity-morning.json`. **RUNTIME-REQUIRES-USER** = must confirm in Google Sheet, Apps Script Executions log, or Script Property `LAST_NEWS_PIPELINE_SUMMARY`.  
**Agent cannot** open your spreadsheet or run Apps Script in your account.

**Live evidence:** run **Stock Tracker → Run full system audit** and read **[E2E_LIVE_FUNCTIONALITY_AUDIT.md](E2E_LIVE_FUNCTIONALITY_AUDIT.md)** (`runSystemAudit.gs`, property `LAST_SYSTEM_AUDIT_JSON`).

**Prior user-reported sheet state (not re-verified by agent):** UNIVERSE + NEWS populated; Tab 10 sub-scores C–L largely zero; Perplexity write counts `order_book=1`, `sector_strength=6`, `macro_beneficiaries=5`.

---

## Core question: 8 AM IST tomorrow — actionable Top 10?

### Answer: **NO** (actionable research-grade Top 10)

### Answer: **PARTIAL** (mechanical Top 10 rows in Tab 11 / board “Top 10 Watchlist (pipeline)”)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Something appears in Tab 11 by 08:00 | **RUNTIME-REQUIRES-USER** | Only if `installDailyTriggers` ran and `dailyMaintenance` completed before 08:00 (`Code.gs` L834–845, L847–870). |
| Tab 11 ranks by conviction **M** | **CODE-VERIFIED** | `syncRankedWatchlist` sorts `b.conviction - a.conviction`, slices `WATCHLIST_TOP_N` (50) (`L1246–1264`). |
| Top 10 is **actionable** (non-zero drivers, moat/valuation, confirmed filings) | **FAIL** | New rows zero C–L (`buildScoringRowFromUniverse_` L1052–1054); E,G,H,I,L never auto-filled (`applyAutoSubScores_` L1159–1192 skips them). User-reported Tab 10 zeros. |
| 08:00 Telegram/email delivers structured Top 10 JSON | **FAIL** | n8n `Parse Report` TODO — sends `content.substring(0, 3500)` only (`workflow-indian-equity-morning.json` L234). |
| 08:00 run refreshes Tab 10 from n8n | **FAIL** | n8n writes only Tab 12 `perplexity_morning` (`L280–314`); no Sheets write to 10/11. |
| Morning brief uses Tab 19/20/16 | **FAIL** | n8n reads Tabs 8, 11, 15, 7 only (`L35–138`); not Tab 10, 16, 19, 20. |

**Blockers (priority):** (1) Triggers + `PERPLEXITY_API_KEY` + 06:00 success — **RUNTIME-REQUIRES-USER**. (2) Conviction near 0 → ranked list is arbitrary among ties (`pickBoardCandidates_` pipeline board L2740–2748). (3) UNIVERSE `sector` empty after NSE CSV → Tab 19 join fails (`resolveSectorStrengthForSymbol_` L1626–1636). (4) n8n credentials (`CONFIGURE_*` placeholders L56–58, L167–169, L254–256). (5) Fundamentals Tab 6 empty → boards needing moat≥7/8 stay empty (`pickBoardCandidates_` L2757–2758).

---

## PHASE 1 — E2E pipeline (stage table)

| Stage | Handler | Expected I/O (code) | Status | Silent failure risk | Evidence |
|-------|---------|---------------------|--------|---------------------|----------|
| 1. Bootstrap tabs | `setupAllSheets` L242 | 21 tabs + 11b headers; seed Tab 8/20 if empty | **PASS** CODE | None if user runs menu | `SHEET_DEFS` L84–173 |
| 2. UNIVERSE import | `importNseEquityCsv_` L323 | HTTP 200 → N rows Tab 1; alert on fail | **PARTIAL** | HTTP ≠200 → alert then `return` L329–340; no row count in sheet | NSE 403 possible |
| 3. Eligibility → Tab 10 | `syncScoringFromUniverse` L1081 | `eligible.length` rows × 33 cols | **PASS** CODE | `getEligibleUniverseRows_` [] → UI alert L1084–1090 | `ALLOW_UNIVERSE_WITHOUT_MCAP` L37 |
| 4. RSS ingest | `fetchNewsRss` L551 | ≤`RSS_MAX_ITEMS_PER_RUN` (200) new rows Tab 7 | **PARTIAL** | `lastRow < 2` on Tab 13 → **silent return** L563; per-feed HTTP fail → `continue` L584–586 | Alert only aggregate L609 |
| 5. Tag symbols | `tagNewsSymbols` L699 | Updates col K for matched headlines | **PARTIAL** | Missing Tab 7/1 or `<2` rows → **silent return** L703 | No alert on 0 tags |
| 6. Perplexity extract | `callPerplexityNewsExtraction_` L2138 | 1 HTTP; JSON 8 arrays | **RUNTIME-REQUIRES-USER** | No key → throw L2140; parse fail → throw L2187–2190 | Summary in `LAST_NEWS_PIPELINE_SUMMARY` L32 |
| 7. Write events | `writeExtractedEventsToSheets_` L2301 | Per `written.counts` | **PARTIAL** | Symbol filter drops rows L2279–2283; dedup → 0 added L2253–2255 | User: ob=1, s19=6, s20=5 |
| 8. Helpers N–R | `computeHelperSignalsInternal_` L1460 | Tab 10 cols 14–18 per symbol | **PARTIAL** | Empty Tab 15–18 → all 0, **no alert** L1463 | Logs L1479–1510 |
| 9. News hints | `applyNewsFlowToScores_` L2472 | 7d Tab 7 → C,D,F, AE,AF | **PARTIAL** | RSS sets `materiality='medium'` L596 — weak boosts | L2485–2536 |
| 10. Auto sub-scores | `applyAutoSubScores_` L1159 | Max(existing,suggested) C,D,F,J,K | **PARTIAL** | O=0,N=0 → suggestions 0 L1182–1186 | E,G,H,I,L untouched |
| 11. Conviction M | `applyConvictionFormulas_` + script L1119–1140 | M = sum capped C–L | **PASS** CODE | Formula overwrite after `setValues` L1400–1401 | `calculateConvictionFromRow_` L1145–1150 |
| 12. Tab 11 watchlist | `syncRankedWatchlist` L1233 | ≤50 rows | **PASS** CODE | Tab 10 empty → UI alert L1237 | Excludes `exclude_from_watchlist` L1248 |
| 13. Tab 11b boards | `refreshDashboardViewsInternal_` L2648 | ≤12×10 rows | **PARTIAL** | Filters drop all → board empty, still **alert** L2686 | `DASHBOARD_BOARD_DEFS` L175–188 |
| 14. Tab 21 stubs | `syncAnalysisOutput` L1319 | ≤10 stock_card rows | **PARTIAL** | Stubs only L1347 | Not Section 4 cards |
| 15. Prices Tab 2 | `refreshWatchlistPrices` L736 | ≤100 symbols, 4 formulas | **PARTIAL** | `symbols.length===0` → UI alert L739–743 | DMA/RSI blank L756 |
| 16. Daily bundle | `dailyMaintenance` L834 | RSS→tag→(PPLX\|rebuild)→prices | **RUNTIME-REQUIRES-USER** | Uncaught Perplexity error aborts rest of chain | L838–842 branch |
| 17. n8n 08:00 | workflow JSON | Read 4 tabs → 2× PPLX → TG/email/Tab12 | **RUNTIME-REQUIRES-USER** | `templateCredsSetupCompleted: false` L390 | No write 10/11/15–20 |

---

## PHASE 2 — Sheet population (per tab)

Row counts: **VERIFY IN SHEET** unless noted from user prior messages.

| Tab | Expected source (code) | User-reported / verify | Downstream consumers | Status |
|-----|------------------------|------------------------|----------------------|--------|
| 1 UNIVERSE | NSE CSV / sample L311–480 | Populated | `getEligibleUniverseRows_`, sector join L1581–1590 | **PASS** path |
| 2 PRICE | `refreshWatchlistPrices` L736 | VERIFY IN SHEET | Column I not fed | **PARTIAL** |
| 3 ANNOUNCEMENTS | Manual only | VERIFY IN SHEET | `parseAnnouncementKeywordsInternal_` → Tab 12 only L2614–2620 | **FAIL** auto write |
| 4 BULK | None in code | VERIFY IN SHEET | None | **FAIL** |
| 5 INSIDER | None in code | VERIFY IN SHEET | None | **FAIL** |
| 6 FUNDAMENTALS | None in code | VERIFY IN SHEET | E,G,H in scoring | **FAIL** auto |
| 7 NEWS FLOW | `fetchNewsRss` L551 | Populated (user) | Perplexity L2002; `applyNewsFlowToScores_` | **PASS** ingest |
| 8 MACRO | `seedMacroDashboard_` L270 | VERIFY IN SHEET | n8n read; not Tab 20 | **PARTIAL** |
| 9 GEOPOLITICS | `writeExtractedEventsToSheets_` append L2420–2434 | VERIFY IN SHEET | Display | **PARTIAL** |
| 10 SCORING | `syncScoringFromUniverse` + pipeline | Zeros C–L (user) | Tab 11, 11b, 21 | **PARTIAL** rows exist, scores weak |
| 11 WATCHLIST | `syncRankedWatchlist` | VERIFY IN SHEET | n8n, prices L767 | **PASS** if Tab 10 |
| 11b BOARDS | `refreshDashboardViewsInternal_` | VERIFY IN SHEET | UI | **PARTIAL** filters |
| 12 ALERTS | `appendAlert` | VERIFY IN SHEET | Audit | **PASS** |
| 13 NEWS SOURCES | `syncNewsSourcesToSheet` L537 | VERIFY IN SHEET | RSS L565 | **PASS** |
| 14 INDIA IMPACT | Perplexity append L2436–2450 | VERIFY IN SHEET | Research | **PARTIAL** |
| 15 FILINGS | Perplexity append L2312–2327 | VERIFY IN SHEET | Helper N L1492 | **PARTIAL** |
| 16 ORDER BOOK | Perplexity append L2329–2344 | **1 row** (user) | Helper O L1493; C via O×5 L1183 | **PARTIAL** |
| 17 ANALYST | Perplexity append L2346–2360 | VERIFY IN SHEET | Q L1496 | **PARTIAL** |
| 18 PROMOTER | Perplexity append L2362–2377 | VERIFY IN SHEET | P L1494 | **PARTIAL** |
| 19 SECTOR | Perplexity **replace** L2379–2397 | **6 rows** (user) | R, F L1497–1498, L1186 | **PARTIAL** needs sector match on Tab 1 |
| 20 MACRO BEN | Perplexity **replace** L2400–2417 | **5 rows** (user) | `applyMacroBeneficiariesToData_` L1664 | **PARTIAL** |
| 21 ANALYSIS | `syncAnalysisOutput` L1319 | VERIFY IN SHEET | Stubs | **PARTIAL** |

---

## PHASE 3 — Functions (100 from `grep '^function '` in Code.gs)

| Function | Line | Class | Evidence |
|----------|------|-------|----------|
| `onOpen` | 205 | **Live** | Menu L206–237 |
| `setupAllSheets` | 242 | **Live** | Menu |
| `seedMacroDashboard_` | 270 | **Live** | Called setupAllSheets L264 |
| `seedMacroBeneficiaries_` | 285 | **Live** | setupAllSheets L265 |
| `migrateLegacyAnalysisOutput_` | 301 | **Live** | setupAllSheets L244 |
| `importNseSymbolList` | 311 | **Live** | Menu |
| `importNseSmeSymbolList` | 315 | **Live** | Menu |
| `importNseEquityCsv_` | 323 | **Live** | Import chain |
| `parseNseEquityCsv_` | 364 | **Live** | importNseEquityCsv_ L343 |
| `buildUniverseRow_` | 421 | **Live** | parseNseEquityCsv_ L407 |
| `detectSme_` | 435 | **Live** | classifyCapSegments L499 |
| `writeUniverseRows_` | 448 | **Live** | import paths |
| `importSampleUniverse` | 466 | **Live** | Menu |
| `classifyCapSegments` | 484 | **Live** | Menu / import |
| `syncNewsSourcesToSheet` | 537 | **Live** | Menu / fetchNewsRss L556 |
| `fetchNewsRss` | 551 | **Live** | Menu, dailyMaintenance L835, trigger L862 |
| `parseRssFeed_` | 617 | **Live** | fetchNewsRss L588 |
| `extractRssItem_` | 639 | **Live** | parseRssFeed_ |
| `extractAtomEntry_` | 654 | **Live** | parseRssFeed_ |
| `childText_` | 674 | **Live** | RSS helpers |
| `childTextNs_` | 679 | **Live** | RSS helpers |
| `loadExistingNewsUrls_` | 688 | **Live** | fetchNewsRss L560 |
| `tagNewsSymbols` | 699 | **Live** | Menu, dailyMaintenance L836 |
| `refreshWatchlistPrices` | 736 | **Live** | Menu, dailyMaintenance L843 |
| `collectWatchlistSymbols_` | 767 | **Live** | refreshWatchlistPrices L738 |
| `appendAlert` | 801 | **Live** | Many callers |
| `logTestAlert` | 811 | **Live** | Menu |
| `checkHighMaterialityNewsAlerts` | 816 | **Live** | fetchNewsRss L610 |
| `dailyMaintenance` | 834 | **Live** | Menu, trigger L855 |
| `installDailyTriggers` | 847 | **Live** | Menu |
| `clearDataBelowHeader_` | 881 | **Live** | Widespread |
| `getOrCreateSheet_` | 890 | **Live** | Widespread |
| `parseCsvLine_` | 908 | **Live** | parseNseEquityCsv_ |
| `getEligibleUniverseRows_` | 933 | **Live** | Scoring pipeline |
| `universeRowToObject_` | 951 | **Live** | Eligibility |
| `isUniverseEligible_` | 972 | **Live** | Eligibility |
| `universeHardFlags_` | 1009 | **Live** | buildScoringRowFromUniverse_ |
| `loadExistingScoringBySymbol_` | 1026 | **Live** | syncScoringFromUniverse L1097 |
| `buildScoringRowFromUniverse_` | 1046 | **Live** | syncScoringFromUniverse L1103 |
| `syncScoringFromUniverse` | 1081 | **Live** | Menu, rebuild L1362 |
| `applyConvictionFormulas_` | 1119 | **Live** | sync/rebuild L1108, L1401 |
| `applyConvictionTotalsInScript_` | 1135 | **Live** | applyAutoSubScoresAndRefreshTotals_ L1399 |
| `calculateConvictionFromRow_` | 1145 | **Live** | applyAutoSubScores_, totals |
| `applyAutoSubScores_` | 1159 | **Live** | applyAutoSubScoresAndRefreshTotals_ L1398 |
| `getTopScoringSymbols_` | 1216 | **Live** | fetchRecentNewsContext_ L2007 |
| `syncRankedWatchlist` | 1233 | **Live** | Menu, rebuild L1373 |
| `pickHorizonLabel_` | 1291 | **Live** | syncRankedWatchlist L1257 |
| `buildUniverseLookup_` | 1303 | **Live** | syncRankedWatchlist, boards L2660 |
| `syncAnalysisOutput` | 1319 | **Live** | Menu, rebuild L1375 |
| `rebuildScoringPipeline` | 1361 | **Live** | Menu, dailyMaintenance L841, news L2573 |
| `applyAutoSubScoresAndRefreshTotals_` | 1387 | **Live** | rebuild, computeScoringHelpers L1447 |
| `openNseFilingsHelper` | 1409 | **Live** | Menu — URL only |
| `computeScoringHelpers` | 1435 | **Live** | Menu |
| `computeHelperSignals` | 1456 | **Duplicate** | Alias → computeScoringHelpers L1457 |
| `computeHelperSignalsInternal_` | 1460 | **Live** | rebuild L1370 |
| `loadSheetData_` | 1521 | **Live** | Helpers, news |
| `normalizeSymbolKey_` | 1533 | **Live** | Widespread |
| `normalizeSectorKey_` | 1541 | **Live** | Sector join L1544–1563 |
| `weekEndingKey_` | 1571 | **Live** | buildSectorStrengthLookup_ L1603 |
| `buildUniverseBySymbol_` | 1581 | **Live** | Helpers, macro, auto scores |
| `buildSectorStrengthLookup_` | 1599 | **Live** | applyAutoSubScores_, helpers |
| `resolveSectorStrengthForSymbol_` | 1626 | **Live** | Helpers L1497, auto L1174 |
| `sectorMacroSuggestionFromStrength_` | 1644 | **Live** | applyAutoSubScores_ L1186 |
| `applyMacroBeneficiariesToData_` | 1664 | **Live** | applyAutoSubScoresAndRefreshTotals_ L1397 |
| `parseBeneficiaryTokens_` | 1705 | **Live** | applyMacroBeneficiariesToData_ L1672 |
| `countEventsSince_` | 1720 | **Live** | Helpers — undated rows count L1728 |
| `hasPromoterBuy_` | 1740 | **Live** | Helper P |
| `parseSheetDate_` | 1758 | **Live** | Date parsing |
| `buildSectorRankMap_` | 1769 | **Unused** | **No callers** in Code.gs |
| `lookupSectorRank_` | 1784 | **Unused** | Only calls dead helpers |
| `coerceSectorStrengthLookup_` | 1796 | **Unused** | Only lookupSectorRank_ L1785 |
| `getPerplexityApiKey_` | 1814 | **Live** | Pipeline gate |
| `shouldRunPerplexityDaily_` | 1824 | **Live** | dailyMaintenance L838 |
| `getNewsExtractionSystemPrompt_` | 1833 | **Live** | callPerplexityNewsExtraction_ L2146 |
| `buildNewsExtractionUserPrompt_` | 1843 | **Live** | callPerplexity L2147 |
| `buildUniverseSymbolSet_` | 1867 | **Live** | fetchRecentNewsContext_, write events |
| `createNewsPipelineSummary_` | 1878 | **Live** | runNewsIntelligencePipeline L2549 |
| `formatNewsPipelineOneLine_` | 1896 | **Live** | logNewsPipelineSummary_ L1981 |
| `formatNewsPipelineAlertMessage_` | 1916 | **Live** | viewLastNewsPipelineLog L1991 |
| `logNewsPipelineSummary_` | 1973 | **Live** | Property L1977 |
| `viewLastNewsPipelineLog` | 1984 | **Live** | Menu |
| `fetchRecentNewsContext_` | 2002 | **Live** | runNewsIntelligencePipeline L2560 |
| `parseJsonFromPerplexityResponse_` | 2078 | **Live** | callPerplexity L2186 |
| `normalizePerplexityPayload_` | 2102 | **Live** | callPerplexity L2197 |
| `callPerplexityNewsExtraction_` | 2138 | **Live** | runNewsIntelligencePipeline L2570 |
| `parseBoolFlag_` | 2218 | **Live** | writeExtractedEventsToSheets_ |
| `normalizeEventSymbol_` | 2229 | **Live** | mapEligibleEventRows_ L2279 |
| `appendRowsDeduped_` | 2242 | **Live** | write events |
| `mapEligibleEventRows_` | 2269 | **Live** | write events |
| `writeExtractedEventsToSheets_` | 2301 | **Live** | runNewsIntelligencePipeline L2571 |
| `applyNewsFlowToScores_` | 2472 | **Live** | rebuild L1371 |
| `runNewsIntelligencePipeline` | 2547 | **Live** | Menu, dailyMaintenance |
| `parseAnnouncementKeywordsInternal_` | 2591 | **Live** | dailyMaintenance L837 — Tab 12 only |
| `parseAnnouncementKeywords` | 2626 | **Live** | Menu |
| `refreshDashboardViews` | 2636 | **Live** | Menu |
| `refreshDashboardViewsInternal_` | 2648 | **Live** | rebuild L1374 |
| `scoringRowToCandidate_` | 2693 | **Live** | boards |
| `num_` | 2728 | **Live** | Widespread |
| `pickBoardCandidates_` | 2739 | **Live** | boards — downgrades logic suspect L2752 |
| `getSheetHeaders_` | 2776 | **Live** | Sheet ops |

**Broken (logic):** `pickBoardCandidates_` `downgradesOnly` requires `revisionUpgrades > 0 && analyst < 4` (L2752) — opposite of downgrade semantics. **CODE-VERIFIED.**

---

## PHASE 4 — Scoring trace (BEL, HAL, RELIANCE, TCS)

Tab 10 column letters (1-based sheet / 0-based array index in parentheses):

| Col | Field | Index |
|-----|-------|-------|
| A | symbol | 0 |
| B | company_name | 1 |
| C | corporate_trigger | 2 |
| D | filings_intelligence | 3 |
| E | business_moat | 4 |
| F | sector_macro | 5 |
| G | financial_strength | 6 |
| H | valuation | 7 |
| I | price_volume | 8 |
| J | promoter_activity | 9 |
| K | analyst_revisions | 10 |
| L | institutional_flow | 11 |
| M | conviction_total | 12 |
| N | filings_signal_count_30d | 13 |
| O | orderbook_signal_count_90d | 14 |
| P | promoter_buy_flag_90d | 15 |
| Q | revision_upgrade_count_60d | 16 |
| R | sector_strength_rank | 17 |

**M formula (CODE-VERIFIED):** `=ROUND(MIN(C,15)+…+MIN(L,5),0)` L1125–1126; script equivalent L1146–1150.

### RELIANCE (sample universe L194–195)

| Step | CODE-VERIFIED behavior | RUNTIME-REQUIRES-USER |
|------|------------------------|----------------------|
| Eligibility | `marketCapCr` 1.8M cr → `mcapOk` true L982–993 | Row on Tab 10? |
| Initial C–L | 0 if new row L1052–1054 | User: zeros |
| N | `countEventsSince_(filings, RELIANCE, …, 30d)` L1492 | Tab 15 rows for RELIANCE? |
| O | Order book count 90d L1493 | User: 1 ob row globally — VERIFY symbol |
| R | `normalizeSectorKey_("Energy")` → alias map L1555–1556 → `OIL & GAS`? **Energy** not in alias table → key `ENERGY` L1564 | Tab 19 `sector` must match `ENERGY` |
| F auto | `sectorMacroSuggestionFromStrength_`: rank≤3 → 8 L1646–1648 | Only if R>0 or sectorInfo |
| C auto | `min(15, O*5)` L1183 | O=0 → C stays 0 |
| M max auto | ~15–35 with news hints only L2520–2527 | VERIFY M cell |

### TCS (L197–198)

Same path; sector `IT Services` → alias `IT SERVICES` L1545–1547. Tab 19 row must use matching `sector` string L1608.

### BEL / HAL (not in `SAMPLE_UNIVERSE` L194–201)

| Issue | Evidence |
|-------|----------|
| On Tab 1? | **VERIFY IN SHEET** |
| Sector for join | Empty sector on NSE CSV import L422–427 → `resolveSectorStrengthForSymbol_` returns null L1628–1629 → **R blank, F suggestion 0** |
| Defense sector | No `DEFENCE` / `AEROSPACE` in `normalizeSectorKey_` aliases L1544–1563 — must match Tab 19 text exactly |
| Conviction | Without Tab 6 → E,G,H=0; without O for symbol → C=0 |

**Why zeros (checklist):**

1. New row init C–L=0 — L1052–1054  
2. Empty Tab 15–18 for symbol — L1492–1496  
3. Sector mismatch Tab 1 ↔ Tab 19 — L1626–1636  
4. Tab 6 empty — no code fills E,G,H  
5. Tab 2 no technical scoring — I stays 0 L756  
6. `applyAutoSubScores_` uses `Math.max` — 0 stays if no helpers L1188–1192  

---

## PHASE 5 — Perplexity pipeline

### Call chain (CODE-VERIFIED)

```
runNewsIntelligencePipeline L2547
  → fetchRecentNewsContext_ L2560 (max 30, 48h L30–31)
  → callPerplexityNewsExtraction_ L2570 (sonar-pro L29, L2143)
  → writeExtractedEventsToSheets_ L2571
  → rebuildScoringPipeline(true) L2573
  → logNewsPipelineSummary_ L2576 (Property L32, L1977)
```

### `LAST_NEWS_PIPELINE_SUMMARY` fields (CODE-VERIFIED `createNewsPipelineSummary_` L1878–1889)

| Field | Meaning |
|-------|---------|
| `news.headlinesSent` | Sent to API (≤30) |
| `news.newsRowsTotal` | Tab 7 data rows |
| `news.withEligibleSymbol` | Tagged + in universe |
| `extractedRaw.*` | Pre-filter array lengths L2199–2202 |
| `filters.droppedSymbol` | Not in eligible UNIVERSE L2281–2283 |
| `filters.droppedDedup` | Duplicate keys L2253–2255 |
| `written.counts` | Rows added/replaced L2304–2307 |

### Categories table (Articles → Written → Lost)

| Category | Articles input | Extracted (raw) | Written (sheet) | Lost mechanisms |
|----------|----------------|-----------------|-----------------|-----------------|
| Headlines | Tab 7 rows in 48h L2027–2031 | `headlinesSent` ≤30 L2058 | N/A (input only) | Older than 48h skipped L2030; no headline L2034 |
| filings | In JSON payload | `extractedRaw.filings` | `written.counts.filings` append | Ineligible symbol L2281; dedup L2322–2326 |
| order_book | In JSON | `extractedRaw.order_book` | counts.order_book | Same + user reported 1 written |
| promoter_activity | In JSON | raw | counts | Symbol required |
| analyst_revisions | In JSON | raw | counts | Symbol required |
| sector_strength | In JSON | raw | **replace** all Tab 19 L2381 | Wrong keys → `normalizePerplexityPayload_` L2106–2128 |
| macro_beneficiaries | In JSON | raw | **replace** Tab 20 L2402 | User: 5 written |
| geopolitics | In JSON | raw | append Tab 9 | Dedup |
| india_impact | In JSON | raw | append Tab 14 | Dedup |

**RUNTIME-REQUIRES-USER:** Open menu **View last news pipeline log** or Executions log for actual numbers tomorrow AM.

---

## PHASE 6 — Data flow integrity (edge tests)

| Edge | Expected | Status | Evidence |
|------|----------|--------|----------|
| Tab 19 → helper R → F | Latest `week_ending` rows → `buildSectorStrengthLookup_` L1599–1617 → `helpers[i][4]` L1497–1498 → `applyAutoSubScores_` sugSector L1186 | **CODE-VERIFIED** if sector keys match | Fail if Tab 1 `sector` empty or ≠ Tab 19 `sector` L1608 |
| Tab 16 → O → C | `countEventsSince_(orderbook, sym, 0, 1, 90d)` L1493 → `sugCorp = min(15,O*5)` L1183 | **CODE-VERIFIED** | **FAIL** for symbol if O=0; undated rows still count L1728 |
| Tab 20 → F | `applyMacroBeneficiariesToData_` token match L1669–1697 | **CODE-VERIFIED** | Needs `beneficiaries` tokens matching symbol or normalized sector L1678–1679 |
| Tab 7 → scores | `applyNewsFlowToScores_` 7d window L2485–2536 | **CODE-VERIFIED** | Weak if all `materiality=medium` from RSS L596 |
| Tab 15 → D | N×3 in auto L1189 | **CODE-VERIFIED** | VERIFY IN SHEET rows |
| Perplexity → Tab 15–20 | `writeExtractedEventsToSheets_` | **RUNTIME-REQUIRES-USER** | User partial success (ob1/s19=6/m20=5) |
| n8n Section 14 → Tab 15–20 | — | **FAIL** | JSON parsed only; sticky L173 “Prefer Apps Script write” |
| rebuild order | helpers → news → macro+auto → 11/11b/21 L1369–1375 | **CODE-VERIFIED** | — |

---

## PHASE 7 — Automation

| Item | CODE-VERIFIED | RUNTIME-REQUIRES-USER |
|------|---------------|----------------------|
| `installDailyTriggers` | Deletes old triggers for `dailyMaintenance`/`fetchNewsRss` L849–852; creates 06:00 + 15:45 IST L855–868 | User ran menu once? |
| `dailyMaintenance` sequence | L835–843: RSS, tag, keywords, Perplexity if `shouldRunPerplexityDaily_` else rebuild, prices | 06:00 execution success? |
| `shouldRunPerplexityDaily_` | False if `RUN_PERPLEXITY_DAILY` false/0 L1825–1826; else needs key L1827 | Property values? |
| `RUN_PERPLEXITY_DAILY` | Read L1825 | Set? |
| n8n schedule | Cron `0 8 * * 1-5`, timezone Asia/Kolkata L6–21, L385–387 | Workflow active? |
| n8n Telegram | `TELEGRAM_CHAT_ID` env L244; credential `CONFIGURE_TELEGRAM` L254–256 | **FAIL until configured** |
| n8n Email | `EMAIL_TO` L263; SMTP `CONFIGURE_SMTP` L274–276 | **FAIL until configured** |
| n8n Perplexity | `CONFIGURE_PERPLEXITY` L167–169 | **FAIL until configured** |
| n8n Google Sheets | `SHEET_ID` env L40; `CONFIGURE_GOOGLE_SHEETS` | **FAIL until configured** |

---

## PHASE 8 — Top 10 simulation (conviction = 0 scenario)

**CODE-VERIFIED** with all Tab 10 rows `M=0`, helpers 0:

| Output | Behavior |
|--------|----------|
| `syncRankedWatchlist` | Still emits up to 50 rows; sort stable by conviction then symbol L1263 — **all ties → arbitrary order** among 0 |
| Board `Top 10 Watchlist (pipeline)` | `pipelineDefault` true L176; sort conviction then signals L2741–2748 → **10 symbols, not actionable** |
| `minConviction: 70` boards | **0 rows** L2753 |
| `minMoat: 8` | **0 rows** if E=0 L2757 |
| `minOrderbookSignals: 1` | **0 rows** unless O≥1 for symbol L2760 |
| `promoterBuy` board | **0 rows** unless P true L2759 |
| Tab 21 | Still writes stubs from Tab 11 L1344–1348 |
| n8n Telegram | Prose excerpt, not Tab 10 sync L234 |

**Impossible without data (CODE-VERIFIED):** Non-zero moat/valuation boards; high-conviction Immediate Opportunities; meaningful trigger_summary beyond `FI:0 OB:0 CT:0` L1258.

---

## PHASE 9 — Failure analysis (ranked)

### Critical

| ID | Issue | Fix |
|----|-------|-----|
| C1 | 08:00 delivery not wired to Tab 10/11 updates | Ensure 06:00 `dailyMaintenance` + key; or extend n8n to write sheets |
| C2 | Tab 10 conviction ~0 with sparse events | Populate Tab 1 sector; rerun pipeline; paste Tab 6 / Section 4 |
| C3 | n8n credentials placeholders | Complete `CONFIGURE_*` + env vars per `backend/workflows/README.md` |

### High

| ID | Issue | Fix |
|----|-------|-----|
| H1 | E,G,H,I,L never automated | Manual Tab 6 + prompts |
| H2 | UNIVERSE sector empty after NSE CSV | Screener merge + classify |
| H3 | n8n briefing ignores Tab 19/20/16 | Add read nodes or rely on 06:00 GAS |
| H4 | `fetchNewsRss` silent exit empty Tab 13 | Run sync news sources first |

### Medium

| ID | Issue | Fix |
|----|-------|-----|
| M1 | `downgradesOnly` board filter inverted L2752 | Fix condition |
| M2 | Q counts all revisions not upgrades L1496 | Compare rating_old/new |
| M3 | `countEventsSince_` counts undated rows L1728 | Require valid date |
| M4 | `computeHelperSignals` duplicate L1456 | Remove alias |

### Low

| ID | Issue | Fix |
|----|-------|-----|
| L1 | Dead `buildSectorRankMap_`, `lookupSectorRank_` L1769–1788 | Delete |
| L2 | RSS default neutral/medium L596–597 | Perplexity or manual enrich |
| L3 | `NEWS_SOURCES` vs `backend/config/news-sources.json` drift | Single sync on setup |

---

## PHASE 10 — Readiness

| Metric | Value | Basis |
|--------|-------|-------|
| **Automation readiness** | **~45%** | Code paths exist; user runtime + credentials + sector + scores missing |
| **Actionable Top 10 readiness** | **~25%** | Mechanical list possible; investment-quality blocked |
| **8 AM actionable Top 10 tomorrow** | **NO** | Phase 1 + core question |

### Blockers (priority)

1. **RUNTIME-REQUIRES-USER:** `installDailyTriggers` + confirm 06:00 run tomorrow.  
2. **RUNTIME-REQUIRES-USER:** `PERPLEXITY_API_KEY` + `LAST_NEWS_PIPELINE_SUMMARY.success`.  
3. **VERIFY IN SHEET:** Tab 1 `sector` for watchlist names; Tab 19 sector strings align (`normalizeSectorKey_`).  
4. **VERIFY IN SHEET:** Tab 10 M and C–L after **Rebuild scoring pipeline**.  
5. n8n: `SHEET_ID`, Google OAuth, Perplexity, Telegram, email.  
6. Populate Tab 6 or run Section 4 for E,G,H.  
7. Fix downgrades board if used (M1).

---

## Appendix — Verification Runbook (~15 min)

**RUNTIME-REQUIRES-USER** — perform in your Google Sheet account.

| Step | Action | Evidence to capture |
|------|--------|---------------------|
| 1 | Extensions → Apps Script → Project Settings → Script properties | `PERPLEXITY_API_KEY` set? `RUN_PERPLEXITY_DAILY`? |
| 2 | Stock Tracker → **View last news pipeline log** | `success`, `written.counts`, `filters.droppedSymbol` |
| 3 | Apps Script → **Executions** → latest `dailyMaintenance` or `runNewsIntelligencePipeline` | Log lines `NEWS_PIPELINE_SUMMARY`, `computeHelperSignalsInternal_` |
| 4 | Tab **12. ALERTS LOG** — filter `news_intelligence`, `daily_maintenance`, `perplexity_error` | Timestamps ~06:00 IST |
| 5 | Stock Tracker → **Install daily triggers (IST)** (once) | UI confirms L870 |
| 6 | Tab **1. UNIVERSE** — count rows; spot-check BEL/HAL/RELIANCE `sector`, `market_cap_cr` | Row counts |
| 7 | Tab **7. NEWS FLOW** — count; col K tagged symbols | `withEligibleSymbol` proxy |
| 8 | Tab **16** — confirm order_book row symbol(s) | O>0 for that symbol on Tab 10 col O |
| 9 | Tab **19** — 6 rows: `sector` names vs Tab 1 sectors | R non-empty on Tab 10 |
| 10 | Tab **10** — RELIANCE/TCS/BEL/HAL: C,D,F,M,N,O,R | Screenshot or copy row |
| 11 | Stock Tracker → **Rebuild scoring pipeline from UNIVERSE** | UI count n symbols L1379 |
| 12 | Tab **11** — top 10 `conviction_total` col G | Ranked list |
| 13 | Tab **11b** — board “Top 10 Watchlist (pipeline)” | 10 rows? |
| 14 | n8n — manual execute workflow; check Telegram/email | Or confirm disabled |
| 15 | Property `LAST_NEWS_PIPELINE_SUMMARY` (Script properties raw JSON) | Archive for audit |

**Pass criteria for “mechanical Top 10 YES”:** Tab 11 has 10 rows with `last_updated` today after step 11; Tab 12 shows `rebuild_pipeline` or `daily_maintenance` today.

**Pass criteria for “actionable Top 10 YES”:** Top row `conviction_total` ≥50 with at least two of C,D,F,J,K ≥5 **and** one confirmed Tab 15 row or high materiality Tab 7 — **not met** per user-reported Tab 10 zeros.

---

*Static audit of repository source. Re-run after `Code.gs` or n8n workflow changes.*
