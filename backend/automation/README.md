# Apps Script install

1. Open your Google Sheet → **Extensions → Apps Script**
2. Paste all `.gs` files in this folder (28 files) — **must include [`Code.gs`](Code.gs) (has `doGet`) and [`WebAppApi.gs`](WebAppApi.gs) (has `handleEquityIQApiGet_`)** → Save → Reload → authorize **Stock Tracker**
3. **Deploy → New deployment → Web app** (Execute as Me, Anyone) — see [`WEB_APP_API_REPAIR.md`](../../WEB_APP_API_REPAIR.md) if you see `Script function not found: doGet`
4. **Setup all sheet tabs** first

## Primary workflow (no manual Tab 10 entry)

1. Import **UNIVERSE** (NSE EQ or sample)
2. Merge Screener caps → **Classify cap segments**
3. Import **Screener fundamentals CSV → Tab 6 FUNDAMENTALS** (weekly)
4. **Data ingestion v2** — **Run ingestion v2** (NSE → Tabs 4, 6, 24; coverage Tab 33; history Tab 34). Target **80%+** universe coverage. Optional weekly Screener CSV for moat only. See [`docs/DATA_INGESTION_V2.md`](../../docs/DATA_INGESTION_V2.md).
5. **Rebuild scoring pipeline from UNIVERSE** — Tab 10 scores + Tab 11 six recommendation lists

## Menu functions

| Item | Function |
|------|----------|
| Setup all sheet tabs | `setupAllSheets` |
| **Rebuild scoring pipeline from UNIVERSE** | `rebuildScoringPipeline` |
| Sync Tab 10 from UNIVERSE only | `syncScoringFromUniverse` |
| Import full NSE universe (EQ) | `importNseSymbolList` |
| Import NSE SME / Emerge list | `importNseSmeSymbolList` |
| Classify cap segments | `classifyCapSegments` |
| Import sample universe | `importSampleUniverse` |
| **Run Peer Comparison Engine v2** | `runPeerComparisonEngineMenu` → Tabs 25, 35, Tab 10 Q/V/G |
| **Preview peer comparison** | `previewPeerComparison` |
| **Preview Analyst Note v2** | `previewAnalystNoteEngine` — full thesis/bull/bear/… sections |
| **Run Risk Engine v2** | `runRiskEngineMenu` → risk_score, risk_grade, reward_risk_ratio |
| **Preview Risk Engine** | `previewRiskEngine` |
| **Build portfolio models (Tab 30)** | `runPortfolioConstructionMenu` |
| **Preview ₹10L portfolio** | `previewPortfolioConstruction` |
| **Run data ingestion v2** | `runDataIngestionV2Now` → Tabs 4, 6, 24 + coverage % |
| **View ingestion coverage** | `viewIngestionCoverageReport` → Tab 33 |
| Backfill deals 30 days | `backfillBulkBlockDeals30Days` |
| Sync recommendations (Tab 11) | `syncRankedWatchlist` → `generateRecommendations_` (v2: DQ≥68, Conf≥58, rank≥38 — see [`docs/RECOMMENDATION_FILTERS.md`](../../docs/RECOMMENDATION_FILTERS.md)) |
| **Audit Tab 11 recommendations** | `auditTab11Recommendations` → **RECOMMENDATION REVIEW** sheet |
| **Audit last 100 recommendations** | `auditLast100Recommendations` → Tab **32. RECOMMENDATION AUDIT** |
| **Audit sector mapping** | `auditSectorMapping` → **SECTOR AUDIT** (goal 100% Tab 1→19 join) |
| **Repair sector mapping** | `repairSectorMapping` — canonicalize Tab 1 / 19 / 20 |
| Compute scoring helpers | `computeScoringHelpers` |
| Refresh watchlist prices | `refreshWatchlistPrices` |
| Open NSE filings helper | `openNseFilingsHelper` |
| Parse announcement keywords | `parseAnnouncementKeywords` |
| **Preview institutional flow scores** | `previewInstitutionalFlowScores` |
| **Preview technical momentum scores** | `previewTechnicalMomentumScores` |
| **Preview data quality scores** | `previewDataQualityScores` |
| **Preview alpha scores** | `previewAlphaScores` |
| Fetch RSS news / Tag news / Sync sources | `fetchNewsRss`, etc. |
| **Run news intelligence pipeline (Perplexity)** | `runNewsIntelligencePipeline` |
| **View last news pipeline log** | `viewLastNewsPipelineLog` |
| **Run backtest engine** | `runBacktestEngine` v4 → Tab 23 + 31 + 36 (snapshots only, paired α, validation report) |
| Snapshot all lists → Tab 22 | `snapshotAllBacktestLists_` |
| **Snapshot recommendation history → Tab 37** | `snapshotRecommendationHistory_` (also 8 AM after Tab 11 sync) |
| **History / validation API** | Web App `?action=recommendation_history` · `?action=recommendation_validation` (scorecards incl. `average_alpha_vs_sector_pct`) |
| **Scorecard audit tests** | `python scripts/test_recommendation_history_scorecard.py` |
| **Install automation (6 + 8 AM)** | `installDailyAutomationTriggers` |
| Run 6 AM refresh now | `run6amRefreshNow` |
| Run 8 AM briefing now | `run8amBriefingNow` |
| Preview morning brief JSON | `previewMorningBriefJson` |
| Daily maintenance (alias) | `dailyMaintenance` → `dailyDataRefresh6am` |
| **Run Scoring Engine 2.1 validation** | `runScoringEngineForensicValidation` → `SCORING_ENGINE_VALIDATION_JSON` |
| **Run full system audit** | `runFullSystemAudit` |
| **Show EquityIQ Web App URL** | `showEquityIQWebAppHelp` |

