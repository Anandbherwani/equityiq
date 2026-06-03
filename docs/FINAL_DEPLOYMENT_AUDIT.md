# Final Production Deployment Audit

**Project:** EquityIQ / Indian Stock Intelligence  
**Audit date:** 3 June 2026  
**Auditor mode:** Read-only (no code changes)  
**Workspace:** `/Users/anandbherwani/Documents/Stock automation`

---

## Commands executed

| Command | Result |
|---------|--------|
| `cd frontend && npm run build` | **PASS** — exit 0, 16 routes generated |
| `cd frontend && npx tsc --noEmit` | **PASS** — exit 0 |
| `cd frontend && npm run lint` | **PASS** — “No ESLint warnings or errors” |
| `python3 scripts/test_recommendation_history_scorecard.py` | **PASS** — 8/8 tests |

**Environment files present:** `.env.local` **MISSING**, `.env` **MISSING** (only `.env.local.example` in repo).

---

## Executive verdict

| Layer | Verdict | Notes |
|-------|---------|-------|
| **Frontend build & types** | **PASS** | Production build, TypeScript strict, ESLint clean |
| **Frontend runtime (no API)** | **WARN** | Dashboard/stock use server-side demo fallbacks; history/validation/recommendations/brief/portfolio/backtest do not |
| **Frontend runtime (demo mode)** | **WARN** | Demo is client-only (`localStorage`); SSR pages ignore `isi_demo_mode` |
| **Backend engines (source)** | **PASS** | `RecommendationHistoryEngine.gs` present, wired in `WebAppApi.gs` + `DailyAutomation.gs` |
| **Live Google Sheet / Web App** | **WARN** | Not verifiable in this workspace; Tab 37/22 population depends on deployed Apps Script + triggers |

**Overall deployment readiness:** **WARN** — safe to deploy the Next.js app artifact; full product requires `NEXT_PUBLIC_SHEETS_API_URL` (or Settings URL) and deployed Apps Script with Tab 37 snapshots.

---

## Verification checklist (15 items)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Next.js build passes | **PASS** | `npm run build` succeeded; routes listed below |
| 2 | TypeScript passes | **PASS** | `npx tsc --noEmit` exit 0, `strict: true` |
| 3 | ESLint passes | **PASS** | `npm run lint` exit 0 |
| 4 | No missing imports | **PASS** | TSC + Next compile; no unresolved `@/` modules |
| 5 | No broken routes | **PASS** | All `NAV_ITEMS` hrefs have matching `app/**/page.tsx`; `/brief` exists (linked from dashboard) |
| 6 | No broken API calls | **WARN** | Frontend actions align with `WebAppApi.gs`; several pages never call API without env URL; unused backend actions not wired in UI |
| 7 | No undefined environment variables | **WARN** | Only `NEXT_PUBLIC_SHEETS_API_URL` (optional); not set in workspace — app degrades with banners, not crash |
| 8 | No references to deleted tabs | **PASS** (frontend) | No `Tab 11b` / `11b` in `frontend/src`; UI refs Tab 6, 10, 11, 22, 37 match `SHEET_DEFS` |
| 9 | Recommendation History Engine operational | **WARN** | Code + tests PASS; live ops need deployed GAS + Tab 37 rows |
| 10 | Validation Dashboard operational | **WARN** | UI complete; data only with API or demo payloads (demo not on SSR path) |
| 11 | Search operational | **PASS** | Static index + recent + keyboard; works offline |
| 12 | Mobile layouts operational | **PASS** | Responsive grids/`pb-24`/`flex-col sm:flex-row` on key surfaces |
| 13 | Theme switching operational | **WARN** | Toggle persists class; no dedicated `.light` CSS tokens — light mode incomplete |
| 14 | Demo mode operational | **WARN** | Client `fetchClientApi` + partial server demo (`/`, `/stock/*`); many SSR pages empty without API |
| 15 | Recommendation cards operational | **PASS** | `TerminalOpportunityCard` + `RecommendationDecisionCard` compile; dashboard shows 10 demo cards without API |

---

## Route audit

