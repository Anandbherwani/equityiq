# Live API Connected — EquityIQ

**Date:** 2026-06-04  
**Production:** https://equityiq-gamma.vercel.app  
**Deployment:** `dpl_7Dxvas8zzy9WYTCXSBziByRTcNbF` (after env fix)

---

## Web App URL (Indian Equity Intelligence)

```text
https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec
```

**Script ID:** `1jgkxO-BLow1rf75yDCchjoQ-PHY0wOpNK50B5edBLpUOYG9xk93YfMNT`  
**Spreadsheet:** `1mWuTNDL2WhBmetQYceCAIlQDX7NyBZy6O_sudddh0KE`

---

## How the frontend connects

| Layer | Mechanism |
|-------|-----------|
| **Server (SSR)** | `NEXT_PUBLIC_SHEETS_API_URL` → `hasSheetsApi()` in `data-source-notice.tsx` |
| **Banner** | Shown when env URL is empty → `ApiBanner` “Research API not connected” |
| **Data load** | `server-preview.ts` → `loadTop10()` etc. via `sheets-api.ts` |
| **Client override** | Settings → `localStorage` key `isi_sheets_api_url` (optional per-browser) |
| **Demo mode** | Cookie `isi_demo_mode=1` forces preview data even if URL is set |

No code changes were required — only env configuration.

---

## Environment variables set

| Location | Variable | Status |
|----------|----------|--------|
| `frontend/.env.local` | `NEXT_PUBLIC_SHEETS_API_URL` | **Set** (gitignored) |
| Vercel **Production** | `NEXT_PUBLIC_SHEETS_API_URL` | **Set** (via `echo URL \| vercel env add … production`) |
| Vercel **Preview** | `NEXT_PUBLIC_SHEETS_API_URL` | **Not set** (add for preview deploys if needed) |

**Important:** First Vercel add used `--value` incorrectly and stored an **empty string**. Fixed by `vercel env rm` + piping URL on stdin, then **`vercel --prod`** redeploy.

---

## Verification results

### Health (`?action=health`) — PASS

```json
{
  "ok": true,
  "spreadsheetName": "Indian Equity Intelligence",
  "tab1Rows": 2378,
  "tab10Rows": 2376,
  "tab11Rows": 50,
  "tab6Rows": 0
}
```

### `scripts/verify_live_api.py`

| Action | Result | Notes |
|--------|:------:|-------|
| health | PASS | |
| recommendation_history | PASS | |
| recommendation_validation | PASS | |
| macro / market_summary | PASS | |
| top10 | FAIL | Apps Script timeout (>45s) — large sheet |
| symbol / stock | FAIL | timeout |
| backtest | FAIL | `ok: false` in payload |
| morning_brief | FAIL | timeout |

Slow endpoints are an Apps Script performance issue, not a missing URL.

### Production UI

- https://equityiq-gamma.vercel.app — **no** “Research API not connected” banner (verified HTML grep)
- Local `npm run build` — **PASS**

---

## User steps (browser)

### Production (automatic)

After Vercel redeploy with env set, **no Settings paste required** — SSR reads `NEXT_PUBLIC_SHEETS_API_URL`.

### Local dev

```bash
cd frontend
# .env.local already contains NEXT_PUBLIC_SHEETS_API_URL
npm run dev
```

### Optional Settings override

1. Open **Settings**
2. Paste the `/exec` URL into **Google Apps Script Web App URL**
3. Save — stored in `localStorage` (`isi_sheets_api_url`)
4. Turn **off Demo mode** if enabled

### Hard refresh

If you still see the old banner: **Cmd+Shift+R** on https://equityiq-gamma.vercel.app

---

## Vercel commands (reference)

```bash
cd frontend
echo 'https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec' | vercel env add NEXT_PUBLIC_SHEETS_API_URL production --yes
vercel --prod --yes
```

Preview (all branches):

```bash
vercel env add NEXT_PUBLIC_SHEETS_API_URL preview --value 'https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec' --yes
```

---

## Related docs

- [`WEB_APP_DOGET_FIX.md`](WEB_APP_DOGET_FIX.md) — working `/exec` vs broken old deployment
- [`FULL_DEPLOYMENT_RECONCILIATION.md`](FULL_DEPLOYMENT_RECONCILIATION.md) — 28-file Apps Script push
- [`LIVE_API_VERIFICATION.md`](LIVE_API_VERIFICATION.md) — probe checklist
