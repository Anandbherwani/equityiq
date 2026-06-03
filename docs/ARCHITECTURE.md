# Production architecture

**Source of truth:** the live **Google Sheet** (Indian Equity Intelligence).  
**Rule:** scoring, eligibility, and automation logic live **only** in `backend/automation/*.gs`. The frontend **reads** via the Web App API; it does **not** reimplement conviction math.

```
Google Sheets                    ← Data layer (source of truth)
        ↓
backend/automation (Apps Script) ← Automation layer
        ↓
backend/intelligence (Perplexity prompts) + API calls in Code.gs
        ↓
Scoring + recommendations in Code.gs  ← Decision layer (canonical)
        ↓
frontend/ (EquityIQ)               ← Presentation layer
        ↑
backend/workflows (n8n)            ← Delivery orchestration (read-only + notify)
```

## Directory map

| Path | Layer | Role |
|------|--------|------|
| `shared/schemas/` | Data | Column contracts for each tab (import headers) |
| `shared/scoring/SCORING.md` | Decision | **Documentation** of caps/formulas (mirrors Code.gs) |
| `shared/api/webapp-v1.json` | Data/API | JSON contract for `doGet` (implementation in `WebAppApi.gs`) |
| `backend/automation/` | Automation + Decision | `Code.gs`, `runSystemAudit.gs`, `WebAppApi.gs` |
| `backend/intelligence/` | Intelligence | `system.md`, `sections/*` Perplexity prompts |
| `backend/config/` | Automation | `news-sources.json` (mirror of `NEWS_SOURCES` in Code.gs) |
| `backend/workflows/` | Automation | n8n morning pipeline |
| `frontend/` | Presentation | `equityiq.html`, hub `index.html` |
| `docs/` | — | Setup, audits, operating cadence |

## What not to duplicate

| Logic | Canonical location | Consumers |
|--------|-------------------|-----------|
| Conviction score (C–L → M) | `Code.gs` | Sheet Tab 10; Web API `symbol` |
| Recommendation lists | `generateRecommendations_()` | Tab 11; Web API `top10` |
| Sector taxonomy / join | `SECTOR_TAXONOMY_`, `normalizeSectorName_()` | Tab 19 join; prompt Section 12 |
| RSS ingest | `fetchNewsRss()` | Tab 7 |
| News → events JSON | Section 14 + `writeExtractedEventsToSheets_()` | Tabs 15–20 |
| Perplexity on-demand enrichment | `frontend/equityiq.html` (1 call) | UI only; uses sheet scores as input |

## Deploy flow

1. **Sheet** — import `shared/schemas/*.csv` headers via **Setup all sheet tabs**.
2. **Apps Script** — paste all files from `backend/automation/`.
3. **Data** — UNIVERSE, Screener → Tab 6, rebuild pipeline ([USER_SETUP.md](USER_SETUP.md)).
4. **Web App** — deploy `WebAppApi.gs` → URL in EquityIQ settings.
5. **n8n** — optional 08:00 delivery ([backend/workflows/README.md](../backend/workflows/README.md)).

## Option C (Sheets brain, UI face)

See [EQUITYIQ_SHEETS_BRIDGE.md](EQUITYIQ_SHEETS_BRIDGE.md).
