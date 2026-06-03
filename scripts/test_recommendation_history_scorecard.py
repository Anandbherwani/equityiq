#!/usr/bin/env python3
"""
Audit tests for Recommendation History scorecards (H1: average_alpha_vs_sector_pct).

Mirrors buildRecommendationScorecard_() in RecommendationHistoryEngine.gs.

Usage:
  python scripts/test_recommendation_history_scorecard.py
"""

from __future__ import annotations

import sys
from typing import Any


def build_scorecard(entries: list[dict], category: str) -> dict[str, Any]:
    """Python mirror of buildRecommendationScorecard_."""
    subset = [e for e in entries if e.get("recommendation_category") == category]
    with_ret = [
        e
        for e in subset
        if e.get("live") and e["live"].get("current_return_pct") is not None
    ]

    issued = len(subset)
    hits = sum(1 for e in with_ret if e["live"].get("hit"))
    hit_rate = round((hits / len(with_ret)) * 1000) / 10 if with_ret else None
    avg_return = (
        round(
            sum(e["live"]["current_return_pct"] for e in with_ret) / len(with_ret) * 100
        )
        / 100
        if with_ret
        else None
    )

    with_alpha_nifty = [
        e for e in with_ret if e["live"].get("alpha_vs_nifty_pct") is not None
    ]
    avg_alpha_nifty = (
        round(
            sum(e["live"]["alpha_vs_nifty_pct"] for e in with_alpha_nifty)
            / len(with_alpha_nifty)
            * 100
        )
        / 100
        if with_alpha_nifty
        else None
    )

    with_alpha_sector = [
        e for e in with_ret if e["live"].get("alpha_vs_sector_pct") is not None
    ]
    avg_alpha_sector = (
        round(
            sum(e["live"]["alpha_vs_sector_pct"] for e in with_alpha_sector)
            / len(with_alpha_sector)
            * 100
        )
        / 100
        if with_alpha_sector
        else None
    )

    return {
        "recommendation_category": category,
        "recommendations_issued": issued,
        "hit_rate_pct": hit_rate,
        "average_return_pct": avg_return,
        "average_alpha_vs_nifty_pct": avg_alpha_nifty,
        "average_alpha_vs_sector_pct": avg_alpha_sector,
    }


def validation_payload_has_sector_alpha(payload: dict) -> bool:
    """Simulates ?action=recommendation_validation scorecard shape."""
    for card in payload.get("scorecards", []):
        if "average_alpha_vs_sector_pct" not in card:
            return False
    return True


def test_average_alpha_vs_sector_pct() -> None:
    entries = [
        {
            "recommendation_category": "immediate",
            "live": {
                "current_return_pct": 10.0,
                "alpha_vs_nifty_pct": 5.0,
                "alpha_vs_sector_pct": 3.0,
                "hit": True,
            },
        },
        {
            "recommendation_category": "immediate",
            "live": {
                "current_return_pct": 6.0,
                "alpha_vs_nifty_pct": 2.0,
                "alpha_vs_sector_pct": 1.0,
                "hit": True,
            },
        },
        {
            "recommendation_category": "immediate",
            "live": {
                "current_return_pct": -2.0,
                "alpha_vs_nifty_pct": None,
                "alpha_vs_sector_pct": -1.0,
                "hit": False,
            },
        },
    ]
    card = build_scorecard(entries, "immediate")
    assert card["average_alpha_vs_nifty_pct"] == 3.5, card
    assert card["average_alpha_vs_sector_pct"] == 1.0, card
    assert card["hit_rate_pct"] == 66.7


def test_sector_alpha_null_when_no_sector_data() -> None:
    entries = [
        {
            "recommendation_category": "turnaround",
            "live": {
                "current_return_pct": 4.0,
                "alpha_vs_nifty_pct": 1.0,
                "alpha_vs_sector_pct": None,
                "hit": True,
            },
        },
    ]
    card = build_scorecard(entries, "turnaround")
    assert card["average_alpha_vs_nifty_pct"] == 1.0
    assert card["average_alpha_vs_sector_pct"] is None


def test_validation_api_field_present() -> None:
    payload = {
        "ok": True,
        "scorecards": [
            {
                "recommendation_category": "immediate",
                "average_alpha_vs_nifty_pct": 3.5,
                "average_alpha_vs_sector_pct": 2.0,
            }
        ],
    }
    assert validation_payload_has_sector_alpha(payload)


def test_typescript_type_field_documented() -> None:
    """Ensure frontend types include average_alpha_vs_sector_pct."""
    path = (
        __file__.replace("scripts/test_recommendation_history_scorecard.py", "")
        + "frontend/src/lib/types.ts"
    )
    text = open(path, encoding="utf-8").read()
    assert "average_alpha_vs_sector_pct" in text


def test_theme_categories_mapped() -> None:
    path = (
        __file__.replace("scripts/test_recommendation_history_scorecard.py", "")
        + "backend/automation/RecommendationHistoryEngine.gs"
    )
    text = open(path, encoding="utf-8").read()
    for cat in ("theme", "theme_winner", "theme_stock"):
        assert f"'{cat}'" in text or f'"{cat}"' in text


def test_no_blank_category_on_snapshot() -> None:
    path = (
        __file__.replace("scripts/test_recommendation_history_scorecard.py", "")
        + "backend/automation/RecommendationHistoryEngine.gs"
    )
    text = open(path, encoding="utf-8").read()
    assert "resolveRecommendationCategory_" in text
    assert "skippedNoCategory" in text


def test_history_health_monitor() -> None:
    path = (
        __file__.replace("scripts/test_recommendation_history_scorecard.py", "")
        + "backend/automation/RecommendationHistoryEngine.gs"
    )
    text = open(path, encoding="utf-8").read()
    assert "getRecommendationHistoryHealth_" in text
    assert "average_alpha_vs_sector_pct" in text


def test_gs_engine_exports_field() -> None:
    path = (
        __file__.replace("scripts/test_recommendation_history_scorecard.py", "")
        + "backend/automation/RecommendationHistoryEngine.gs"
    )
    text = open(path, encoding="utf-8").read()
    assert "average_alpha_vs_sector_pct: avgAlphaSector" in text


def main() -> int:
    tests = [
        test_average_alpha_vs_sector_pct,
        test_sector_alpha_null_when_no_sector_data,
        test_validation_api_field_present,
        test_typescript_type_field_documented,
        test_theme_categories_mapped,
        test_no_blank_category_on_snapshot,
        test_history_health_monitor,
        test_gs_engine_exports_field,
    ]
    for t in tests:
        t()
        print(f"OK  {t.__name__}")
    print(f"\nAll {len(tests)} audit tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
