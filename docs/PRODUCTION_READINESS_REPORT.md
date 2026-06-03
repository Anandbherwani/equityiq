# Production Readiness Report

**Project:** Indian Equity Intelligence / Stock automation  
**Repo:** `/Users/anandbherwani/Documents/Stock automation`  
**Audit date:** 2026-06-04  
**Method:** Static review of `backend/automation/*.gs`, `docs/*`, `backend/workflows/`, `frontend/`, `shared/`; grep for TODO/stub/synthetic; cross-check prior audits against current code. **No live Sheet execution** in this environment.

**Remediation plan (67 → 90):** [ROADMAP_TO_90.md](./ROADMAP_TO_90.md) — gap inventory, ranked fixes, and phased implementation sequence (reconciled with Backtest v3, DataIngestionEngine, 23-file deploy).

---

## Executive summary

The codebase is a **mature research prototype**: scoring 2.1, data quality, alpha, six Tab 11 lists, Apps Script 6 AM/8 AM automation, morning brief, backtest engine, Next.js frontend, and a live system audit are **implemented in source**. Production readiness is blocked by **operational dependencies** (populated fundamentals/deals, pasted Apps Script project, installed triggers, Web App URL, Perplexity/Telegram credentials) and **known quality gaps** (sparse pillars, insufficient Tab 22 snapshot history, n8n unstructured briefing, stale audit docs referencing removed Tab 11b). Backtest v3 is **snapshot-only** (synthetic cohort removed in source).

| Metric | Value |
|--------|------:|
| **Average component score** | **67 / 100** |
| **Verdict** | **Beta** |

**Beta** — suitable for a single-operator research workflow after setup; not **Production Ready** for unattended institutional use until data cadence, deployment, and validation gates are proven on a live sheet.

---

## Component score table

| # | Component | Score | Status |
|---|-----------|------:|--------|
| 1 | Code.gs (sheet defs, rebuild, version, tabs) | **78** | Strong code; data/deploy dependent |
| 2 | runSystemAudit.gs | **72** | Good coverage; no E2E pipeline run |
| 3 | Scoring Engine (pillars, Tab 10, DQ, alpha) | **68** | Logic present; live scores weak without Tab 6 |
| 4 | Perplexity Pipeline | **62** | End-to-end; no rate limits/retries |
| 5 | Recommendation Engine (Tab 11) | **75** | Gates + audit; fallback fills lists |
| 6 | Automation (DailyAutomation, brief) | **70** | 6/8 AM IST in Apps Script |
| 7 | Triggers | **65** | Menu installer; daily incl. weekends |
| 8 | n8n | **48** | One workflow; Parse TODO; optional path |
| 9 | Data Quality | **72** | Engine + Tab 11 gate; empty inputs → low DQ |
| 10 | Backtesting | **58** | Engine + API + UI; synthetic default |
| | **Average** | **67** | |

---

## 1. Code.gs — 78

### Complete

- `SHEET_DEFS`: tabs **1–24** including backtest 22/23 and shareholding 24 (`Code.gs`).
- `SCORING_ENGINE_VERSION = '2.1'`; conviction caps `CONVICTION_CAP`.
- `rebuildScoringPipeline`: UNIVERSE → Tab 10 → prices → helpers → news hints → `populateQuantitativeScores_` → auto sub-scores → `generateRecommendations_`.
- `setupAllSheets` + migrations `migrateRankedWatchlistHeaders_`, `migrateLegacyAnalysisOutput_`.
- Menu `onOpen` documents full operator surface.

### Partial

- Tab **21** `syncAnalysisOutput` is explicit no-op.
- Tab **23** headers in `SHEET_DEFS` may omit `list_name` / `median_return_pct` order used by `BacktestEngine.gs` `BACKTEST_HEADERS_RESULTS`; `getBacktestResults_` compensates dynamically.
- NSE CSV import, RSS, GOOGLEFINANCE prices — **PARTIAL** (NSE 403 risk, `PRICE_REFRESH_MAX_SYMBOLS` 100).
- Large monolith (~3,800+ lines, 130+ functions in `Code.gs` alone).

### Missing

- ~~Auto-ingest tabs 4/6/24~~ — **`DataIngestionEngine.gs`** added; Screener still needed for full Tab 6 moat/valuation (`docs/DATA_INGESTION.md`).

---

## 2. runSystemAudit.gs — 72

### Complete

