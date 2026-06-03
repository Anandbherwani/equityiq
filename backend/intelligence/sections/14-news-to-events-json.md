# Section 14 — News → structured events (JSON only)

**API:** Perplexity `sonar-pro` (Apps Script or n8n)  
**Input:** Tab **7 NEWS FLOW** headlines (last 48h) + watchlist symbols from Tab 10/11  
**Output:** STRICT JSON only — no markdown outside the JSON object.

Append to user message: `[USE REAL-TIME WEB SEARCH]`

---

## Rules

1. Use **only** NSE symbols that appear in the provided watchlist / headline `symbol` fields. Do not invent tickers.
2. Prefer `[CONFIRMED]` only when the headline cites exchange filings or regulator primary sources; otherwise `[INTERPRETED]`.
3. If uncertain, omit the item rather than guess.
4. Deduplicate: one row per distinct catalyst (symbol + date + headline gist).
5. Max **30** headline inputs per run — prioritize `materiality=high` and tagged symbols.

---

## Required JSON schema

Return a single JSON object (no prose before/after):

```json
{
  "filings": [],
  "order_book": [],
  "promoter_activity": [],
  "analyst_revisions": [],
  "sector_strength": [],
  "macro_beneficiaries": [],
  "geopolitics": [],
  "india_impact": []
}
```

### `filings[]` → Tab **15. FILINGS**

| Field | Type | Notes |
|-------|------|-------|
| date | string | `YYYY-MM-DD` IST |
| symbol | string | NSE symbol |
| filing_type | string | e.g. `exchange`, `results`, `governance` |
| sub_type | string | optional |
| headline | string | |
| materiality | string | `low` \| `medium` \| `high` |
| source_url | string | from news or search |
| confirmed_flag | boolean | true if exchange-confirmed |
| impact_window | string | `1w` \| `1m` \| `3m` \| `6-12m` |
| catalyst_type | string | `order_win` \| `results` \| `capex` \| `governance` \| `capital_raise` \| `other` |
| ai_interpretation | string | 1–3 sentences, prefix `[CONFIRMED]` or `[INTERPRETED]` |

### `order_book[]` → Tab **16. ORDER BOOK TRACKER**

| Field | Type |
|-------|------|
| symbol, date | required |
| order_value_cr | number or empty |
| customer_type, project_type, sector | string |
| domestic_export, execution_period | string |
| order_book_est_cr, ttm_revenue_cr | number or empty |
| source_url, confidence (`high`/`medium`/`low`), notes | string |

### `promoter_activity[]` → Tab **18. PROMOTER ACTIVITY**

| Field | Type |
|-------|------|
| symbol, date | required |
| entity_name, entity_type | string |
| promoter_group_flag, trust_holding_flag | boolean |
| transaction_type | `buy` \| `sell` \| `pledge` \| other |
| qty, value, post_holding, pledge_pct | number or empty |
| pledge_trend, source_url | string |

### `analyst_revisions[]` → Tab **17. ANALYST REVISIONS**

| Field | Type |
|-------|------|
| symbol, date, broker | required |
| rating_old, rating_new, target_old, target_new | string |
| eps_fy1_old, eps_fy1_new, margin_change | string |
| confidence, source_url | string |

### `sector_strength[]` → Tab **19. SECTOR STRENGTH**

| Field | Type |
|-------|------|
| week_ending | `YYYY-MM-DD` (use latest Friday or today) |
| sector | string |
| narrative_score, macro_score, flow_score | 0–10 |
| composite_rank | integer rank |
| momentum_vs_prior_week | string |
| sectors_helped_note | string |

### `macro_beneficiaries[]` → Tab **20. MACRO BENEFICIARIES**

| Field | Type |
|-------|------|
| metric, value, trend, bias | string |
| beneficiaries, losers | pipe-separated sectors or symbols |
| as_of_date | `YYYY-MM-DD` |
| notes | string |

### `geopolitics[]` → Tab **9. GEOPOLITICS FLAGS**

| Field | Type |
|-------|------|
| event, status | string |
| sectors_helped, sectors_hurt | string |
| last_updated | `YYYY-MM-DD` |
| notes | string |

### `india_impact[]` → Tab **14. INDIA IMPACT LOG**

| Field | Type |
|-------|------|
| date | `YYYY-MM-DD` |
| global_headline, source, global_theme | string |
| india_transmission | string |
| sectors_helped, sectors_hurt, watchlist_symbols | string |
| confidence (`high`/`medium`/`low`), action_note | string |

---

## User message template (Apps Script / n8n)

```
Date IST: {{DATE}}
Run ID: {{RUN_ID}}
Watchlist: {{WATCHLIST_SYMBOLS}}

Headlines (Tab 7):
{{NEWS_JSON}}

Extract material events into the JSON schema. Empty arrays if none qualify.
```

[USE REAL-TIME WEB SEARCH]
