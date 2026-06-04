# Immediate Picks Fix — EquityIQ Dashboard

**Date:** 2026-06-04  
**Production:** https://equityiq-gamma.vercel.app

## Symptom

Dashboard showed:

> No immediate picks yet. Connect your API in Settings or enable Demo mode.

…even though `?action=health` on the live Apps Script Web App returned valid data (`tab11=50`).

## Root causes (two issues)

### 1. Empty Vercel env var (production blocker)

`NEXT_PUBLIC_SHEETS_API_URL` existed on Vercel Production but its **value was empty** (`""`). The server therefore treated the app as having no API configured.

**Fix:** Set the correct URL on Vercel Production and redeployed.

```
https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec
```

### 2. `top10` timeout + SSR architecture

Live `?action=top10` takes **~146 seconds** (cold Apps Script + Tab 11 enrichment). The frontend used a **30s fetch timeout**, so server-side `loadTop10()` always failed with timeout. The dashboard then showed an empty list with a misleading “Connect your API” message.

**Fix:**

- Increased `top10` timeout to **180s** (client + server fetch helpers).
- Moved dashboard immediate picks to a **client component** with loading skeleton and clear error/retry UI (avoids Vercel serverless SSR timeout limits).
- Improved empty/error copy so timeout ≠ “API not connected”.

## API verification (2026-06-04)

| Action  | Result | Notes |
|---------|--------|-------|
| `health` | OK | ~5s, tab11Rows=50 |
| `top10`  | OK | ~146s, 5 lists, 10 items in “Top 10 Immediate Opportunities” |

Response shape matches frontend types (`ok`, `lists[].name`, `lists[].items[]`).

## Files changed

| File | Change |
|------|--------|
| `frontend/src/lib/api-url.ts` | **New** — shared env URL helpers + cookie name |
| `frontend/src/lib/sheets-api.ts` | Server reads Settings cookie; 180s top10 timeout; redirect follow |
| `frontend/src/lib/client-api.ts` | 180s top10 timeout; shared URL resolution |
| `frontend/src/lib/storage.ts` | Sync API URL to cookie on save (server can read it) |
| `frontend/src/lib/server-preview.ts` | Use `hasServerSheetsApi()` (env + cookie) |
| `frontend/src/app/page.tsx` | Client-side immediate picks section |
| `frontend/src/components/recommendations/immediate-opportunities-section.tsx` | **New** — loading, live fetch, error/retry |
| `frontend/src/components/shared/data-source-notice.tsx` | Async server API check |
| `frontend/src/components/shared/api-banner.tsx` | Separate connect vs error variants |
| `frontend/src/app/settings/settings-client.tsx` | Seed cookie from env on first visit |

## Vercel deploy

- **Status:** Production deploy **READY** (latest: `dpl_9snMkkV8ffcks8387wpMesH8wkt9`)
- **URL:** https://equityiq-gamma.vercel.app
- **Env:** `NEXT_PUBLIC_SHEETS_API_URL` set on Production (was empty before; confirmed embedded in production JS bundle)

## User steps

1. **Production (Vercel):** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R). Dashboard should show “Loading immediate picks…” for up to ~2 minutes, then 10 cards.
2. **Local dev:** Ensure `frontend/.env.local` contains:
   ```
   NEXT_PUBLIC_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec
   ```
   Restart `npm run dev` after changing env.
3. **Settings fallback:** Paste the exec URL in **Settings → API URL → Save**. This writes localStorage + cookie so server and client both resolve the URL without redeploy.
4. **Demo mode:** Toggle **Demo mode On** in Settings for instant preview data (no API wait).

## Expected UX after fix

| State | Dashboard behavior |
|-------|-------------------|
| API configured | Loading skeleton → 10 immediate opportunity cards |
| API timeout/error | Red error banner with message + Retry (not “Connect API”) |
| No API URL | “Connect your API in Settings or enable Demo mode” |
| Demo mode | Instant demo picks |
| API OK but Tab 11 empty | “No immediate opportunities in Tab 11 yet…” |

## Follow-ups (optional)

- **Recommendations page** still SSR-fetches `top10` (may timeout on slow cold starts); consider same client-side pattern.
- **Apps Script performance:** `top10` ~146s is slow; optimizing `getTop10Data_()` in `WebAppApi.gs` would improve UX across all clients.
