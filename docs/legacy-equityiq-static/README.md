# Dashboard — EquityIQ + hub

## Architecture (Option C)

| Layer | Role |
|-------|------|
| **Google Sheets + Apps Script** | Universe, news, scoring, Top 10 lists (brain) |
| **WebAppApi.gs** | JSON `doGet` endpoint |
| **equityiq.html** | Charts, pivots, exploration (face) |

See [docs/EQUITYIQ_SHEETS_BRIDGE.md](../docs/EQUITYIQ_SHEETS_BRIDGE.md) and [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Open locally

```bash
cd dashboard
python3 -m http.server 8080
```

- **Hub:** http://localhost:8080/index.html  
- **EquityIQ:** http://localhost:8080/equityiq.html  

## Connect to your sheet

1. Paste `WebAppApi.gs` into Apps Script (with `Code.gs`).
2. Deploy Web app (Execute as Me, Anyone).
3. **Stock Tracker → Show EquityIQ Web App URL**.
4. EquityIQ **Settings → Sheets Web App URL** → **Test Sheets connection**.
5. Enable **Use Google Sheets as data brain**.

Top 10 lists from Tab 11 appear on the home screen; clicking a symbol loads sheet scores + optional Perplexity enrichment.

## Perplexity API key

Optional for enrichment (1 call per symbol when Sheets is connected). Without a key, sheet scores still load; charts use demo OHLCV.

Stored in `localStorage` only.

## CORS

- **Sheets Web App** — `fetch` to `script.google.com` usually works for GET.
- **Perplexity** — may be blocked from the browser; use demo enrichment or server proxy later.

## Keyboard

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `1`–`7` | Switch tabs |

## Files

| File | Purpose |
|------|---------|
| `index.html` | Hub — pipeline summary + link to EquityIQ |
| `equityiq.html` | Full analyzer (Sheets-first, Perplexity enrichment) |
