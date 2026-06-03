# Data Quality Engine

**Version:** 1.0  
**Apps Script:** `backend/automation/DataQualityEngine.gs`  
**Tab 10 columns:** `data_quality_pct` (AP) = **quality_score**, `quality_grade` (AQ) = **A–F**  
**Tab 11 gate:** `quality_score` &lt; **60** → cannot enter recommendations

---

## API

### `dataQualityScore(symbol, ctx?, rowOpts?)`

| Field | Type | Description |
|-------|------|-------------|
| `quality_score` | 0–100 | Composite data quality (same value written to `data_quality_pct`) |
| `quality_grade` | A–F | Letter grade from score bands |
| `components` | object | Per-dimension scores 0–100 |
| `missing` | string[] | Gap codes |
| `stale` | string[] | Staleness codes |
| `data_gate_flag` | boolean | ≥3 key Tab 6 fields (ROCE, ROE, rev, debt, P/E) |
| `rationale` | string | One-line summary |
| `tab11_eligible` | boolean | `quality_score >= 60` |

**Batch:** `buildDataQualityContext_(ss)` once per rebuild → score each symbol in `applyScoringDataMetrics_`.

**Menu:** **Stock Tracker → Preview data quality scores**

---

## Composite formula

```
quality_score = ROUND(
  fundamentals_coverage      × 25%
+ sector_mapping             × 10%
+ valuation_availability     × 15%
+ momentum_availability      × 15%
+ news_availability          × 10%
+ institutional_availability × 15%
+ freshness                  × 10%
)
```

Each dimension is scored **0–100** independently, then weighted.

---

## Dimension rules

### 1. Fundamentals coverage (25%)

Tab **6. FUNDAMENTALS** field presence:

| Field | Points |
|-------|--------|
| ROCE | 18 |
| ROE | 18 |
| Rev YoY | 14 |
| PAT YoY | 14 |
| P/E | 12 |
| P/B | 12 |
| Debt/equity | 12 |

No Tab 6 row → **0** + `TAB6_ROW`.

### 2. Sector mapping (10%)

| Check | Points |
|-------|--------|
| Tab 1 sector | 40 |
| Tab 6 `sector_normalized` | 35 |
| Tab 1 `market_cap_cr` | 25 |

### 3. Valuation availability (15%)

| Field | Points |
|-------|--------|
| P/E | 30 |
| P/B | 25 |
| `pe_vs_3y` | 25 |
| `valuation_tag` | 20 |

### 4. Momentum availability (15%)

Tab **2. PRICE & TECHNICALS**:

| Check | Points |
|-------|--------|
| Price present | 25 base |
| DMA50 | 20 |
| DMA200 | 20 |
| vs 50 DMA | 15 |
| vs 200 DMA | 10 |
| RSI | 10 |
| 52w high | 5 |

### 5. News availability (10%)

Tab **7. NEWS FLOW** (30d symbol-tagged headlines):

| Headlines | Score |
|-----------|-------|
| ≥ 5 | 100 |
| 2–4 | 70 |
| 1 | 45 |
| 0 | 15 + `TAB7_NEWS` |

Boost if Tab 10 `news_events` ≥ 4 or filings/order helpers &gt; 0.

### 6. Institutional data availability (15%)

| Source | Points |
|--------|--------|
| Tab 4 deals for symbol | +30 |
| Tab 24 shareholding row | +25 |
| Tab 18 promoter activity | +20 |
| Tab 6 `fii_holding` | +15 |

Global empty tabs add `TAB4_EMPTY` / `TAB24_EMPTY` (symbol still penalized).

### 7. Freshness (10%)

Starts at **100**, penalties:

| Condition | Penalty |
|-----------|---------|
| No Tab 6 | −50 |
| Tab 6 age ≥ 180d or stale flag | −50 (`TAB6_STALE_FLAG`) |
| Tab 6 age ≥ 90d | −25 |
| No Tab 2 price | −25 |
| Tab 2 age ≥ 30d | −30 (`TAB2_STALE`) |
| Tab 2 age ≥ 7d | −15 |

---

## Letter grades

| Grade | Score range | Tab 11 |
|-------|-------------|--------|
| **A** | 90–100 | Eligible |
| **B** | 80–89 | Eligible |
| **C** | 70–79 | Eligible |
| **D** | 60–69 | Eligible |
| **F** | 0–59 | **Blocked** |

Constant: `DATA_QUALITY_TAB11_MIN_SCORE_ = 60` in `DataQualityEngine.gs`  
`RecommendationEngine.gs` uses the same threshold via `REC_FILTER_MIN_DATA_QUALITY_`.

---

## Tab 10 persistence

On **Rebuild scoring pipeline** / `applyScoringDataMetrics_`:

| Column | Field | Engine output |
|--------|-------|---------------|
| AP (41) | `data_quality_pct` | `quality_score` |
| AQ (42) | `quality_grade` | A–F |
| AH (35) | `data_completeness_pct` | avg of coverage dimensions |
| AN (39) | `stale_data_flags` | `stale[]` joined |
| AM (38) | `missing_data_flags` | `missing[]` joined |

Legacy columns (freshness %, source reliability, data gate) are derived in `mapDataQualityToLegacyReport_()` for backward compatibility.

---

## Integration

| Consumer | Behavior |
|----------|----------|
| **Tab 11** | `passesRecommendationQualityGate_` rejects `dataQualityPct < 60` |
| **Web App** | `quality_score`, `quality_grade`, `data_quality.tab11_eligible` on symbol payload |
| **EquityIQ** | `data_quality_pct` badge; optional grade display |
| **Conviction** | `quality_rank` still uses completeness × staleness penalty (unchanged) |

---

## Deploy checklist

1. Paste **`DataQualityEngine.gs`** with other `.gs` files.  
2. **Setup all sheet tabs** (adds `quality_grade` header on Tab 10).  
3. Import **Tab 6** fundamentals + **Refresh watchlist prices** (Tab 2).  
4. Optional: Tab 4, 24, 18, 7 for institutional/news dimensions.  
5. **Rebuild scoring pipeline from UNIVERSE**.  
6. **Preview data quality scores** → verify grades.  
7. **Sync recommendations (Tab 11)** — only grade D+ (≥60) pass.

---

## Example

| Symbol | Score | Grade | Tab 11 | Weak dimensions |
|--------|-------|-------|--------|-----------------|
| RELIANCE | 72 | C | Yes | institutional_availability=45 |
| NEWLIST | 38 | F | No | fundamentals=0, TAB6_ROW |

---

## Related docs

- [`shared/scoring/DATA_QUALITY.md`](../shared/scoring/DATA_QUALITY.md) — legacy column reference  
- [`docs/RECOMMENDATION_ENGINE_REVIEW.md`](RECOMMENDATION_ENGINE_REVIEW.md) — Tab 11 filters  
- [`shared/scoring/CONVICTION_SCORE.md`](../shared/scoring/CONVICTION_SCORE.md)
