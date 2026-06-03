# Current State Report — Indian Equity Intelligence Platform

**Phase 1: Full system review**  
**Date:** 2026-06-03  
**Repo layout:** Production structure — `backend/`, `frontend/`, `shared/`, `docs/` (see [ARCHITECTURE.md](ARCHITECTURE.md)).  
**Method:** Static review of repository code, schemas, workflows, prompts, and audit docs. No live Sheet or n8n execution in this pass. Where noted, **live deployment observations** from your recent audit run are included.

**Project objective (target):** A professional platform that fuses fundamentals, valuation, growth, quality, news, corporate actions, sector/macro/government/geopolitics, order wins, analyst/promoter/institutional signals, and technical momentum into **conviction scores**, **ranked recommendations**, **daily reports**, **watchlists**, and **risk alerts** — Bloomberg × Perplexity × Screener × Trendlyne quality for India.

**Architectural stance (agreed):** **Google Sheets + Apps Script + Perplexity = research engine.** **EquityIQ = visualization layer.** The web app must not replace universe management or scoring.

---

## Executive summary

| Dimension | Verdict | Notes |
|-----------|---------|--------|
| **Sheet + Apps Script core** | **Strong foundation** | 21-tab model, full rebuild pipeline, six Tab 11 lists, Screener import, RSS, optional Perplexity news pipeline, live audit, Web API for EquityIQ |
| **Scoring intelligence** | **Thin in practice** | Code complete; **~2% of Tab 10 rows with M>0** in your live sheet until Tab 6 + sectors + events are populated |
| **Daily 8 AM actionable report** | **Not met** | n8n sends truncated text; does not write Tabs 15–20 or structured Top 10 |
| **EquityIQ UI** | **Operational (demo + Sheets-first)** | 7-tab analyzer; reads Tab 10/11 via `WebAppApi.gs` when deployed |
| **Prompt library** | **Reference / manual** | Section 14 wired to automation; 01–13 mostly MCP/manual |
| **Docs vs code** | **Drift** | Several audits still describe removed Tab 11b and dead functions |

**Readiness vs vision:** The **plumbing and conviction engine architecture exist**; the **intelligence layer is data-starved** (empty Tab 6, sparse events, blank UNIVERSE sectors). Quality of recommendations will track Tab 6 + event tabs + sector join, not UI polish.

---

## Working

Fully operational when the user completes setup (paste Apps Script, authorize, run menu flows, set keys). Evidence: function wiring in `Code.gs`, `runSystemAudit.gs`, `WebAppApi.gs`.

### Google Sheet architecture

- **21 numbered tabs** defined in `SHEET_DEFS` (`Code.gs`) with matching CSV schemas under `shared/schemas/`.
- **Tab 8 vs Tab 20** separation documented (`docs/SHEET_SETUP.md`) — daily macro levels vs beneficiary map.
- **Tab 10 v2** — 10 conviction components (C–L), total M, helpers N–R, `data_gate_flag`, `quality_rank`, staleness fields (`shared/schemas/10-scoring-model.csv`, `shared/scoring/SCORING.md`).
- **Tab 11 v2** — six recommendation lists via `list_name` (`RECOMMENDATION_LIST_DEFS`, `generateRecommendations_()`).
- **Event tabs 15–20** schemas aligned with Perplexity Section 14 output.
- **Setup / migration** — `setupAllSheets()`, Tab 11 header migration menu, legacy 11b removal guidance (`docs/SHEET_SETUP.md`).

### Code.gs — core automation

