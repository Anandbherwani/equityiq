# Backtest v4 — Validation Report

**Engine:** `BacktestEngine.gs` v4.0  
**Output sheet:** Tab **36. BACKTEST VALIDATION**  
**API field:** `validation` on `?action=backtest`  
**Script property:** `LAST_BACKTEST_VALIDATION_JSON`

---

## Purpose

After each **Run backtest engine** run, v4 writes a structured validation report that confirms:

1. Only **actual Tab 22 recommendation snapshots** were used (no synthetic cohort, no live Tab 11 substitute).
2. Each pick was compared to **Nifty 50** and a **sector benchmark** on the **same entry/exit dates**.
3. Core metrics were computed: **Alpha** (paired per trade), **Hit Rate**, **Sharpe**, **Sortino**, **Max Drawdown**.

---

## Verdicts

| Verdict | Meaning |
|---------|---------|
| **PASS** | List has ≥5 Tab 22 snapshots and horizon has ≥3 completed trades |
| **PARTIAL** | List ready but horizon immature (exit still in future) or &lt;3 trades |
| **FAIL** | &lt;5 snapshots for the list (`insufficient_snapshots`) |

**Overall verdict:** PASS if most horizons pass; PARTIAL if mixed; FAIL if most lists lack snapshot history.

---

## Tab 36 columns

| Column | Description |
|--------|-------------|
| `scope` | `HORIZON` (per list × horizon) or `LIST_SUMMARY` |
| `verdict` | PASS / PARTIAL / FAIL |
| `trade_count` | Completed snapshot trades in horizon |
| `hit_rate_pct` | % positive returns |
| `avg_return_pct` | Mean pick return |
| `alpha_vs_nifty_pct` | Mean paired alpha vs Nifty |
| `alpha_vs_sector_pct` | Mean paired alpha vs sector index |
| `sharpe_ratio` | Annualized Sharpe (√12, rf=0) |
| `sortino_ratio` | Annualized Sortino |
| `max_drawdown_pct` | Max drawdown on compounded trade curve |

---

## Workflow

1. **Sync recommendations** (Tab 11)  
2. **Snapshot all lists → Tab 22** daily for ≥30 days  
3. **Run backtest engine** → Tab 23 + Tab 31 + Tab 36  
4. Review **EquityIQ /backtest** validation panel and Tab 36  

---

## Related docs

- [BACKTEST_ENGINE.md](./BACKTEST_ENGINE.md) — full methodology  
- [shared/scoring/BACKTEST.md](../shared/scoring/BACKTEST.md) — schema summary  
