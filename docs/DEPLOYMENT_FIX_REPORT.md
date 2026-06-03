# Deployment Fix Report

**Date:** 3 June 2026  
**Scope:** Address `FINAL_DEPLOYMENT_AUDIT.md` FAIL/WARN items affecting reliability, deployment, recommendations, API stability, and mobile — no new features or architecture changes.

---

## Summary

| Audit item | Before | After |
|------------|--------|-------|
| Live spreadsheet FAIL (no data in repo) | Empty SSR pages without API | **Mitigated** — server preview data on all recommendation/history/validation routes |
| SSR demo gap | Client-only `localStorage` | **Fixed** — `isi_demo_mode` cookie + `server-preview.ts` |
| Recommendations empty offline | WARN | **Fixed** — 6-list `DEMO_TOP10` + `loadTop10()` |
| API fetch stability | No timeout / weak HTTP handling | **Fixed** — 30s timeout, HTTP + JSON errors |
| Theme switching | `.light` class ineffective | **Fixed** — cookie-driven `html` class + light body styles |
| Mobile Settings access | Excluded from bottom nav | **Fixed** — Settings on mobile bar |
| Env documentation | Minimal | **Clarified** — `.env.local.example` production note |

**Build verification:** `npm run build`, `npx tsc --noEmit`, `npm run lint` — all pass after fixes.

---

## Fixes by file

### `frontend/src/lib/server-preview.ts` (new)

| Field | Value |
|-------|-------|
| **Reason** | Central server loaders: preview when API URL missing or `isi_demo_mode=1` cookie |
| **Risk** | Low |
| **Before** | Each page called `hasSheetsApi()` only; no data without env URL |
| **After** | `loadTop10`, `loadRecommendationHistory`, `loadRecommendationValidation`, `loadBacktest`, `loadMorningBrief`, `loadPortfolio` return live or demo payloads |

---

### `frontend/src/lib/demo-data.ts`

| Field | Value |
|-------|-------|
| **Reason** | Complete preview datasets for deployment smoke test without Google Sheet |
| **Risk** | Low |
| **Before** | 3 recommendation lists; no brief/portfolio demo |
| **After** | 6 lists (matches `RECOMMENDATION_LIST_NAMES`); `DEMO_MORNING_BRIEF`, `DEMO_PORTFOLIO` with typed fields |

---

### `frontend/src/lib/sheets-api.ts`

| Field | Value |
|-------|-------|
| **Reason** | API stability — avoid hung requests and silent HTTP failures |
| **Risk** | Low |
| **Before** | `fetch` without timeout; no check for non-OK HTTP or invalid JSON |
| **After** | `AbortSignal.timeout(30_000)`; `parseSheetsResponse` returns explicit errors |

---

### `frontend/src/lib/client-api.ts`

| Field | Value |
|-------|-------|
| **Reason** | Match server fetch hardening for client-side API calls |
| **Risk** | Low |
| **Before** | Same gaps as `sheets-api.ts` |
| **After** | 30s timeout, HTTP status check, JSON parse guard |

---

### `frontend/src/lib/storage.ts`

| Field | Value |
|-------|-------|
| **Reason** | SSR demo mode alignment with client toggle |
| **Risk** | Low |
| **Before** | Demo/theme only in `localStorage` |
| **After** | `setDemoMode` sets `isi_demo_mode` cookie; `syncThemeCookie` sets `isi_theme` cookie |

---

### `frontend/src/lib/demo-fetch.ts`

| Field | Value |
|-------|-------|
| **Reason** | Client demo parity for brief/portfolio actions |
| **Risk** | Low |
| **Before** | `morning_brief` / `portfolio` returned “not mocked” |
| **After** | Returns `DEMO_MORNING_BRIEF`, `DEMO_PORTFOLIO` |

---

### `frontend/src/components/shared/data-source-notice.tsx` (new)

| Field | Value |
|-------|-------|
| **Reason** | Consistent API/preview messaging on server pages |
| **Risk** | Low |
| **Before** | `ApiBanner` only when URL missing; demo cookie showed live shell with no data |
| **After** | API banner when disconnected; violet preview notice when demo cookie + URL set |

---

### `frontend/src/app/layout.tsx`

