# Alpha Validation Framework

**Engines:** `BacktestEngine.gs` v4 (horizon backtest) · `RecommendationHistoryEngine.gs` v1.1 (live track record)  
**Horizons:** 30 · 90 · 180 · 365 calendar days

---

## 1. Snapshot evidence (Tab 22 + Tab 37)

| Layer | Sheet | Use |
|-------|-------|-----|
| Horizon backtest | Tab 22 → Tab 23/36 | Paired entry/exit windows; PASS ≥5 snapshots + ≥3 trades |
| Live track record | Tab 37 | Entry = snapshot date; metrics to **today** |

Daily **8 AM** after Tab 11 sync: `snapshotRecommendationHistory_` + `snapshotAllBacktestLists_`.

---

## 2. Metrics (all horizons)

Per recommendation cohort vs benchmarks on **identical dates**:

| Metric | Definition |
|--------|------------|
| Hit rate | % trades with positive return |
| Alpha vs Nifty | Mean (stock return − Nifty 50 return) |
| Alpha vs sector | Mean (stock return − sector index return) |
| Sharpe | Annualized √(12), rf=0 |
| Sortino | Downside deviation variant |
| Max drawdown | Worst peak-to-trough on compounded curve |

---

## 3. Validation gates

| Horizon | Calendar days from first snapshot | Min trades (PASS) |
|---------|-----------------------------------|-------------------|
| 30d (1M) | 30+ | 3 |
| 90d (3M) | 90+ | 3 |
| 180d (6M) | 180+ | 3 |
| 365d (12M) | 365+ | 3 |

**Interpretability:** 30+ unique snapshot dates recommended before trusting aggregate hit rates.

---

## 4. APIs & UI

| Need | Action |
|------|--------|
| Horizon PASS/FAIL | `?action=backtest` → `validation` |
| Live alpha scorecards | `?action=recommendation_validation` |
| History drill-down | `?action=recommendation_history` |
| Status doc | `docs/BACKTEST_V4_STATUS.md` |

---

## 5. Production candidate criteria

- Tab 37 ≥ 30 days history for core six lists  
- Tab 22 ≥ 5 rows/list; backtest mode `snapshot_log`  
- Overall validation not FAIL on majority of horizons  
- History health monitor PASS (M3)  

---

## 6. Run sequence

1. Install triggers (6 AM + 8 AM)  
2. Accumulate 30+ calendar days  
3. **Run backtest engine**  
4. Review Tab 36 + `/validation` + `/backtest`  
5. Regenerate `BACKTEST_V4_STATUS.md` from sheet  