- **Universe:** NSE EQ + SME CSV import, cap classification, sample 3-stock path, eligibility filters (`getEligibleUniverseRows_`, `isUniverseEligible_`).
- **Scoring pipeline:** `rebuildScoringPipeline()` — sync Tab 10 → refresh prices (top 100) → helpers → news hints → quantitative scores → auto sub-scores → Tab 11 recommendations.
- **Screener merge:** `importScreenerCsvToFundamentals` → Tab 6 + sector/mcap back to Tab 1 (`mergeScreenerGridIntoFundamentals_`, `applyScreenerSectorToUniverse_`).
- **Conviction math:** Capped sum to 100; script + formula reconciliation (`reconcileConvictionColumn_`, `applyConvictionFormulas_`).
- **Sector taxonomy:** `SECTOR_TAXONOMY_`, `normalizeSectorName_` for Tab 19 join; Section 12 prompt constrained (`backend/intelligence/sections/12-sector-strength.md`).
- **RSS:** `syncNewsSourcesToSheet` → `fetchNewsRss` → Tab 7; dedupe; `tagNewsSymbols()`; materiality alerts.
- **Perplexity (Apps Script):** `runNewsIntelligencePipeline` → Tabs 15–20, 9, 14 → full rebuild; logging via `LAST_NEWS_PIPELINE_SUMMARY`; menu **View last news pipeline log**.
- **Triggers:** `installDailyTriggers` — 06:00 `dailyMaintenance`, 15:45 `fetchNewsRss`.
- **Alerts:** `appendAlert` across flows → Tab 12.
- **Prices:** `GOOGLEFINANCE` on Tab 2 for watchlist/top symbols (`refreshWatchlistPricesSilent_`).

### runSystemAudit.gs

- **Live audit** — `runFullSystemAudit()`: setup headers, row counts, Tab 6 fundamentals stage, conviction distribution (F), sample symbols (C), universe sector empties, stale M detection, recommendation list stats, trigger check, Perplexity key presence.
- **Outputs:** UI alert, `AUDIT SNAPSHOT` sheet, `LAST_SYSTEM_AUDIT_JSON` script property.

### WebAppApi.gs (EquityIQ bridge)

- **`doGet`** actions: `health`, `top10`, `symbol`, `macro`.
- **Payloads:** Tab 10 scoring, Tab 6 fundamentals, Tab 2 price row, Tab 7 recent news, Tab 11 list membership, Tab 8 macro.
- **Menu:** Show EquityIQ Web App URL (`showEquityIQWebAppHelp`).

### Perplexity integration (canonical path)

- **Section 14** JSON contract (`backend/intelligence/sections/14-news-to-events-json.md`) implemented in `callPerplexityNewsExtraction_` / `writeExtractedEventsToSheets_`.
- **System rules** (`backend/intelligence/system.md`) — data honesty, labels, search directive.
- **Pipeline doc** (`docs/NEWS_TO_SCORING.md`) matches Apps Script order and sector join via UNIVERSE.

### RSS engine

- **Catalog:** `backend/config/news-sources.json` + `NEWS_SOURCES` in `Code.gs` (ET, Mint, Moneycontrol, BS, FE, Reuters, BBC, etc.).
- **Operational doc:** `docs/NEWS_FEEDS.md` — tiers, cadence, materiality rules.

### Recommendation engine (code path)

- **Six lists:** Immediate, 3-Month, 12-Month Compounders, Monopoly (moat threshold), Government Beneficiaries, Turnarounds.
- **Tier gates + per-list sort** (event vs fundamentals vs quality_rank) in `pickRecommendationCandidates_`.
- **Narratives:** `buildRecommendationNarrative_` — bull/bear/catalyst/evidence on Tab 11.

### EquityIQ web app

- **Single-file UI** (`frontend/equityiq.html`) — Bloomberg-style shell, 7 tabs, Chart.js, demo mode, export, settings, compare (3 symbols), cache, keyboard shortcuts.
- **Option C:** Sheets-first `analyzeSymbol` + one Perplexity enrichment call; Top 10 rail from `?action=top10`.
- **Hub** (`frontend/index.html`) + docs (`frontend/README.md`, `docs/EQUITYIQ_SHEETS_BRIDGE.md`).

### Prompt library (assets)

- **14 section files** + `prompts/README.md` tool mapping and paste-back targets.
- **Sections 09–13** for event-led v2 (filings, order book, promoter, sector, legacy dashboard copy).

