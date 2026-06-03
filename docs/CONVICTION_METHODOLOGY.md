# Tiered Investment Framework — Conviction Methodology

**Version:** 3.1  
**Implementation:** `backend/automation/ConvictionEngine3.gs`  
**Tab 10 outputs:** `quality_score`, `valuation_score`, `catalyst_score`, `alpha_score`, `conviction_stage`, `opportunity_rank`  
**Tab 10 M (`conviction_total`):** equals **`opportunity_rank`** — **not** sum(C–K).

Pillars C–K remain **inputs** to the funnel (transparency + pillar rules in [`shared/scoring/CONVICTION_SCORE.md`](../shared/scoring/CONVICTION_SCORE.md)). They are **not** added to produce the final investment score when Engine 3.1 is enabled.

---

## Design principle

Institutional screening is **sequential**, not additive:

1. Remove untradeable or structurally weak names (**hard reject**).
2. Score **business quality** on its own.
3. Among quality names, score **valuation** (cheap vs expensive for that quality).
4. Score **catalysts** (why now).
5. **Rank** survivors with a non-linear composite.

A stock with high news (H) but weak fundamentals (C) must **not** rank like a compounder. Additive pillar sums allow that failure mode; the tiered framework prevents it.

---

## Five stages

| Stage | Name | Purpose | Tab 10 `conviction_stage` | Primary output |
|------:|------|---------|---------------------------|----------------|
| **1** | Reject bad businesses | Hard filters: governance, pump, risk, weak core | `REJECTED` | `opportunity_rank` = 0 |
| **2** | Find quality businesses | Weighted quality from C, F, K, G, data quality | `QUALITY` | `quality_score` 0–100 |
| **3** | Undervalued quality | Valuation only if quality ≥ 50 | `VALUATION` | `valuation_score` 0–100 |
| **4** | Find catalysts | Events, flow, tech — if quality ≥ 40 | `CATALYST` | `catalyst_score` 0–100 |
| **5** | Rank opportunities | Geometric + bottleneck blend | `RANKED` | `opportunity_rank` → **M** |

`investment_stage` (1–5) mirrors the table above for APIs and narratives.

---

## Stage 1 — Reject bad businesses

**Function:** `level1RejectBadBusiness_(c, f)`

Fails (any → `REJECTED`, all scores 0):

| Code | Condition |
|------|-----------|
| `EXCLUDED` | Tab 10 exclude flag |
| `PUMP_FLAG` | 40%+ move / pump heuristic |
| `SEBI_INVESTIGATION` | SEBI flag |
| `HIGH_PLEDGE` | Pledge > 50% |
| `CFO_PAT_DIVERGENCE` | Accounting red flag |
| `MGMT_EXITS` | Management exit flag |
| `WEAK_CORE_NO_DATA_GATE` | C+F+K &lt; 6 and no data gate |
| `DEBT_EQUITY_GT_3` | Tab 6 leverage |
| `ROCE_LT_5` | Tab 6 ROCE &lt; 5% when known |
| `EXCESSIVE_RISK_*` | Risk Engine grade D or danger &gt; 65 |

No quality, valuation, catalyst, or alpha scores are computed for rejects.

---

## Stage 2 — Quality score

**Function:** `level2QualityScore_(c, f)`  
**Range:** 0–100

**Inputs (normalized pillar caps):**

| Input | Weight in quality |
|-------|-------------------|
| Fundamentals (C) / 15 | 32% |
| Financial strength (F) / 15 | 28% |
| Business moat (K) / 10 | 22% |
| Sector strength (G) / 10 | 12% |
| Data quality % | 6% |

**Tab 6 bonuses (capped at 100):** ROCE ≥18 (+6), ≥12 (+3); ROE ≥15 (+4); low debt (+3).  
**Sector:** top-5 sector rank (+5).  
**Peers:** 70% internal + 30% `relative_quality_score` when present.

**Minimum pass:** `quality_score` ≥ **35** to leave Stage 2 failure state. Below 35 → stage `QUALITY`, rank capped (~`quality × 0.25`).

---

## Stage 3 — Valuation score (undervalued quality)

**Function:** `level3ValuationScore_(c, f, quality)`  
**Gate:** computed only if `quality_score` ≥ **50**; otherwise **0**.

**Logic:**

- Base from valuation (D) and growth (E) pillars, scaled by **`quality / 100`** (cheap junk is not rewarded).
- Blend 65% internal + 35% `relative_valuation_score`.
- Tab 6: undervaluation tag (+12), PE vs 3Y &lt; 0.9 (+8), reasonable PE+ROE (+5).
- Strong D+E pillars (+6).

High quality + weak valuation → moderate rank ceiling in Stage 5.

---

## Stage 4 — Catalyst score

**Function:** `level4CatalystScore_(c, ctx)`  
**Gate:** `quality_score` ≥ **40**; otherwise **0**.

**Inputs:**

| Source | Role |
|--------|------|
| News events (H) | 35% |
| Filings (30d) | 20% |
| Order book (90d) | 20% |
| Analyst upgrades | 15% |
| Promoter buy | 15% |
| Technical momentum engine | up to 20% |
| Institutional flow engine | up to 15% |

Bonuses: 1w/1m horizon (+8); ≥3 news articles in 30d (+5).

---

## Alpha score (hierarchical, not legacy sum)

**Function:** `computeHierarchicalAlpha_(quality, valuation, catalyst, c, ctx)`

