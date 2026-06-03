# Section 3: Stock screening universe

**MCP:** `perplexity_reason` | **Recency:** `week` | **Domains:** `nseindia.com`, `sebi.gov.in`, `screener.in`, `bseindia.com`

**Context:** Tab 1 UNIVERSE contains **all** NSE EQ listings (large, mid, small, micro, SME). Paste filtered CSV or `{{WATCHLIST}}` (max 20 symbols for deep dive).

**Universe scope:** Screen from full market. Use columns `cap_segment`, `is_sme`, `listing_segment`, `market_cap_cr` from UNIVERSE.

---

Apply filters:

**Mandatory (all must apply):**
- Listed NSE or BSE (present in UNIVERSE)
- No auditor resignation / qualified audit (12m)
- No NCLT/insolvency
- Promoter pledge < 30%

**Optional liquidity filter (recommended for near-term trades, not for full discovery):**
- Market cap > INR 500 crore — **skip** to include small cap, micro cap, and SME platform names
- When liquidity filter ON: exclude `cap_segment=micro` unless explicitly researching turnarounds

**Positive signals (score 1 point each, max 10):** promoter buying 90d, QIP/FPI activity, bulk deal 30d, order win 60d, govt/PLI approval, capacity addition, earnings upgrade 60d, results surprise potential, technical breakout, sector in govt spotlight.

**Exclude if any:** pledge > 50%, receivables spike without revenue, CFO vs PAT divergence > 30% (2y), multiple mgmt exits, SEBI investigation, +40% price in 30d without fundamental trigger.

**Output:** Table of candidates passing mandatory filters with positive signal count, sorted by count. Max 20 names for deep dive in Section 4.

[USE REAL-TIME WEB SEARCH]
