# Quality pillars — auto-scoring (Engine 2.1)

**Implementation:** `backend/automation/QualityPillarScoring.gs` + `populateQuantitativeScores_` in `Code.gs`  
**Goal:** Score **every eligible UNIVERSE symbol** on Tab 10 even when Tab 6 is empty, using fallbacks so conviction **M > 0** coverage rises.

## Letter map (user labels → Tab 10)

| Your label | Tab 10 column | Field | Max pts in M |
|------------|---------------|--------|----------------|
| Business Moat (E*) | **K** | `business_moat` | 10 |
| Financial Strength (G*) | **F** | `financial_strength` | 15 |
| Valuation (H*) | **D** | `valuation` | 15 |
| Price Momentum (I) | **I** | `technical_momentum` | 5 |
| Institutional Flow (L*) | **J** | `institutional_flow` | 5 |

\* Legacy letter names in briefings; Excel column **E** on Tab 10 is still **growth** (unchanged).

**C fundamentals** (0–15) = business *quality* (ROCE/ROE/margin) — paired with **K moat** for full “business” view.

```
M = min(C,15) + min(K,10) + min(D,15) + min(E,15) + min(F,15) + min(G,10) + min(H,10) + min(I,5) + min(J,5)
```

---

## 1. Business Moat — column K (0–10)

| Item | Detail |
|------|--------|
| **Function** | `scoreBusinessMoatComponent_` |
| **Primary source** | Tab **6** — ROCE, ROE, EBITDA margin, promoter %, FII %, `earnings_quality_note` |
| **Fallback source** | Tab **1** — `cap_segment`, `pledge_pct`, `is_sme` |
| **Formula** | `moat = min(10, ROCE_tiers + ROE_tiers + margin_tiers + promoter_tier + FII_band + note_keywords + cap/pledge_adjust)` × staleness multiplier |
| **Staleness** | Tab 6 age: 0× if &gt;180d or stale_flag; 0.8× if &gt;90d; universe-only fallback × **0.65** |
| **Confidence** | `filled_fields / 6 × 100`, +15 if source=tab6, cap **45** if universe_fallback |
| **Missing data** | Flags `TAB6_ROW`, `TAB6_ROCE_ROE`; still assigns **2–6** pts from UNIVERSE |

---

## 2. Financial Strength — column F (0–15)

| Item | Detail |
|------|--------|
| **Function** | `scoreFinancialStrengthComponent_` → `scoreFinancialStrengthFromFundamentals_` when Tab 6 present |
| **Primary source** | Tab **6** — `debt_equity`, `current_ratio`, `fcf_trend`, `dividend_yield` |
| **Fallback source** | Tab **1** `pledge_pct` (&lt;25 → +4, &lt;50 → +2) |
| **Formula** | See CONVICTION_SCORE.md §F; fallback `min(15, round(base_3_7 × 0.7))` |
| **Confidence** | High when ≥3 Tab 6 fields; **≤45** on pledge-only fallback |
| **Missing data** | `TAB6_ROW`; minimum **~3** pts possible from pledge |

---

## 3. Valuation — column D (0–15)

| Item | Detail |
|------|--------|
| **Function** | `scoreValuationComponent_` |
| **Primary source** | Tab **6** — `valuation_tag`, `pe_vs_3y`, `pe`, `pb` |
| **Fallback source** | Tab **2** `chg_pct` (neutral momentum proxy); else **base 5** + large-cap +1 |
| **Formula** | `scoreValuationFromFundamentals_` OR `5 + chg_pct_band` OR neutral 5 |
| **Confidence** | **≤45** when only price proxy or baseline |
| **Missing data** | `TAB6_VALUATION`, `TAB2_PRICE`; never leaves D at 0 if rebuild ran |

---

## 4. Price Momentum — column I (0–5)

| Item | Detail |
|------|--------|
| **Function** | `technicalMomentumScore` → `scoreTechnicalMomentumComponent_` |
| **Engine** | `backend/automation/TechnicalMomentumEngine.gs` |
| **Docs** | [`docs/TECHNICAL_MOMENTUM_ENGINE.md`](../../docs/TECHNICAL_MOMENTUM_ENGINE.md) |
| **Primary source** | Tab **2** — RSI, DMAs, RS vs Nifty, 52w high, vol surge, trend |
| **Fallback source** | Universe baseline 2–3 if no Tab 2 price |
| **Formula** | Weighted signals → round 0–5; **bullish/neutral/bearish** classification |
| **Confidence** | High with full Tab 2; lower with RSI estimate or no Nifty row |
| **Missing data** | `TAB2_*`, `NIFTY_BENCHMARK` |

---

## 5. Institutional Flow — column J (0–5)

| Item | Detail |
|------|--------|
| **Function** | `institutionalFlowScore` → `scoreInstitutionalFlowComponent_` |
| **Engine** | `backend/automation/InstitutionalFlowEngine.gs` |
| **Docs** | [`docs/INSTITUTIONAL_FLOW_ENGINE.md`](../../docs/INSTITUTIONAL_FLOW_ENGINE.md) |
| **Primary source** | Tab **4** bulk/block + investor tags; Tab **24** FII/DII/MF/promoter Δ |
| **Secondary** | Tab **18** / **5** promoter & insider; Tab **6** FII%; Tab **17** upgrades; Tab **8** macro |
| **Formula** | Weighted signals → round 0–5; `confidence`, `source`, `date`, `rationale` |
| **Confidence** | Highest with Tab 4 + Tab 24; **≤35** macro-only |
| **Missing data** | `TAB4_*`, `TAB24_*`, `TAB6_FII`, `TAB18_PROMOTER` (score may still be &gt;0) |

---

## Confidence & missing flags on Tab 10

| Column | Content |
|--------|---------|
| **L** `moat_confidence_pct` | Average of five pillar confidences (0–100) |
| **AM** `missing_data_flags` | Existing codes + `PILLARS\|m=8@72%tab6\|f=5@40%universe_fallback\|...` |

---

## Deploy

1. Paste **`QualityPillarScoring.gs`**, **`TechnicalMomentumEngine.gs`**, and **`InstitutionalFlowEngine.gs`** with other `.gs` files.  
2. **Setup all sheet tabs** (migrates K/L headers to `business_moat`, `moat_confidence_pct`).  
3. **Rebuild scoring pipeline from UNIVERSE** — runs `applyFivePillarScoresBatch_` on all Tab 10 rows.  
4. Import **Screener → Tab 6** weekly to move confidence from fallback → full Tab 6 sourcing.

---

## Expected coverage impact

| Before (typical) | After Engine 2.1 |
|------------------|------------------|
| M&gt;0 only when Tab 6 row exists | **Most eligible symbols** get M ≥ 8–15 from fallbacks |
| I=0 without Tab 2 | I ≥ 2 from baseline or GOOGLEFINANCE |
| J=0 without Tab 4 | J ≥ 0–1 from macro FII; higher with Tabs 17/18 |

Run **Stock Tracker → Run full system audit** and compare stage **F** `count_gt0` before/after rebuild.