**Not** the weighted factor sum in `AlphaEngine.gs` (`ALPHA_FACTOR_WEIGHTS_`).

| Component | Weight |
|-----------|--------|
| √(quality × valuation) core | 55% |
| Catalyst timing | 25% |
| Technical momentum | 20% of 5-pt scale → % |
| Institutional flow | 15% of 5-pt scale → % |

Pump flag: −25. Classification uses `classifyAlpha_` bands when available.

---

## Stage 5 — Final rank (not a simple sum)

**Function:** `level5OpportunityRank_(quality, valuation, catalyst, alpha, c)`  
**Written to:** `opportunity_rank` (col 50) and **`conviction_total` M** (col 13)

### Why not sum(C–J)?

```
additive_pillar_sum = MIN(C,15) + MIN(K,10) + MIN(D,15) + … + MIN(J,5)   // max ~100
opportunity_rank    = f(quality_score, valuation_score, catalyst_score, alpha_score)  // gated funnel
```

`additive_pillar_sum` is logged in narratives for transparency only.

### Formula (3.1)

1. **Geometric blend** (exponents enforce “all legs matter”):

```
geo = (Q/100)^0.38 × (V'/100)^0.28 × (C'/100)^0.22 × (α'/100)^0.12
```

where V′ = max(valuation, 25), C′ = max(catalyst, 15), α′ = max(alpha, 10).

2. **Bottleneck** (weakest leg caps upside):

```
bottleneck = min(Q, max(V,20)×1.05, max(C,12)×1.15, max(α,15)×1.1)
```

3. **Blend:**

```
rank = round(geo × 100 × 0.72 + bottleneck × 0.28)
```

4. **Stage dampeners:** valuation &lt; 35 (×0.88), catalyst &lt; 20 (×0.9), quality &lt; 50 (×0.85).

5. **Peer overlay:** relative Q/V/S geometric multiplier (same as Engine 3.0).

6. **Sector leader:** sector rank ≤ 3 → +4 (cap 100).

### Example

| Symbol | Q | V | C | α | Pillar sum | opportunity_rank |
|--------|--:|--:|--:|--:|-----------:|-----------------:|
| Quality compounder | 72 | 58 | 28 | 55 | ~78 | ~52 |
| News-driven, weak C | 38 | 10 | 65 | 40 | ~71 | ~28 (capped) |
| Rejected | 0 | 0 | 0 | 0 | 45 | 0 |

---

## Tab 10 column map

| Col | Field | Role in framework |
|-----|--------|-------------------|
| C–J, K | Pillars | Stage 2–4 **inputs** |
| 44 | `alpha_score` | Hierarchical α |
| 45 | `quality_score` | Stage 2 |
| 46 | `valuation_score` | Stage 3 |
| 47 | `catalyst_score` | Stage 4 |
| 48 | `conviction_stage` | Stage label |
| 49 | `opportunity_rank` | Stage 5 |
| 13 (M) | `conviction_total` | **= opportunity_rank** (no SUM formula when Engine 3 on) |

---

## Pipeline order

1. `populateQuantitativeScores_` — fill C–K from Tabs 6/2/4/7  
2. `applyScoringDataMetrics_` — DQ, gates, quality rank  
3. `applyPeerComparisonBatch_` — relative Q/V/S  
4. **`applyConvictionEngine3Batch_`** — tiered scores + M  
5. `applyRiskEngineBatch_` — risk columns (Stage 1 also reads risk)  
6. `reconcileConvictionColumn_` — keeps M = opportunity_rank (not pillar sum)  
7. `applyConvictionFormulas_` — **skipped** on M when `USE_CONVICTION_ENGINE_3_` is true  

---

## Recommendations & API

- Tab 11 sort: `recommendationSortKey_` uses `opportunity_rank` / Engine 3 fields.  
- Gates: `ENGINE3_REJECTED`, quality &lt; 35, rank thresholds in `RecommendationEngine.gs`.  
- Narratives: `why_now`, `why_stock`, `why_peers` from `buildEngine3Narratives_`.  
- Web App: `decision.quality_score`, `valuation_score`, `catalyst_score`, `alpha_score`, `conviction_stage`.

---

## Disable tiered framework (legacy additive)

Set `USE_CONVICTION_ENGINE_3_ = false` in `ConvictionEngine3.gs`:

- M becomes SUM(C–J) via sheet formula + `calculateConvictionFromRow_`.  
- `applyAlphaScoresBatch_` runs legacy alpha.

---

## Related docs

- [`CONVICTION_ENGINE_3.md`](CONVICTION_ENGINE_3.md) — operator quick reference  
- [`shared/scoring/CONVICTION_SCORE.md`](../shared/scoring/CONVICTION_SCORE.md) — pillar point rules (inputs only when Engine 3 on)  
- [`ALPHA_ENGINE.md`](ALPHA_ENGINE.md) — legacy alpha (bypassed for Tab 10 when hierarchical α is written)  
- [`RISK_ENGINE.md`](RISK_ENGINE.md) — Stage 1 excessive risk gate  

---

## Deploy checklist

1. Paste `ConvictionEngine3.gs` + updated `Code.gs`.  
2. **Rebuild scoring pipeline**.  
3. **Preview Conviction Engine 3.0** — confirm `rank ≠ pillar sum` on a sample symbol.  
4. Verify column M has **values**, not `=SUM(C:J)` formulas.
