# Indian Equity Intelligence Platform

Google Sheets **source of truth** + Apps Script automation + Perplexity intelligence + EquityIQ presentation layer.

**Not investment advice.** Personal research using public data only.

## Production layout

```
Google Sheets          ← Data layer (live spreadsheet)
backend/automation/    ← Automation + decision (Apps Script — canonical logic)
backend/intelligence/  ← Perplexity prompts
backend/workflows/     ← n8n delivery
frontend/              ← EquityIQ web dashboard
shared/                ← Schemas & API contracts (no executable logic)
docs/                  ← Setup, architecture, audits
```

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** and **[docs/CURRENT_STATE_REPORT.md](docs/CURRENT_STATE_REPORT.md)**.

## Quick start

1. Create a Google Sheet named **Indian Equity Intelligence**.
2. Follow **[docs/SHEET_SETUP.md](docs/SHEET_SETUP.md)** and **[docs/USER_SETUP.md](docs/USER_SETUP.md)**.
3. Paste **`backend/automation/`** (`Code.gs`, `runSystemAudit.gs`, `WebAppApi.gs`) → **Extensions → Apps Script** → authorize.
4. **Stock Tracker → Setup all sheet tabs** (headers from `shared/schemas/`).
5. Import UNIVERSE → Screener → Tab 6 → **Rebuild scoring pipeline from UNIVERSE**.
6. RSS + optional **Run news intelligence pipeline (Perplexity)**.
7. Deploy **Web App** → bookmark `/exec` for the HTML hub; set `SHEETS_API_URL` (or `NEXT_PUBLIC_SHEETS_API_URL`) to the same `/exec` + `?action=…` for JSON (see [frontend/README.md](frontend/README.md), [VERCEL_ENV_UPDATE.md](VERCEL_ENV_UPDATE.md)).

## Layers

| Layer | Location |
|-------|----------|
| Data | Google Sheet + `shared/schemas/` |
| Automation | `backend/automation/*.gs` |
| Intelligence | `backend/intelligence/` + Perplexity in `Code.gs` |
| Decision | Scoring & Tab 11 in **`Code.gs` only** — see `shared/scoring/SCORING.md` |
| Presentation | `frontend/` · API contract `shared/api/webapp-v1.json` |

## Morning automation (optional)

| Time | Component |
|------|-----------|
| 6:00 IST | Apps Script `dailyDataRefresh6am` — news, events, prices, scores |
| 8:00 IST | Apps Script `dailyBriefing8am` — Top 10, sectors, macro → Telegram + email |

See **[docs/PHASE6_AUTOMATION.md](docs/PHASE6_AUTOMATION.md)**. Optional n8n: [`backend/workflows/`](backend/workflows/).

[docs/AUTOMATION_PIPELINE.md](docs/AUTOMATION_PIPELINE.md) · [docs/NEWS_TO_SCORING.md](docs/NEWS_TO_SCORING.md)

## Frontend (EquityIQ)

- **Next.js app:** `cd frontend && npm run dev` → [http://localhost:3000](http://localhost:3000)
- Setup: [frontend/README.md](frontend/README.md) · Bridge: [docs/EQUITYIQ_SHEETS_BRIDGE.md](docs/EQUITYIQ_SHEETS_BRIDGE.md)
- Legacy static UI: [docs/legacy-equityiq-static/](docs/legacy-equityiq-static/)

## Audits

- **Live:** **Stock Tracker → Run full system audit** ([docs/E2E_LIVE_FUNCTIONALITY_AUDIT.md](docs/E2E_LIVE_FUNCTIONALITY_AUDIT.md))
- **Static:** [docs/FULL_SYSTEM_AUDIT.md](docs/FULL_SYSTEM_AUDIT.md)

## Legacy paths

Old `sheets/`, `dashboard/`, `n8n/`, `config/`, `prompts/` folders redirect via README stubs — use paths above.

## Disclaimer

Respect NSE/BSE and publisher ToS. No redistribution of market data.
