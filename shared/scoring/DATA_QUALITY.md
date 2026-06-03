# Data Quality System (Phase 5)

**Implementation:** `dataQualityScore()` in `backend/automation/DataQualityEngine.gs` → `applyScoringDataMetrics_()` in `Code.gs`  
**Docs:** [`docs/DATA_QUALITY_ENGINE.md`](../../docs/DATA_QUALITY_ENGINE.md)  
**Sheet columns (Tab 10):** `data_completeness_pct` (AJ), `staleness_penalty` (AK), `missing_data_flags` (AM), `stale_data_flags` (AN), `source_reliability_pct` (AO), **`data_quality_pct` (AP)** = `quality_score`, **`quality_grade` (AQ)** = A–F  
**Tab 11:** Recommendations require **quality_score ≥ 60** (grade D or better).  
**Display everywhere:** EquityIQ shows **Data Quality %** and grade from API (`quality_score`, `quality_grade`).

---

## Composite: quality_score (Tab 10 `data_quality_pct`)

Engine 1.0 weighted dimensions (see DATA_QUALITY_ENGINE.md):

| Dimension | Weight |
|-----------|--------|
| Fundamentals coverage | 25% |
| Sector mapping | 10% |
| Valuation availability | 15% |
| Momentum availability | 15% |
| News availability | 10% |
| Institutional availability | 15% |
| Freshness | 10% |

**Grades:** A ≥90, B ≥80, C ≥70, D ≥60, F &lt;60.

Legacy columns `data_completeness_pct`, `source_reliability_pct` are derived from dimension scores for backward compatibility.

---

## 1. Missing data detection

`missing_data_flags` — comma-separated codes when a check fails:

| Code | Condition |
|------|-----------|
| `UNIVERSE_SECTOR` | No sector on Tab 1 — run **Repair sector mapping** / [`SECTOR_INTELLIGENCE_AUDIT.md`](../../docs/SECTOR_INTELLIGENCE_AUDIT.md) |
| `UNIVERSE_MCAP` | No `market_cap_cr` on Tab 1 |
| `TAB6_ROW` | No fundamentals row |
| `TAB6_ROCE` … `TAB6_DEBT` | Individual Tab 6 fields empty/zero |
| `TAB6_SECTOR_NORM` | `sector_normalized` empty after import |
| `TAB2_PRICE` | No price on Tab 2 |
| `TAB2_DMA50` | No 50 DMA |
| `TAB2_RSI` | No RSI |
| `EVENT_SIGNALS` | No filings/order/sector-rank helper activity |

Completeness % = `filled_checks / total_checks × 100` (see `computeDataQualityReport_`).

---

## 2. Stale data detection

`stale_data_flags` — comma-separated codes:

| Code | Condition |
|------|-----------|
| `TAB6_AGE_Nd` | Tab 6 `last_updated` older than 90 days (N = age) |
| `TAB6_STALE_FLAG` | Tab 6 `stale_flag` TRUE or age ≥ 180 days |
| `TAB2_AGE_Nd` | Tab 2 `as_of_date` older than 7 days |
| `TAB2_STALE` | Tab 2 price older than 30 days |

**Freshness %** starts at 100 and subtracts:

- No Tab 6 row: −50  
- Tab 6 age ≥ 180d or stale flag: −50 (else ≥90d: −25)  
- No Tab 2 price: −25  
- Tab 2 age ≥ 30d: −30 (else ≥7d: −15)  

Floor: 0.

**`staleness_penalty`** (0–0.2) still feeds `quality_rank` for Tab 11 sorting:

- Tab 6 stale rules (same as Engine 2.0)  
- Extra +0.15 if freshness % &lt; 50  

---

## 3. Data completeness score

Column **`data_completeness_pct`** (0–100) = share of weighted checks passed (not only the legacy 5 Tab 6 fields).

**Data gate** (`data_gate_flag`): TRUE when ≥3 of {ROCE, ROE, rev YoY, debt/equity, P/E} are present on Tab 6 (unchanged gate for list filters).

---

## 4. Source reliability score

Column **`source_reliability_pct`** (0–100):

| Source | Points (cumulative cap 100) |
|--------|---------------------------|
| Base (symbol on Tab 10) | 15 |
| Tab 6 row exists | +35 |
| `sector_normalized` set | +10 |
| Tab 6 updated ≤ 60d | +15 (else ≤90d: +5) |
| Tab 2 price present | +10 |
| Tab 2 updated ≤ 7d | +10 |
| Filings or order helper &gt; 0 | +10 |
| Analyst revision helper &gt; 0 | +5 |

---

## When scores refresh

- **Rebuild scoring pipeline from UNIVERSE**  
- **`populateQuantitativeScores_`** (Tab 6/2 refresh path)  
- **`applyAutoSubScoresAndRefreshTotals_`** (helpers + macro)

---

## API & UI

| Consumer | Field |
|----------|--------|
| `?action=symbol` | `scoring.data_quality_pct`, `scoring.data_quality { ... }` |
| `?action=top10` | each item `data_quality_pct` |
| EquityIQ stock page | Data Quality badge + breakdown panel |
| EquityIQ recommendations | DQ % on each card |

See also [CONVICTION_SCORE.md](./CONVICTION_SCORE.md) for how completeness/staleness affect `quality_rank`.
