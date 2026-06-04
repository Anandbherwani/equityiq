# EquityIQ Prompts Execution Report

**Source:** `/Users/anandbherwani/Downloads/equityiq_cursor_prompts.md`  
**Executed:** 2026-06-04  
**Production app:** https://equityiq-gamma.vercel.app  
**Live API:** https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec

## Approach

The prompt file specifies a **single-file vanilla HTML app** (`equityiq.html` + Chart.js + hash routing). This repository’s **production surface is the Next.js app** on Vercel (see `GO_LIVE_CHECKLIST.md`, `SCREENER_UI_DEPLOY.md`). Legacy static HTML lives at `docs/legacy-equityiq-static/equityiq.html`.

**Strategy:** Map each prompt step to the Next.js implementation; skip rebuilding the full 3k-line static file. Implement **gaps** only (IPO, SME, themes, system health, research watchlist table, macro ticker, legal footer).

---

## Step-by-step status

| Step | Prompt title | Status | Notes |
|------|----------------|--------|-------|
| PRE | API / scoring context | **Skipped** | Reference only; API already documented in repo |
| 1 | Project scaffold + design system | **Skipped** | Superseded by Next.js + Tailwind design system |
| 2 | App shell (sidebar, top bar, hash routing) | **Done (prior)** | `AppShell`, `Sidebar`, `TopBar`, App Router; **enhanced:** `MacroTicker`, nav items for new routes |
| 3 | Dashboard (KPI, macro, sectors, top 5) | **Done (prior)** | `/`, `/screener`; sector/macro on screener |
| 4 | Top Picks (6 lists, filters, cards) | **Done (prior)** | `/recommendations`, `immediate-opportunities-section` |
| 5 | Stock detail drawer + charts | **Done (prior)** | `/stock/[symbol]`, `StockDetailView`, tabs, `MetricChart` |
| 6 | Watchlist + Sectors/Themes | **Partial → Done** | Personal watchlist existed; **added** `ResearchPicksTable` on `/watchlist`; **new** `/themes` |
| 7 | Portfolio construction | **Done (prior)** | `/portfolio`, `PortfolioConstructionView` |
| 8 | Backtest + validation | **Done (prior)** | `/backtest`, `/validation` |
| 9 | IPO + SME views | **Done** | **New** `/ipo`, `/sme` |
| 10 | System health + search + polish | **Partial → Done** | Search existed; **new** `/health`; macro refresh 5m; legal footer; error retry cards |

---

## New / changed files

| Area | Files |
|------|--------|
| Types & API | `frontend/src/lib/types.ts`, `sheets-api.ts`, `demo-data.ts`, `demo-fetch.ts` |
| Nav | `frontend/src/lib/constants.ts`, `components/layout/sidebar.tsx` |
| Pages | `app/ipo/*`, `app/sme/*`, `app/themes/*`, `app/health/*` |
| Components | `components/watchlist/research-picks-table.tsx`, `components/layout/macro-ticker.tsx`, `components/shared/api-error-card.tsx`, `components/shared/legal-footer.tsx` |
| Layout | `app-shell.tsx`, `top-bar.tsx`, `app/watchlist/page.tsx` |

---

## Deploy

| Item | Value |
|------|--------|
| Target | Vercel production (`equityiq-gamma.vercel.app`) |
| Local build | **Blocked** — `ENOSPC` (disk full) during local `next build` |
| Remote deploy | **Done** — `dpl_A7zcLvKTj3hkaPpziNMaKAh5U15a` → https://equityiq-gamma.vercel.app |
| TypeScript | `npx tsc --noEmit` — **pass** |

---

## Verification checklist (from prompt Step 10)

| Check | Status |
|-------|--------|
| All main views render | ✅ Routes: home, screener, recommendations, themes, watchlist, portfolio, ipo, sme, backtest, validation, health, stock |
| Stock detail from symbol click | ✅ Existing `/stock/[symbol]` |
| Charts in stock tabs | ✅ Existing (Recharts) |
| Watchlist sort/filter/export | ✅ `ResearchPicksTable` |
| Portfolio by capital | ✅ Existing |
| Global search → stock page | ✅ Existing `GlobalSearch` |
| API error + retry | ✅ `ApiErrorCard` on new views |
| Disclaimer footer | ✅ `LegalFooter` in `AppShell` |
| Top bar Nifty + bias | ✅ `MacroTicker` (5 min refresh) |
| Vanilla `equityiq.html` at repo root | **Skipped** — legacy in `docs/legacy-equityiq-static/` |

---

## Blocked / not implemented

1. **Full single-file `equityiq.html`** at project root — intentional; would duplicate Next.js.
2. **Lightweight-Charts candlesticks** in drawer — Next.js stock page uses Recharts; synthetic OHLC not ported.
3. **Chart.js doughnut theme wheel** — themes page uses tables + sector cards (lighter than full prompt spec).
4. **SME vs mainboard bubble scatter** — not added (needs combined top10 + sme chart).
5. **Local Vercel deploy** — retry after freeing disk space.

---

## Quick links after deploy

- IPO: https://equityiq-gamma.vercel.app/ipo  
- SME: https://equityiq-gamma.vercel.app/sme  
- Themes: https://equityiq-gamma.vercel.app/themes  
- Health: https://equityiq-gamma.vercel.app/health  
- Research watchlist: https://equityiq-gamma.vercel.app/watchlist  
