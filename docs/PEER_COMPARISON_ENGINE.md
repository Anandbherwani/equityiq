# Peer Comparison Engine v2

**Apps Script:** `backend/automation/PeerComparisonEngine.gs`  
**Version:** 2.0  
**Tabs:** **25** sector medians · **35** per-stock peer comparison · **Tab 10** relative scores

Every scored symbol is compared to **sector peers** (same `sector_key` on UNIVERSE / Tab 6).

---

## Metrics vs peers

| Metric | Source (Tab 6) | vs sector median |
|--------|----------------|------------------|
| **PE** | `pe` | Cheaper → higher `relative_valuation_score` |
| **PB** | `pb` | Same |
| **ROE** | `roe` | Higher → higher `relative_quality_score` |
| **ROCE** | `roce` | Same |
| **Growth** | `rev_yoy` → `pat_yoy` → `ebitda_yoy` | Higher → higher `relative_growth_score` |
| **Margins** | `ebitda_margin` | Higher → higher `relative_quality_score` |

Requires ≥ **3** symbols in sector with usable fundamentals.

---

## Relative scores (0–100)

| Score | Tab 10 col | Formula idea |
|-------|------------|--------------|
| **relative_quality_score** | 50 | Blend: ROCE, ROE, EBITDA margin vs sector medians (higher = better) |
| **relative_valuation_score** | 51 | PE + PB vs medians (cheaper = better; capped if quality weak) |
| **relative_growth_score** | 52 | Revenue/PAT growth vs median growth |

Scores are **not** a simple sum of PE+PB+ROE; each dimension is ratio-scored then blended.

---

## Tab 10 columns

| Col | Field |
|-----|--------|
| 50 | `relative_quality_score` |
| 51 | `relative_valuation_score` |
| 52 | `relative_growth_score` |
| 53–56 | Sector median PE, PB, ROCE, growth |
| 64–65 | Sector median ROE, EBITDA margin % |

---

## Tab 35 — PEER STOCK COMPARISON

One row per symbol: raw metrics, sector medians, ratios (`pe_vs_median`, etc.), and Q/V/G scores. Use for audit and EquityIQ detail views.

---

## Ranking integration

| Consumer | Use |
|----------|-----|
| **recommendationSortKey_** | `peerComparisonSortBoost_` = 38% Q + 32% V + 30% G (scaled ~0.38 max boost) |
| **Compounders / 3M** | +12% relative quality, +10% relative growth in sort key |
| **Turnaround** | +18% relative valuation, +8% growth |
| **Gov beneficiary** | +10% relative growth |
| **Conviction Engine 3.1** | L2 quality, L3 valuation, L5 rank peer geometric factor |
| **Tab 11 narratives** | `buildWhyBetterThanPeers_` — BEL vs HAL style |

---

## Pipeline

1. Import **Tab 6 fundamentals** (Screener CSV + ingestion v2).  
2. **Rebuild scoring pipeline** → `applyPeerComparisonBatch_` runs before Conviction 3.1.  
3. Optional: **Run Peer Comparison Engine v2** menu to refresh only peer columns.

---

## API

Symbol payload includes `relative_quality_score`, `relative_valuation_score`, `relative_growth_score`, and `peer_comparison` object with sector medians.

---

## Deploy

1. Paste **`PeerComparisonEngine.gs`** + updated **`Code.gs`**.  
2. **Setup all sheet tabs** (Tab 10 = 66 columns, Tab 35 added).  
3. **Rebuild scoring pipeline** → **Sync recommendations**.

Without Tab 6 data, scores default to **50** and medians stay **0**.
