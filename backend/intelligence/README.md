# Perplexity MCP playbook (v2)

Use with [`system.md`](system.md) as the **system** message and section files as **user** messages.

## Tool selection

| Section | File | MCP tool | Recency |
|---------|------|----------|---------|
| 1 Macro | `01-macro.md` | `perplexity_ask` | `day` |
| 2 Sectors | `02-sectors.md` | `perplexity_research` | `week` |
| 3 Screening | `03-screening.md` | `perplexity_reason` | `week` |
| 4 Stock cards | `04-stock-cards.md` | `perplexity_reason` | `day` |
| 5 Tables | `05-ranked-tables.md` | `perplexity_reason` | — |
| 6 Bear case | `06-bear-case.md` | `perplexity_reason` | — |
| 7 Checklist | `07-checklist.md` | `perplexity_ask` | `day` |
| 8 News | `08-news-intelligence.md` | `perplexity_ask` | `hour` / `day` |
| 14 News → JSON | `14-news-to-events-json.md` | API `sonar-pro` (Apps Script / n8n) | `hour` |
| 9 Filings | `09-filing-interpretation.md` | `perplexity_reason` | `week` |
| 10 Order book | `10-order-book.md` | `perplexity_ask` | `month` |
| 11 Promoter | `11-promoter.md` | `perplexity_ask` | `month` |
| 12 Sector / macro map | `12-sector-strength.md` | `perplexity_research` | `week` |
| 13 Dashboard | `13-dashboard-views.md` | `perplexity_reason` | — |

## Tiered `search_domain_filter`

**Filings / fundamentals (3, 4, 9):**
```json
["nseindia.com", "bseindia.com", "sebi.gov.in", "screener.in"]
```

**Indian news (8):**
```json
["economictimes.indiatimes.com", "livemint.com", "moneycontrol.com", "business-standard.com", "financialexpress.com", "reuters.com"]
```

**Global macro (1, 8, 12):**
```json
["reuters.com", "ft.com", "bbc.com", "cnbc.com"]
```

## Placeholders

| Token | Replace with |
|-------|----------------|
| `{{DATE}}` | Today IST |
| `{{WATCHLIST}}` | Tab 11 or Tab 10 CSV |
| `{{MACRO_VERDICT}}` | Tab 8 verdict |
| `{{X_ALLOWLIST}}` | Tab 13 `notes` (`x:@handle`) |

## Paste-back map (v2)

| Output | Sheet tab |
|--------|-----------|
| Macro Verdict | 8 MACRO DASHBOARD |
| Filing interpretation | 15 FILINGS |
| Order book row | 16 ORDER BOOK TRACKER |
| Analyst revision | 17 ANALYST REVISIONS |
| Promoter trade | 18 PROMOTER ACTIVITY |
| Sector strength | 19 SECTOR STRENGTH |
| Macro beneficiaries | 20 MACRO BENEFICIARIES |
| Stock cards + sub-scores | 10 SCORING |
| Tables A–D | **21 ANALYSIS_OUTPUT** |
| News digest | 7 NEWS FLOW, 14 INDIA IMPACT |
| Section 14 JSON batch | 15–20, 9, 14 (via `runNewsIntelligencePipeline`) |
| Recommendation narratives | 11 RANKED WATCHLIST (`evidence` column) |

## Labels (required)

- `[CONFIRMED]` — exchange/regulator primary source  
- `[ANALYST ESTIMATE]` — broker/consensus  
- `[INTERPRETED]` — model inference  
- `[STALE]` — source &gt; 60 days old  

## Cost control

- Section 4 ≤20 symbols; Section 9 only material filings  
- RSS for headlines; Perplexity for interpretation and paywalled gaps
