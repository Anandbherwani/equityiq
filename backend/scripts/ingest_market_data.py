#!/usr/bin/env python3
"""
Optional NSE market data backfill (bulk/block deals, shareholding).
Use when Apps Script hits execution limits or for one-off 30-day deal history.

  pip install -r requirements-ingestion.txt
  python ingest_market_data.py --deals-days 30
  python ingest_market_data.py --shareholding RELIANCE,TCS,INFY --out-dir ../../data/exports

Does not write to Google Sheets unless GOOGLE_SHEETS_ID + GOOGLE_APPLICATION_CREDENTIALS are set.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    print("Install: pip install requests", file=sys.stderr)
    sys.exit(1)

NSE_HOME = "https://www.nseindia.com"
NSE_API = "https://www.nseindia.com/api"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}
DELAY_SEC = 0.4


class NseClient:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def bootstrap(self) -> None:
        r = self.session.get(NSE_HOME, timeout=30)
        r.raise_for_status()
        time.sleep(DELAY_SEC)

    def get_json(self, path: str, params: dict[str, str] | None = None) -> Any:
        url = path if path.startswith("http") else f"{NSE_API}{path}"
        time.sleep(DELAY_SEC)
        r = self.session.get(url, params=params or {}, timeout=30)
        if r.status_code == 403:
            self.bootstrap()
            time.sleep(DELAY_SEC)
            r = self.session.get(url, params=params or {}, timeout=30)
        r.raise_for_status()
        return r.json()


def dd_mm_yyyy(d: datetime) -> str:
    return d.strftime("%d-%m-%Y")


def normalize_deals(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict):
        rows = payload.get("data") or payload.get("bulkDeals") or payload.get("blockDeals") or []
    else:
        rows = []
    out = []
    for r in rows:
        sym = r.get("symbol") or r.get("secSymbol") or ""
        if not sym:
            continue
        out.append(
            {
                "date": r.get("date") or r.get("tradeDate") or "",
                "symbol": sym,
                "client_name": r.get("clientName") or r.get("client") or "",
                "buy_sell": r.get("buySell") or r.get("transactionType") or "",
                "qty": r.get("qty") or r.get("quantity") or "",
                "price": r.get("watp") or r.get("tradePrice") or r.get("price") or "",
                "deal_type": "block" if "block" in str(r.get("remarks", "")).lower() else "bulk",
            }
        )
    return out


def fetch_deals(client: NseClient, days: int, option_type: str) -> list[dict[str, Any]]:
    end = datetime.now()
    start = end - timedelta(days=max(1, days))
    data = client.get_json(
        "/historical/bulk-deals-type",
        {"optionType": option_type, "from": dd_mm_yyyy(start), "to": dd_mm_yyyy(end)},
    )
    return normalize_deals(data)


def fetch_shareholding(client: NseClient, symbol: str) -> dict[str, Any] | None:
    data = client.get_json("/corporate-share-holdings", {"index": "equities", "symbol": symbol})
    cats = []
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        cats = data["data"]
    elif isinstance(data, list):
        cats = data
    if not cats:
        return None
    row = {
        "symbol": symbol,
        "as_of_date": datetime.now().strftime("%Y-%m-%d"),
        "fii_pct": 0.0,
        "dii_pct": 0.0,
        "mf_pct": 0.0,
        "promoter_pct": 0.0,
        "public_pct": 0.0,
        "source": "nse:corporate-share-holdings",
    }
    dii_acc = 0.0
    for c in cats:
        label = str(c.get("category") or c.get("name") or "").lower()
        pct = float(c.get("percentage") or c.get("percHolding") or 0)
        if "promoter" in label:
            row["promoter_pct"] += pct
        elif "foreign" in label or "fpi" in label or "fii" in label:
            row["fii_pct"] += pct
        elif "mutual" in label:
            row["mf_pct"] += pct
        elif "insurance" in label or ("bank" in label and "mutual" not in label):
            dii_acc += pct
        elif "public" in label:
            row["public_pct"] += pct
    row["dii_pct"] = dii_acc
    return row


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="NSE ingestion backfill")
    parser.add_argument("--deals-days", type=int, default=0, help="Fetch bulk+block deals for N days")
    parser.add_argument("--shareholding", type=str, default="", help="Comma-separated symbols")
    parser.add_argument(
        "--out-dir",
        type=str,
        default=str(Path(__file__).resolve().parents[2] / "data" / "exports"),
    )
    args = parser.parse_args()
    out_dir = Path(args.out_dir)
    client = NseClient()
    client.bootstrap()

    if args.deals_days > 0:
        bulk = fetch_deals(client, args.deals_days, "bulk_deals")
        block = fetch_deals(client, args.deals_days, "block_deals")
        deals = bulk + block
        p = out_dir / f"bulk_block_deals_{datetime.now().strftime('%Y%m%d')}.csv"
        write_csv(
            p,
            ["date", "symbol", "client_name", "buy_sell", "qty", "price", "deal_type"],
            deals,
        )
        print(f"Wrote {len(deals)} deals → {p}")

    symbols = [s.strip().upper() for s in args.shareholding.split(",") if s.strip()]
    if symbols:
        rows = []
        for sym in symbols:
            try:
                sh = fetch_shareholding(client, sym)
                if sh:
                    rows.append(sh)
            except Exception as e:
                print(f"skip {sym}: {e}", file=sys.stderr)
        p = out_dir / f"shareholding_{datetime.now().strftime('%Y%m%d')}.csv"
        write_csv(
            p,
            ["symbol", "as_of_date", "fii_pct", "dii_pct", "mf_pct", "promoter_pct", "public_pct", "source"],
            rows,
        )
        print(f"Wrote {len(rows)} shareholding rows → {p}")

    summary = {"ok": True, "deals_days": args.deals_days, "symbols": len(symbols)}
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
