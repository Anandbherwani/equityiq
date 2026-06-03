# Section 12 — Sector strength & macro map (Tabs 19–20)

**System:** `backend/intelligence/system.md`  
**Date:** `{{DATE}}`  
**Macro verdict:** `{{MACRO_VERDICT}}` from Tab 8

## Part A — Tab 19 SECTOR STRENGTH (weekly)

For each sector you track (min 8 sectors), use **only** these canonical `sector` names on Tab 19 (must match Tab 1 `sector` after Screener merge):

`BFSI`, `IT SERVICES`, `PHARMACEUTICALS`, `CONSUMER`, `AUTOMOBILES`, `INDUSTRIALS`, `OIL & GAS`, `POWER`, `METALS & MINING`, `REAL ESTATE`, `TELECOM`, `MEDIA`, `CHEMICALS`, `AGRICULTURE`, `DEFENCE`, `INFRASTRUCTURE`, `LOGISTICS`, `HOSPITALITY`, `TEXTILES`, `RETAIL`, `INSURANCE`, `NBFC`, `CEMENT`, `ELECTRICALS`, `MISCELLANEOUS`

Do not invent alternate labels (e.g. use `BFSI` not "Banking" or "Financial Services").

| Field | Guidance |
|-------|----------|
| week_ending | Friday date IST |
| narrative_score | 0–10 thematic momentum |
| macro_score | 0–10 fit to Tab 8 / 20 macro |
| flow_score | 0–10 FII/DII / ETF tilt (qualitative if no data) |
| composite_rank | 1 = strongest |
| momentum_vs_prior_week | up / flat / down |
| sectors_helped_note | 1-line driver |

## Part B — Tab 20 MACRO BENEFICIARIES

For each active macro metric (USDINR, Brent, US10Y, India 10Y, FII, DII, RBI stance, etc.):

| Field | Guidance |
|-------|----------|
| metric | Name matching Tab 8 where possible |
| value / trend / bias | From Section 1 macro |
| beneficiaries | Comma sectors or NSE symbols |
| losers | Comma sectors or symbols hurt |
| as_of_date | `{{DATE}}` |

**Do not duplicate Tab 8** — Tab 8 holds levels; Tab 20 holds **who wins/loses**.

## Scoring hint

- `sector_strength_rank` helper on Tab 10 from Tab 19 `composite_rank` (lower rank = stronger).
- Apply to `sector_macro` (max 10) manually.

## MCP

- Tool: `perplexity_research`
- Recency: `week`
- Domains: Indian business press + `reuters.com`
