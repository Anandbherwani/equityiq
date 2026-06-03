# Offline backtest (Python)

Complements Apps Script `BacktestEngine.gs` when GOOGLEFINANCE quotas are tight.

```bash
pip install yfinance pandas numpy
python backend/backtest/run_backtest.py RELIANCE TCS INFY HDFCBANK ITC
```

Same horizons (1M / 3M / 6M / 12M) and metrics as [shared/scoring/BACKTEST.md](../../shared/scoring/BACKTEST.md).

Canonical results for EquityIQ live in Sheets Tab **23** via `?action=backtest`.
