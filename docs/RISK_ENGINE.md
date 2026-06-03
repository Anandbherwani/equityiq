# Risk Engine v2

**Apps Script:** `backend/automation/RiskEngine.gs`  
**Version:** 2.0  
**Tab 29:** `RISK BREAKDOWN` (per-dimension scores)  
**Tab 10:** `risk_score`, `risk_grade`, `reward_risk_ratio`

---

## Six risk dimensions

Each dimension is scored **0–100 danger** (higher = worse). Composite danger is a weighted average.

| Dimension | What it measures | Primary inputs |
|-----------|-----------------|----------------|
| **Debt risk** | Leverage & solvency | Tab 6 debt/equity, current ratio, Tab 10 financial strength |
| **Governance risk** | Accounting / control | SEBI, NCLT, auditor flag, CFO/PAT divergence, mgmt exits |
| **Pledge risk** | Promoter collateral | UNIVERSE pledge %, Tab 18 trend, pledge_gt_50 |
| **Liquidity risk** | Tradability | Cap segment, SME, market cap, liquidity flag, volume |
| **Valuation risk** | Expensive vs peers | PE/PB vs sector, relative valuation, valuation pillar |
| **Cyclicality risk** | Earnings cyclicality | Sector bucket (metals, auto, …), negative growth |

**Weights:** debt 20%, governance 18%, pledge 15%, valuation 17%, cyclicality 15%, liquidity 15%.

---

## Outputs

| Output | Meaning |
|--------|---------|
| **risk_score** | **Safety** 0–100 on Tab 10 col **59** — **higher = lower risk** (100 − composite danger) |
| **risk_grade** | A (safest) → F on col **60** |
| **risk_danger** | Composite danger 0–100 (internal + Tab 29) |
| **reward_risk_ratio** | `opportunity_rank ÷ max(8, danger)` on col **67** and Tab 29 — higher = better upside per unit risk |

Example: upside 72, danger 36 → **reward_risk_ratio ≈ 2.0**.

---

## Rank integration

After Conviction Engine 3.1 sets `opportunity_rank`, Risk Engine may **cap** rank (cols 12 & 49):

| Danger | Rank cap |
|--------|----------|
| ≥ 75 | ≤ 22 |
| ≥ 65 | ≤ 38 |
| ≥ 55 | × 0.82 |

`recommendationSortKey_` multiplies by `recommendationRiskSortMultiplier_` (0.52–1.12). Strong **reward_risk_ratio** (≥ 2) adds a small sort boost on compounders / 3M lists.

---

## Recommendation integration

| Hook | Behavior |
|------|----------|
| **Quality gate** | `isExcessiveStockRisk_` rejects Tab 11 when danger ≥ 65, grade F, or D + high danger |
| **Conviction L1** | Engine 3 rejects on excessive risk |
| **Narratives** | `buildRiskRecommendationBlock_` — Upside · Risk · Reward/Risk on every pick |
| **Analyst notes** | Risks section includes safety score, grade, R/R |
| **API / EquityIQ** | `decision.upside`, `decision.risk`, `decision.reward_risk`, `reward_risk_ratio` |
| **Score breakdown** | `Risk 72 [B] R/R 2.1` in recommendation review |

---

## Pipeline order

1. Peer comparison  
2. Conviction Engine 3.1  
3. **Risk Engine** (`applyRiskEngineBatch_`)  
4. Theme intelligence (rebuild)  
5. `applyRiskEngineToScoreSheet_` after theme (rebuild only)  
6. Tab 11 recommendations  

---

## Operations

| Menu | Action |
|------|--------|
| **Run Risk Engine v2** | Refresh Tab 10 cols 59–60, 67 + Tab 29 |
| **Preview Risk Engine** | Sample watchlist symbols |

---

## Deploy

1. Paste **`RiskEngine.gs`** with other automation modules.  
2. **Setup all sheet tabs** (Tab 10 = **67** columns).  
3. **Rebuild scoring pipeline** → **Sync recommendations**.

Without Tab 6 / UNIVERSE pledge data, debt and pledge dimensions use conservative defaults.
