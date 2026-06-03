# Backtest engine (Phase 7 → v4)

**Implementation:** `backend/automation/BacktestEngine.gs` v4.0  
**Validation:** Tab 36 · `docs/BACKTEST_VALIDATION_REPORT.md`
**Full docs:** [`docs/BACKTEST_ENGINE.md`](../../docs/BACKTEST_ENGINE.md)  
**v3.0:** Snapshot-only (Tab 22) · Nifty + sector benchmarks · Sortino · Performance dashboard (Tab 31 / API `dashboard`)  
**Sheets:** Tab **22** (log) · Tab **23** (results)  
**API:** `?action=backtest`

## Tracked lists

- Top 10 Immediate Opportunities  
- Top 10 12-Month Compounders  
- Top 10 Government Beneficiaries  
- Top 10 Turnarounds  

## Horizons

1 / 3 / 6 / 12 months (30 / 90 / 180 / 365 days).

## vs Nifty 50

Each list × horizon → **recommendations** row + **nifty** row on Tab 23.

## Metrics

Hit rate, average return, **median return**, max drawdown, Sharpe, total return.

## Snapshot

`snapshotAllBacktestLists_()` daily → Tab 22 for point-in-time backtests.
