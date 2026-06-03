# Section 13 — Dashboard boards (Tab 11b)

**System:** `backend/intelligence/system.md`  
**Date:** `{{DATE}}`  
**Watchlist:** `{{WATCHLIST}}` from Tab 10/11

## Purpose

Produce narrative blurbs for board rows; primary ranking comes from Sheet QUERY / `refreshDashboardViews()` documented in [SCORING.md](../../shared/scoring/SCORING.md).

## Boards (Top 10 each unless noted)

| board_name | Filter logic (Sheet) |
|------------|----------------------|
| Top 10 Immediate Opportunities | conviction ≥ 70, horizon_1w or horizon_1m TRUE |
| Top 10 Long-Term Compounders | conviction ≥ 75, horizon_6_12m TRUE, business_moat ≥ 7 |
| Top 10 Monopoly Businesses | business_moat ≥ 8 |
| Top 10 Government Beneficiaries | sector_macro ≥ 7 + theme govt/capex in UNIVERSE |
| Top 10 Insider Buying Candidates | promoter_buy_flag_90d = TRUE |
| Top 10 Order Book Winners | orderbook_signal_count_90d ≥ 1 |
| Top 10 Turnaround Stories | financial_strength improving + conviction 50–70 |
| Top 10 High Risk / High Reward | conviction ≥ 65 + pledge or pump flag |
| Fallen Angels | price_volume weak + business_moat ≥ 7 |
| Watchlist Upgrades | revision_upgrade_count_60d ≥ 1 |
| Watchlist Downgrades | analyst downgrades or conviction drop (manual flag) |

## Perplexity task

For each board requested by user, output:

`board_name | rank | symbol | trigger_summary (2 lines) | action_label`

Do not invent symbols outside `{{WATCHLIST}}` + Tab 10 universe.

## Paste target

**11b DASHBOARD BOARDS** or run **Stock Tracker → Refresh dashboard views**.

## MCP

- Tool: `perplexity_reason`
- Inputs: paste Tab 10 summary CSV + Tab 19 sector ranks