### n8n (template)

- **Importable workflow** `backend/workflows/workflow-indian-equity-morning.json` — weekday 08:00 IST cron, reads Sheets tabs, Section 14 parse node, Perplexity brief, Telegram/email/Tab 12 log.
- **Setup guide** `backend/workflows/README.md`.

### Documentation & audits

- Operating cadence, data sources, cap segments, NSE filings workflow, delivery templates, Tab 10 matrix, E2E / full system audits (historical evidence; some stale — see Technical Debt).

---

## Partial

Implemented but dependent on data, credentials, caps, or strict filters. Typical “works in code, weak in sheet.”

### Scoring engine / conviction

- **Coverage:** Live audit showed **49 / 2,376** Tab 10 rows with `conviction_total > 0` (~2%) with **Tab 6 = 0** and **Tab 4 = 0** — engine runs but scores stay zero without fundamentals and events.
- **Auto sub-scores:** `applyAutoSubScores_` only lifts C,D,F,J,K from helpers; **E,G,H,I,L** need Tab 6/2/4 (`populateQuantitativeScores_`).
- **Horizon flags (Tab 10 cols 19–22):** Initialized false; rarely set by code — list filters underuse them.
- **Hard risk flags:** `pump_flag`, `sebi_investigation`, etc. not auto-populated from data.
- **Monopoly list:** Empty when all `business_moat` = 0 (no Tab 6).
- **Stale M:** RELIANCE/TCS showed M=45 with C–L=0 until rebuild + `reconcileConvictionColumn_` (fixed in repo; requires re-paste Apps Script).
- **Recommendation fallback:** `pickRecommendationCandidates_` can pad lists below filter quality when universe is sparse.

### Google Sheet tabs (population)

| Tab | Partial because |
|-----|-----------------|
| **1 UNIVERSE** | NSE import leaves sector/mcap blank until Screener merge |
| **2 PRICE** | Only ~100 symbols refreshed; DMA/RSI/MACD columns often empty |
| **3 ANNOUNCEMENTS** | Parser suggests via Tab 12 only — does not fill Tab 15/16 |
| **4 BULK DEALS** | Manual / empty — institutional flow (L) stays 0 |
| **5 INSIDER/PROMOTER** | Schema only — **no Apps Script reader/writer** |
| **6 FUNDAMENTALS** | Weekly manual Screener CSV (4–5 cap-band exports for full universe) |
| **7 NEWS** | RSS works; symbol column sparse until `tagNewsSymbols`; default medium/neutral materiality |
| **15–18** | Only after Perplexity news pipeline + eligible symbols |
| **19–20** | Replaced each Perplexity run; need sector names matching taxonomy |
| **21 ANALYSIS_OUTPUT** | No pipeline writer — optional legacy |

### Perplexity integration

- **Requires** `PERPLEXITY_API_KEY`; optional `RUN_PERPLEXITY_DAILY`.
- **`APPLY_PERPLEXITY_SCORES = false`** — `enrichMoatFromNews_` off by default (cost).
- **Caps:** 30 headlines / 48h lookback per run; symbols not on eligible UNIVERSE dropped.
- **Hallucination risk** — documented; human review via Tab 12.
- **n8n path:** Parses Section 14 for **briefing context only** — does **not** write Tabs 15–20 (Apps Script owns that at 06:00).
- **Sections 01–13:** Manual Cursor/MCP — not scheduled in Apps Script.

### RSS engine

- **Silent failure** if Tab 13 empty (no sources synced).
- **Per-feed skip** on HTTP errors — batch continues without alerting loudly.
- **Weak score linkage:** medium materiality defaults → small boosts to Tab 10 C/D/F.
- **x-curated** source has no `rss_url` — skipped.

### Recommendation engine (output quality)