| Route | File | Build | Without API | With API |
|-------|------|-------|-------------|----------|
| `/` | `app/page.tsx` | ○ static | **PASS** — `DEMO_TOP10` + `DEMO_INDICES` | **PASS** |
| `/recommendations` | `app/recommendations/page.tsx` | ○ static | **WARN** — empty lists + banner | **PASS** |
| `/history` | `app/history/page.tsx` | ○ static | **WARN** — banner only | **PASS** if Tab 37 populated |
| `/validation` | `app/validation/page.tsx` | ○ static | **WARN** — banner only | **PASS** if Tab 37 + scorecards |
| `/stock/[symbol]` | `app/stock/[symbol]/page.tsx` | ƒ dynamic | **PASS** — `demoSymbol()` | **PASS** |
| `/settings` | `app/settings/page.tsx` | ○ static | **PASS** | **PASS** |
| `/watchlist` | `app/watchlist/page.tsx` | ○ static | **PASS** — localStorage | **PASS** |
| `/compare` | `app/compare/page.tsx` | ○ static | **WARN** — needs API or demo client | **PASS** |
| `/peers` | `app/peers/page.tsx` | ○ static | **WARN** — needs API or demo client | **PASS** |
| `/alerts` | `app/alerts/page.tsx` | ○ static | **WARN** — needs API or demo client | **PASS** |
| `/portfolio` | `app/portfolio/page.tsx` | ○ static | **WARN** — banner only | **PASS** |
| `/backtest` | `app/backtest/page.tsx` | ○ static | **WARN** — banner only | **PASS** if Tab 22 rows |
| `/brief` | `app/brief/page.tsx` | ○ static | **WARN** — banner only | **PASS** |
| `/_not-found` | built-in | ○ static | **PASS** | **PASS** |

---

## API action parity (frontend ↔ WebAppApi.gs)

| Action | `sheets-api.ts` | `client-api` / `demo-fetch` | `WebAppApi.gs` | Status |
|--------|-----------------|----------------------------|----------------|--------|
| `health` | `getHealth` | demo only | ✓ | **WARN** — exported, unused in pages |
| `top10` | `getTop10` | demo | ✓ | **PASS** |
| `symbol` | `getSymbol` | demo | ✓ | **PASS** |
| `macro` | `getMacro` | demo | ✓ | **WARN** — no page calls `getMacro` (dashboard uses `DEMO_INDICES`) |
| `backtest` | `getBacktest` | demo | ✓ | **PASS** |
| `recommendation_history` | `getRecommendationHistory` | demo | ✓ | **WARN** — SSR only; demo not applied server-side |
| `recommendation_validation` | `getRecommendationValidation` | demo | ✓ | **WARN** — SSR only |
| `data_coverage` | `getDataCoverage` | demo | ✓ | **WARN** — SSR only |
| `morning_brief` | `getMorningBrief` | — | ✓ | **WARN** — no demo mock |
| `portfolio` | `getPortfolioConstruction` | — | ✓ | **WARN** — no demo mock |
| `recommendation_history_health` | — | demo | ✓ | **WARN** — removed from Settings UI; mock exists |
| `theme_intelligence` | — | — | ✓ | **WARN** — backend only, no frontend |
| `sme_alpha` | — | — | ✓ | **WARN** — backend only |
| `ipo_intelligence` | — | — | ✓ | **WARN** — backend only |
| `system_audit` | — | — | ✓ | **WARN** — backend only |

**Broken API calls:** None identified at compile time. Runtime failures occur when URL missing or Apps Script engines not pasted (returns `{ ok: false, error: "…not deployed" }`).

---

## Environment variables

| Variable | Required? | Defined in repo? | Runtime behavior if missing |
|----------|-----------|------------------|------------------------------|
| `NEXT_PUBLIC_SHEETS_API_URL` | Recommended for production | Example only (`.env.local.example`) | `hasSheetsApi()` false → banners + server demo on `/` and `/stock/*` |
| Other `process.env.*` | — | None referenced | **PASS** — no undefined env access |

**Status:** **WARN** — production deploy must set `NEXT_PUBLIC_SHEETS_API_URL` on host (Vercel/etc.) or users must save URL in Settings.

---

## Tab reference audit (frontend code)

| Tab referenced in UI | Exists in `Code.gs` `SHEET_DEFS` | Status |
|----------------------|----------------------------------|--------|
| Tab 6 (Fundamentals) | `6. FUNDAMENTALS` | **PASS** |
| Tab 10 (Scoring) | `10. SCORING MODEL` | **PASS** |
| Tab 11 (Ranked watchlist) | `11. RANKED WATCHLIST` | **PASS** |
| Tab 22 (Backtest) | `22. BACKTEST LOG` | **PASS** |
| Tab 37 (Recommendation history) | `37. RECOMMENDATION HISTORY` | **PASS** |
| Tab 38 (IPO) | `38. IPO INTELLIGENCE` | **PASS** — backend only; not referenced in frontend TSX |
| Tab 11b (deprecated) | Not in `SHEET_DEFS` | **PASS** — zero frontend references |