- Entry `runFullSystemAudit` → stages **A_setup**, **B_rowCounts**, **B_fundamentals**, **C_sampleSymbols**, **C_universeSector**, **F_convictionDistribution**, **G_dataQuality**, **D_triggers**, **E_integrations**.
- Checks `SHEET_DEFS` headers, **22** required function names, row counts for 17 sheets.
- Conviction forensic `auditScoringConviction_` vs `calculateConvictionFromRow_`.
- Writes **AUDIT SNAPSHOT** + `LAST_SYSTEM_AUDIT_JSON`.

### Partial

- Does **not** execute rebuild, Perplexity extraction, or Telegram send (by design).
- Optional Perplexity probe is HEAD-only when `probePerplexity: true`.
- Simulates Tab 11 picks via `pickRecommendationCandidates_` but does not validate live Tab 11 row narratives.

### Missing

- Tab **22/23** backtest health, Web App deployment check, frontend connectivity.

---

## 3. Scoring Engine — 68

### Complete

- Pillars C–K documented in `ScoringEngineValidation.gs` `PILLAR_COLS_`; menu `runScoringEngineForensicValidation`.
- `QualityPillarScoring.gs`, `TechnicalMomentumEngine.gs`, `InstitutionalFlowEngine.gs`, `SectorIntelligence.gs` wired from rebuild.
- `applyScoringDataMetrics_` + `DataQualityEngine` + `applyAlphaScoresBatch_` on rebuild.
- `docs/SCORING_ENGINE_VALIDATION.md` ties Engine 2.1 to forensic validation.

### Partial

- Archived live snapshot: **2,376** Tab 10 rows, **49** with M>0 (**2.06%**), Tab 6 **0** rows (`docs/SCORING_ENGINE_VALIDATION.md`) — **data starvation**, not logic-only failure.
- `APPLY_PERPLEXITY_SCORES = false` — moat enrichment off by default.

### Missing

- Automated CI run of forensic validation against a golden sheet export.

---

## 4. Perplexity Pipeline — 62

### Complete

- `runNewsIntelligencePipeline`: key check → `fetchRecentNewsContext_` → `callPerplexityNewsExtraction_` → `writeExtractedEventsToSheets_` → `rebuildScoringPipeline`.
- Structured prompts, JSON parse `parseJsonFromPerplexityResponse_`, pipeline summary property `LAST_NEWS_PIPELINE_SUMMARY`.
- 6 AM optional via `shouldRunPerplexityDaily_` (`DailyAutomation.gs`).

### Partial

- **Single** HTTP request per run; no Perplexity 429 backoff/retry.
- `PERPLEXITY_NEWS_MAX_HEADLINES = 30` caps input.
- Daily cost exposure if key set and `RUN_PERPLEXITY_DAILY` default true when key present.

### Missing

- Rate-limit policy, idempotent run keys, structured morning JSON in n8n path.

---

## 5. Recommendation Engine — 75

### Complete

- `RecommendationEngine.gs`: gates DQ≥60, confidence≥50, conviction≥20, stale/news-only rejection.
- `pickRecommendationCandidates_` applies `passesRecommendationQualityGate_` then list filters + fallback pool.
- Six lists `RECOMMENDATION_LIST_DEFS`; `generateRecommendations_` writes Tab 11.
- `auditTab11Recommendations` → **RECOMMENDATION REVIEW** sheet.
- 8 AM briefing uses acceptance list names (`DailyAutomation.gs`).

### Partial

- Fallback can pad lists below filter thresholds — mechanical Top 10 may be weak candidates.
- Narratives template/heuristic via `buildRecommendationNarrativeV2_`, not full Section 4 LLM cards.

### Missing

- Hard fail when &lt;10 symbols pass gates (lists can be short or empty sections in briefing).

---

## 6. Automation — 70

### Complete

- `DailyAutomation.gs`: `dailyDataRefresh6am` (RSS, announcements, prices, Perplexity/rebuild), `dailyBriefing8am` (recommendations, backtest snapshot, Telegram/email).
- `MorningBriefEngine.gs` / `buildMorningBriefingReport_`, HTML/plain formatters, multi-message Telegram split.
- Menu: install triggers, run now, preview.

### Partial

- Credentials required (`TELEGRAM_*`, `BRIEFING_EMAIL_TO`, optional `PERPLEXITY_API_KEY`) — skipped channels logged, not failed run.
- n8n documented as **optional** alternative (`backend/workflows/README.md`).

