# Data Ingestion Engine v2

**Goal:** Eliminate routine manual dependence on **Tab 4** (deals), **Tab 6** (fundamentals), and **Tab 24** (shareholding). Target **≥80% weighted universe coverage** from public NSE pipelines.

**Engine:** `backend/automation/DataIngestionEngineV2.gs`  
**Primitives:** `DataIngestionEngine.gs` (NSE session, fetch, merge)  
**Schedule:** 6 AM IST via `runDataIngestionPipelineRouted_` (v2 on by default when file is deployed)

---

## Pipelines (automated)

| Dataset | Source | Target | Cadence | v2 batch/run |
|---------|--------|--------|---------|----------------|
| Fundamentals (partial) | NSE financial results + company info | Tab 6 | Daily | 90 + 40 symbols |
| Shareholding | NSE `corporate-share-holdings` | Tab 24 | Daily | 90 symbols |
| FII ownership | NSE shareholding categories | Tab 24 → Tab 6 | Daily | Same batch |
| DII ownership | NSE shareholding | Tab 24 | Daily | Same batch |
| MF ownership | NSE “Mutual Funds” category | Tab 24 | Daily | Same batch |
| Bulk deals | NSE historical `bulk_deals` | Tab 4 | Daily | Full 7d window |
| Block deals | NSE historical `block_deals` | Tab 4 | Daily | Full 7d window |
| Quarterly results | NSE `corporates-financial-results` | Tab 6 | Daily | 90 symbols |
| Corporate actions | NSE `corporates-corporateActions` | Tab 3 | Daily | 45 symbols |
| Market FII/DII | NSE `fiidiiTradeReact` | Tab 8 | Daily | 1 call |

**Optional (higher quality, not required daily):** Screener CSV → Tab 6 for moat, EV/EBITDA, PE vs 3Y (`importScreenerCsvToFundamentals`).

---

## Requirements checklist

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | Public source mapping | `getIngestionV2SourceRegistry_()` — 12 datasets with provider, endpoint, tab, cadence |
| 2 | Refresh cadence | Daily deals/macro; rotating batches (90/90/45/40) with **independent cursors** per dataset |
| 3 | Error handling | `ingestionV2FetchWithRetry_` (3 attempts); step-level ok/fail in summary; Tab 12 alerts on fatal error |
| 4 | Rate limiting | `INGESTION_V2_MAX_API_CALLS_PER_RUN_` (220); `NSE_REQUEST_DELAY_MS_` (400ms); budget gate per step |
| 5 | Data quality scoring | `ingestionV2ScoreDataset_` 0–100 per fetch; stored in Tab 34 + script state |
| 6 | Incremental updates | `ingestionV2RecordIncremental_` — MD5 hash + timestamp per symbol/dataset in `DATA_INGESTION_V2_STATE_JSON` |
| 7 | Historical retention | Tab **34. INGESTION HISTORY** (365d trim); Tab 24 capped at 8000 rows (latest quarters kept) |

---

## Coverage metric

**Weighted coverage %** = sum of dataset coverages × weights:

| Dataset | Weight |
|---------|--------|
| Fundamentals | 22% |
| Shareholding | 14% |
| FII / DII / MF | 12% / 12% / 8% |
| Bulk / Block | 8% / 8% |
| Quarterly | 10% |
| Corporate actions | 6% |

**Per-symbol detail:** Tab **33. INGESTION COVERAGE** (Y flags per dataset + symbol %).

**Target:** `INGESTION_V2_COVERAGE_TARGET_PCT_` = **80%**.

**Time to target:** ~500 eligible symbols ÷ ~90 per run ≈ **6 trading days** for shareholding/financials; deals cover watchlist names in **first run** (market-wide 7d window).

---

## Menu

| Action | Function |
|--------|----------|
| Run ingestion v2 | `runDataIngestionV2Now` |
| Run ingestion (routed) | `runDataIngestionNow` → v2 if enabled |
| View coverage % | `viewIngestionCoverageReport` |
| View v2 log | `viewLastDataIngestionV2Log` / `LAST_DATA_INGESTION_V2_JSON` |

Disable v2: script property `DATA_INGESTION_V2_ENABLED` = `false`.

---

## System audit

`auditStageDataIngestion_` includes `weightedCoveragePct`, `meetsCoverageTarget`, and `coverageBreakdown`. Status **PARTIAL** if coverage &lt; 80% even when row counts exist.

---

## Deploy

1. Paste `DataIngestionEngineV2.gs` + updated `DataIngestionEngine.gs`, `Code.gs`, `DailyAutomation.gs`, `runSystemAudit.gs`.
2. **Setup all sheet tabs** (adds Tabs 33–34).
3. **Run ingestion v2** daily (or rely on 6 AM trigger).
4. **View ingestion coverage %** after 5–10 sessions; confirm ≥80%.
5. Weekly Screener CSV optional for moat/valuation depth only.

---

## Python overflow

For runs exceeding Apps Script 6-minute limit:

```bash
cd backend/scripts && pip install -r requirements-ingestion.txt
python ingest_market_data.py --deals-days 30 --shareholding RELIANCE,TCS
```

See [DATA_INGESTION.md](./DATA_INGESTION.md) for v1 details and compliance note.