| Field | Value |
|-------|-------|
| **Reason** | Theme switching works on SSR and first paint |
| **Risk** | Low |
| **Before** | Hardcoded `className="dark"` |
| **After** | Async layout reads `isi_theme` cookie → `dark` or `light` on `<html>` |

---

### `frontend/src/app/globals.css`

| Field | Value |
|-------|-------|
| **Reason** | Light theme readable (deployment audit WARN) |
| **Risk** | Low |
| **Before** | Dark terminal background applied to all themes |
| **After** | Dark gradient only on `html.dark body`; light gradient on `html.light body`; light terminal grid |

---

### `frontend/src/app/settings/settings-client.tsx`

| Field | Value |
|-------|-------|
| **Reason** | Persist theme/demo to cookies for SSR; sync on mount |
| **Risk** | Low |
| **Before** | Class toggle only in browser |
| **After** | `syncThemeCookie` / `setDemoMode` on apply; mount syncs cookies from `localStorage` |

---

### `frontend/src/components/layout/sidebar.tsx`

| Field | Value |
|-------|-------|
| **Reason** | Mobile deployment — users must reach Settings to set API URL |
| **Risk** | Low |
| **Before** | Mobile bottom nav excluded `/settings` |
| **After** | Settings on mobile bar; `/compare` moved to desktop-only sidebar |

---

### Server pages (preview loaders + `DataSourceNotice`)

| File | Reason | Risk |
|------|--------|------|
| `app/page.tsx` | Use `loadTop10()` | Low |
| `app/recommendations/page.tsx` | Full lists without API | Low |
| `app/history/page.tsx` | `DEMO_HISTORY` preview | Low |
| `app/validation/page.tsx` | `DEMO_VALIDATION` + coverage | Low |
| `app/backtest/page.tsx` | `DEMO_BACKTEST` shell | Low |
| `app/brief/page.tsx` | `DEMO_MORNING_BRIEF` | Low |
| `app/portfolio/page.tsx` | `DEMO_PORTFOLIO` | Low |
| `app/stock/[symbol]/page.tsx` | `isServerPreviewMode()` for demo symbol | Low |

**Before:** Banner-only or empty content without `NEXT_PUBLIC_SHEETS_API_URL`.  
**After:** Full UI with labeled preview data; live path unchanged when API configured and demo off.

---

### `frontend/.env.local.example`

| Field | Value |
|-------|-------|
| **Reason** | Deployment clarity for production env |
| **Risk** | None |
| **Before** | URL comment only |
| **After** | Note that URL is required for live data (Settings alternative) |

---

## Audit WARN items — disposition

| WARN | Action |
|------|--------|
| SSR pages empty without API | **Fixed** — `server-preview.ts` |
| Demo mode client-only | **Fixed** — demo cookie |
| Theme incomplete | **Fixed** — layout + CSS |
| Recommendations empty | **Fixed** — 6-list demo + loader |
| History/validation SSR demo | **Fixed** |
| Brief/portfolio/backtest SSR | **Fixed** |
| API HTTP/timeout | **Fixed** |
| Mobile Settings | **Fixed** |
| Env var not set | **Documented** — ops still must set URL for live (not a code defect) |
| Live Google Sheet in repo | **Mitigated** — preview data; live sheet still ops (P0 deploy Apps Script) |
| Unused backend actions (`sme_alpha`, etc.) | **No change** — not deployment blockers per scope |
| Tab 11b doc drift | **No change** — docs only, out of scope |
| `getHealth` unused | **No change** — no reliability impact |

---

## Remaining operator steps (not code)

1. Set `NEXT_PUBLIC_SHEETS_API_URL` on the hosting platform (or users save URL in Settings).
2. Deploy full Apps Script project including `RecommendationHistoryEngine.gs` and `WebAppApi.gs`.
3. Run Tab 37 snapshots (8 AM trigger or menu) for live validation scorecards.
4. Populate Tab 22 for live backtest metrics (preview still shows empty-state dashboard).

---

## Post-fix verification

```bash
cd frontend && npm run build && npx tsc --noEmit && npm run lint
python3 scripts/test_recommendation_history_scorecard.py
```

All commands should pass.
