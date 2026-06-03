# EquityIQ v1.0-beta — Release Notes

**Tag:** `v1.0-beta`  
**Release commit:** `6a08811987ce56003f474a74e416e9e4dd22b492`  
**Date:** 4 June 2026  
**Product:** Indian Stock Intelligence / EquityIQ — Indian equity research terminal

---

## Overview

v1.0-beta is the first integrated release of the Stock automation monorepo: Google Apps Script research engines, permanent recommendation history, validation scorecards with alpha tracking, Backtest v4 snapshot methodology, and a production Next.js frontend deployable to Vercel.

**Build status:** `READY_FOR_VERCEL = YES` (see `docs/BUILD_VERIFICATION_REPORT.md`).

---

## New Features

### Recommendation History

- **RecommendationHistoryEngine.gs** (v1.1) — daily 8 AM append-only snapshots to **Tab 37**
- Fields captured: symbol, list, conviction, thesis, target, confidence, risk, category
- **History Explorer** (`/history`) — filter by category/symbol, live returns from entry
- API: `?action=recommendation_history`
- Dedup by `date|symbol|list_name`; explicit categories (immediate, theme, SME, IPO, etc.)
- Menu: **Snapshot history → Tab 37 (today)**

### Validation Dashboard

- **Track record** page (`/validation`) — scorecards per recommendation category
- Metrics: hit rate, average return, **alpha vs Nifty**, **alpha vs sector**
- Best and worst picks per category with entry date and live P&amp;L
- **History health** panel (Tab 37 existence, last snapshot, blank categories)
- **Data coverage** pillar scorecards (nine pillars, stale/null/confidence %)
- API: `?action=recommendation_validation` · `?action=data_coverage` · `?action=recommendation_history_health`

### Backtest v4

- **BacktestEngine** v4.0 — **snapshot-only** (no synthetic cohorts)
- Uses **Tab 22** historical list snapshots vs Nifty 50 and sector benchmarks
- Horizons: 1M, 3M, 6M, 12M across six Tab 11 lists
- Metrics: hit rate, alpha, Sharpe, Sortino, max drawdown
- Frontend **Performance** page (`/backtest`) with validation report UI
- `docs/BACKTEST_V4_STATUS.md` generator script for audit exports

### Frontend Terminal

- **Next.js 15** App Router — dark-first Bloomberg-style UI
- **Dashboard** — market summary (5 indices) + Top 10 immediate opportunity grid
- **Recommendations** — six curated lists with analyst-note cards (BUY/WATCH/AVOID)
- **Stock detail** — hero metrics, thesis stack (bull/bear/catalysts/risks/peers/theme)
- **Global search** — symbol + company autocomplete, recent searches, keyboard nav (⌘K)
- **Compare**, **Peers**, **Watchlist**, **Portfolio**, **Morning Brief**, **Alerts**
- Server preview mode when API URL missing or demo enabled (`server-preview.ts`)
- Skeleton loaders, empty states, API-unavailable banners

### Automation

- **DailyAutomation.gs** — 6 AM maintenance + **8 AM** briefing pipeline
- 8 AM sequence: scoring → Tab 11 lists → **Tab 37 history snapshot** → morning brief
- **installDailyTriggers** for weekday IST runs
- **runSystemAudit.gs** — stages I (Tab 37 health) and J (pillar coverage)
- **n8n** workflow template + **backend/workflows** for optional orchestration
- Engines: SME Alpha, IPO Intelligence, Data Coverage, Theme Intelligence, Morning Brief, Portfolio Construction

### Scoring Engine 2.1

- Tab **10** conviction model — fundamentals, growth, valuation, sector, news, technical, institutional, moat
- **Quality pillars** and **data quality %** with gate flags
- **AlphaEngine** — alpha score and classification on Tab 10
- **RiskEngine** — risk grade, reward/risk ratio
- **ConvictionEngine 3.0** — opportunity rank, relative quality/valuation/growth vs sector
- Six **Tab 11** recommendation lists (immediate, 3M, compounders, monopoly, gov, turnaround) + theme/SME/IPO lists
- **AnalystNoteEngine** — structured thesis, bull/bear, catalysts, risks on Tab 11
- **RecommendationAuditEngine** — Tab 32 audit trail for list quality

---

## Repository contents (v1.0-beta)

| Area | Highlights |
|------|------------|
| `backend/automation/` | 28+ `.gs` engines, `WebAppApi.gs`, `Code.gs` sheet defs |
| `frontend/` | EquityIQ UI (105 files) |
| `shared/schemas/` | CSV headers incl. Tab 37 recommendation history |
| `docs/` | Architecture, audits, engine completion reports |
| `scripts/` | Recommendation history scorecard tests (8 passing) |

---

