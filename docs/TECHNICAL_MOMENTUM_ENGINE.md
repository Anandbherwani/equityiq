# Technical Momentum Engine

**Version:** 1.0  
**Apps Script:** `backend/automation/TechnicalMomentumEngine.gs`  
**Tab 10 column:** **I** `technical_momentum` (0–5)  
**Conviction cap:** 5 points (Engine 2.1)

Multi-factor technical scoring with **bullish / neutral / bearish** classification. Sheets are the source of truth; EquityIQ displays API values only.

---

## API

### `technicalMomentumScore(symbol, ctx?)`

| Field | Type | Description |
|-------|------|-------------|
| `score` | 0–5 | Integer technical momentum score |
| `classification` | string | `bullish`, `neutral`, or `bearish` |
| `confidence` | 0–100 | Data coverage and signal strength |
| `source` | string | `tab2_technicals`, `tab2_composite`, `missing_tab2`, `none` |
| `date` | ISO date | Tab 2 `as_of_date` or context date (IST) |
| `rationale` | string | Human-readable summary |
| `signals` | array | `{ type, weight, date, detail }` |
| `missing` | string[] | Gap codes |

**Batch:** `buildTechnicalMomentumContext_(ss)` once per rebuild → score each symbol.

**Menu:** **Stock Tracker → Preview technical momentum scores**

---

## Data sources (Tab 2)

| Factor | Tab 2 fields | Notes |
|--------|---------------|--------|
| RSI | `rsi14` | Sheet formula from vs DMA + chg; engine uses **estimated RSI** if empty |
| 50 DMA | `dma50`, `vs_50dma` | GOOGLEFINANCE 55d average |
| 200 DMA | `dma200`, `vs_200dma` | GOOGLEFINANCE 210d average |
| Relative strength | `chg_pct` vs Nifty | `rs_vs_nifty` computed in engine |
| 52-week breakout | `high_52w`, `price` | Breakout when price ≥ 99% of 52w high |
| Volume surge | `vol`, `vol_avg_20d` | Surge when vol ≥ 1.5× 20d average |
| Price trend | DMA stack + chg% | Uptrend/downtrend rules below |

### Tab 2 extended headers

```
symbol, price, chg_pct, vol, dma20, dma50, dma200, rsi14, macd_signal,
delivery_pct, vs_50dma, vs_200dma, high_52w, vol_avg_20d, tech_setup, as_of_date
```

**Refresh watchlist prices** writes GOOGLEFINANCE for price, chg%, volume, DMAs, vs DMA %, `high52`, 20d avg volume, and an RSI estimate formula.

### Nifty benchmark (relative strength)

Engine subtracts Nifty day change from stock `chg_pct`:

- Prefer Tab 2 row keyed `NIFTY50` / `NIFTY`
- Else any symbol containing `NIFTY`

If no benchmark row: `missing: NIFTY_BENCHMARK` (RS signals skipped).

---

## Scoring methodology

### Step 1 — Signals and weights

| Signal | Weight | Condition |
|--------|--------|-----------|
| `rsi_bull_zone` | +0.85 | RSI 55–70 |
| `rsi_overbought` | −0.55 | RSI > 75 |
| `rsi_oversold` | −0.35 | RSI < 35 |
| `rsi_recovery` | +0.45 | RSI 40–55 and chg% > 0 |
| `rsi_estimated` | +0.25 | RSI proxy when `rsi14` empty |
| `above_50dma` | +0.75 | vs_50dma > 2% |
| `below_50dma` | −0.55 | vs_50dma < −3% |
| `above_200dma` | +0.75 | vs_200dma > 2% |
| `below_200dma` | −0.60 | vs_200dma < −5% |
| `price_trend_up` | +0.85 | Price above 50/200 DMA stack |
| `price_trend_down` | −0.85 | Below key DMAs + weak chg |
| `chg_strong` | +0.50 | Day chg ≥ +3% |
| `chg_weak` | −0.55 | Day chg ≤ −5% |
| `rs_outperform` | +0.90 | RS vs Nifty ≥ +2 pp |
| `rs_underperform` | −0.70 | RS vs Nifty ≤ −2 pp |
| `breakout_52w` | +1.15 | Price ≥ 99% of `high_52w` |
| `far_below_52w` | −0.35 | Price > 15% below 52w high |
| `volume_surge` | +0.65 | Vol ≥ 1.5× 20d avg |
| `volume_dry` | −0.30 | Vol ≤ 0.6× avg |

**Score:** `round(clamp(0, 5, sum(weights)))`.

### Step 2 — Classification

| Label | Rules (simplified) |
|-------|-------------------|
| **bullish** | Score ≥ 4, or score ≥ 3 with ≥2 more positive than negative signals, or score ≥ 2 with clear positive dominance |
| **bearish** | Score ≤ 1, or score ≤ 2 with negative signal dominance, or score ≤ 3 with more negatives than positives |
| **neutral** | Otherwise |

Classification is returned on every call and echoed in Tab 10 `missing_data_flags` as `[bullish]` / `[neutral]` / `[bearish]` on pillar `t=`.

### Step 3 — Confidence

- Base from signal count and “core” signals (RSI, DMA, breakout, volume, RS).
- **+5** if Tab 2 has rows.
- Penalties for missing RSI, Nifty benchmark, 52w/volume columns.
- Macro-only-style thin setups capped ~40.

### Step 4 — Missing data

| Code | Meaning |
|------|---------|
| `TAB2_PRICE` | No price row for symbol |
| `TAB2_RSI` | Empty `rsi14` (estimate may still run) |
| `TAB2_DMA` | No DMA values |
| `NIFTY_BENCHMARK` | No Nifty chg for RS |
| `TAB2_HIGH52` | No 52w high |
| `TAB2_VOLUME` / `TAB2_VOL_AVG` | Volume surge unavailable |
| `ALL` | Invalid symbol |

Universe-only symbols without Tab 2 get **baseline** score 2–3 via `QualityPillarScoring` fallback when engine has no price.

---

## RSI estimation

When `rsi14` is blank:

```
RSI_est = clamp(5, 95, 50 + vs_50dma×0.85 + vs_200dma×0.35 + chg_pct×3.5 + adjustments)
```

Import real RSI from your data provider into column H to override the estimate.

---

## Integration

- `populateQuantitativeScores_` builds `techCtx` + `instFlowCtx` once.
- `scoreTechnicalMomentumComponent_` → column **I**.
- Legacy `scoreTechnicalMomentum_(p)` used if engine file not loaded.

---

## Deploy checklist

1. Paste **`TechnicalMomentumEngine.gs`** with other `.gs` files.
2. **Setup all sheet tabs** (migrates Tab 2 headers).
3. **Refresh watchlist prices** (populates formulas).
4. Optional: add Tab 2 row `NIFTY50` with NSE index formulas for RS.
5. **Rebuild scoring pipeline from UNIVERSE**.
6. **Preview technical momentum scores** to verify I and classifications.

---

## Related docs

- [`shared/scoring/CONVICTION_SCORE.md`](../shared/scoring/CONVICTION_SCORE.md) — column I in M  
- [`shared/scoring/QUALITY_PILLARS.md`](../shared/scoring/QUALITY_PILLARS.md) — pillar wiring  
- [`docs/INSTITUTIONAL_FLOW_ENGINE.md`](INSTITUTIONAL_FLOW_ENGINE.md) — column J engine
