# Recommendation Engine Review

**Version:** 1.0  
**Apps Script:** `backend/automation/RecommendationEngine.gs` + `generateRecommendations_` / `pickRecommendationCandidates_` in `Code.gs`  
**Output tab:** **11. RANKED WATCHLIST** (six Top-10 lists)  
**Audit sheet:** **RECOMMENDATION REVIEW** (written by menu audit)

This document defines how Tab 11 picks are built, filtered, and reviewed. Every live recommendation should expose **why it ranked**, **score breakdown**, **data quality**, **confidence**, **catalyst**, and **risk**.

---

## Global quality gates (required)

Symbols must pass **all** gates before they can appear on Tab 11. Implemented in `passesRecommendationQualityGate_()`.

| Gate | Threshold | Reject code |
|------|-----------|-------------|
| **Minimum conviction** | M ≥ **20** | `LOW_CONVICTION_*` |
| **Minimum data quality** | `quality_score` / `data_quality_pct` ≥ **60** (grade D+) — see [`DATA_QUALITY_ENGINE.md`](DATA_QUALITY_ENGINE.md) | `LOW_DATA_QUALITY_*` |
| **Minimum confidence** | Tab 11 confidence ≥ **50** | `LOW_CONFIDENCE_*` |
| **Not stale** | No `TAB2_STALE` / `TAB6_STALE*` in Tab 10 `stale_data_flags`; fundamentals age &lt; 180d | `STALE_DATA` |
| **Not news-only** | See below | `NEWS_ONLY_THESIS` |
| **Not excluded** | `exclude_from_watchlist` false | `EXCLUDED_WATCHLIST` |

Constants (edit in `RecommendationEngine.gs`):

```javascript
REC_FILTER_MIN_DATA_QUALITY_ = DATA_QUALITY_TAB11_MIN_SCORE_ (60);
REC_FILTER_MIN_CONFIDENCE_ = 50;
REC_FILTER_MIN_CONVICTION_ = 20;
```

### Removed categories

| Category | How detected | Action |
|----------|--------------|--------|
| **Low-quality** | DQ &lt; 60 or confidence &lt; 50 or conviction &lt; 20 | Excluded from pool |
| **Stale** | Tab 10 `stale_data_flags` or aged fundamentals/price | Excluded |
| **Single-news thesis** | `news_events` ≥ 4 but core pillars &lt; 10–14 and no OB/filings/promoter/analyst; or exactly **1** Tab 7 headline in 30d with high H | Excluded |

**Core pillars** (for news-only test): C + K + D + E + F + I + J (fundamentals, moat, valuation, growth, financial, technical, institutional).

---

## Confidence formula

`computeRecommendationConfidence_(c)`:

```
confidence = min(100, round(conviction × 0.85 + data_quality_pct × 0.15))
```

If `data_gate_flag` is false, DQ is reduced by 15 points before blending. Symbols with confidence &lt; 50 never reach Tab 11 after gating.

---

## Per-list filters (after global gate)

Pool = all Tab 10 candidates that pass global gates. Then list-specific rules in `pickRecommendationCandidates_`:

| List | Filter id | Additional rules (summary) |
|------|-----------|----------------------------|
| Top 10 Immediate Opportunities | `immediate` | Tier full/event; horizon 1w/1m or OB/filings; **conviction ≥ 30**; sort by **news_events** |
| Top 10 3-Month Opportunities | `three_month` | Tier full/watchlist; horizon 3m or sector rank ≤10; conviction ≥ 28; quality_rank ≥ 15 |
| Top 10 12-Month Compounders | `compounders` | Data gate; fundamentals ≥ 15; financial_strength ≥ 9; long horizon / moat |
| Top 10 Monopoly Businesses | `monopoly` | Data gate; moat ≥ 7 or fundamentals+moat ≥ 18 |
| Top 10 Government Beneficiaries | `gov_beneficiary` | sector_strength ≥ 6 + macro beneficiary match |
| Top 10 Turnarounds | `turnaround` | valuation ≥ 5; financial_strength ≥ 5; no pump flag |

Fallback fill (if &lt; 10 names) only pulls from **gate-passing** pool, not the full universe.

---

## What each Tab 11 row shows

