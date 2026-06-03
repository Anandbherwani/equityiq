# Alpha Engine

**Version:** 1.0  
**Apps Script:** `backend/automation/AlphaEngine.gs`  
**Tab 10 columns:** `alpha_score` (0–100), `alpha_classification`  
**Goal:** Rank stocks by **likelihood of outperforming Nifty** using multi-factor Tab 10 pillars + relative strength.

---

## API

### `alphaScore(symbol, ctx?)`

| Field | Type | Description |
|-------|------|-------------|
| `alpha_score` | 0–100 | Composite alpha vs benchmark thesis |
| `classification` | string | `Strong Buy`, `Buy`, `Watch`, `Avoid` |
| `factors` | object | Per-factor scores 0–100 |
| `confidence` | 0–100 | Data coverage across factors |
| `rationale` | string | Summary for UI / alerts |
| `missing` | string[] | Gap codes |

**Batch:** `buildAlphaContext_(ss)` → `applyAlphaScoresBatch_(data, ss)` on rebuild / `populateQuantitativeScores_`.

**Menu:** **Stock Tracker → Preview alpha scores**

---

## Factors (weights)

Each factor is scored **0–100**, then combined:

| Factor | Weight | Tab 10 / source |
|--------|--------|-----------------|
| **Fundamentals** | 22% | C fundamentals + F financial_strength + K business_moat |
| **Growth** | 14% | E growth |
| **Valuation** | 12% | D valuation |
| **Sector strength** | 12% | G sector_strength + sector rank (R) + Tab 19 join |
| **Momentum** | 18% | `technicalMomentumScore` (RS vs Nifty, RSI, DMAs) or column I |
| **Institutional flow** | 12% | `institutionalFlowScore` or column J |
| **News** | 10% | H news_events + orderbook/filings helpers |

```
alpha_score = ROUND( Σ (factor_score × weight) ) − penalties
```

Clamped to **0–100**.

---

## Factor detail

### Fundamentals (22%)

```
score = (C/15)×40 + (F/15)×40 + (K/10)×20
```

### Growth (14%)

```
score = (E/15) × 100
```

### Valuation (12%)

```
score = (D/15) × 100
```

(Higher D in Engine 2.1 = better valuation pillar → more alpha potential in model.)

### Sector strength (12%)

- Base: `(G/10) × 100`
- +15 if sector rank ≤ 5; +8 if rank ≤ 10
- +5 if Tab 19 join succeeds for `sectorKey`

### Momentum (18%) — Nifty-relative

Uses **Technical Momentum Engine** when loaded:

- Maps pillar I (0–5) to 0–70%
- **+20** if classification `bullish`; **−25** if `bearish`
- **+15** if RS vs Nifty ≥ +2 pp (day); **−12** if ≤ −2 pp

Fallback: `(I/5) × 100` from Tab 10 only.

### Institutional flow (12%)

Uses **Institutional Flow Engine** when loaded: `(J/5) × 100` with flow confidence.  
Fallback: Tab 10 J; **+15** if promoter buy flag.

### News (10%)

`(H/10) × 100` + boosts for orderbook/filings helpers.  
**50% discount** if `isNewsOnlyRecommendation_` (news-only thesis).

---

## Penalties (subtracted after blend)

| Penalty | Points | Trigger |
|---------|--------|---------|
| Pump flag | 18 | Tab 10 pump_flag |
| No data gate | 8 | `data_gate_flag` false |
| Low data quality | 12 | `data_quality_pct` &lt; 60 |
| Weak RS vs Nifty | 8 | RS ≤ −4 pp (Tab 2) |

---

## Classifications

| Label | Rules |
|-------|--------|
| **Strong Buy** | `alpha_score` ≥ 78 **and** momentum ≥ 55 **and** fundamentals ≥ 50 |
| **Buy** | `alpha_score` ≥ 62 |
| **Watch** | `alpha_score` ≥ 42 |
| **Avoid** | `alpha_score` &lt; 42, or pump flag, or score &lt; 25 |

Excluded watchlist symbols → **Avoid**, alpha **0**.

---

## Confidence

- Base from count of non-zero factor scores  
- **+8** if data quality ≥ 60  
- **+5** if conviction M ≥ 25  
- Penalties for many missing factors or news-only thesis  

---

## Tab 10 persistence

| Column | Field |
|--------|--------|
| AR (43) | `alpha_score` |
| AS (44) | `alpha_classification` |

Written on:

- **Rebuild scoring pipeline from UNIVERSE**
- **Populate quantitative scores**

Conviction column **M** remains separate (100-pt engine); alpha is an **overlay** for Nifty-relative opportunity ranking.

---

## API / EquityIQ

`?action=symbol` returns:

```json
{
  "alpha_score": 68,
  "alpha_classification": "Buy",
  "scoring": { ... }
}
```

Use alpha for sort/filter; use conviction + data quality for Tab 11 gates.

---

## Deploy

1. Paste **`AlphaEngine.gs`** with other engines (`TechnicalMomentumEngine`, `InstitutionalFlowEngine`, …).  
2. **Setup all sheet tabs** (adds `alpha_score`, `alpha_classification` headers).  
3. **Rebuild scoring pipeline from UNIVERSE**.  
4. **Preview alpha scores** on watchlist symbols.  
5. Optional: sort Tab 10 by `alpha_score` for research screen.

---

## Example

| Symbol | Alpha | Class | Notes |
|--------|-------|-------|-------|
| INFY | 74 | Buy | Momentum bullish, RS +3pp vs Nifty |
| XYZ | 38 | Avoid | News-only penalty, low DQ |

---

## Related docs

- [`docs/TECHNICAL_MOMENTUM_ENGINE.md`](TECHNICAL_MOMENTUM_ENGINE.md) — RS vs Nifty  
- [`docs/INSTITUTIONAL_FLOW_ENGINE.md`](INSTITUTIONAL_FLOW_ENGINE.md)  
- [`shared/scoring/CONVICTION_SCORE.md`](../shared/scoring/CONVICTION_SCORE.md) — pillar caps C–K, M  
- [`docs/RECOMMENDATION_ENGINE_REVIEW.md`](RECOMMENDATION_ENGINE_REVIEW.md) — Tab 11 gates (DQ ≥ 60)
