# Data sources (free tier)

Personal research use only. Do not redistribute NSE/BSE data or paywalled article full text.

## Refresh cadence

| Tab | Source | Frequency | Method |
|-----|--------|-----------|--------|
| 1 UNIVERSE | NSE EQUITY_L CSV (all EQ) | Weekly | Apps Script `importNseSymbolList` |
| 1 UNIVERSE | Screener.in export (mcap, sector) | Weekly | Manual merge → `classifyCapSegments` |
| 1 UNIVERSE | BSE listed CSV (optional) | Monthly | Manual append for BSE-only names |
| 2 PRICE | Google Finance | Daily | Apps Script `refreshWatchlistPrices` |
| 3 Announcements | NSE corporate filings | Daily (watchlist) | Manual paste |
| 4 Bulk deals | NSE large deals | Daily (watchlist) | Manual paste |
| 5 Insider | InsiderScreener | Weekly (watchlist) | Manual export |
| 6 Fundamentals | Screener.in | Weekly | Manual CSV |
| 7 News | RSS + Perplexity | 2x daily | Apps Script + Section 8 |
| 8 Macro | GOOGLEFINANCE + Perplexity | Daily | Sheet formulas + Section 1 |
| 9 Geopolitics | Manual + Perplexity | Weekly | Tab 9 + Section 1/8 |
| 13 News sources | `backend/config/news-sources.json` | On change | Apps Script sync |

## NSE symbol list (full market)

- **Primary (auto):** `nsearchives.nseindia.com` then `archives.nseindia.com` → `/content/equities/EQUITY_L.csv`
- **Manual (HTTP 403/404 from Google):** [Securities available for trading](https://www.nseindia.com/static/market-data/securities-available-for-trading) → download Equity segment `.csv` → **Stock Tracker → Import NSE EQUITY_L.csv from file…**
- Imports **all equity rows** with `SERIES = EQ` (main-board cash market). ~1,800+ symbols.
- After import, **Classify cap segments** runs automatically; merge `market_cap_cr` from Screener for accurate large/mid/small/micro tags.
- See [CAP_SEGMENTS.md](CAP_SEGMENTS.md) for thresholds and SME/Emerge rules.
- Apps Script sends browser-like headers + tries both archive hosts.

## Screener.in

1. Build screen (market cap, sector, etc.).
2. Export → CSV.
3. Paste or import into UNIVERSE / FUNDAMENTALS matching `symbol_nse`.

## GOOGLEFINANCE (Tab 2)

Example for RELIANCE on NSE:

```excel
=GOOGLEFINANCE("NSE:RELIANCE","price")
=GOOGLEFINANCE("NSE:RELIANCE","changepct")
=GOOGLEFINANCE("NSE:RELIANCE","volume")
```

RSI/MACD are not native — update manually or via Perplexity for watchlist symbols only.

## Macro (Tab 8)

| Metric | Formula / source |
|--------|------------------|
| USDINR | `=GOOGLEFINANCE("CURRENCY:USDINR")` |
| Brent | `=GOOGLEFINANCE("INDEX:BCOMCL")` or manual |
| India VIX | Manual / NSE site |
| FII/DII | Manual from NSE / Motilal Oswal dashboard |

Paste **Macro Verdict** from Section 1 into named range `MacroVerdict` (see SETUP.md).

## Deferred (phase 2)

- NSE `bulkdeals-data` API (session cookies)
- Twitter API v2
- Global Datafeeds / Bloomberg Terminal
- Apify Screener scraper

## Compliance

- Use data for **your own** research.
- Flag data older than 60 days as `[STALE]` in prompts and `stale_flag` columns.
- Paywalled outlets: headlines via RSS/search only; do not scrape full articles at scale.