| User field | Tab 11 column | Source |
|------------|---------------|--------|
| **Why it ranked** | `bull_case` (prefix) | `buildWhyRanked_` — sort key, sector rank, OB/filings, DQ, data gate |
| **Score breakdown** | `evidence` | `buildScoreBreakdown_` — `C15 K8 D12 E10 F11 G6 H4 I3 J2 M42` |
| **Data quality** | embedded in evidence + API `data_quality_pct` | Tab 10 column AP |
| **Confidence** | `confidence` | Gated composite % |
| **Catalyst** | `catalyst` | OB, filings, sector rank, promoter, analyst |
| **Risk** | `bear_case` | Pump flag, weak quality, default liquidity/sector risk |

**Evidence line format:**

```
Breakdown: C15/15 K8/10 … M42/100 | DQ 72% | Conf 58% | OB:1; Sector rank 3
```

**API (`?action=top10`):** Each item includes `decision.{why,what,risk,catalyst,timeline}`, plus `score_breakdown`, `why_ranked`, `data_quality_pct` when candidate map is available.

---

## Score breakdown legend

| Code | Tab 10 column | Max in M |
|------|---------------|----------|
| C | fundamentals | 15 |
| K | business_moat | 10 |
| D | valuation | 15 |
| E | growth | 15 |
| F | financial_strength | 15 |
| G | sector_strength | 10 |
| H | news_events | 10 |
| I | technical_momentum | 5 |
| J | institutional_flow | 5 |
| M | conviction_total | 100 |

---

## Audit workflow

1. **Rebuild scoring pipeline from UNIVERSE** (Tab 10 + metrics).  
2. **Refresh watchlist prices** (Tab 2 freshness).  
3. **Sync recommendations (Tab 11)** — applies gates + narratives.  
4. **Audit Tab 11 recommendations** — menu → `auditTab11Recommendations`  
   - Writes **RECOMMENDATION REVIEW** sheet (one row per pick).  
   - Stores JSON snapshot in script property `LAST_RECOMMENDATION_ENGINE_REVIEW_JSON`.  
   - Logs reject samples per list.

### RECOMMENDATION REVIEW sheet columns

`list_name`, `rank`, `symbol`, `conviction`, `data_quality_pct`, `confidence`, `why_ranked`, `score_breakdown`, `catalyst`, `risk`, `filter_pass`, `filter_reasons`

---

## Example review row (Immediate list)

| Field | Example |
|-------|---------|
| symbol | RELIANCE |
| conviction | 38 |
| data_quality_pct | 68 |
| confidence | 54 |
| why_ranked | List sort key 6 on filter "immediate"; sector rank #4; data gate pass; DQ 68% |
| score_breakdown | C12/15 K6/10 D8/15 E9/15 F10/15 G5/10 H6/10 I3/5 J2/5 M38/100 |
| catalyst | Order win 90d x1; Sector rank 4 |
| risk | Monitor pledge/liquidity |
| filter_pass | TRUE |

---

## Rejected example (news-only)

| Field | Value |
|-------|--------|
| symbol | XYZ |
| conviction | 24 |
| data_quality_pct | 55 |
| reasons | `LOW_DATA_QUALITY_55_LT_60`, `NEWS_ONLY_THESIS` |
| Action | Not on Tab 11 |

---

## Operational notes

- Empty or thin lists after filtering are **expected** when Tab 6/2/4 are empty — import fundamentals and refresh prices before expecting full Top 10s.  
- Immediate list still requires **conviction ≥ 30** (stricter than global 20).  
- Frontend **EquityIQ** uses `decision` block from API; no rescoring in UI.  
- Edit thresholds in `RecommendationEngine.gs` and redeploy Apps Script.

---

## Files

| File | Role |
|------|------|
| `RecommendationEngine.gs` | Gates, news-only detection, audit, narratives v2 |
| `Code.gs` | `generateRecommendations_`, `pickRecommendationCandidates_` |
| `WebAppApi.gs` | `top10` + `score_breakdown` / `why_ranked` |
| `DailyAutomation.gs` | 8 AM briefing uses Tab 11 rows |

---

## Related docs

- [`shared/scoring/DATA_QUALITY.md`](../shared/scoring/DATA_QUALITY.md)  
- [`docs/FINAL_ACCEPTANCE_TEST.md`](FINAL_ACCEPTANCE_TEST.md)  
- [`shared/scoring/CONVICTION_SCORE.md`](../shared/scoring/CONVICTION_SCORE.md)
