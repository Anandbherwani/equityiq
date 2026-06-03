# Data Ingestion — Automatic Pipelines

**Goal:** Cut Scoring Engine 2.1 **fallback dependence by ~80%** by filling Tabs **4**, **6**, and **24** from public NSE (and optional BSE) sources instead of empty-sheet defaults.

**Engine:** `backend/automation/DataIngestionEngine.gs` + **v2** [`DataIngestionEngineV2.gs`](./DATA_INGESTION_V2.md)  
**Schedule:** 6 AM IST daily (`dailyDataRefresh6am` → `data_ingestion` via `runDataIngestionPipelineRouted_`)  
**Manual:** **Stock Tracker → Data ingestion (NSE)** → **Run ingestion v2** / **View ingestion coverage %**

---

## What gets populated

| Data type | Primary source | Tab | Scoring impact |
|-----------|----------------|-----|----------------|
| Bulk deals | NSE historical + snapshot | **4** | Institutional flow J (bulk_buy/sell) |
| Block deals | NSE historical + snapshot | **4** | Institutional flow J (block_buy/sell) |
| FII/DII on deals | Client-name classifier | **4** | `fii_deal_buy`, `dii_deal_buy` |
| Shareholding pattern | NSE `corporate-share-holdings` | **24** | FII/DII/MF/promoter **deltas** |
| FII / promoter % (snapshot) | Tab 24 → merge | **6** cols 11–12 | DQ + weak institutional tilt |
| Quarterly results (partial) | NSE `corporates-financial-results` | **6** | ROE/ROCE/rev/PAT YoY when empty |
| Corporate actions | NSE `corporates-corporateActions` | **3** | Announcements / event hints |
| FII/DII market net | NSE `fiidiiTradeReact` | **8** | Macro bias when symbol data thin |

**Still manual (higher quality):** Screener CSV → Tab 6 for moat, EV/EBITDA, PE vs 3Y, sector normalization at scale.

---

## Public sources (evidence table)

| # | Dataset | Source | Endpoint / method | Refresh cadence | Reliability | Rate limits |
|---|---------|--------|-------------------|-----------------|-------------|-------------|
| 1 | Shareholding patterns | **NSE India** | `GET /api/corporate-share-holdings?index=equities&symbol={SYM}` | Daily batch (~35 symbols/run) | **Medium** — needs session cookie; symbol coverage EQ only | ~3 req/s effective; 400ms delay in engine |
| 2 | Mutual fund ownership | **NSE** (category “Mutual Funds” in shareholding) | Same as #1 → `mf_pct` on Tab 24 | Same | Medium | Same |
| 3 | FII ownership | **NSE** shareholding + deal tags | Tab 24 `fii_pct`; Tab 4 FII client classifier | Daily / deal days | Medium | Same |
| 4 | DII ownership | **NSE** shareholding (insurance/banks/domestic inst.) | Tab 24 `dii_pct` | Daily batch | Medium | Same |
| 5 | Bulk deals | **NSE** | `GET /api/historical/bulk-deals-type?optionType=bulk_deals&from=DD-MM-YYYY&to=DD-MM-YYYY` | Daily 7d window; weekly 30d backfill menu | **Medium–High** on trading days | Session + date format strict |
| 6 | Block deals | **NSE** | `optionType=block_deals` | Same | Medium–High | Same |
| 7 | Quarterly results | **NSE** | `GET /api/corporates-financial-results?index=equities&symbol={SYM}` | Daily batch (~35/run) | **Low–Medium** — JSON shape varies | Per-symbol |
| 8 | Corporate actions | **NSE** | `GET /api/corporates-corporateActions?index=equities&symbol={SYM}` | Daily batch | Medium | Per-symbol |
| 9 | Market FII/DII flow | **NSE** | `GET /api/fiidiiTradeReact` | Daily 6 AM | Medium | 1 call/run |
| 10 | Full fundamentals | **Screener.in** (export CSV) | Menu: Import Screener CSV | **Weekly** | **High** (user export) | Human; no API in engine |
| 11 | Universe / ISIN | **NSE archives CSV** | `EQUITY_L.csv` | On demand | High (CSV) | Low |
| 12 | BSE bulk (fallback) | **BSE API** | Optional Python `ingest_market_data.py` | Weekly | Medium | Documented in script |

