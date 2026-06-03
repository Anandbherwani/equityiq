# Tab 10 scoring matrix (10. SCORING MODEL)

One row per eligible UNIVERSE symbol. **Scoring Engine 2.0:** conviction **M** = capped sum of **C–J** (100 pts max). Point rules: **[shared/scoring/CONVICTION_SCORE.md](../shared/scoring/CONVICTION_SCORE.md)**. Helpers **N–R** do not add to M; they drive automation into C–J.

**User import required for quantitative columns:** weekly **Screener.in export → Tab 6 FUNDAMENTALS** (see [Import path](#tab-6-screener-import-path)). Tab 2 prices refresh via **Refresh watchlist prices** / `rebuildScoringPipeline` (top 100 symbols, Google Finance).

---

## Conviction components (C–L)

| Col | Field | Max | Current source (function + tab) | Automated? | Why zeros today | Missing logic | Recommended automation |
|-----|-------|-----|--------------------------------|------------|-----------------|---------------|------------------------|
| C | corporate_trigger | 10 | `applyAutoSubScores_` ← helper O; event-age decay from Tab 15 | **Partial** | No Tab 16 rows | Order wins not on Tab 16 | Tab 16 ORDER BOOK; Tab 15 filing dates |
| D | filings_intelligence | 10 | `applyAutoSubScores_` ← helper N; event-age decay | **Partial** | Empty Tab 15 | No filing rows extracted | Tab 15 FILINGS |
| E | business_moat | 12 | `scoreMoatFromFundamentals_` ← Tab 6 | **Partial** | Tab 6 empty | Qualitative moat | Tab 6 ROCE, margin, promoter, debt; staleness zeroes if &gt;180d |
| F | sector_macro | 10 | `applyAutoSubScores_` + Tab 19/20 | **Partial** | Tab 19 empty or sector mismatch | Sector alias gaps | Tab 19 uses canonical taxonomy (Section 12); UNIVERSE `sector` normalized on Screener import |
| G | financial_strength | 12 | `scoreFinancialStrengthFromFundamentals_` | **Partial** | Tab 6 empty | — | Tab 6: ROCE, ROE, rev/pat yoy, debt, current ratio |
| H | valuation | 10 | `scoreValuationFromFundamentals_` | **Partial** | Tab 6 empty | — | Tab 6: `pe`, `pb`, `pe_vs_3y`, `valuation_tag` |
| I | price_volume | 8 | `populateQuantitativeScores_` ← Tab 2 | **Partial** | Tab 2 empty | DMA/RSI | Tab 2 refresh (top 100) |
| J | promoter_activity | 10 | `applyAutoSubScores_` ← Tab 18 | **Partial** | Tab 18 empty | — | Tab 18 |
| K | analyst_revisions | 10 | `applyAutoSubScores_` ← Tab 17 | **Partial** | Tab 17 empty | — | Tab 17 |
| L | institutional_flow | 8 | `populateQuantitativeScores_` ← Tab 4/8 | **Partial** | Tab 4 empty | — | Tab 4 bulk 90d net |

### Focus components (detail)

| Component | Automation rule (Code.gs) | Data dependency |
|-----------|---------------------------|-----------------|
| **E business_moat** | `scoreMoatFromFundamentals_` (max 12); 20% penalty if Tab 6 &gt;90d; zero if &gt;180d | Tab 6 + cap segment |
| **G financial_strength** | `scoreFinancialStrengthFromFundamentals_` (max 12); same staleness rules | Tab 6 weekly Screener import |
| **H valuation** | Cheap vs `valuation_tag` / `pe_vs_3y` | Tab 6 |
| **I price_volume** | Momentum from `chg_pct`, vs DMA columns, RSI if numeric | Tab 2 after price refresh |
| **L institutional_flow** | Net bulk `buy` − `sell` count/value proxy 90d, cap 5 | Tab 4 |

---

## Identity & total (A–B, M)

| Col | Field | Source | Automated? | Why zeros / empty | Missing | Automation |
|-----|-------|--------|------------|-------------------|---------|------------|
| A | symbol | `buildScoringRowFromUniverse_` ← Tab 1 | **Y** | — | — | UNIVERSE eligibility |
| B | company_name | Same | **Y** | — | — | UNIVERSE |
| M | conviction_total | `applyConvictionFormulas_` / `calculateConvictionFromRow_` | **Y** | Sum of C–L all 0 | Sub-scores empty | Auto-fills when C–L populated |

---

## Helper columns (N–R)

| Col | Field | Source | Automated? | Why zeros today | Missing | Automation |
|-----|-------|--------|------------|-----------------|---------|------------|
| N | filings_signal_count_30d | `computeHelperSignalsInternal_` COUNT Tab 15 | **Y** if Tab 15 data | Tab 15 empty | Filing dates/symbols | Tab 15 |
| O | orderbook_signal_count_90d | `computeHelperSignalsInternal_` COUNT Tab 16 | **Y** if Tab 16 data | Tab 16 empty | Order rows | Tab 16 |
| P | promoter_buy_flag_90d | `computeHelperSignalsInternal_` Tab 18 buy 90d | **Y** if Tab 18 data | Tab 18 empty | — | Tab 18 |
| Q | revision_upgrade_count_60d | `computeHelperSignalsInternal_` COUNT Tab 17 | **Y** if Tab 17 data | Tab 17 empty | Upgrade filter | Tab 17 |
| R | sector_strength_rank | `computeHelperSignalsInternal_` Tab 19 via UNIVERSE sector | **Y** if Tab 19 + sector match | Tab 19 empty or alias mismatch | Sector normalization | Tab 19 + Tab 1 `sector` |

---

## Horizons, flags, news boosts (S–AG)

| Col | Field | Source | Automated? | Why empty / false | Missing | Automation |
|-----|-------|--------|------------|-------------------|---------|------------|
| S | positive_signal_count | Not auto-written in script (sheet formula optional) | **N** | No formula in pipeline | COUNTIFS template in SCORING.md | Optional sheet formula or future script |
| T | horizon_1w | Manual / Perplexity | **N** | User never sets | Horizon tagging | Rule: high O+N + conviction → set in `generateRecommendations_` only on Tab 11 output, not Tab 10 |
| U | horizon_1m | Manual | **N** | Same | — | Tab 11 `target_horizon` |
| V | horizon_3m | Manual | **N** | Same | — | Tab 11 lists |
| W | horizon_6_12m | Manual | **N** | Same | — | Tab 11 compounders list |
| X | action_label | Manual default `Watch` in sync | **Partial** | Empty string on new rows | — | Tab 11 `generateRecommendations_` |
| Y | pledge_gt_50 | `universeHardFlags_` | **Y** | Only if pledge>50% | — | Tab 1 `pledge_pct` |
| Z | pump_flag_40pct_30d | `universeHardFlags_` false | **N** | Not computed | Price pump detection | Tab 2 `chg_pct` rule (future) |
| AA | sebi_investigation | Manual false | **N** | — | — | Manual |
| AB | cfo_pat_divergence | Manual false | **N** | — | — | Manual |
| AC | mgmt_exits | Manual false | **N** | — | — | Manual |
| AD | exclude_from_watchlist | `universeHardFlags_` OR flags | **Partial** | pledge>50 only auto | Other flags manual | OR of Y–AC |
| AE | news_boost_trigger | `applyNewsFlowToScores_` | **Partial** | No high materiality Tab 7 | — | Tab 7 |
| AF | news_boost_sector | `applyNewsFlowToScores_` | **Partial** | Same | — | Tab 7 sector tags |
| AG | last_scored_date | `buildScoringRowFromUniverse_` today IST | **Y** | — | — | Each rebuild |

---

## Tab 6 Screener import path

1. Export from **Screener.in** (4–5 cap-band screens for full universe — see `docs/USER_SETUP.md`).
2. **Stock Tracker → Import Screener CSV to Tab 6** (selection or paste); merges on NSE symbol, sets `sector_normalized`, `last_updated`, `stale_flag`.
3. Run **Rebuild scoring pipeline** — `populateQuantitativeScores_()` + `data_gate_flag` / `quality_rank` on Tab 10.
4. Tab 1 `sector` and `market_cap_cr` updated from merge where present.

---

## Perplexity (no new prompt files)

| Use | Where | Default |
|-----|-------|---------|
| News → Tabs 15–20 | `buildNewsExtractionUserPrompt_` + Section 14 schema reference in Code.gs | On if `PERPLEXITY_API_KEY` |
| Moat news enrichment | `enrichMoatFromNews_` inline prompt in Code.gs | **Off** (`APPLY_PERPLEXITY_SCORES=false`) |
| Stock cards | `backend/intelligence/sections/04-stock-cards.md` manual paste | Optional override C–L |

---

## Pipeline order (`rebuildScoringPipeline`)

1. `syncScoringFromUniverse`
2. `refreshWatchlistPricesSilent_` (top 100 symbols)
3. `computeHelperSignalsInternal_`
4. `applyNewsFlowToScores_`
5. `populateQuantitativeScores_`
6. `applyAutoSubScoresAndRefreshTotals_`
7. `generateRecommendations_` (Tab 11 all lists)

Tab **11b** deprecated. Tab **21** optional — pipeline no longer writes stubs; evidence lives in Tab 11 `evidence` column.
