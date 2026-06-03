# Section 10 — Order book intelligence (Tab 16)

**System:** `backend/intelligence/system.md`  
**Date:** `{{DATE}}`

## Inputs

- Symbol, announcement headline or Tab 15 filing summary
- Latest annual report / concall order book commentary (paste if available)
- TTM revenue from Tab 6 if available

## Tasks

1. Extract **order_value_cr**, customer_type (government / PSU / private / export), project_type.
2. Estimate **execution_period** (months) and **order_book_est_cr** post-win.
3. Compute **orderbook_revenue_ratio** = order_book_est_cr / ttm_revenue_cr when both numeric.
4. Rate **confidence** (high / medium / low) based on source (exchange filing = high).
5. Note **domestic_export** and sector linkage.

## Output (Tab 16 row)

Ready-to-paste CSV columns per `schemas/16-order-book-tracker.csv`.

## Scoring hint

- Strong order book build (ratio > 0.25, high confidence) → suggest +3 to +8 on `corporate_trigger` or `filings_intelligence` (human confirms).
- Helper `orderbook_signal_count_90d` increments via Apps Script when row added.

## MCP

- Tool: `perplexity_ask`
- Domains: `nseindia.com`, `moneycontrol.com`, `screener.in`
- Recency: `month`