- **Mechanical Top 10 rows:** Possible after rebuild — **PARTIAL** (`docs/E2E_LIVE_FUNCTIONALITY_AUDIT.md`).
- **Actionable Top 10 (conviction + fundamentals + events):** **NO** until Tab 6 and event tabs populated.
- **Audit sample symbols (4):** Can show M>0 while bulk sheet is ~98% zeros — audit C stage is not full-distribution (F stage added in repo for that).

### runSystemAudit.gs

- **PARTIAL overall** normal when Tab 6 empty, Tab 11 legacy headers, or sparse conviction.
- **Perplexity probe** optional — may incur API cost.
- **`eval`-based** function existence check.

### n8n workflow

- **Template only** until `CONFIGURE_*` credentials and `SHEET_ID` set (`templateCredsSetupCompleted: false`).
- **Hybrid timing:** 06:00 Apps Script vs 08:00 n8n — user must understand division of labor.
- **Reads limited tabs** (8, 11, 15, 7) — not Tab 10 conviction grid or 16/19/20 in morning context.
- **NSE CSV node disabled** (403 risk).
- **Morning brief:** Inline prompt, not full `backend/intelligence/system.md` + sections 01–04 chain.

### EquityIQ

- **Requires deployed Web App** URL in settings.
- **Perplexity from browser** may hit CORS — falls back to demo enrichment.
- **Does not score or rank** — displays sheet brain; predictions are enrichment layer.
- **Peer radar in demo** uses synthetic peers.

### Daily opportunity reports / portfolio / risk

- **Telegram/email:** Unstructured excerpt (3500 chars) — not structured daily opportunity JSON.
- **Portfolio watchlists:** Tab 11 lists exist in sheet; no portfolio P&L or position tracking tab.
- **Risk alerts:** Tab 12 high-materiality news + audit/system alerts — not a full risk engine (VaR, drawdown, position limits).

### Vision gap (product feel)

- Not yet **Bloomberg-terminal breadth** (no fixed income, futures, depth, L2).
- Not **TradingView**-grade charting (EquityIQ uses Chart.js + optional Perplexity OHLCV).
- **Screener/Trendlyne-style screeners** live in Sheet logic, not a dedicated screener UI with 50+ filters.

---

## Broken

Not functioning as designed, orphaned, or explicitly failing E2E criteria.

### Delivery & morning report

- **Structured 8 AM Top 10 to Telegram/email:** **FAIL** — n8n `Parse Report` uses `content.substring(0, 3500)` with explicit `TODO` for JSON parse (`backend/workflows/workflow-indian-equity-morning.json`).
- **n8n does not update Tab 10/11** at 08:00 — append Tab 12 log only.
- **Actionable daily opportunity report** without user discipline on Tab 6 + rebuild: **FAIL** per audits and live conviction distribution.

### Orphaned / no-op code paths

- **`syncAnalysisOutput()`** — Alert-only stub; **not on menu**; Tab 21 never auto-filled (`Code.gs`).
- **Tab `5. INSIDER/PROMOTER`** — In `SHEET_DEFS` only; **no automation** (promoter activity uses Tab 18).
- **Removed but still documented:** Tab **11b** `refreshDashboardViewsInternal_`, `pickBoardCandidates_` — **not in current `Code.gs`**; multiple docs still reference them as live.

### Unused configuration

- **`WATCHLIST_TOP_N`**, **`ANALYSIS_OUTPUT_TOP_N`** — defined, never used in `.gs`.
- **`SCREENER_API_DELAY_MS` / `SCREENER_API_MAX_PER_RUN`** — no Screener API fetch implemented despite constants.

### Documentation-as-truth errors (treat as broken UX for operators)

- `docs/FULL_SYSTEM_AUDIT.md`, `docs/FULL_FUNCTIONALITY_VERIFICATION_AUDIT.md`, `docs/E2E_LIVE_FUNCTIONALITY_AUDIT.md` — stages for **11b**, `syncAnalysisOutput` stubs, `refreshDashboardViews` in rebuild diagram.
- `docs/AUTOMATION_PIPELINE.md` — Stage 4 still mentions writing to **11b** and optional `refreshDashboardViews` web call.
- `docs/EVENT_LED_ARCHITECTURE.md`, `backend/intelligence/sections/13-dashboard-views.md` — Tab 11b board model.
- `shared/schemas/11-dashboard-views.csv` — orphaned schema.

