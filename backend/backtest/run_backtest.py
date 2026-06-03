#!/usr/bin/env python3
"""
Offline backtest (Phase 7) — recommendations vs Nifty 50.
Requires: pip install yfinance pandas numpy

Usage:
  python backend/backtest/run_backtest.py RELIANCE TCS INFY HDFCBANK ITC
  python backend/backtest/run_backtest.py --symbols-file picks.txt
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

try:
    import yfinance as yf
except ImportError:
    print("Install: pip install yfinance pandas numpy", file=sys.stderr)
    sys.exit(1)

HORIZONS = [
    ("1M", 30),
    ("3M", 90),
    ("6M", 180),
    ("12M", 365),
]

NIFTY_TICKER = "^NSEI"


def nse_ticker(symbol: str) -> str:
    s = symbol.strip().upper().replace(".NS", "")
    return f"{s}.NS"


def fetch_close(ticker: str, day: datetime) -> float | None:
    start = day - timedelta(days=5)
    end = day + timedelta(days=2)
    hist = yf.Ticker(ticker).history(start=start, end=end, auto_adjust=True)
    if hist.empty:
        return None
    hist.index = hist.index.tz_localize(None)
    target = pd.Timestamp(day.date())
    row = hist.loc[hist.index <= target]
    if row.empty:
        return None
    return float(row["Close"].iloc[-1])


def trade_return(symbol: str, horizon_days: int, today: datetime) -> float | None:
    entry_day = today - timedelta(days=horizon_days)
    entry = fetch_close(nse_ticker(symbol), entry_day)
    exit_px = fetch_close(nse_ticker(symbol), today)
    if not entry or not exit_px or entry <= 0:
        return None
    return (exit_px - entry) / entry * 100


def nifty_return(horizon_days: int, today: datetime) -> float | None:
    entry_day = today - timedelta(days=horizon_days)
    entry = fetch_close(NIFTY_TICKER, entry_day)
    exit_px = fetch_close(NIFTY_TICKER, today)
    if not entry or not exit_px or entry <= 0:
        return None
    return (exit_px - entry) / entry * 100


def metrics(returns: list[float]) -> dict:
    if not returns:
        return {
            "sample_count": 0,
            "hit_rate_pct": 0.0,
            "avg_return_pct": 0.0,
            "max_drawdown_pct": 0.0,
            "sharpe_ratio": 0.0,
            "total_return_pct": 0.0,
        }
    arr = np.array(returns, dtype=float)
    winners = int((arr > 0).sum())
    avg = float(arr.mean())
    std = float(arr.std(ddof=1)) if len(arr) > 1 else 0.0
    sharpe = (avg / std * np.sqrt(12)) if std > 0 else (1.0 if avg > 0 else 0.0)

    equity = 1.0
    peak = 1.0
    max_dd = 0.0
    for r in arr:
        equity *= 1 + r / 100
        peak = max(peak, equity)
        dd = (peak - equity) / peak * 100 if peak else 0
        max_dd = max(max_dd, dd)

    return {
        "sample_count": len(arr),
        "hit_rate_pct": round(winners / len(arr) * 100, 1),
        "avg_return_pct": round(avg, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "sharpe_ratio": round(float(sharpe), 2),
        "total_return_pct": round((equity - 1) * 100, 2),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest picks vs Nifty")
    parser.add_argument("symbols", nargs="*", help="NSE symbols e.g. RELIANCE TCS")
    parser.add_argument("--symbols-file", help="One symbol per line")
    args = parser.parse_args()

    symbols = list(args.symbols or [])
    if args.symbols_file:
        with open(args.symbols_file, encoding="utf-8") as f:
            symbols.extend(line.strip() for line in f if line.strip())

    if not symbols:
        print("Provide symbols or --symbols-file", file=sys.stderr)
        sys.exit(1)

    today = datetime.now()
    print(f"Backtest as of {today.date()} — symbols: {', '.join(symbols)}\n")

    for label, days in HORIZONS:
        rec_rets = [r for s in symbols if (r := trade_return(s, days, today)) is not None]
        nif = nifty_return(days, today)
        rec_m = metrics(rec_rets)
        nif_m = metrics([nif] if nif is not None else [])

        print(f"=== {label} ({days}d) ===")
        print(
            f"  Recommendations: n={rec_m['sample_count']} hit={rec_m['hit_rate_pct']}% "
            f"avg={rec_m['avg_return_pct']}% DD={rec_m['max_drawdown_pct']}% Sharpe={rec_m['sharpe_ratio']}"
        )
        if nif is not None:
            print(
                f"  Nifty 50:        hit={nif_m['hit_rate_pct']}% avg={nif_m['avg_return_pct']}% "
                f"DD={nif_m['max_drawdown_pct']}% Sharpe={nif_m['sharpe_ratio']}"
            )
            print(f"  Alpha (avg):     {rec_m['avg_return_pct'] - nif_m['avg_return_pct']:+.2f}%")
        print()


if __name__ == "__main__":
    main()
