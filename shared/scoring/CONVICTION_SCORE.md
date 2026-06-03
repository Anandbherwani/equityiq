# Conviction Score 2.1 — pillar inputs (C–K)

**Version:** 2.1 pillars · **3.1 tiered final score**  
**Pillar rules:** this document  
**Final investment score (M):** [`docs/CONVICTION_METHODOLOGY.md`](../../docs/CONVICTION_METHODOLOGY.md) — **not** a simple sum when Conviction Engine 3.1 is on.

**Implementation:** `Code.gs` + `QualityPillarScoring.gs` + `ConvictionEngine3.gs`  
**Sheet:** Tab **10** — columns **C–K** are pillar **inputs**; **M** = `opportunity_rank` from the five-stage funnel (quality → valuation → catalyst → rank). **L** = `moat_confidence_pct` (metadata).

---

## Master formula (legacy additive — disabled when Engine 3.1 is on)

When `USE_CONVICTION_ENGINE_3_ = false`, M is the sum below. When Engine 3.1 is on, use the tiered framework instead:

```
conviction_total (M) = opportunity_rank   // Engine 3.1 — see CONVICTION_METHODOLOGY.md

// Legacy only:
conviction_total (M) = ROUND( MIN(C,15)+MIN(K,10)+MIN(D,15)+…+MIN(J,5), 0 )
```

Capped at **100** per pillar before any legacy sum.

**Quality rank (AL)** — not part of the 100, but used for Tab 11 ranking:

```
quality_rank = ROUND(conviction_total × (data_completeness_pct / 100) × (1 − staleness_penalty))
```

- `data_completeness_pct`: share of 5 key Tab 6 fields present (ROCE, ROE, rev YoY, debt/equity, P/E).  
- `staleness_penalty`: 0.2 if Tab 6 is stale (&gt;90d) or `stale_flag` TRUE; 0 otherwise.  
- `data_gate_flag`: TRUE when ≥3 of those 5 fields are populated.

---

## Component map (Tab 10)

| Col | Field | Max | What it measures |
|-----|--------|-----|------------------|
| C | **fundamentals** | 15 | Business quality (ROCE/ROE/margin) — auto + universe fallback |
| D | **valuation** | 15 | Cheap vs history; price proxy if Tab 6 missing |
| E | **growth** | 15 | Revenue, PAT, EBITDA growth (Tab 6) |
| F | **financial_strength** | 15 | Leverage, liquidity, FCF; pledge fallback |
| G | **sector_strength** | 10 | Tab 19 + macro beneficiaries |
| H | **news_events** | 10 | Events + Tab 7 news |
| I | **technical_momentum** | 5 | Tab 2 GOOGLEFINANCE; baseline 2 if no price |
| J | **institutional_flow** | 5 | Tab 4 / 17 / 18 / 6 FII / Tab 8 macro |
| K | **business_moat** | 10 | Moat pillar — see QUALITY_PILLARS.md |
| L | **moat_confidence_pct** | — | Avg pillar confidence (not in M) |
| M | **conviction_total** | 100 | Sum of C–K (except L) |
| N–R | *helpers* | — | Counts/flags; drive automation into C–J (not added to M) |

---

## C — Fundamentals quality (0–15)

**Function:** `scoreFundamentalsQualityOnly_(f, capSegment)` (Engine 2.1)  
**Primary data:** Tab **6**; **fallback:** Tab **1** cap/pledge via `scoreFundamentalsQualityUniverseFallback_`.  
**Pair with:** **K business_moat** (0–10) — see [`QUALITY_PILLARS.md`](QUALITY_PILLARS.md).

| Rule | Points |
|------|--------|
| ROCE ≥ 25% | +5 |
| ROCE ≥ 18% | +3 |
| ROCE ≥ 12% | +2 |
| ROE ≥ 20% | +3 |
| ROE ≥ 15% | +2 |
| EBITDA margin ≥ 20% | +3 |
| EBITDA margin ≥ 12% | +1 |
| Promoter holding ≥ 50% | +2 |
| Cap segment = `large` | +1 |

**Cap:** 15. Moat-specific points are in **K**, not C.

---

## D — Valuation (0–15)

**Function:** `scoreValuationFromFundamentals_(f)`  
**Primary data:** Tab 6 — `valuation_tag`, `pe_vs_3y`, `pe`, `pb`.

| Rule | Points |
|------|--------|
| Base | 5 |
| Tag contains `cheap` or `underv` | +4 |
| Tag `fair` | +1 |
| Tag `expensive` or `rich` | −2 |
| `pe_vs_3y` &gt; 0 and &lt; 0.9 (below 3Y avg) | +2 |
| `pe_vs_3y` &gt; 1.2 | −1 |
| P/E &gt; 0 and &lt; 18 | +2 |
| P/E &gt; 45 | −1 |
| P/B &gt; 0 and &lt; 2 | +1 |
| P/B &gt; 5 | −1 |

