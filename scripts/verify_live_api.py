#!/usr/bin/env python3
"""Probe EquityIQ Web App actions. Usage: API_URL=https://.../exec python3 scripts/verify_live_api.py"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ACTIONS = [
    "health",
    "top10",
    ("symbol", {"symbol": "HAL"}),
    ("stock", {"symbol": "HAL"}),
    "recommendation_history",
    "recommendation_validation",
    ("market_summary", {}),
    "macro",
    "backtest",
    "morning_brief",
]


def fetch(base: str, action: str, params: dict | None = None) -> dict:
    q = {"action": action, **(params or {})}
    url = base + "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            body = r.read().decode("utf-8", errors="replace")
            return {"status": r.status, "ok_json": True, "body": json.loads(body)}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "ok_json": False, "error": str(e)}
    except json.JSONDecodeError as e:
        return {"status": 200, "ok_json": False, "error": f"invalid json: {e}"}
    except Exception as e:
        return {"status": 0, "ok_json": False, "error": str(e)}


def main() -> int:
    base = (os.environ.get("API_URL") or os.environ.get("NEXT_PUBLIC_SHEETS_API_URL") or "").strip().rstrip("/")
    if not base:
        print("SKIP: set API_URL or NEXT_PUBLIC_SHEETS_API_URL")
        return 2
    results = []
    for item in ACTIONS:
        if isinstance(item, tuple):
            action, params = item
        else:
            action, params = item, None
        row = fetch(base, action, params)
        payload = row.get("body") if row.get("ok_json") else {}
        api_ok = isinstance(payload, dict) and payload.get("ok") is True
        results.append({"action": action, "http": row.get("status"), "api_ok": api_ok, "detail": row})
        status = "PASS" if api_ok else "FAIL"
        print(f"{action}\t{status}\thttp={row.get('status')}")
    fails = sum(1 for r in results if not r["api_ok"])
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
