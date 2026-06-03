# Section 8: News intelligence digest

**MCP:** `perplexity_ask` | **Recency:** `hour` (morning) or `day` (evening) | **Context:** `{{WATCHLIST}}`, Tab 14 themes, `{{MACRO_VERDICT}}`

**Domain tiers (run separate searches if needed):**

- Indian: `economictimes.indiatimes.com`, `livemint.com`, `moneycontrol.com`, `business-standard.com`, `financialexpress.com`, `thehindubusinessline.com`, `reuters.com`
- Global: `reuters.com`, `ft.com`, `bbc.com`, `cnbc.com`, `apnews.com` (headlines only if paywalled)
- Blogs: `capitalmind.in`, `zerodha.com`, `substack.com`, `-reddit.com`
- Social: `x.com`, `twitter.com` — **only** these handles: {{X_ALLOWLIST}}

---

## Tasks

### 1. Overnight global digest (5–10 bullets)
Each bullet: headline | source | date | `india_transmission` | `sectors_helped` | `sectors_hurt` | [CONFIRMED]/[INTERPRETED]

### 2. India market day ahead
Policy, earnings, sector movers, FII/DII context.

### 3. Watchlist news cards
For each symbol in `{{WATCHLIST}}`: headline, URL, date, sentiment, materiality (high/medium/low), event_type, [CONFIRMED]/[INTERPRETED].

### 4. Expert / blog roundup (3–5 items)
Non-mainstream insights with URLs.

### 5. Social signal summary
Allowlisted X only; flag rumor risk.

### 6. Sector heatmap
Which sectors gained/lost narrative momentum vs prior session.

## Paste targets

- Tab **7 NEWS FLOW** — row per item (columns match schema)  
- Tab **14 INDIA IMPACT LOG** — one row per major global story with India transmission  

Do not duplicate URLs already in Tab 7 from today's RSS fetch.

[USE REAL-TIME WEB SEARCH]
