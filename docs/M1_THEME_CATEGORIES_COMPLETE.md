# M1 — Theme Categories Complete

**Status:** Closed (2026-06-04)  
**Engine:** `RecommendationHistoryEngine.gs` v1.1

## Problem

Theme Tab 11 lists (`Top Themes`, `Theme Winners`, `Theme Conviction`, `Top 10 Theme Stocks`) were snapshotted to Tab 37 with **blank** `recommendation_category`, breaking validation scorecards and filters.

## Solution

Explicit category map — no blank values on new snapshots:

| Tab 11 list name | `recommendation_category` |
|------------------|---------------------------|
| Top Themes | `theme` |
| Theme Winners | `theme_winner` |
| Theme Conviction | `theme_winner` |
| Top 10 Theme Stocks | `theme_stock` |

Core six lists unchanged (`immediate`, `three_month`, etc.). SME and IPO categories added in same sprint (`sme_*`, `ipo`).

## Behaviour

- `resolveRecommendationCategory_(pick)` — never appends without a valid category.
- `parseTab11EvidenceMeta_(evidence)` — JSON overrides for SME/IPO tracks.
- `parseRecommendationHistoryRow_` — backfills category from `list_name` for legacy rows.
- `isEquityHistoryRow_` — `theme` rows skip live price/alpha math (non-ticker theme IDs).

## Surfaces updated

- Tab 37 snapshot (`snapshotRecommendationHistory_`)
- `?action=recommendation_history` / `recommendation_validation`
- `/history` filter chips (`RECOMMENDATION_CATEGORY_LABELS`)
- `/validation` scorecards
- `scripts/test_recommendation_history_scorecard.py` (theme + blank-category tests)

## Verification

```bash
python scripts/test_recommendation_history_scorecard.py
```

After deploy: run **Snapshot history → Tab 37**; confirm column B has only values from `VALID_RECOMMENDATION_CATEGORIES_`.