**Deleted-tab docs drift:** Legacy `Tab 11b` still appears in `docs/FULL_SYSTEM_AUDIT.md` and related docs — **WARN** for documentation only, not runtime.

---

## Component audit (PASS / WARN / FAIL)

### Build & quality gates

| Component | Status | Notes |
|-----------|--------|-------|
| Next.js production build | **PASS** | Next 15.1.0, 16 pages |
| TypeScript (`strict`) | **PASS** | `tsc --noEmit` clean |
| ESLint (`next lint`) | **PASS** | Zero warnings/errors |
| Import graph (`@/*`) | **PASS** | No missing modules detected |

### Core app shell

| Component | Status | Notes |
|-----------|--------|-------|
| `app/layout.tsx` | **PASS** | `html.dark` default |
| `AppShell` / `Sidebar` / `TopBar` | **PASS** | `lg:pl-60`, mobile bottom padding on pages |
| `ClientChrome` / `DemoBanner` | **PASS** | Shows when `isi_demo_mode=1` |
| `GlobalSearch` | **PASS** | Autocomplete, recent, ⌘K, arrows; `SEARCH_INDEX` |
| `ApiBanner` | **PASS** | API-unavailable state (not blank) |
| `loading.tsx` (root + stock) | **PASS** | Skeletons present |
| `EmptyState` | **PASS** | Reusable; used where wired |

### Dashboard & market

| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard (`app/page.tsx`) | **PASS** | Market summary + 10 immediate cards |
| `MarketSummary` / `IndexCards` | **PASS** | 5 indices; demo levels |
| `TerminalOpportunityCard` | **PASS** | BUY badge, thesis, risk, badges |
| Breadth / Fear-Greed (removed from dashboard) | **WARN** | No longer on home; still in codebase |

### Recommendations

| Component | Status | Notes |
|-----------|--------|-------|
| `RecommendationDecisionCard` | **PASS** | BUY/WATCH/AVOID, analyst excerpt |
| `ListSection` / recommendations page | **WARN** | Empty without API URL |
| `AnalystNoteSections` / `DecisionSections` | **PASS** | Used on cards and stock |

### Stock detail

| Component | Status | Notes |
|-----------|--------|-------|
| `StockHero` | **PASS** | Above-fold metrics |
| `StockThesisStack` | **PASS** | Thesis, bull/bear, catalysts, risks, peers, theme |
| `StockDetailView` (tabs) | **PASS** | News, peers, fundamentals tabs |
| Stock demo without API | **PASS** | `demoSymbol()` fallback |

### History & validation

| Component | Status | Notes |
|-----------|--------|-------|
| `RecommendationHistoryEngine.gs` | **PASS** | Snapshot, health, validation exports |
| `DailyAutomation.gs` 8 AM hook | **PASS** | `snapshotRecommendationHistory_()` after recommendations |
| `WebAppApi` history endpoints | **PASS** | `recommendation_history`, `recommendation_validation`, `history_health` |
| Scorecard tests (`scripts/…`) | **PASS** | 8/8 including `average_alpha_vs_sector_pct` |
| `HistoryExplorer` UI | **PASS** | Filters, live metrics columns |
| History page SSR + demo | **WARN** | Demo data in `demo-fetch` but page uses `getRecommendationHistory` server-only |
| `ValidationDashboard` UI | **PASS** | Evidence strip, hit rate, alpha, best/worst |
| Validation page SSR + demo | **WARN** | Same SSR gap as history |
| `HistoryHealthPanel` | **PASS** | Component exists; not on Settings (by design) |
| `DataCoveragePanel` | **PASS** | Renders when coverage API returns |

### Settings, theme, demo

| Component | Status | Notes |
|-----------|--------|-------|
| `SettingsClient` | **PASS** | API URL, demo, theme, refresh |
| Demo mode (`demo-fetch.ts`) | **WARN** | Client-only; reload required; SSR pages partial |
| Theme switching | **WARN** | `dark`/`light` class toggle; **no `.light` theme variables** in `globals.css` |
| `storage.ts` keys | **PASS** | API URL, demo, theme, watchlist, portfolio |

