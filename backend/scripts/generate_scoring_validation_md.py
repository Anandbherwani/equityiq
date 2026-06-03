#!/usr/bin/env python3
"""
Build docs/SCORING_ENGINE_VALIDATION.md from Apps Script JSON export.

Usage:
  1. In Sheet: Stock Tracker → Run Scoring Engine 2.1 validation
  2. Project settings → Script properties → copy SCORING_ENGINE_VALIDATION_JSON
     OR save JSON to data/scoring_validation.json
  3. python backend/scripts/generate_scoring_validation_md.py data/scoring_validation.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "SCORING_ENGINE_VALIDATION.md"


def render(report: dict) -> str:
    c = report.get("conviction", {})
    lines = [
        "# Scoring Engine Validation Report",
        "",
        f"**Engine version:** {report.get('engineVersion', 'unknown')}  ",
        f"**Timestamp (IST):** {report.get('timestampIst', '—')}  ",
        f"**Spreadsheet:** {report.get('spreadsheetName', '—')}  ",
        f"**Tab 10 rows:** {report.get('tab10Rows', 0)}  ",
        f"**Tab 6 rows:** {report.get('tab6Rows', 0)}  ",
        f"**Stale M rows (C–J=0, old M>0):** {report.get('stale_m_count', 0)}  ",
        "",
        "## Conviction (M) distribution",
        "",
        "| Metric | Value |",
        "|--------|------:|",
        f"| Count M > 0 | {c.get('count_gt0', 0)} |",
        f"| Count M > 10 | {c.get('count_gt10', 0)} |",
        f"| Count M > 20 | {c.get('count_gt20', 0)} |",
        f"| Count M > 40 | {c.get('count_gt40', 0)} |",
        f"| Count M > 60 | {c.get('count_gt60', 0)} |",
        f"| Maximum M | {c.get('max', 0)} |",
        f"| Median M | {c.get('median', 0)} |",
        f"| Average M | {c.get('average', 0)} |",
        f"| % rows with M > 0 | {report.get('diagnosis', {}).get('pct_rows_m_gt0', 0)}% |",
        "",
        "## Pillar forensic (C–K)",
        "",
        "| Pillar | Non-zero | Missing | Avg (non-zero) | Avg (all rows) | Total pts | At cap | Conf % |",
        "|--------|--------:|--------:|---------------:|---------------:|----------:|-------:|-------:|",
    ]
    for p in report.get("pillars", []):
        lines.append(
            f"| {p.get('key')} {p.get('name')} | {p.get('non_zero_count')} "
            f"({p.get('non_zero_pct')}%) | {p.get('missing_count')} | "
            f"{p.get('average_score_nonzero')} | {p.get('average_score_all_rows')} | "
            f"{p.get('total_points_contributed')} | {p.get('at_cap_count')} | "
            f"{p.get('avg_confidence_pct')} |"
        )
    d = report.get("diagnosis", {})
    lines.extend([
        "",
        "## Diagnosis",
        "",
        f"- **Dominant pillar (total points):** {d.get('dominant_pillar', '—')} ({d.get('dominant_total_points', 0)} pts)",
        f"- **Weak pillars (&lt;5% non-zero, max≥10):** {', '.join(d.get('weak_pillars', [])) or 'none'}",
        f"- **Never contribute (0% non-zero):** {', '.join(d.get('never_contribute', [])) or 'none'}",
        "",
        "## Top 20 by M",
        "",
        "| Rank | Symbol | M |",
        "|-----:|--------|--:|",
    ])
    for t in report.get("top20", []):
        lines.append(f"| {t.get('rank')} | {t.get('symbol', '—')} | {t.get('conviction_total')} |")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python generate_scoring_validation_md.py <validation.json>", file=sys.stderr)
        sys.exit(1)
    data = json.loads(Path(sys.argv[1]).read_text())
    OUT.write_text(render(data), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
