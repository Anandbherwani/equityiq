# EquityIQ UI Polish Sprint — Report

**Date:** 3 June 2026  
**Scope:** Visual and UX polish only — no new routes, APIs, or product features.  
**Goal:** Bloomberg-style Indian equity terminal — decisions visible in under 10 seconds.

---

## Executive summary

The frontend was refocused around four questions on every primary surface:

1. **What should I buy?** — BUY / WATCH / AVOID badges and conviction-first layout  
2. **Why?** — Thesis summary on cards and a dedicated research narrative block on stock pages  
3. **What is the risk?** — Risk line on opportunity cards; bear case and risks above the fold on detail  
4. **What changed today?** — Market summary strip + link to track record on the dashboard  

Dark mode remains the default. Semantic colors: **green** opportunity, **red** risk, **amber** caution, **cyan** intelligence.

---

## Before vs after

| Area | Before | After |
|------|--------|--------|
| **Dashboard** | Multiple acceptance lists × 2 cards; breadth/fear sections dominated the fold | **Market summary** (5 indices) → **Top 10 immediate** grid (5×2 on desktop); demo data when API offline |
| **Recommendation cards** | Score + nested analyst sections | **Analyst-note** style: action badge, thesis excerpt, list badges (High Conviction, SME Alpha, etc.) |
| **Stock detail** | Symbol header buried in tabs | **Stock hero** (price, conviction, target, upside, confidence, risk) + **thesis stack** before tabs |
| **Search** | Symbol filter on popular list only | **Symbol + company** index, recent searches, **⌘K**, arrow keys + Enter |
| **Validation** | Scorecards equal weight | **Evidence at a glance**: hit rate, α Nifty, α sector; best/worst picks emphasized per category |
| **Settings** | API jargon, history health, data inventory | **API URL**, **Demo**, **Theme**, **Refresh** only |
| **Loading** | Blank or abrupt paint | Route `loading.tsx`, dashboard/stock skeletons, dashed empty states |

---

## Screenshots

Capture locally after `npm run dev` in `frontend/`:

```bash
cd frontend && npm run dev
# Open http://localhost:3000 — enable Demo mode in Settings if needed
```

Recommended captures (save under `docs/screenshots/ui-polish/`):

| File | Page | Notes |
|------|------|--------|
| `01-dashboard-after.png` | `/` | Market summary + 10 opportunity cards |
| `02-stock-after.png` | `/stock/HAL` | Hero + thesis sections |
| `03-recommendations-after.png` | `/recommendations` | BUY/WATCH badges on cards |
| `04-validation-after.png` | `/validation` | Evidence strip + scorecards |
| `05-search-after.png` | Any (header) | Autocomplete with company names |
| `06-settings-after.png` | `/settings` | Four simple sections |

*Before screenshots:* use git history (`git show HEAD~1:frontend/src/app/page.tsx`) or a prior build branch if you need side-by-side PR assets.

---

## Implementation map

### Dashboard (`frontend/src/app/page.tsx`)

- `MarketSummary` + `DEMO_INDICES` (Nifty, Sensex, Bank Nifty, Midcap, Smallcap)  
- Single list: **Top 10 Immediate Opportunities** via `TerminalOpportunityCard`  
- Falls back to `DEMO_TOP10` when API URL is not configured  

### New / updated components

| File | Role |
|------|------|
| `lib/recommendation-badges.ts` | BUY/WATCH/AVOID + list badge mapping |
| `components/recommendations/terminal-opportunity-card.tsx` | Compact terminal card for dashboard grid |
| `components/market/market-summary.tsx` | Section wrapper for indices |
| `components/stock/stock-hero.tsx` | Above-the-fold decision metrics |
| `components/stock/stock-thesis-stack.tsx` | Thesis, bull/bear, catalysts, risks, peers, theme |
| `lib/search-index.ts` | Static symbol/company autocomplete |
| `components/shared/empty-state.tsx` | Reusable empty UI |
| `app/loading.tsx`, `app/stock/[symbol]/loading.tsx` | Skeleton loaders |

### Search (`global-search.tsx`)

- Autocomplete from `SEARCH_INDEX`  
- Recent searches (existing storage)  
- Keyboard: ↑/↓, Enter, Escape, **⌘K** focus  

### Validation (`validation-dashboard.tsx`)

- Highlight band: hit rate, average α vs Nifty/sector  
- Per-category: hit rate and alpha emphasized; best/worst recommendation blocks  

### Settings (`settings-client.tsx`)

- Removed history health panel and “available data” inventory  
- Added theme toggle (dark/light via `localStorage` + `html` class)  

### Mobile

- Dashboard: 1 → 2 → 5 column grid  
- Watchlist: full-width symbol input and bucket select on small screens  
- Stock: collapsible cap/quality row on mobile; hero stacks vertically  

### Color system (`globals.css`)

- Dark terminal gradient background retained  
- `--gain`, `--loss`, `--warn`, `--intel` tokens on `.dark`  
- Cyan accents for intelligence links and section labels  

---

## Design principles checklist

| Principle | Status |
|-----------|--------|
| Hide complexity, surface decisions | ✅ Hero + terminal cards |
| No new features / routes | ✅ Same routes only |
| Dark default | ✅ `html.dark` in layout |
| Skeleton / empty / API banner | ✅ Loading routes + `ApiBanner` + empty cards |
| Professional terminal feel | ✅ Typography, grid, monospace numbers |

---

## Verification

```bash
cd frontend && npm run build
```

Build completed successfully after this sprint.

---

## Follow-up (optional)

1. Add real screenshot PNGs under `docs/screenshots/ui-polish/` for PR/marketing.  
2. Wire live index levels into `MarketSummary` when the Web API exposes an index feed (currently demo indices).  
3. Extend `SEARCH_INDEX` from Tab 1 universe export for full-universe autocomplete.
