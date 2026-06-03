# News feeds catalog

Tab **13 NEWS SOURCES** mirrors [`backend/config/news-sources.json`](../backend/config/news-sources.json). Tab **7 NEWS FLOW** is the unified inbox.

## Source tiers

| Tier | Trust | Examples |
|------|-------|----------|
| T1 | Regulator / exchange / government | NSE, SEBI, RBI, PIB |
| T2 | Major wire / newspaper | Reuters, ET, Mint, BS, FT, WSJ |
| T3 | Market portal / TV | Moneycontrol, Livemint markets, CNBC-TV18 |
| T4 | Expert blog / newsletter | Capitalmind, Zerodha Varsity, Substack authors |
| T5 | Social | Curated X accounts only |

## India — newspapers & business press (T2–T3)

| Source | RSS / domain | Notes |
|--------|----------------|-------|
| Economic Times | `economictimes.indiatimes.com` | Markets RSS varies; verify URL in Tab 13 |
| Mint | `livemint.com/rss` | Business |
| Business Standard | `business-standard.com` | Markets feed |
| Financial Express | `financialexpress.com` | Industry |
| Hindu BusinessLine | `thehindubusinessline.com` | |
| Moneycontrol | `moneycontrol.com/rss` | Top news |
| Reuters India | `reuters.com` | World + India |

## India — official (T1)

| Source | URL |
|--------|-----|
| PIB | https://pib.gov.in |
| RBI press releases | https://www.rbi.org.in |
| SEBI | https://www.sebi.gov.in |

## Global — wires (T2) — filter for India impact in Tab 14

Reuters, AP, BBC Business, Financial Times, Wall Street Journal, Bloomberg (headlines), CNBC, MarketWatch, The Economist (macro summaries via Perplexity if RSS limited).

## Expert blogs (T4)

- capitalmind.in  
- blog.zerodha.com (Varsity / Z-Connect)  
- Substack India equity authors (add handles to Tab 13 `notes`)  
- Public research notes from brokerages (when freely published)

## Social / X (T5)

Maintain allowlist in Tab 13 column `notes` as `x:@handle`:

Examples (edit to your preference):

- `@RBI`, `@SEBI_India`, `@ETMarkets`, `@livemint`  
- Global macro: `@federalreserve`, `@ecb`  

**v1:** No Twitter API. Section 8 uses Perplexity with `search_domain_filter: ["x.com","twitter.com"]` and explicit handle list in the prompt.

## Excluded by default

- Reddit tip forums (`-reddit.com` in Perplexity filters)  
- Telegram pump groups  
- Unverified WhatsApp forwards  

## Materiality rules (Tab 7)

| Level | Criteria |
|-------|----------|
| high | Named Indian company + price-sensitive event (results, order, regulatory action) |
| medium | Sector policy, macro print, broker sector note |
| low | General market commentary |

## Sentiment

Set `sentiment` to: `bullish` | `bearish` | `neutral` | `mixed`. Optional `sentiment_score` -2 to +2 (manual or from Perplexity).

## RSS reliability

Many global outlets limit RSS to headlines. Use **Section 8** for paywalled synthesis and **India transmission** rows on Tab 14.

## Apps Script

- `syncNewsSourcesToSheet()` — loads JSON into Tab 13  
- `fetchNewsRss()` — polls enabled feeds; dedupes by `url`  
- `tagNewsSymbols()` — matches `company_name` from UNIVERSE  

Feeds that return HTTP errors are logged to Tab 12 and skipped (batch continues).
