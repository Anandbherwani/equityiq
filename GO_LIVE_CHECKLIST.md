# Go-Live Checklist — EquityIQ

Completed **2026-06-04**. Production is wired to the live Google Apps Script Web API.

## Production URL

**https://equityiq-gamma.vercel.app**

Latest deployment: `https://equityiq-7hk8z3tm6-anandbherwani-6786s-projects.vercel.app`

## What was configured

### 1. Local development

Created `frontend/.env.local`:

```
NEXT_PUBLIC_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec
```

Run locally: `cd frontend && npm run dev`

### 2. Vercel production environment

| Variable | Environment | Status |
|----------|-------------|--------|
| `NEXT_PUBLIC_SHEETS_API_URL` | Production | **Set** (encrypted) |

Verified with:

```bash
cd frontend && vercel env run --environment production -- sh -c 'echo $NEXT_PUBLIC_SHEETS_API_URL'
```

**Note:** The first env entry was an empty string (variable existed but value was blank). It was removed and re-added with `--value` so the build embeds the URL.

Preview/Development env was **not** set (CLI requires branch selection for Preview). Production is the priority.

### 3. Backend API performance fix (required for live mode)

The live Web App URL was configured, but `top10` and `symbol` timed out (>45s, 0 bytes) because:

- `getTop10Data_()` ran heavy per-item enrichment (analyst note generation, full scoring map).
- `findSymbolListMembership_()` recursively called `getTop10Data_()`.

**Fixed in** `backend/automation/WebAppApi.gs`:

- One-pass price lookup (`buildPriceLookup_`)
- Lightweight Tab 11 parsing (`tab11RowToItem_`)
- Direct Tab 11 scan for symbol list membership (no recursion)

**Deployed:**

```bash
cd backend/automation
clasp push --force
clasp deploy -i AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw -d "Web API fast top10/symbol v29"
```

Also fixed `.claspignore` (`**/**` was ignoring all source files from clasp push).

**Result:** `top10` ~8s, `symbol` ~8s (was timing out).

### 4. Frontend live vs demo logic

| Layer | Live when | Demo/preview when |
|-------|-----------|-------------------|
| **Server pages** (`server-preview.ts`) | `NEXT_PUBLIC_SHEETS_API_URL` set **and** cookie `isi_demo_mode` ≠ `1` | Env missing **or** demo cookie set |
| **Client fetches** (`client-api.ts`) | Demo off **and** (localStorage URL **or** `NEXT_PUBLIC_SHEETS_API_URL`) | `localStorage isi_demo_mode === "1"` |
| **Settings override** | `localStorage isi_sheets_api_url` + cookie `isi_sheets_api_url` | Can override env per browser |

Demo mode is stored in:

- `localStorage`: `isi_demo_mode` (`"1"` = on)
- Cookie: `isi_demo_mode` (synced from Settings; affects server-rendered pages)

## Verification results

### Health (curl)

```bash
curl -sSL "https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec?action=health"
```

Returns: `Indian Equity Intelligence`, tab1=2378, tab10=2376, tab11=50.

### `scripts/verify_live_api.py`

```bash
API_URL='https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec' \
  python3 scripts/verify_live_api.py
```

| Action | Status |
|--------|--------|
| health, top10, symbol, stock | PASS |
| recommendation_history, recommendation_validation | PASS |
| macro, market_summary | PASS |
| backtest, morning_brief | FAIL (API returns `ok: false` — engine/tab issue, not env) |

### Frontend build

```bash
cd frontend && npm run build   # ✓ passes with .env.local
```

### Production smoke (2026-06-04)

- `/` — live conviction cards, **no** “Research API not connected” banner
- `/recommendations` — live symbols (HAL, Reliance, etc.)
- `/stock/HAL` — “Hindustan Aeronautics” (not “HAL Ltd (Demo)”)

## If you still see demo mode

1. **Hard refresh** the site (Cmd+Shift+R / Ctrl+Shift+R).
2. Open **Settings → Demo mode → Off** (sets cookie + localStorage).
3. Clear site storage for `equityiq-gamma.vercel.app`:
   - DevTools → Application → Local Storage → delete `isi_demo_mode` if `"1"`
   - Cookies → delete `isi_demo_mode` if `"1"`
4. Optional: clear `isi_sheets_api_url` if you previously saved a wrong URL in Settings.

## Redeploy commands (future)

```bash
# Frontend (after env or code changes)
cd frontend
vercel --prod --yes

# Backend (after WebAppApi.gs changes)
cd backend/automation
clasp push --force
clasp deploy -i AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw -d "description"
```

## Remaining manual / follow-up

- **Preview deployments** on Vercel: add `NEXT_PUBLIC_SHEETS_API_URL` via dashboard or `vercel env add ... preview --value ... --yes` if you use preview URLs.
- **backtest / morning_brief**: API actions return `ok: false` — check Apps Script engines/tabs, not frontend env.
- **Do not commit** `frontend/.env.local`, `frontend/.env.vercel*`, or `.clasp.json` if it contains secrets.
