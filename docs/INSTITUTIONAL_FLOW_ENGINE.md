# Institutional Flow Engine

**Version:** 1.0  
**Apps Script:** `backend/automation/InstitutionalFlowEngine.gs`  
**Tab 10 column:** **J** `institutional_flow` (0–5)  
**Conviction cap:** 5 points (Engine 2.1)

The engine replaces the legacy bulk-net-only heuristic with a weighted, multi-source signal model. Sheets remain the source of truth; EquityIQ reads scored values via the Web App API and does not recompute J.

---

## API

### `institutionalFlowScore(symbol, ctx?)`

| Field | Type | Description |
|-------|------|-------------|
| `score` | 0–5 | Integer institutional flow score |
| `confidence` | 0–100 | How much primary data backed the score |
| `source` | string | Primary tab id (`tab4_deals`, `tab24_shareholding`, `tab18_promoter`, `tab8_macro`, `composite`, `missing_all`, `none`) |
| `date` | ISO date | Latest signal date (IST `yyyy-MM-dd`), or context `asOf` |
| `rationale` | string | One-line human summary for UI / `missing_data_flags` |
| `signals` | array | `{ type, weight, date, detail }` audit trail |
| `missing` | string[] | Data gaps (e.g. `TAB4_EMPTY`, `TAB24_SHAREHOLDING`) |

**Batch usage:** Call `buildInstitutionalFlowContext_(ss)` once per rebuild, then `institutionalFlowScore(sym, ctx)` per symbol. `populateQuantitativeScores_` / `applyFivePillarScoresBatch_` in `QualityPillarScoring.gs` already do this.

**Menu:** **Stock Tracker → Preview institutional flow scores** (`previewInstitutionalFlowScores`) — first 8 watchlist symbols.

---

## Data sources

| Input | Tab | What it measures |
|-------|-----|------------------|
| Bulk deals | **4. BULK & LARGE DEALS** | NSE bulk trades (90d lookback) |
| Block deals | **4** (column `deal_type` or inferred from text) | Block buy/sell counts |
| FII/DII/MF on deals | **4** (`investor_category` or client-name classifier) | Tagged institutional buyers/sellers |
| FII ownership change | **24. SHAREHOLDING PATTERN** | Δ FII % between last two snapshots (≤180d) |
| DII ownership change | **24** | Δ DII % |
| Mutual fund accumulation | **24** (`mf_pct`) | Δ MF % |
| Promoter holding change | **24** | Δ promoter % |
| Promoter purchases / sales | **18. PROMOTER ACTIVITY** | Buy/sell counts (90d) |
| Insider flow | **5. INSIDER/PROMOTER** | Secondary promoter/insider trades |
| FII level (snapshot) | **6. FUNDAMENTALS** | `fii_holding` % — not a flow, weak tilt only |
| Analyst upgrades | **17. ANALYST REVISIONS** | Secondary (60d) |
| Macro FII/DII bias | **8. MACRO DASHBOARD** | Market-wide tilt when symbol data thin |

### Tab 4 extended headers (backward compatible)

```
date, symbol, client_name, buy_sell, qty, price, pct_traded,
deal_type, investor_category, value_cr, source_url
```

Legacy 7-column imports still work: `deal_type` inferred from `client_name`; `investor_category` from `classifyInvestorCategory_()`.

### Tab 24 — shareholding pattern

```
symbol, as_of_date, fii_pct, dii_pct, mf_pct, promoter_pct, public_pct, source, notes
```

Requires **at least two rows per symbol** (different `as_of_date`) to compute deltas. **Automatic:** daily NSE batch via [`DATA_INGESTION.md`](DATA_INGESTION.md). **Manual:** Screener/BSE exports still supported.

---

## Scoring methodology

### Step 1 — Build signals

Each rule emits a signal with a **weight** (fractional point contribution). Weights sum to a raw score, then **round** to integer 0–5.