### Missing

- No distributed lock if 6 AM and manual rebuild overlap; no holiday/market calendar skip.

---

## 7. Triggers — 65

### Complete

- `installDailyAutomationTriggers` deletes prior handlers for `dailyDataRefresh6am`, `dailyBriefing8am`, `dailyMaintenance`, `fetchNewsRss` then creates 6 AM and 8 AM IST triggers.
- Audit stage `auditStageTriggers_` reports installed handlers.

### Partial

- `.everyDays(1)` — **no weekday-only** guard (unlike n8n cron `0 8 * * 1-5`).
- Triggers exist only after **manual** menu install — not in repo state.

### Missing

- Documented idempotency token for duplicate 8 AM runs (Tab 22 dedup is date|symbol|list only).

---

## 8. n8n — 48

### Complete

- `backend/workflows/workflow-indian-equity-morning.json` + `README.md`.
- Reads Tabs 8, 11, 7, 15; Perplexity briefing chain documented.

### Partial

- **Parse Report** node: `TODO: parse structured JSON`; sends `content.substring(0, 3500)`.
- Does **not** write Tabs 15–20 (canonical write is Apps Script 6 AM).
- Credentials placeholders `CONFIGURE_GOOGLE_SHEETS`.

### Missing

- Second workflow, production deployment evidence, structured Top 10 JSON delivery per `docs/DELIVERY_TEMPLATES.md`.

---

## 9. Data Quality — 72

### Complete

- `DataQualityEngine.gs`: weighted components, grades A–F, `DATA_QUALITY_TAB11_MIN_SCORE_ = 60`.
- Integrated in `applyScoringDataMetrics_` on rebuild; audit stage G.
- `docs/DATA_QUALITY_ENGINE.md` present.

### Partial

- With Tab 6/4 empty, DQ scores and `data_gate_flag` collapse — gates exclude most symbols from Tab 11.
- Tab 24 shareholding in DQ context — often empty.

### Missing

- Automated alerting when avg DQ &lt; 40 across universe.

---

## 10. Backtesting — 58

### Complete

- `BacktestEngine.gs`: `snapshotAllBacktestLists_`, `runBacktestEngine`, 4 lists × 4 horizons × 2 benchmarks, `getBacktestResults_` for API.
- `BACKTEST_MIN_SNAPSHOT_ROWS_ = 5`; mode `snapshot_log` vs `synthetic_cohort` at line ~190.
- 8 AM calls snapshot (`DailyAutomation.gs`).
- Frontend `frontend/src/app/backtest/` + Web App `?action=backtest`.
- `docs/BACKTEST_ENGINE.md` matches code modes.

### Partial

- Default **`synthetic_cohort`** when Tab 22 &lt; 5 rows per list — survivorship/look-ahead bias documented.
- Offline `backend/backtest/run_backtest.py` (yfinance) — separate from Sheet truth.
- Tab 23 schema drift vs `SHEET_DEFS` (mitigated in reader).

### Missing

- Production-grade point-in-time history (months of Tab 22 snapshots); CI validation of hit-rate claims.

---

## Highest-risk weaknesses (ranked)

1. **Empty fundamentals and deals** → conviction and recommendations not economically meaningful (`docs/SCORING_ENGINE_VALIDATION.md`).
2. **14-file Apps Script deploy** not enforced by root README; Web App + `NEXT_PUBLIC_SHEETS_API_URL` required for frontend.
3. **Backtest synthetic mode** until daily Tab 22 snapshots accumulate (`BacktestEngine.gs`).
4. **Perplexity** single-call, no retry; daily spend if key set.
5. **n8n morning brief** unstructured excerpt vs Apps Script structured briefing (dual paths confuse ops).
6. **Documentation drift** — `docs/FULL_SYSTEM_AUDIT.md` still describes Tab **11b** and removed dashboard refresh paths.
7. **Weekend triggers** run daily maintenance without market context.
8. **Recommendation fallback** may surface low-quality Top 10 rows.
9. **Tab 23 header mismatch** risk for manual Sheet users.
10. **No automated test suite** for Apps Script (audit is closest live check).

---

## Top 10 fixes (prioritized)

