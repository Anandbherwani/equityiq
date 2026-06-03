# NSE filings workflow (manual + Perplexity)

v1/v2 do **not** scrape NSE behind login or session cookies. Use this repeatable workflow.

## 1. Open filings for a symbol

**Stock Tracker → Open NSE filings helper** — enter symbol or use active cell on Tab 10/11.

Opens:

`https://www.nseindia.com/companies-listing/corporate-filings-announcements?symbol={SYMBOL}`

Also bookmark company quote page → Corporate announcements.

## 2. Paste into Tab 3 first (raw)

| Tab 3 column | Source |
|--------------|--------|
| symbol | NSE symbol |
| date | Announcement date |
| headline | Exact title |
| category | Board meeting / Results / Order / Other |
| source_url | NSE PDF or HTML link |
| confirmed_flag | TRUE when copied from exchange |
| notes | Optional |

## 3. Promote material rows to Tab 15 (FILINGS)

For each material announcement:

1. Copy row context from Tab 3.
2. Add filing_type, sub_type, materiality (low/medium/high), impact_window (1w/1m/3m/6-12m), catalyst_type.
3. Run Perplexity **`backend/intelligence/sections/09-filing-interpretation.md`** with headline + URL.
4. Paste `ai_interpretation` and set `confirmed_flag` = TRUE.

## 4. Perplexity interpretation (Section 09)

Paste into Cursor:

- Symbol, headline, URL, last investor deck date (if known)
- Prior Tab 15 row for same catalyst_type (if any)

Answer the five questions in the section file; store summary in `ai_interpretation`.

Label outputs: `[CONFIRMED]` for exchange text; `[INTERPRETED]` for model synthesis.

## 5. Order wins → Tab 16

When filing or Tab 3 headline indicates order / LOA / contract win:

1. Add Tab 16 row with order_value_cr, customer_type, execution_period.
2. Estimate `orderbook_revenue_ratio` = order_book_est_cr / ttm_revenue_cr when both known.
3. Optional: run **`backend/intelligence/sections/10-order-book.md`**.

## 6. Optional Apps Script keyword pass

**Stock Tracker → Parse announcement keywords (suggest 15/16)**

Scans Tab 3 headlines (last 90 days) for:

| Keyword pattern | Suggested target |
|-----------------|------------------|
| order, contract, LOA, work order | Tab 16 |
| board meeting, results, outcome | Tab 15 |
| acquisition, demerger, fund raise | Tab 15 |

Writes suggestions to **Tab 12 ALERTS LOG** (`trigger_type=suggest_filing` / `suggest_orderbook`). Does **not** auto-append Tab 15/16 (human confirms).

## 7. Cadence

| Frequency | Action |
|-----------|--------|
| Daily (watchlist) | Tab 3 paste for Tab 11 symbols |
| On alert | Tab 3 → Tab 15 within same session |
| Weekly | Bulk scan Tab 3 keywords → review suggestions |
| Results season | All holdings: Results + Investor presentation → Tab 15 |

## 8. Compliance

- Public announcements only; no MNPI.
- Respect NSE terms; do not automate bulk download without permission.
- Keep `source_url` for audit trail.

## 9. BSE-only names

Use BSE corporate announcements URL pattern in notes; same Tab 15 schema with `filing_type` = BSE.