**Session bootstrap:** `GET https://www.nseindia.com` → `Set-Cookie` cached 25 min (`NSE_SESSION_CACHE_JSON`).

**Archives CSV** (`archives.nseindia.com`) does not require cookies; **www.nseindia.com/api** does.

---

## Pipeline behaviour

### Daily 6 AM (`runDataIngestionPipeline_`)

1. FII/DII macro → Tab 8  
2. Bulk + block deals (last **7** days) → Tab 4; trim rows &gt; **120** days  
3. Shareholding batch (**35** symbols, rotating cursor) → Tab 24 + patch Tab 6 promoter/FII  
4. Financial results batch (**35** symbols) → Tab 6 partial  
5. Corporate actions (**25** symbols) → Tab 3  

Then existing steps: prices → rebuild / Perplexity.

**Full universe coverage:** ~500 symbols ÷ 35 ≈ **15 trading days** for one full Tab 24/6 NSE pass. Run **Backfill deals 30 days** once after deploy.

### Symbol queue priority

1. Tab 10 by conviction (desc)  
2. Tab 11 recommendation symbols  
3. UNIVERSE (mcap ≥ `MIN_MARKET_CAP_CR` or provisional flag)

Cursor: Script property `DATA_INGESTION_SYMBOL_CURSOR`.

---

## Reducing fallback dependence (~80%)

| Before (typical) | After sustained ingestion |
|------------------|---------------------------|
| Tab 4 empty → bulk/block signals missing | 7–30d deal history for watchlist names |
| Tab 24 &lt;2 snapshots → no FII/DII/MF deltas | New quarterly row per run; deltas after 2nd visit |
| Tab 6 empty → pillars C–G fallbacks | NSE fills ROE/ROCE/YoY + holdings; Screener fills rest |
| `institutional_flow` source `missing_all` | `tab4_deals` / `tab24_shareholding` dominant |
| DQ institutional dimension 0 | +25 pts when Tab 24 present (`DataQualityEngine.gs`) |

**Measure:** Run **Scoring Engine 2.1 validation** and **full system audit** before/after; target **≥40%** Tab 10 rows with M&gt;0 and Tab 4/24 row counts &gt;0.

---

## Operations

| Action | Menu / trigger |
|--------|----------------|
| Run now | **Data ingestion → Run ingestion now** |
| Deal backfill | **Backfill bulk/block deals 30 days** |
| Log | **View last ingestion log** / property `LAST_DATA_INGESTION_JSON` |
| Weekly Screener | **Import Screener CSV to Tab 6** (still required for moat/valuation depth) |

### Python batch backfill (optional)

For large backfills when Apps Script 6-minute limit bites:

```bash
cd backend/scripts
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-ingestion.txt
python ingest_market_data.py --deals-days 30 --shareholding RELIANCE,TCS,INFY
```

Outputs CSV under `data/exports/` for audit, or set `GOOGLE_SHEETS_ID` + service account to push (see script header).

---

## Failure modes

| Symptom | Cause | Mitigation |
|---------|-------|------------|
| HTTP 403 on NSE API | Cookie expired / IP throttle | Retry; wait 15 min; use Python backfill |
| Empty deal array | Non-trading day or wrong date format | Use `DD-MM-YYYY`; run on weekday |
| Shareholding 404 | SME / delisted / wrong symbol | Skip; rely on Screener for that symbol |
| Tab 6 still sparse | NSE JSON missing growth fields | Weekly Screener CSV |
| Slow 6 AM | 70+ API calls | Lower `INGESTION_*_PER_RUN_` in `DataIngestionEngine.gs` |

---

## Files

| File | Role |
|------|------|
| `DataIngestionEngine.gs` | NSE fetch, merge, 6 AM hook |
| `DailyAutomation.gs` | `data_ingestion` step |
| `InstitutionalFlowEngine.gs` | Consumes Tab 4 / 24 |
| `DataQualityEngine.gs` | DQ gates use Tab 4/24 presence |
| `backend/scripts/ingest_market_data.py` | Optional bulk backfill |
| `docs/INSTITUTIONAL_FLOW_ENGINE.md` | How J uses ingested data |

---

## Compliance note

NSE/BSE data is subject to **exchange terms of use**. This project uses public endpoints for **personal research** automation. Do not redistribute raw feeds commercially without a data license.
