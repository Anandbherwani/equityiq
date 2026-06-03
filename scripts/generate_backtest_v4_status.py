#!/usr/bin/env python3
"""
Generate docs/BACKTEST_V4_STATUS.md from Tab 22/23 CSV exports (or empty schema stubs).

Export from Google Sheets:
  File → Download → CSV for "22. BACKTEST LOG" and "23. BACKTEST RESULTS"
  Save as shared/schemas/22-backtest-log.csv and 23-backtest-results.csv

Usage:
  python scripts/generate_backtest_v4_status.py
  python scripts/generate_backtest_v4_status.py --log path/to/22.csv --results path/to/23.csv
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LOG = ROOT / "shared/schemas/22-backtest-log.csv"
DEFAULT_RESULTS = ROOT / "shared/schemas/23-backtest-results.csv"
OUT_PATH = ROOT / "docs/BACKTEST_V4_STATUS.md"

TRACKED_LISTS = [
    "Top 10 Immediate Opportunities",
    "Top 10 3-Month Opportunities",
    "Top 10 12-Month Compounders",
    "Top 10 Monopoly Businesses",
    "Top 10 Government Beneficiaries",
    "Top 10 Turnarounds",
]

HORIZONS = [
    ("1M", "1 Month", 30),
    ("3M", "3 Month", 90),
    ("6M", "6 Month", 180),
    ("12M", "12 Month", 365),
]

MIN_SNAPSHOT_ROWS = 5
MIN_TRADES_VALIDATION = 3
INTERPRETABLE_CALENDAR_DAYS = 30


def parse_date(val: str) -> date | None:
    if not val or not str(val).strip():
        return None
    s = str(val).strip()[:10]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def num(val) -> float | None:
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def load_snapshots(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            snap = parse_date(r.get("snapshot_date", ""))
            list_name = (r.get("list_name") or "").strip()
            symbol = (r.get("symbol") or "").strip()
            source = (r.get("source") or r.get("source ", "") or "").lower()
            if not snap or not symbol or not list_name:
                continue
            if list_name not in TRACKED_LISTS:
                continue
            if "synthetic" in source:
                continue
            rows.append(
                {
                    "snapshot_date": snap,
                    "list_name": list_name,
                    "symbol": symbol,
                }
            )
    return rows


def load_results(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out: list[dict] = []
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            list_name = (r.get("list_name") or "").strip()
            horizon = (r.get("horizon") or "").strip()
            bench = (r.get("benchmark") or "").strip().lower()
            if not list_name or not horizon:
                continue
            out.append(
                {
                    "list_name": list_name,
                    "horizon": horizon,
                    "benchmark": bench,
                    "sample_count": int(num(r.get("sample_count")) or 0),
                    "hit_rate_pct": num(r.get("hit_rate_pct")),
                    "avg_return_pct": num(r.get("avg_return_pct")),
                    "alpha_pct": num(r.get("alpha_pct")),
                    "mode": (r.get("mode") or "").strip(),
                    "notes": (r.get("notes") or "").strip(),
                }
            )
    return out


def mature_trade_count(snaps: list[dict], horizon_days: int, today: date) -> int:
    n = 0
    for s in snaps:
        exit_d = s["snapshot_date"] + timedelta(days=horizon_days)
        if exit_d <= today:
            n += 1
    return n


def horizon_verdict(
    ready: bool, trade_count: int, rec_row: dict | None
) -> str:
    if not ready:
        return "FAIL"
    if trade_count < 1:
        return "PARTIAL"
    if trade_count >= MIN_TRADES_VALIDATION:
        return "PASS"
    return "PARTIAL"


def list_verdict(ready: bool, horizons: list[dict]) -> str:
    if not ready:
        return "FAIL"
    passes = sum(1 for h in horizons if h["verdict"] == "PASS")
    if passes >= 2:
        return "PASS"
    if any(h["trade_count"] > 0 for h in horizons):
        return "PARTIAL"
    return "FAIL"


def estimate_days_to_meaningful(
    snaps: list[dict], today: date
) -> dict:
    n = len(snaps)
    unique_days = len({s["snapshot_date"] for s in snaps})
    days_to_min_rows = 0 if n >= MIN_SNAPSHOT_ROWS else 1

    per_horizon: list[dict] = []
    max_days_pass = 0
    for _key, label, days in HORIZONS:
        mature = mature_trade_count(snaps, days, today)
        gap = max(0, MIN_TRADES_VALIDATION - mature)
        if n < MIN_SNAPSHOT_ROWS:
            d_pass = days + 1
        elif gap <= 0:
            d_pass = 0
        else:
            oldest = min((s["snapshot_date"] for s in snaps), default=None)
            if oldest is None:
                d_pass = days
            else:
                exit_d = oldest + timedelta(days=days)
                if exit_d > today:
                    d_pass = (exit_d - today).days
                else:
                    d_pass = gap
        max_days_pass = max(max_days_pass, d_pass)
        per_horizon.append(
            {
                "horizon": label,
                "mature_trades": mature,
                "days_to_pass": d_pass,
            }
        )

    days_interpretable = max(0, INTERPRETABLE_CALENDAR_DAYS - unique_days)
    overall = max(days_to_min_rows, days_interpretable, max_days_pass)

    return {
        "days_to_min_rows": days_to_min_rows,
        "days_to_interpretable_history": days_interpretable,
        "days_to_longest_horizon_pass": max_days_pass,
        "days_estimated_overall": overall,
        "per_horizon": per_horizon,
        "unique_snapshot_days": unique_days,
    }


def build_list_section(
    list_name: str,
    snaps: list[dict],
    results: list[dict],
    today: date,
) -> tuple[str, dict]:
    list_snaps = [s for s in snaps if s["list_name"] == list_name]
    n = len(list_snaps)
    ready = n >= MIN_SNAPSHOT_ROWS
    dates = [s["snapshot_date"] for s in list_snaps]
    earliest = min(dates).isoformat() if dates else "—"
    latest = max(dates).isoformat() if dates else "—"
    mode = "snapshot_log" if ready else "insufficient_snapshots"

    horizon_rows: list[dict] = []
    any_pass = False
    lines = [
        f"### {list_name}",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Tab 22 snapshot rows | **{n}** (min {MIN_SNAPSHOT_ROWS} required) |",
        f"| Earliest snapshot | {earliest} |",
        f"| Latest snapshot | {latest} |",
        f"| Evaluation mode | `{mode}` |",
        "",
        "#### Completed trades by horizon",
        "",
        "| Horizon | Mature trades (date window) | Tab 23 sample (if run) | Verdict |",
        "|---------|---------------------------|------------------------|---------|",
    ]

    for _key, label, days in HORIZONS:
        mature = mature_trade_count(list_snaps, days, today)
        rec = next(
            (
                r
                for r in results
                if r["list_name"] == list_name
                and r["horizon"] == label
                and r["benchmark"] == "recommendations"
            ),
            None,
        )
        tab23_n = rec["sample_count"] if rec else 0
        trade_count = tab23_n if tab23_n > 0 else mature
        verdict = horizon_verdict(ready, trade_count, rec)
        if verdict == "PASS":
            any_pass = True
        horizon_rows.append(
            {
                "horizon": label,
                "trade_count": trade_count,
                "verdict": verdict,
                "rec": rec,
            }
        )
        lines.append(
            f"| {label} | {mature} | {tab23_n or '—'} | **{verdict}** |"
        )

    list_v = list_verdict(ready, horizon_rows)

    alpha_n = "—"
    alpha_s = "—"
    if ready:
        rec_12 = next((h["rec"] for h in horizon_rows if h["horizon"] == "12 Month"), None)
        if rec_12 and rec_12.get("alpha_pct") is not None:
            alpha_n = f"{rec_12['alpha_pct']:+.2f}%"
        sec = next(
            (
                r
                for r in results
                if r["list_name"] == list_name
                and r["benchmark"] == "sector"
            ),
            None,
        )
        if sec and rec_12:
            ar = rec_12.get("avg_return_pct")
            sr = sec.get("avg_return_pct")
            if ar is not None and sr is not None:
                alpha_s = f"{ar - sr:+.2f}% (spread vs sector row)"

    est = estimate_days_to_meaningful(list_snaps, today)

    lines.extend(
        [
            "",
            f"| List validation verdict | **{list_v}** |",
            f"| Any horizon PASS? | {'Yes' if any_pass else 'No'} |",
            f"| Alpha vs Nifty (12M rec. row, Tab 23) | {alpha_n} |",
            f"| Alpha vs sector (12M, Tab 23) | {alpha_s} |",
            f"| Est. days to meaningful stats (this list) | **{est['days_estimated_overall']}** calendar days |",
            "",
        ]
    )

    return "\n".join(lines), {
        "list_name": list_name,
        "snapshot_rows": n,
        "list_verdict": list_v,
        "any_pass": any_pass,
        "estimate": est,
    }


def overall_verdict(sections: list[dict]) -> str:
    fails = sum(1 for s in sections if s["list_verdict"] == "FAIL")
    passes = sum(1 for s in sections if s["list_verdict"] == "PASS")
    if fails > passes:
        return "FAIL"
    if passes == 0:
        return "PARTIAL"
    return "PASS" if passes >= len(TRACKED_LISTS) // 2 else "PARTIAL"


def generate_markdown(
    log_path: Path, results_path: Path, today: date | None = None
) -> str:
    today = today or date.today()
    snaps = load_snapshots(log_path)
    results = load_results(results_path)

    sections_meta: list[dict] = []
    body_parts: list[str] = []

    for list_name in TRACKED_LISTS:
        section, meta = build_list_section(list_name, snaps, results, today)
        body_parts.append(section)
        sections_meta.append(meta)

    overall = overall_verdict(sections_meta)
    max_est = max((m["estimate"]["days_estimated_overall"] for m in sections_meta), default=0)
    total_snaps = len(snaps)
    data_note = (
        "Live Tab 22/23 CSV exports in `shared/schemas/`"
        if snaps or results
        else "**No Tab 22/23 data in repo** — export sheets or run Apps Script menu "
        "**Generate BACKTEST_V4 status (markdown)** after snapshots exist."
    )

    lines = [
        "# Backtest v4 — Status Report",
        "",
        f"**Generated:** {today.isoformat()} (local generator)",
        f"**Engine:** BacktestEngine.gs v4.0 · snapshot-only",
        f"**Data source:** {data_note}",
        "",
        "## Executive summary",
        "",
        f"| Field | Value |",
        f"|-------|-------|",
        f"| Overall validation verdict | **{overall}** |",
        f"| Total Tab 22 rows (tracked lists, non-synthetic) | **{total_snaps}** |",
        f"| Lists with ≥{MIN_SNAPSHOT_ROWS} snapshots | "
        f"**{sum(1 for m in sections_meta if m['snapshot_rows'] >= MIN_SNAPSHOT_ROWS)}** / {len(TRACKED_LISTS)} |",
        f"| Longest horizon to PASS (max across lists) | **{max_est}** calendar days (estimate) |",
        "",
        "### Thresholds (v4)",
        "",
        f"- **{MIN_SNAPSHOT_ROWS}+** Tab 22 rows per list before horizons evaluate",
        f"- **{MIN_TRADES_VALIDATION}+** completed trades per horizon for **PASS**",
        f"- **{INTERPRETABLE_CALENDAR_DAYS}+** unique snapshot dates recommended for interpretable hit rates",
        "",
        "### Days-to-meaningful (method)",
        "",
        "Per list, estimated calendar days until PASS on the slowest horizon, using:",
        "",
        "1. One trading day to reach min row count (daily Top 10 snapshot ≈10 rows/list).",
        "2. `snapshot_date + horizon_days ≤ today` for mature trade counts.",
        "3. Roadmap interpretability: 30 unique snapshot dates.",
        "4. 12M horizon requires ~365 days from the **oldest** snapshot in the cohort.",
        "",
        "Re-run after **Run backtest engine** for paired alpha from Google Finance (Tab 23).",
        "Mature-trade counts here do not require price fetches.",
        "",
        "---",
        "",
        "## Per recommendation list",
        "",
    ]
    lines.extend(body_parts)
    lines.extend(
        [
            "---",
            "",
            "## Regenerate this file",
            "",
            "**From spreadsheet (authoritative):**",
            "Stock Tracker → Backtest (Phase 7) → **Generate BACKTEST_V4 status (markdown)**",
            "(runs engine if needed; copies markdown to log).",
            "",
            "**From CSV exports:**",
            "```bash",
            "python scripts/generate_backtest_v4_status.py",
            "```",
            "",
            "See [BACKTEST_ENGINE.md](./BACKTEST_ENGINE.md) · [BACKTEST_VALIDATION_REPORT.md](./BACKTEST_VALIDATION_REPORT.md).",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--log", type=Path, default=DEFAULT_LOG)
    parser.add_argument("--results", type=Path, default=DEFAULT_RESULTS)
    parser.add_argument("-o", "--output", type=Path, default=OUT_PATH)
    args = parser.parse_args()

    md = generate_markdown(args.log, args.results)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(md, encoding="utf-8")
    print(f"Wrote {args.output} ({len(md)} bytes)")


if __name__ == "__main__":
    main()
