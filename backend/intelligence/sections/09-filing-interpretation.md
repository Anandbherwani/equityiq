# Section 09 — Filing interpretation (Tab 15)

**System:** `backend/intelligence/system.md`  
**Date:** `{{DATE}}` (IST)  
**Append:** `[USE REAL-TIME WEB SEARCH]` when using Perplexity MCP.

## Inputs

Paste for each filing:

- `symbol`, `headline`, `source_url`, `filing_type`, `sub_type`
- Optional: prior Tab 15 row for same symbol + catalyst_type
- Optional: last investor presentation date

## Five high-value questions (answer all)

1. **New information vs routine?** — Is this incremental to what the market already knew from the last deck, concall, or prior filing? State what was already priced in.
2. **Incremental vs last deck?** — Quantify or qualify what changed vs the most recent investor presentation / annual report guidance.
3. **Capital allocation impact?** — Buyback, dividend, capex, M&A, rights, debt raise: does this improve or dilute per-share economics over 12–24 months?
4. **Beneficiaries** — Which value chain peers, customers, or suppliers benefit on a 1–3 month view? Name NSE symbols only if verified.
5. **Time horizon** — Primary impact window: 1w | 1m | 3m | 6–12m; secondary window if different.

## Output format (paste to Tab 15)

| Field | Content |
|-------|---------|
| materiality | low / medium / high |
| impact_window | from Q5 |
| catalyst_type | order_win / results / capex / governance / capital_raise / other |
| ai_interpretation | 150–300 word narrative answering Q1–Q5 |
| confirmed_flag | TRUE if headline matches exchange |

Prefix narrative with labels: `[CONFIRMED]` / `[INTERPRETED]` / `[ANALYST ESTIMATE]`.

## Scoring hints (Tab 10 — human applies)

| Signal | Suggested column | Max |
|--------|------------------|-----|
| Material confirmed filing | filings_intelligence | up to 15 |
| Near-term corporate catalyst | corporate_trigger | up to 15 |

Do not auto-sum into `conviction_total`; user confirms sub-scores.

## MCP

- Tool: `perplexity_reason`
- `search_domain_filter`: `["nseindia.com", "bseindia.com", "sebi.gov.in"]`
- `search_recency_filter`: `week`
