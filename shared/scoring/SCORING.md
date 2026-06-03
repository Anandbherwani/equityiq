# Scoring model (Tab 10) — pipeline & workflow

> **Conviction math (Scoring Engine 2.0):** see **[CONVICTION_SCORE.md](./CONVICTION_SCORE.md)** — full 100-point breakdown, every rule, no black box.

# Scoring model (Tab 10) — v2 event-led

## UNIVERSE-driven workflow (no manual symbols)

Tab **10** is populated by Apps Script **Rebuild scoring pipeline from UNIVERSE**:

1. `getEligibleUniverseRows_()` filters Tab 1 (`MIN_MARKET_CAP_CR` 500, pledge &lt; 30%, no NCLT/bad audit, liquidity/large/mid rules in `Code.gs`)
2. One row per eligible symbol — `symbol`, `company_name` from UNIVERSE; hard flags from pledge/NCLT
3. Helpers N–R from Tabs 15–18
4. Optional `APPLY_AUTO_SUB_SCORES` fills C–J caps from helpers
5. Column **M** `conviction_total` via formula or script
6. `populateQuantitativeScores_()` fills E,G,H,I,L from Tabs 6, 2, 4 (after helpers)
7. Tab **11** six Top-10 recommendation lists via `generateRecommendations_()` (see [TAB10_SCORING_MATRIX.md](../../docs/TAB10_SCORING_MATRIX.md))

Perplexity paste into C–J is optional refinement; rebuild **preserves** existing sub-scores per symbol.

**Why sub-scores stay low:** Event components (C,D,F,J,K) need Tabs 15–18 populated. Quantitative E,G,H,I,L need **Tab 6 Screener CSV** and **Tab 2** price refresh (runs in rebuild for top 100 symbols).

## Conviction components (100 points) — Engine 2.0

| Col | Field | Max |
|-----|-------|-----|
| A | symbol | — |
| B | company_name | — |
| C | fundamentals | 25 |
| D | valuation | 15 |
| E | growth | 15 |
| F | financial_strength | 15 |
| G | sector_strength | 10 |
| H | news_events | 10 |
| I | technical_momentum | 5 |
| J | institutional_flow | 5 |
| K–L | legacy_reserved | 0 |
| M | conviction_total | 100 (sum C–J) |
| AH | data_gate_flag | ≥3 of 5 key Tab 6 fields |
| AI | fundamentals_age_days | from Tab 6 `last_updated` |
| AJ | data_completeness_pct | 0–100 |
| AK | staleness_penalty | 0–0.2 |
| AL | quality_rank | conviction × completeness × (1 − penalty) |
| AM | missing_data_flags | comma codes — see DATA_QUALITY.md |
| AN | stale_data_flags | comma codes |
| AO | source_reliability_pct | 0–100 |
| AP | **data_quality_pct** | **composite Data Quality % (display everywhere)** |

### Master formula (cell M2)

Sub-scores in C2:J2 (see CONVICTION_SCORE.md for point rules):

```excel
=ROUND(
  MIN(C2,25)+MIN(D2,15)+MIN(E2,15)+MIN(F2,15)+MIN(G2,10)+MIN(H2,10)+MIN(I2,5)+MIN(J2,5)
,0)
```

**Column letters:** conviction = **M**; components **C–J**.

## Helper columns (suggest only — not in conviction sum)

| Col | Field | Source |
|-----|-------|--------|
| N | filings_signal_count_30d | Tab 15 COUNTIFS 30d |
| O | orderbook_signal_count_90d | Tab 16 COUNTIFS 90d |
| P | promoter_buy_flag_90d | Tab 18 buy in 90d |
| Q | revision_upgrade_count_60d | Tab 17 upgrades 60d |
| R | sector_strength_rank | Tab 19 vs UNIVERSE sector |

### N — filings_signal_count_30d (example M2 row → use N2)

```excel
=COUNTIFS('15. FILINGS'!B:B,A2,'15. FILINGS'!A:A,">="&TODAY()-30)
```

Adjust `A:A`/`B:B` if date/symbol columns differ after import.

### O — orderbook_signal_count_90d

```excel
=COUNTIFS('16. ORDER BOOK TRACKER'!A:A,A2,'16. ORDER BOOK TRACKER'!B:B,">="&TODAY()-90)
```

### P — promoter_buy_flag_90d