### Security / deployment (if misconfigured)

- **Web App `doGet` with “Anyone”** — no auth token; public read of sheet JSON if URL leaked (`WebAppApi.gs`).

---

## Technical Debt

Hacks, workarounds, duplication, stale logic, and temporary fixes.

### Code.gs monolith & duplication

- **~3,500+ lines**, 100+ functions — high coupling; `WebAppApi.gs` and `runSystemAudit.gs` depend on shared globals.
- **Dual conviction on Tab 10** — formulas plus script totals plus reconcile pass — audit had to add `m_stale` detection.
- **`getRange(row, col, numRows, cols)` bugs** — fixed in `writeAuditSnapshot_` and elsewhere; pattern risk if new `setValues` added wrong.
- **Duplicate news config** — `NEWS_SOURCES` in code vs `backend/config/news-sources.json` — manual sync.
- **`eval` in audit** — `auditFunctionExists_` (`runSystemAudit.gs`).
- **O(n×m) news tagging** — full universe × all Tab 7 rows in `tagNewsSymbols`.
- **Recommendation fallback** weakens list quality when filters empty.
- **`computeHelperSignals`** alias not on menu — redundant with `computeScoringHelpers`.
- **Daily branch:** With Perplexity key, `dailyMaintenance` runs full news API path instead of lighter rebuild-only — cost/latency surprise.

### Scoring & data model

- **NSE-only universe** without Screener → blank sector breaks Tab 19 join (documented; fix is operational).
- **Tab 3 announcements** — keyword parser writes alerts, not structured Tab 15 rows.
- **Tab 10 columns** with schema but no writers (horizons, pump flags, positive_signal_count).
- **Perplexity replaces Tab 19/20** each run — no merge/history of sector ranks.
- **Allow universe without mcap** (`ALLOW_UNIVERSE_WITHOUT_MCAP`) — inflates Tab 10 row count with unscored names.

### Integrations

- **Two Perplexity pipelines** — Apps Script writer vs n8n context-only Section 14 — easy to confuse which owns truth.
- **n8n morning prompt** not aligned with full prompt library.
- **EquityIQ client-side API key** in `localStorage` — acceptable for personal use; not enterprise pattern.
- **No Tab 22 backtest log** — validation phase (2–3 week Top 10 tracking) not scaffolded in repo.
- **No Screener API automation** — weekly CSV manual export only.

### Documentation drift

- **Five+ audit/setup files** contradict current Tab 11 six-list model.
- **README** still lists optional “Perplexity sections 1–4” without emphasizing Tab 6 as P0.
- **FULL_SYSTEM_AUDIT** readiness percentages (~45–62%) may mislead if Tab 6 empty — code-ready ≠ signal-ready.

### Dead / stale references (cleanup backlog)

| Item | Status in code today |
|------|----------------------|
| `refreshDashboardViews` / `11b` | Removed from `Code.gs` |
| `buildSectorRankMap_` / `lookupSectorRank_` | Removed (audits still mention) |
| `pickBoardCandidates_` | Removed |
| `syncAnalysisOutput` writing Tab 21 | Never implemented; stub only |
| `11-dashboard-views.csv` | Orphan file |

---

## Subsystem scorecard (vs project objective)