| Signal type | Weight | Condition |
|-------------|--------|-----------|
| `bulk_buy` | +1.2 | Bulk buys > bulk sells (90d) |
| `bulk_sell` | −0.8 | Bulk sells dominate |
| `block_buy` | +1.0 | Any block buy in window |
| `block_sell` | −0.7 | Any block sell |
| `fii_deal_buy` | +0.6 | FII-tagged deal buys > sells |
| `dii_deal_buy` | +0.5 | DII-tagged deal buys > sells |
| `mf_deal_buy` | +0.7 | MF-tagged deal buys > sells |
| `fii_pct_up` | +0.8 | Δ FII ≥ +0.5 pp (Tab 24) |
| `fii_pct_down` | −0.6 | Δ FII ≤ −0.5 pp |
| `dii_pct_up` | +0.7 | Δ DII ≥ +0.5 pp |
| `mf_pct_up` | +0.8 | Δ MF ≥ +0.5 pp |
| `promoter_pct_up` | +0.5 | Δ promoter ≥ +0.3 pp |
| `promoter_pct_down` | −0.5 | Δ promoter ≤ −0.3 pp |
| `fii_level_ok` | +0.35 | Tab 6 FII 20–45% (snapshot) |
| `fii_crowded` | −0.2 | Tab 6 FII > 45% |
| `promoter_buy` | +1.3 | Tab 18 buy count > 0 (90d) |
| `promoter_sell` | −1.0 | Tab 18 sell count > 0 |
| `insider_buy` / `insider_sell` | +0.5 / −0.4 | Tab 5 |
| `analyst_upgrade` | up to +0.6 | Tab 17 upgrades × 0.2 |
| `macro_fii_positive` | +0.25 | Tab 8 FII bias bullish |
| `macro_dii_positive` | +0.2 | Tab 8 DII bias bullish |

**Final score:** `score = clamp(0, 5, round(sum(weights)))`.

### Step 2 — Confidence (0–100)

- Base **30** + **12** per active signal + **8** per “high quality” signal (bulk/block/promoter/shareholding delta).
- **+5** if Tab 4 has any rows globally; **+10** if Tab 24 has rows.
- **−5** if Tab 6 FII missing for symbol.
- Cap **35** if only macro signals fired (thin data).
- Floor **10**; empty symbol → **10** with `missing: ['ALL']`.

### Step 3 — Primary `source`

Priority order: `block_buy` → `bulk_buy` → `promoter_buy` → `mf_pct_up` → `fii_pct_up` → … → macro. Maps to `tab4_deals`, `tab24_shareholding`, `tab18_promoter`, or `tab8_macro`.

### Step 4 — Rationale

Top 4 signals by |weight|; prefix tone by score band:

- **≥ 3:** “Net institutional support”
- **≤ 1:** “Weak or negative flow”
- else: “Mixed flow”

Appended to Tab 10 `missing_data_flags` as `i=J@conf%source:rationale` (truncated) via `QualityPillarScoring.gs`.

---

## Missing data handling

| Code | Meaning | Score impact |
|------|---------|--------------|
| `TAB4_EMPTY` | No rows on Tab 4 | No deal signals; may still score from 18/24/8 |
| `TAB4_NO_SYMBOL` | Tab 4 populated but no deals for symbol | Same |
| `TAB24_SHAREHOLDING` | Tab 24 empty | No FII/DII/MF/promoter deltas |
| `TAB24_NO_HISTORY` | Symbol has &lt; 2 snapshots | No deltas |
| `TAB6_FII` | No `fii_holding` on Tab 6 | No snapshot tilt |
| `TAB18_PROMOTER` | No Tab 18 rows for symbol | No promoter buy/sell signals |
| `ALL` | Invalid symbol | score **0**, confidence **10** |

**Important:** Missing data does **not** block scoring. Macro-only or analyst-only symbols can still get J &gt; 0 with low confidence.

---

## Integration with conviction (M)

Engine 2.1:

```
M = C(15) + K(10) + D + E + F + G + H + I + J
```

`applyFivePillarScoresBatch_` sets `row[9]` = `inst.score` using `Math.max(existing, auto)` on rebuild.

Legacy `scoreInstitutionalFlow_(bulk, fiiBias)` remains as fallback if `InstitutionalFlowEngine.gs` is not pasted.

---

## Operational checklist

1. **Setup all sheet tabs** — creates Tab 24 with headers.
2. Import **NSE bulk/block** CSV → Tab 4 (include `deal_type` / `investor_category` when available).
3. Import **quarterly shareholding** (two dates per symbol minimum) → Tab 24.
4. Keep Tab **6**, **18**, **5**, **17**, **8** updated on your usual cadence.
5. **Rebuild scoring pipeline from UNIVERSE**.
6. **Preview institutional flow scores** or **Run Scoring Engine 2.1 validation** to confirm J distribution.

---

## Related docs

- [`shared/scoring/QUALITY_PILLARS.md`](../shared/scoring/QUALITY_PILLARS.md) — pillar J wiring  
- [`shared/scoring/CONVICTION_SCORE.md`](../shared/scoring/CONVICTION_SCORE.md) — full M formula  
- [`docs/SCORING_ENGINE_VALIDATION.md`](SCORING_ENGINE_VALIDATION.md) — forensic Tab 10 stats
