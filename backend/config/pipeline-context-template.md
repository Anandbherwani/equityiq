# Pipeline context block (assembled by n8n before Perplexity)

Replace `{{...}}` placeholders in n8n Code node. Keep under ~12k tokens for sonar-pro.

---

## RUN METADATA

- Date (IST): {{DATE_IST}}
- Run ID: {{RUN_ID}}
- Watchlist symbols: {{WATCHLIST_SYMBOLS}}

---

## MACRO VERDICT (from Tab 8)

{{MACRO_VERDICT_TEXT}}

---

## MACRO BENEFICIARIES (from Tab 20, last 5 rows)

{{MACRO_BENEFICIARIES_TABLE}}

---

## SECTOR STRENGTH (from Tab 19, latest week)

{{SECTOR_STRENGTH_TABLE}}

---

## RECENT FILINGS (Tab 15, last 48h)

{{FILINGS_48H_TABLE}}

Format: `date | symbol | filing_type | headline | materiality`

---

## RECENT NEWS (Tab 7, last 24h, high materiality)

{{NEWS_24H_TABLE}}

Format: `published_at | symbol | headline | source | sentiment | materiality`

---

## EXTRACTED EVENTS (Tabs 15–20 from Section 14 / Apps Script)

{{EVENTS_JSON_SNIPPET}}

Summarize counts: filings, order_book, promoter, analyst, sector_strength rows. Prefer Tab 15 `confirmed_flag=TRUE` over Tab 7 for scoring narrative.

---

## ORDER WINS (Tab 16, last 90d for watchlist)

{{ORDERBOOK_SNIPPET}}

---

## PROMOTER ACTIVITY (Tab 18, last 90d)

{{PROMOTER_SNIPPET}}

---

## CURRENT SCORING SNAPSHOT (Tab 10, watchlist only)

{{SCORING_CSV}}

Columns: symbol, conviction_total, corporate_trigger, filings_intelligence, promoter_activity, action_label

---

## INDIA IMPACT (Tab 14, last 3 days)

{{INDIA_IMPACT_SNIPPET}}

---

## INSTRUCTIONS FOR THIS RUN

Using ONLY the context above plus live web search:

1. Section 1 macro verdict (update if new data)
2. Screen watchlist with mandatory filters (mcap >500 Cr unless symbol flagged micro/SME research)
3. Produce **Top 10** stock cards with v2 conviction sub-scores (max: CT15, FI15, moat10, sector10, fin10, val10, PV10, promo15, analyst10, inst5)
4. Output **JSON** array `top10` with fields: rank, symbol, company_name, conviction_total, thesis_one_line, action_label, horizon, tags[]
5. 5-bullet **7-day checklist** excerpt
6. Label all claims [CONFIRMED] / [INTERPRETED] / [STALE]

Do not fabricate tickers or prices.

[USE REAL-TIME WEB SEARCH]