**Floor:** 0. **Cap:** 15.

---

## E — Growth (0–15)

**Function:** `scoreGrowthFromFundamentals_(f)`  
**Primary data:** Tab 6 — `rev_yoy`, `pat_yoy`, `ebitda_yoy`.

| Rule | Points |
|------|--------|
| Revenue YoY ≥ 20% | +6 |
| Revenue YoY ≥ 12% | +4 |
| Revenue YoY ≥ 8% | +2 |
| PAT YoY ≥ 20% | +5 |
| PAT YoY ≥ 12% | +3 |
| PAT YoY ≥ 8% | +2 |
| EBITDA YoY ≥ 15% | +4 |
| EBITDA YoY ≥ 8% | +2 |

**Cap:** 15 (double-counting across lines is intentional — strong growers can hit cap quickly).

---

## F — Financial strength (0–15)

**Function:** `scoreFinancialStrengthFromFundamentals_(f)`  
**Primary data:** Tab 6 — `debt_equity`, `current_ratio`, `fcf_trend`, `dividend_yield`.

| Rule | Points |
|------|--------|
| Debt/equity &gt; 0 and &lt; 0.5 | +5 |
| Debt/equity &gt; 0 and ≤ 1.0 | +3 |
| Current ratio ≥ 1.5 | +3 |
| FCF trend contains `improv` or `positive` | +4 |
| Dividend yield ≥ 1% | +1 |

**Cap:** 15.

**Note:** v1 mixed growth + leverage in one “financial_strength” column; v2 moves growth to **E** so turnarounds (high F + D) are visible.

---

## G — Sector strength (0–10)

**Functions:** `scoreSectorStrengthSuggestion_`, `applyMacroBeneficiariesToData_`  
**Primary data:** Tab **19. SECTOR STRENGTH** (helper **R**), Tab **20. MACRO BENEFICIARIES**, UNIVERSE sector.

| Source | Rule | Points (capped at 10) |
|--------|------|------------------------|
| Sector rank R ≤ 3 | Top-tier sector week | up to 8 |
| Sector rank R 4–7 | Mid tier | up to 5 |
| Sector rank R &gt; 7 | Weak sector | up to 2 |
| Tab 19 narrative/macro/flow scores | No rank on row | `min(10, round(max(narrative, macro, flow) × 0.8))` |
| Tab 20 beneficiary symbol hit | Per hit | `min(10, hits × 3)` |
| Tab 20 beneficiary sector hit | Per hit | `min(10, hits × 2)` |

**Automation:** `applyAutoSubScores_` writes suggested sector into **G** if higher than current. Manual scores preserved if higher.

---

## H — News & events (0–10)

**Functions:** `scoreNewsEventsFromSignals_`, `applyNewsFlowToScores_`  
**Primary data:** Helpers **N** (filings 30d), **O** (orders 90d), **P** (promoter buy), **Q** (revisions 60d), Tab **7. NEWS FLOW**, Tabs **15–18** (via pipeline).

| Signal | Formula (before decay) | Max contribution |
|--------|------------------------|------------------|
| Order book count O | `min(4, O × 2)` | 4 |
| Filings count N | `min(3, N × 1.5)` | 3 |
| Promoter buy flag P | +2 if TRUE | 2 |
| Revision upgrades Q | `min(2, Q × 1)` | 2 |
| Tab 7 per symbol (7d) | high×3 + medium×2 + low, capped | merged into H |
| Tab 7 sector theme | sector news count × 2 | merged into G (sector), not H |

**Event age decay** (latest Tab 15 filing date per symbol):

| Age of latest event | Multiplier on H automation |
|---------------------|----------------------------|
| ≤ 14 days | 1.0 |
| ≤ 30 days | 0.85 |
| ≤ 60 days | 0.65 |
| ≤ 90 days | 0.45 |
| &gt; 90 days | 0.25 |

**Cap:** 10. v1 split this across corporate_trigger, filings, promoter, analyst; v2 **aggregates** into one auditable bucket.

---

## I — Technical momentum (0–5)

**Function:** `technicalMomentumScore(symbol, ctx)` in `TechnicalMomentumEngine.gs` (via `scoreTechnicalMomentumComponent_`).  
**Docs:** [`docs/TECHNICAL_MOMENTUM_ENGINE.md`](../../docs/TECHNICAL_MOMENTUM_ENGINE.md)