## Live system audit (~5 minutes)

1. Ensure UNIVERSE + **Rebuild scoring pipeline** have run at least once.
2. **Stock Tracker → Run full system audit**
3. Check the UI alert (PASS / PARTIAL / FAIL).
4. Open tab **AUDIT SNAPSHOT** (appended rows per run).
5. Apps Script → **Executions** for full `Logger.log` JSON.
6. Project settings → Script properties → **`LAST_SYSTEM_AUDIT_JSON`** (machine-readable snapshot).

The audit does **not** call Perplexity unless you invoke `runFullSystemAudit({ probePerplexity: true })` from the editor with `PERPLEXITY_API_KEY` set (optional minimal probe).

See [docs/E2E_LIVE_FUNCTIONALITY_AUDIT.md](../../docs/E2E_LIVE_FUNCTIONALITY_AUDIT.md).

## Script properties

| Property | Required | Purpose |
|----------|----------|---------|
| `PERPLEXITY_API_KEY` | For 6 AM events | Bearer token for `api.perplexity.ai` (Section 14 extraction) |
| `RUN_PERPLEXITY_DAILY` | Optional | Set `false` to skip Perplexity at 6 AM (RSS + rebuild still run) |
| `TELEGRAM_BOT_TOKEN` | For 8 AM briefing | Telegram Bot API |
| `TELEGRAM_CHAT_ID` | For 8 AM briefing | Target chat id |
| `BRIEFING_EMAIL_TO` | For 8 AM briefing | Comma-separated emails |
| `SEND_TELEGRAM` / `SEND_EMAIL` | Optional | Set `false` to disable a channel |
| `LAST_SYSTEM_AUDIT_JSON` | Written by audit | Latest `runFullSystemAudit` report (JSON) |

**Set in Apps Script:** Project settings → Script properties → Add `PERPLEXITY_API_KEY`.

See [docs/NEWS_TO_SCORING.md](../../docs/NEWS_TO_SCORING.md).

## Eligibility constants (top of Code.gs)

| Constant | Default | Meaning |
|----------|---------|---------|
| `MIN_MARKET_CAP_CR` | 500 | Minimum market cap (Cr) |
| `MAX_PLEDGE_PCT` | 30 | Max promoter pledge % |
| `HIGH_LIQUIDITY_MCAP_CR` | 5000 | Liquidity bypass threshold |
| `WATCHLIST_TOP_N` | 50 | Legacy cap (Tab 11 uses 6×10 lists) |
| `APPLY_AUTO_SUB_SCORES` | true | Helper → suggested C–J caps (Engine 2.0) |
| `APPLY_PERPLEXITY_SCORES` | false | Optional `enrichMoatFromNews_` (costly) |
| `PRICE_REFRESH_MAX_SYMBOLS` | 100 | Tab 2 refresh before scoring |

## Pipeline functions (internal)

| Function | Role |
|----------|------|
| `getEligibleUniverseRows_` | Filter Tab 1 |
| `syncScoringFromUniverse` | Write Tab 10 |
| `refreshWatchlistPricesSilent_` | Tab 2 top 100 symbols |
| `computeHelperSignalsInternal_` | Tab 10 cols N–R |
| `populateQuantitativeScores_` | Tab 6/2/4 → C–J inputs; M from tiered Engine 3.1 (`docs/CONVICTION_METHODOLOGY.md`) |
| `applyAutoSubScores_` | Event-based H,G from helpers N–Q |
| `applyRiskEngineBatch_` | Tab 10 risk_score/grade + rank cap; Tab 29 breakdown |
| `generateRecommendations_` | Tab 11 six Top-10 lists |
| `runNewsIntelligencePipeline` | Tab 7 → Perplexity → Tabs 15–20 → full rebuild |
| `applyNewsFlowToScores_` | Tab 7 materiality hints on Tab 10 |
| `fetchRecentNewsContext_` | Build headline payload for Perplexity |
| `writeExtractedEventsToSheets_` | Parse JSON → event tabs |

## Known limitations

- Full UNIVERSE eligible set can be 500+ Tab 10 rows (Sheets limit ~10M cells).
- Tab 6 **partial** auto-fill via NSE financial results + shareholding; **full** moat/valuation still needs weekly Screener CSV.
- Moat proxy capped at 7 until manual / Perplexity paste raises E.
- Tab **11b** deprecated; Tab **21** optional (evidence on Tab 11).

See [docs/TAB10_SCORING_MATRIX.md](../../docs/TAB10_SCORING_MATRIX.md).