```excel
=IF(COUNTIFS('18. PROMOTER ACTIVITY'!A:A,A2,'18. PROMOTER ACTIVITY'!F:F,"buy",'18. PROMOTER ACTIVITY'!B:B,">="&TODAY()-90)>0,TRUE,FALSE)
```

(`F:F` = transaction_type; verify column after setup.)

### Q — revision_upgrade_count_60d

```excel
=COUNTIFS('17. ANALYST REVISIONS'!A:A,A2,'17. ANALYST REVISIONS'!B:B,">="&TODAY()-60)
```

Refine manually when `rating_new` / `target_new` imply downgrade only.

### R — sector_strength_rank

```excel
=IFERROR(VLOOKUP(INDEX('1. UNIVERSE'!D:D,MATCH(A2,'1. UNIVERSE'!A:A,0)),'19. SECTOR STRENGTH'!B:B,'19. SECTOR STRENGTH'!F:F,FALSE),"")
```

Use latest `week_ending` block on Tab 19 (filter or sort weekly).

Apps Script **computeScoringHelpers** fills N–R for all Tab 10 symbols.

## Hard filters (exclude Tab 11)

| Col | Flag | Rule |
|-----|------|------|
| X | pledge_gt_50 | UNIVERSE pledge_pct > 50 |
| Y | pump_flag_40pct_30d | manual / price tab |
| Z | sebi_investigation | manual |
| AA | cfo_pat_divergence | manual |
| AB | mgmt_exits | manual |
| AC | exclude_from_watchlist | `=OR(X2,Y2,Z2,AA2,AB2)` |

*(Letters assume schema through `last_scored_date` in col AF; verify against row 1 headers.)*

## Positive signal count (column S / positive_signal_count)

```excel
=IF(N2>0,1,0)+IF(O2>0,1,0)+IF(P2=TRUE,1,0)+IF(Q2>0,1,0)+IF(R2<>"",1,0)
+IF(COUNTIF('3. NSE/BSE ANNOUNCEMENTS'!A:A,A2)>0,1,0)
```

Cap display at 10.

## News → score linkage (hints only)

**Automated (v3):** `applyNewsFlowToScores_()` runs inside `rebuildScoringPipeline` — Tab 7 materiality bumps **H news_events** / **G sector_strength**; `runNewsIntelligencePipeline` fills Tabs 15–20 via Perplexity Section 14, then helpers N–R and `applyAutoSubScores_` apply.

Columns **AD–AE** (`news_boost_trigger`, `news_boost_sector`) — suggested boosts 0–5 each. Prefer Tab 15 over Tab 7 when `confirmed_flag` TRUE.

## Filings priority

If Tab 3 `confirmed_flag` = TRUE for same event as Tab 7 news, score `corporate_trigger` / `filings_intelligence` from Tab 15 only.

## Tab 11 — recommendation lists (conviction engine)

**Stock Tracker → Rebuild scoring pipeline** writes Tab **11. RANKED WATCHLIST** with six lists (10 rows each max):

| list_name | Filter logic (Code.gs) |
|-----------|-------------------------|
| Top 10 Immediate Opportunities | Short horizon or order/filing signals + conviction ≥40 |
| Top 10 3-Month Opportunities | 3m horizon or sector rank ≤10 |
| Top 10 12-Month Compounders | Moat + financial strength + long horizon |
| Top 10 Monopoly Businesses | Moat ≥8 |
| Top 10 Government Beneficiaries | Sector macro + Tab 20 beneficiaries |
| Top 10 Turnarounds | Valuation + improving financials, no pump flag |

Columns: `list_name`, `rank`, `symbol`, `company_name`, `sector`, `conviction_total`, `bull_case`, `bear_case`, `catalyst`, `target_horizon`, `evidence`, `last_updated`.

Tab **11b** is **deprecated** (no new tab created in setup).

## Tables A–D

Paste Perplexity Section 5 output into **21. ANALYSIS_OUTPUT** using `table_id`: A, B, C, D.

## Event tabs → scoring guide

| Tab | Use for columns |
|-----|-----------------|
| 15 FILINGS | D filings_intelligence, C corporate_trigger |
| 16 ORDER BOOK | C, D; helper O |
| 17 ANALYST REVISIONS | K analyst_revisions; helper Q |
| 18 PROMOTER ACTIVITY | J promoter_activity; helper P |
| 19 SECTOR STRENGTH | F sector_macro; helper R |
| 20 MACRO BENEFICIARIES | F sector_macro (beneficiary/loser themes) |