## Known Limitations

### Live data and deployment

- **Google Sheet not bundled** — Tab 37/22 population requires your live spreadsheet and deployed Apps Script Web App
- **`NEXT_PUBLIC_SHEETS_API_URL`** must be set on Vercel (or saved in Settings) for live data; preview/demo data ships without it
- **30+ days of Tab 37 history** recommended before validation scorecards are statistically meaningful
- **Tab 22 snapshots** required for non-empty backtest dashboards (daily 8 AM + manual backtest run in Sheets)

### Backtest and validation

- Backtest v4 returns **insufficient_snapshots** until Tab 22 accumulates enough daily rows
- Live alpha vs sector depends on sector benchmark data availability per symbol
- Repo CSV exports may be header-only until you export from production sheet

### Automation and ops

- Triggers and credentials (**Perplexity**, Telegram, etc.) are **operator-configured** — not auto-provisioned
- **n8n path** is optional; primary path is Apps Script 6/8 AM
- **Screener CSV import** still needed for full fundamentals/moat coverage alongside NSE ingestion
- System audit may show **PARTIAL** until ingestion and pillars reach ≥80% on your sheet

### Frontend

- All app routes are **server-rendered on demand** (cookies for theme/demo) — compatible with Vercel, not static export
- Light theme supported but optimized for **dark terminal** UX
- Some backend API actions (`sme_alpha`, `ipo_intelligence`, `system_audit`) are not yet wired to dedicated UI pages

### Documentation

- Legacy docs still mention deprecated **Tab 11b** in places — runtime code does not use 11b
- **Production Candidate 96/100** is a static code assessment, not a live sheet certification

---

## Roadmap to Production

Target: **Production Ready (98+)** with live proof on your spreadsheet.

### Phase 1 — Deploy and wire (week 1)

| Step | Action |
|------|--------|
| 1 | Paste all `backend/automation/*.gs` into Apps Script; deploy **Web App** (Execute as Me, Anyone) |
| 2 | **Setup all sheet tabs**; fix Tab 11 headers if migrating |
| 3 | Set `NEXT_PUBLIC_SHEETS_API_URL` on Vercel; root directory `frontend` |
| 4 | Run **installDailyAutomationTriggers** |
| 5 | Import universe + **Rebuild scoring pipeline**; sync Tab 11 |

### Phase 2 — Data quality (weeks 1–4)

| Step | Action |
|------|--------|
| 1 | Weekly **Screener CSV → Tab 6**; run **Data ingestion v2** |
| 2 | Target **≥80%** pillar coverage on `?action=data_coverage` |
| 3 | `runFullSystemAudit` → resolve FAIL stages (ingestion, pillars, history) |
| 4 | Confirm Tab 37 health **PASS** after each 8 AM run |

### Phase 3 — Track record (days 1–30+)

| Step | Action |
|------|--------|
| 1 | Allow **30+ trading days** of Tab 37 snapshots |
| 2 | **Snapshot all lists → Tab 22** daily (8 AM automation) |
| 3 | Review **Validation** dashboard for hit rate and alpha trends |
| 4 | Run **Backtest engine** in Sheets; export `BACKTEST_V4_STATUS.md` |

### Phase 4 — Production ready gate

| Criterion | Target |
|-----------|--------|
| `runFullSystemAudit` | **PASS** (or documented remediation) |
| Ingestion coverage | Weighted average **≥80%** |
| Tab 37 health | **PASS** for 14 consecutive trading days |
| Backtest validation | Overall verdict **≠ FAIL** |
| Frontend | Live API + preview fallback tested on mobile |

### Suggested next release

- **v1.0** — production ready after live sheet proof  
- **v1.1** — live index feed on dashboard, expanded search universe from Tab 1 export  

---

## Upgrade / install

```bash
git checkout v1.0-beta
cd frontend && npm install && npm run build
```

Deploy Apps Script from `backend/automation/` per `docs/USER_SETUP.md` and `backend/automation/README.md`.

---

## Links

| Document | Purpose |
|----------|---------|
| `docs/BUILD_VERIFICATION_REPORT.md` | Vercel build proof |
| `docs/FINAL_DEPLOYMENT_AUDIT.md` | Deployment audit |
| `docs/PRODUCTION_CANDIDATE_REPORT.md` | 96/100 component scores |
| `docs/RECOMMENDATION_HISTORY.md` | Tab 37 engine reference |
| `docs/COMMIT_REPORT.md` | Release commit `6a08811` |

---

## Tag

```bash
git fetch --tags
git checkout v1.0-beta
# Release commit: 6a08811987ce56003f474a74e416e9e4dd22b492
```

**Tag `v1.0-beta` points at commit `6a08811` (EquityIQ v1.0-beta).**