1. **Weekly Screener CSV → Tab 6** + bulk deals → Tab 4; rerun **Rebuild scoring pipeline**; rerun **Scoring Engine 2.1 validation**.
2. **Paste all 14 `.gs` files** per `backend/automation/README.md`; deploy Web App; set `NEXT_PUBLIC_SHEETS_API_URL`.
3. **Install triggers**; run `runFullSystemAudit`; store PASS with Tab 6 ≥50 rows and avg DQ &gt;40.
4. **Daily Tab 22 snapshots** (8 AM already calls `snapshotAllBacktestLists_`) for 30+ days before trusting Tab 23.
5. **Set `RUN_PERPLEXITY_DAILY=false`** until Tab 7 volume and budget validated; keep RSS + rebuild.
6. **Retire or fix n8n Parse Report** JSON parsing; or disable n8n and use Apps Script 8 AM only.
7. **Update stale audits** (`FULL_SYSTEM_AUDIT.md`, `AUTOMATION_PIPELINE.md`) — remove 11b, fix rebuild diagram to 10→11 only.
8. **Align Tab 23 headers** in `SHEET_DEFS` with `BacktestEngine.gs`.
9. **Restrict triggers to weekdays** (`everyWeekdays` or skip in handler).
10. **Tighten recommendation fallback** — do not pad lists below quality gates for acceptance lists.

---

## What is complete (system-wide)

- Canonical scoring/recommendation logic in Apps Script (not duplicated in Python/frontend).
- 24-tab schema, scoring 2.1, six Tab 11 lists, DQ/alpha engines, institutional/technical modules.
- News → Perplexity → event tabs → rebuild pipeline.
- Phase 6 automation (6/8 AM) with institutional 9-section morning brief (`MorningBriefEngine.gs`, `docs/MORNING_BRIEF_TEMPLATE.md`, `/brief`, `?action=morning_brief`).
- Backtest engine + Web API `?action=backtest` + Next.js pages.
- Live audit + forensic scoring validation menus.
- Shared schemas and extensive `docs/`.

---

## What is partial

- Data ingestion (RSS yes; fundamentals/deals manual).
- Live sheet population and conviction distribution.
- Triggers/credentials (code yes; install per environment).
- n8n delivery vs Apps Script delivery.
- Backtest statistical validity.
- Documentation vs code (11b, stub Tab 21).

---

## What is missing

- Automated E2E test against a fixture sheet.
- Production monitoring/alerting beyond Tab 12 ALERTS LOG.
- Auto NSE filings/bulk ingest.
- Structured n8n Top 10 JSON.
- Institutional SLA, multi-user auth, audit trail immutability.

---

## Verdict criteria (evidence-based)

| Label | Criteria met by this repo |
|-------|---------------------------|
| **Prototype** | Core logic exists but no automation — **not** this project. |
| **Beta** | Full pipeline in source; requires manual data + deploy + credentials; validation shows sparse live scores; backtest biased without Tab 22 history. **Matches.** |
| **Production Ready** | Would require proven live audit PASS, Tab 6 populated, `snapshot_log` backtest, single delivery path, no critical doc/code drift — **not met**. |

---

## Deployment checklist

- [ ] Create Sheet **Indian Equity Intelligence**; run **Setup all sheet tabs**
- [ ] Paste **all** `backend/automation/*.gs` (14 files); authorize
- [ ] Import NSE universe + Screener fundamentals + cap classify
- [ ] Import Tab 4 deals / Tab 24 shareholding (optional but affects J/DQ)
- [ ] **Rebuild scoring pipeline**; run **Scoring Engine 2.1 validation**
- [ ] Set Script properties: `PERPLEXITY_API_KEY` (optional), `TELEGRAM_*`, `BRIEFING_EMAIL_TO`
- [ ] **Install triggers — 6 AM + 8 AM IST**; test **Run 6 AM / 8 AM now**
- [ ] Deploy Web App (`WebAppApi.gs`); set `NEXT_PUBLIC_SHEETS_API_URL`; `npm run build` in `frontend/`
- [ ] Run **full system audit** → PASS or documented PARTIAL
- [ ] Enable daily Tab 22 snapshots ≥30 days; rerun backtest in `snapshot_log` mode
- [ ] Decide single delivery path: Apps Script 8 AM **or** n8n (fix Parse JSON if n8n)
- [ ] Refresh `docs/FULL_SYSTEM_AUDIT.md` to match current `Code.gs`

---

*Generated from static production readiness audit. Re-run after live Sheet deploy and data imports to refresh scores.*