| Capability | Working | Partial | Broken |
|------------|---------|---------|--------|
| Universe management | Import, classify, eligibility | Sector/mcap until Screener | — |
| Fundamentals / valuation / quality | Screener → Tab 6 → E,G,H | Tab 6 empty in deployment | Tab 5 unused |
| News / corporate actions | RSS → Tab 7 | Tagging, materiality weak | Tab 3 → not Tab 15 |
| Sector / macro / govt / geo | Perplexity → 19/20/9/14 | Join needs sector on Tab 1 | — |
| Order wins / analyst / promoter | Perplexity → 15–18 | Empty until pipeline runs | Tab 5 orphan |
| Institutional flow | Tab 4 + Tab 6 FII | Both often empty | — |
| Technical momentum | Tab 2 partial GOOGLEFINANCE | 100 symbols; thin columns | — |
| Conviction scores | Formula + pipeline | ~2% non-zero M (live) | — |
| Ranked recommendations | Tab 11 six lists | Low conviction / empty lists | — |
| Daily opportunity reports | Apps Script 06:00 rebuild | n8n text excerpt | Structured JSON delivery |
| Portfolio watchlists | Tab 11 lists | No positions/P&L | — |
| Risk alerts | Tab 12 alerts | Not comprehensive risk system | — |
| Bloomberg-like UI | EquityIQ 7 tabs | Sheets API + CORS setup | Not a terminal replacement |
| Live audit | `runFullSystemAudit` | PARTIAL normal | — |

---

## Observed live deployment (your audit, 2026-06-03)

For grounding — not re-run in this review:

- Tab 10: **2,376** rows; **49** with M>0; max M **51**
- Tab 6: **0** rows; Tab 4: **0**; Tab 2: **50** rows
- Tab 11: **50** rows; legacy header mismatch until **Fix Tab 11 headers**
- Perplexity news pipeline: **success** (order_book, sector, macro counts in log)
- Triggers: **2** (daily + RSS)
- Sample symbols: **4/4** on Tab 10 with M>0; **sector join failed** (empty UNIVERSE sector)
- Overall audit: **PARTIAL**

This matches **code works, data brain underfed**.

---

## Recommended priority (aligns with Option C)

1. **Populate Tab 6** (Screener weekly) + **sectors on Tab 1** — same session.
2. **Rebuild scoring pipeline** — expect conviction distribution to move from ~2% toward majority of Screener-covered names.
3. **Run news pipeline** on schedule; verify Tabs 15–20 non-empty for watchlist names.
4. **Validate 2–3 weeks** — track Top 10 vs Nifty (consider Tab 22 backtest log — not in repo yet).
5. **Deploy `WebAppApi.gs`** — connect EquityIQ.
6. **Fix n8n `Parse Report`** — structured JSON per `docs/DELIVERY_TEMPLATES.md`.
7. **Doc cleanup** — retire 11b references in audits and `AUTOMATION_PIPELINE.md`.

---

## Key files reviewed

| Area | Paths |
|------|--------|
| Apps Script | `backend/automation/Code.gs`, `runSystemAudit.gs`, `WebAppApi.gs` |
| Sheets | `shared/schemas/*.csv`, `docs/SHEET_SETUP.md`, `docs/USER_SETUP.md`, `shared/scoring/SCORING.md` |
| Perplexity / news | `docs/NEWS_TO_SCORING.md`, `backend/intelligence/sections/14-news-to-events-json.md`, `backend/intelligence/system.md` |
| RSS | `backend/config/news-sources.json`, `docs/NEWS_FEEDS.md` |
| Audits | `docs/E2E_LIVE_FUNCTIONALITY_AUDIT.md`, `docs/FULL_SYSTEM_AUDIT.md`, `docs/FULL_FUNCTIONALITY_VERIFICATION_AUDIT.md`, `docs/TAB10_SCORING_MATRIX.md` |
| n8n | `backend/workflows/workflow-indian-equity-morning.json`, `backend/workflows/README.md` |
| UI | `frontend/equityiq.html`, `frontend/index.html`, `docs/EQUITYIQ_SHEETS_BRIDGE.md` |
| Prompts | `prompts/README.md`, `backend/intelligence/sections/01`–`14` |

---

*This report is the Phase 1 deliverable. Update after Tab 6 import and a second full system audit for measured conviction coverage.*
