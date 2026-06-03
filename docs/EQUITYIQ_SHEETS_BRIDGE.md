# EquityIQ ↔ Google Sheets (Option C)

**Sheets + Apps Script + Perplexity = research engine**  
**EquityIQ = visualization layer**

The web app does not score, rank, or manage the universe. It reads pre-computed data from your sheet and uses Perplexity only for on-demand enrichment (live price, pivots, predictions).

## Architecture

```
Google Sheets (brain)
  Tab 1 UNIVERSE · Tab 6 FUNDAMENTALS · Tab 7 NEWS
  Tab 10 SCORING · Tab 11 RANKED WATCHLIST · Tab 8 MACRO
        ↓
  WebAppApi.gs  doGet ?action=...
        ↓
  frontend/equityiq.html  fetch() + 1× Perplexity enrichment
```

## Deploy the JSON API

1. In Apps Script, add [`WebAppApi.gs`](../backend/automation/WebAppApi.gs) next to `Code.gs`.
2. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
3. **Stock Tracker → Show EquityIQ Web App URL** — copy the `/exec` URL.
4. In EquityIQ **Settings → Sheets Web App URL** — paste URL → **Test Sheets connection**.

### Endpoints

| Action | Example |
|--------|---------|
| `health` | `.../exec?action=health` |
| `top10` | `.../exec?action=top10` |
| `symbol` | `.../exec?action=symbol&symbol=RELIANCE` |
| `macro` | `.../exec?action=macro` |

## Recommended sequencing

1. **Fix scoring** — Screener → Tab 6, sectors on Tab 1, rebuild pipeline (see [USER_SETUP.md](../docs/USER_SETUP.md)).
2. **Validate** — Run audit; track Top 10 for 2–3 weeks before trusting lists.
3. **Deploy Web App** — Connect EquityIQ.
4. **Use EquityIQ** — Sheet scores + optional Perplexity enrichment per symbol.

## Per-symbol flow in EquityIQ

1. `fetch(?action=symbol&symbol=X)` — conviction, fundamentals, price row, news, list membership.
2. If API key set: **one** Perplexity call (`buildEnrichmentPrompt`) for charts/pivots/predictions.
3. If no API key: demo charts with **sheet conviction** preserved.

Fallback: if Sheets URL missing or fails → 3 Perplexity calls or full demo mode.

## Phase 2 ideas

- Tab 22 backtest log (daily Top 10 vs 1W/1M price)
- Published sheet CSV as read-only fallback
- n8n pushing macro summary into `?action=macro`
