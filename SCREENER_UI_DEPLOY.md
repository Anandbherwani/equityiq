# Screener UI Deployment Report

**Date:** 4 Jun 2026 (perf + infographics pass)  
**Deploy ID:** `dpl_6r1bXm7Y6u4XSJkygb3duPoDFEAx`  
**Production URL:** https://equityiq-gamma.vercel.app/screener  
**Inspect:** https://vercel.com/anandbherwani-6786s-projects/equityiq/6r1bXm7Y6u4XSJkygb3duPoDFEAx

---

## Before / After (this deploy)

| Aspect | Before | After |
|--------|--------|-------|
| **First paint** | Blocked on SSR `loadTop10()` (8–146s) | Shell + static sections paint immediately; data streams in client-side |
| **API loading** | Sequential SSR: top10 → then macro/health | Client `Promise.all([macro, health, top10])` in parallel |
| **Slow top10** | Blank page until server responds | 10 card skeletons + conviction spread placeholder; KPI/macro skeletons |
| **Pipeline icons** | Lucide components | Reference inline SVGs from `indian-stock-screener.html` |
| **Pipeline flow** | No step arrows | Desktop `→` connectors between nodes (reference `.pipe-arrow`) |
| **Charts / infographics** | Cards + score bars only | + conviction spread bar chart, market bias semi-gauge, macro trend micro-bars, ↑/↓ value cues |
| **KPI placeholders** | Triggers/Insider/Bulk showed `—` | Reference-style demo values (23 / 7 / 11) until dedicated API fields exist |

---

## Reference HTML — visual inventory

`indian-stock-screener.html` uses **CSS + inline SVG** (no canvas, recharts, donut, or heat-map grid). Inventory:

| Element | Type | In React screener |
|---------|------|-------------------|
| Logo sparkline SVG | SVG path + dot | ✅ Header |
| Pulsing status dot | CSS animation | ✅ Header |
| IST clock | JS interval | ✅ `ScreenerClock` |
| KPI grid (6 cards) | Typography | ✅ + skeleton while loading |
| Next-run banner | Styled box | ✅ |
| Top 10 score bars | CSS gradient `.score-fill` | ✅ Per card |
| Conviction spread | — | ✅ **Added** `ScreenerScoreDistribution` |
| Pipeline 5 steps | Inline SVG in colored boxes | ✅ **Fixed** `screener-infographics.tsx` |
| Pipeline arrows | CSS `pipe-arrow` | ✅ **Added** (lg breakpoint) |
| Delivery channel emoji tiles | Static | ✅ |
| Monitoring table + badges | Table | ✅ + table skeleton |
| Macro list ↑/↓ colors | Text + `.change-pos/neg` | ✅ **Enhanced** arrows + `MacroTrendBar` |
| Market bias visual | Text “BULL” in KPI | ✅ **Added** `ScreenerMarketBiasGauge` |
| Hot/warm/cool sector pills | CSS tags | ✅ |
| Sidebar pipeline-mini | Static sidebar | ⏭ AppShell sidebar (not duplicated) |
| Theme toggle | Button in reference topbar | ⏭ AppShell / global theme |

---

## Performance strategy

1. **`page.tsx`** — Renders only `<ScreenerDashboard />` (no `loadTop10`, `getMacro`, `getHealth` on server).
2. **`screener-dashboard.tsx`** — Client fetches macro + health + top10 in parallel; top10 keeps 180s timeout.
3. **Progressive UI** — Pipeline, channels, headers, and automation banner render on first paint; KPI/macro/top10/watchlist sections use screener-themed skeletons.
4. **Target** — Meaningful layout & static infographics in **&lt;2s**; live picks/table/KPI numbers when API returns (up to ~2 min cold top10).

Pattern aligned with `immediate-opportunities-section.tsx` (client fetch + skeleton grid).

---

## Routes

| Route | Change |
|-------|--------|
| `/screener` | Client-hydrated dashboard (no SSR API block) |

---

## Key files

| File | Purpose |
|------|---------|
| `frontend/src/app/screener/page.tsx` | Instant shell — delegates to client dashboard |
| `frontend/src/components/screener/screener-dashboard.tsx` | Parallel client API loads |
| `frontend/src/components/screener/screener-view.tsx` | Layout + loading states + infographic slots |
| `frontend/src/components/screener/screener-infographics.tsx` | Pipeline SVGs, score spread, bias gauge, macro bars |
| `frontend/src/components/screener/screener-skeletons.tsx` | KPI / card / table / macro skeletons |
| `frontend/src/components/screener/screener-data-notice.tsx` | Client-side API / demo notice |
| `frontend/src/components/screener/screener-sections.tsx` | KPIs, pipeline, channels, macro/sectors |
| `frontend/src/lib/screener-data.ts` | Transforms + demo macro/KPI fallbacks |

---

## Live data wiring

| UI Section | API | Notes |
|------------|-----|-------|
| Top 10 cards | Client `top10` | Skeleton until loaded |
| KPI grid | Client `health` + `macro` + picks count | Skeleton until macro/health done |
| Monitoring table | Derived from picks | Skeleton with top10 |
| Macro snapshot | Client `macro` | Demo fallback + trend bars |
| Hot sectors | Static tags | Same as reference |
| Pipeline / channels | Static | Immediate paint |

**API URL:** `NEXT_PUBLIC_SHEETS_API_URL` (Vercel env).

---

## Build & deploy

```bash
cd frontend && npm run build   # ✓ passed
vercel --prod --yes            # ✓ dpl_6r1bXm7Y6u4XSJkygb3duPoDFEAx
```

**Aliases:** https://equityiq-gamma.vercel.app → production

---

## Prior deploy (initial screener UI)

**Deploy ID:** `dpl_5PMWRD5NsFvakvhD3ryhgLwkWJSH` — first `/screener` route and reference token styling.
