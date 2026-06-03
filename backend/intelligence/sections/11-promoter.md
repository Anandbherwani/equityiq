# Section 11 — Promoter activity (Tab 18)

**System:** `backend/intelligence/system.md`  
**Date:** `{{DATE}}`

## Inputs

- Symbol
- Paste BSE/NSE insider trades or InsiderScreener export
- Tab 5 row if already captured
- UNIVERSE `pledge_pct` if known

## Tasks

1. Classify **transaction_type**: buy / sell / pledge invoke / pledge release / gift / trust transfer.
2. Set **promoter_group_flag** and **trust_holding_flag** where applicable.
3. Track **pledge_pct** and **pledge_trend** (rising / stable / falling).
4. Flag open-market **buy** in last 90d for `promoter_buy_flag_90d` helper on Tab 10.

## Output (Tab 18)

Columns per `schemas/18-promoter-activity.csv`. Label [CONFIRMED] for exchange filings.

## Scoring hint (Tab 10 `promoter_activity`, max 15)

| Pattern | Suggested range |
|---------|-----------------|
| Open market buy + falling pledge | 10–15 |
| Neutral / no change | 4–7 |
| Rising pledge or large sell | 0–3 |

## MCP

- Tool: `perplexity_ask`
- Domains: `nseindia.com`, `bseindia.com`, `insidertrading.in` (if indexed)
- Recency: `month`