### Mobile UX

| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard grid | **PASS** | `grid-cols-1 sm:2 lg:5`, `pb-24` |
| Stock hero / thesis | **PASS** | Stacks on small screens; collapsible stats |
| Search | **PASS** | Full-width input; kbd hidden on `sm` |
| Watchlist form | **PASS** | `flex-col sm:flex-row` |
| Recommendation cards | **PASS** | Truncation / `line-clamp` on thesis and risk |
| Sidebar on mobile | **WARN** | Not audited in browser this run; layout uses `lg:pl-60` (verify hamburger if any) |

### Other pages

| Component | Status | Notes |
|-----------|--------|-------|
| Compare client | **WARN** | Demo via `fetchClientApi` only |
| Peers client | **WARN** | Demo via `fetchClientApi` only |
| Alerts client | **WARN** | Demo via `fetchClientApi` only |
| Portfolio / Brief / Backtest | **WARN** | Server fetch only; no demo SSR |
| Watchlist | **PASS** | Local persistence |

### Backend deployment (source-level)

| Component | Status | Notes |
|-----------|--------|-------|
| `WebAppApi.gs` | **PASS** | All frontend-used actions implemented |
| `RecommendationHistoryEngine.gs` v1.1 | **PASS** | Tab 37, categories, scorecards |
| `DataCoverageEngine.gs` | **PASS** | Wired to `data_coverage` action |
| `runSystemAudit.gs` stages I/J | **PASS** | History + pillar coverage stages |
| Live spreadsheet | **FAIL** (in repo context) | No sheet export with Tab 37/22 data in workspace — **operational**, not code defect |

---

## Feature-specific conclusions

### 9. Recommendation History Engine

| Check | Status |
|-------|--------|
| Engine file in repo | **PASS** |
| Menu + 8 AM snapshot | **PASS** |
| API `recommendation_history` | **PASS** |
| Tab 37 schema in `SHEET_DEFS` | **PASS** |
| Frontend History Explorer | **PASS** |
| Live snapshots in sheet | **WARN** — requires production sheet + daily run |
| Demo on `/history` without API | **WARN** — not server-wired |

### 10. Validation Dashboard

| Check | Status |
|-------|--------|
| UI scorecards + evidence band | **PASS** |
| `average_alpha_vs_sector_pct` in types/UI | **PASS** |
| API + engine | **PASS** (source) |
| Empty Tab 37 → empty scorecards message | **PASS** (graceful) |
| Demo without API on SSR | **WARN** |

### 11. Search

| Check | Status |
|-------|--------|
| Autocomplete (symbol + company) | **PASS** |
| Recent searches | **PASS** |
| Keyboard navigation | **PASS** |
| Direct symbol entry | **PASS** |

### 12–15. Mobile, theme, demo, cards

Summarized in component table: cards and mobile **PASS**; theme and demo **WARN**.

---

## Production deployment blockers

| Priority | Blocker | Type |
|----------|---------|------|
| P0 | Set `NEXT_PUBLIC_SHEETS_API_URL` on hosting **or** document Settings URL flow | Config |
| P0 | Deploy full Apps Script project (include `RecommendationHistoryEngine.gs`, `WebAppApi.gs`) | Ops |
| P1 | Run Tab 37 snapshots (8 AM trigger or manual menu) before validation UI shows data | Data |
| P1 | Align demo mode with SSR for `/history`, `/validation`, `/recommendations` if demo-first UX required | Product (known gap) |
| P2 | Implement `.light` CSS tokens if light theme is a release requirement | UX |
| P2 | Clean doc references to Tab 11b in `docs/FULL_SYSTEM_AUDIT.md` etc. | Docs |

---

## Summary scorecard

| Category | PASS | WARN | FAIL |
|----------|------|------|------|
| Build / lint / types | 4 | 0 | 0 |
| Routes & imports | 2 | 0 | 0 |
| API & env | 1 | 2 | 0 |
| Tab references (frontend) | 1 | 0 | 0 |
| Feature readiness | 6 | 8 | 1* |

\* **FAIL** = live Google Sheet not present in repository (expected); not a frontend build failure.

---

## Auditor sign-off

The **Next.js application is build-ready for production deploy** as a static/SSR frontend artifact. End-to-end “production operational” status is **WARN** until the Sheets Web App URL is configured and Apps Script engines are deployed with populated Tab 37 (and Tab 22 for backtest).

**No code was modified during this audit.**
