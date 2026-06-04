# Live API Checklist — `NEXT_PUBLIC_SHEETS_API_URL`

**Goal:** Every code path that should call the Sheets Web App resolves the same URL (env → Settings override).

---

## 1. Environment configuration

| Location | Variable | Required | Status |
|----------|----------|----------|--------|
| Vercel → Project **equityiq** → Environment Variables | `NEXT_PUBLIC_SHEETS_API_URL` | Production | ⚠️ Set to deployed `/exec` URL (currently empty) |
| `frontend/.env.local` (local dev) | `NEXT_PUBLIC_SHEETS_API_URL` | Dev | ⚠️ Copy from `.env.local.example` |
| User browser (optional) | Settings → API URL | Runtime | ✅ `localStorage` + cookie flow |

**Format:** `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec` (no trailing slash)

---

## 2. Code references (verified in repo)

| File | Usage |
|------|--------|
| `frontend/src/lib/sheets-api.ts` | `process.env.NEXT_PUBLIC_SHEETS_API_URL`; `hasSheetsApi()`, `fetchSheets()` |
| `frontend/src/app/settings/settings-client.tsx` | `getStoredApiUrl() \|\| process.env.NEXT_PUBLIC_SHEETS_API_URL` |
| `frontend/.env.local.example` | Documented template |
| `frontend/README.md` | Setup instructions |

**Server preview:** When URL is missing or demo cookie set, `server-preview.ts` serves demo data (no API call). This is intentional fallback, not a missing reference.

---

## 3. Web App deployment (Apps Script)

| Step | Command / action |
|------|------------------|
| 1 | Paste `backend/automation/WebAppApi.gs` + `Code.gs` (+ all engines) |
| 2 | **Deploy → New deployment → Web app** |
| 3 | Execute as: **Me** · Who has access: **Anyone** |
| 4 | Copy `/exec` URL → Vercel + `.env.local` |
| 5 | Menu: **Show EquityIQ Web App URL** (`showEquityIQWebAppHelp`) |

---

## 4. Actions to verify (automated script)

Run after URL is set:

```bash
export API_URL="https://script.google.com/macros/s/YOUR_ID/exec"
python3 scripts/verify_live_api.py
```

| Action | Frontend consumer |
|--------|-------------------|
| `health` | Settings / connectivity |
| `top10` | `/`, dashboard |
| `symbol` | `/stock/[symbol]` |
| `recommendation_history` | `/history` |
| `recommendation_validation` | `/validation` |
| `backtest` | `/backtest` |
| `morning_brief` | `/brief` |

---

## 5. Vercel redeploy

After changing env:

```bash
cd frontend
vercel env add NEXT_PUBLIC_SHEETS_API_URL production --value "YOUR_EXEC_URL" --yes --no-sensitive
vercel deploy --prod --yes
```

---

## 6. Sign-off

| Check | Owner | Done |
|-------|-------|:----:|
| Web App deployed | Operator | ☐ |
| URL in Vercel Production | Operator | ☐ |
| `verify_live_api.py` all PASS | Operator | ☐ |
| Home shows live data (no “API not connected”) | Operator | ☐ |