**Primary data:** Tab **2** — RSI, 50/200 DMA, relative strength vs Nifty, 52w breakout (`high_52w`), volume surge, price trend.

Returns **score**, **classification** (`bullish` | `neutral` | `bearish`), `confidence`, `source`, `date`, `rationale`.

**Legacy fallback:** `scoreTechnicalMomentum_(p)` if engine file not loaded.

**Cap:** 5.

---

## J — Institutional flow (0–5)

**Function:** `institutionalFlowScore(symbol, ctx)` in `InstitutionalFlowEngine.gs` (wired via `scoreInstitutionalFlowComponent_`).  
**Docs:** [`docs/INSTITUTIONAL_FLOW_ENGINE.md`](../../docs/INSTITUTIONAL_FLOW_ENGINE.md)

**Primary data:** Tab **4** bulk/block (90d), Tab **24** shareholding deltas, Tab **18** promoter buy/sell, Tab **5** insider, Tab **6** FII snapshot, Tab **17** upgrades (secondary), Tab **8** macro FII/DII.

Signals use weighted contributions (bulk/block, FII/DII/MF deal tags, shareholding Δ, promoter activity); weights sum and **round** to 0–5. Returns `confidence`, `source`, `date`, `rationale`, and `missing[]` for thin data.

**Legacy fallback:** `scoreInstitutionalFlow_(bulk, fiiBias)` if the engine file is not loaded.

**Cap:** 5.

---

## Helpers N–R (not in the 100)

These **do not** add to conviction_total. They exist so you can audit *why* H and G moved.

| Col | Field | How it is filled |
|-----|--------|------------------|
| N | filings_signal_count_30d | COUNT Tab 15 last 30d |
| O | orderbook_signal_count_90d | COUNT Tab 16 last 90d |
| P | promoter_buy_flag_90d | Tab 18 buy in 90d |
| Q | revision_upgrade_count_60d | COUNT Tab 17 last 60d |
| R | sector_strength_rank | Tab 19 vs UNIVERSE sector |

Menu: **Stock Tracker → Compute scoring helpers** (or full rebuild).

---

## Tab 11 — how lists use v2 columns

Filters in `pickRecommendationCandidates_` (still conviction-first, but gates use v2 names):

| List | Gate (simplified) | Sort key emphasis |
|------|-------------------|-------------------|
| Immediate | `news_events` + helpers / horizons; conviction ≥ 30 | news_events |
| 3-Month | data gate + sector rank; conviction ≥ 28 | growth + fundamentals + valuation |
| Compounders | data gate; fundamentals ≥ 15, financial_strength ≥ 9 | fundamentals + financial + growth |
| Monopoly | data gate; **fundamentals ≥ 20** | fundamentals |
| Government beneficiaries | sector_strength ≥ 6 + macro beneficiary set | sector_strength + news_events |
| Turnarounds | valuation ≥ 5, financial_strength ≥ 5, no pump flag | financial_strength + growth |

---

## Migration from v1 (10 columns C–L)

| v1 column | v2 destination |
|-----------|----------------|
| business_moat (E) | Mostly **C fundamentals** |
| financial_strength (G) | Split → **E growth** + **F financial_strength** |
| valuation (H) | **D valuation** |
| sector_macro (F) | **G sector_strength** |
| corporate_trigger + filings + promoter + analyst (C,D,J,K) | **H news_events** |
| price_volume (I) | **I technical_momentum** (rescaled) |
| institutional_flow (L) | **J institutional_flow** (rescaled) |

After deploying v2 script: run **Rebuild scoring pipeline from UNIVERSE** so C–J are recomputed; old sub-scores in wrong columns are overwritten.

---

## What is *not* in the 100 (by design)

- Perplexity narrative scores (unless `APPLY_PERPLEXITY_SCORES=true`, which only nudges **C** from headlines).  
- Manual overrides: any column C–J can be raised in the sheet; rebuild uses `Math.max(auto, existing)` for quantitative columns.  
- Hard flags (pledge &gt;50%, pump, SEBI, etc.) — column **AD** `exclude_from_watchlist`; they **exclude** Tab 11, not subtract points.

---

## Verification

1. **Stock Tracker → Run full system audit** — stage `conviction_distribution` recomputes M from C–J.  
2. Pick one symbol: add up C–J by hand; compare to M.  
3. API: `?action=symbol&symbol=RELIANCE` returns `scoring` object with v2 field names (`WebAppApi.gs`).

For architecture and pipelines see [SCORING.md](./SCORING.md) and [docs/TAB10_SCORING_MATRIX.md](../../docs/TAB10_SCORING_MATRIX.md) (matrix updated for v2).
