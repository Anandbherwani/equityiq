# Portfolio Construction Engine

**Version:** 1.0  
**Apps Script:** `backend/automation/PortfolioConstructionEngine.gs`  
**Tab 30:** `30. PORTFOLIO MODELS`  
**API:** `?action=portfolio` or `?action=portfolio&capital=1000000`

Builds suggested portfolios from **Tab 10 + Tab 11** only (no rescoring in the API).

---

## Capital inputs (INR)

| Capital | Max names | Max single name | Cash target |
|---------|-----------|-----------------|-------------|
| ₹1,00,000 | 10 | 14% | 5% |
| ₹5,00,000 | 14 | 10% | 3% |
| ₹10,00,000 | 18 | 8% | 2% |
| ₹1,00,00,000 | 25 | 5% | 1% |

---

## Outputs

### Suggested allocation (Core / Growth / Opportunistic)

| Bucket | Typical role |
|--------|----------------|
| **Core** | Compounders / monopoly lists, high quality + risk grade A/B, data gate |
| **Growth** | 3-month list profile, quality + growth/catalyst scores |
| **Opportunistic** | Immediate / theme / order-book / turnaround catalysts |

Each tier has **target %** and **actual %** after position sizing, plus **cash**.

### Sector exposure

Per-sector `amount_inr`, `weight_pct`, and `over_limit` vs max sector cap (18–28% by tier).

### Position sizing

- Budget split by bucket targets  
- Weights ∝ `portfolio_pick_score` within bucket  
- Rounded to ₹1k / ₹2k / ₹5k / ₹25k steps by tier  
- `shares_estimate` from Tab 2 last price when available  

### Maximum drawdown estimate

Heuristic **not** a backtest: blends average portfolio danger, opportunistic weight, top-sector concentration, and HHI. Typical range **8–38%**.

### Portfolio conviction score

Value-weighted blend of `opportunity_rank × (risk_score/100) × (data_quality/100)` across positions (0–100).

---

## Eligibility

- Tab 10 symbol, not excluded  
- Not Engine 3 `REJECTED`  
- Not `isExcessiveStockRisk_`  
- Data quality ≥ 60 when DQ is present  
- Classified into at least one bucket  

`portfolio_pick_score` uses opportunity rank, risk safety, DQ, Tab 11 list boost.

---

## Menu

**Stock Tracker → Portfolio construction**

- **Build all capital models (Tab 30)** — `runPortfolioConstructionMenu`  
- **Preview ₹10L model** — `previewPortfolioConstruction`  

---

## EquityIQ

`/portfolio` — select capital tier, view allocation, sectors, positions, conviction, and estimated max DD (Sheets API required).

---

## Deploy

Paste `PortfolioConstructionEngine.gs` with other `.gs` files → **Setup tabs** → **Rebuild scoring pipeline** → **Build all capital models** or call API.
