# Market cap segments (India)

UNIVERSE includes **all NSE equity (EQ) listings** plus optional BSE merges from Screener. Cap classification uses `market_cap_cr` (INR crore, full market cap).

## INR crore thresholds (v1)

| `cap_segment` | `market_cap_bucket` | Market cap (INR Cr) | Typical profile |
|---------------|---------------------|---------------------|-----------------|
| `large` | Large-cap | ≥ 20,000 | Nifty 50 / top liquid names |
| `mid` | Mid-cap | 5,000 – 19,999 | Nifty Midcap style |
| `small` | Small-cap | 500 – 4,999 | Broader small-cap index |
| `micro` | Micro-cap | &lt; 500 | Low cap, higher liquidity risk |
| `unknown` | Unclassified | (blank) | Import default until Screener merge |

**Screening default (Section 3):** liquidity filter **market cap &gt; 500 Cr** is **optional** — apply only when you want liquid names. Full UNIVERSE retains micro/SME for discovery.

## AMFI-style note (phase 2)

Mutual fund categories use **rank by market cap** (top 100 = large, 101–250 = mid, 251+ = small), not fixed crore cutoffs. If you import rank from Screener, you can override `cap_segment` via a helper column.

## SME / Emerge

| Field | Meaning |
|-------|---------|
| `is_sme` | `TRUE` for NSE Emerge or BSE SME platform listings |
| `listing_segment` | NSE `SERIES` from EQUITY_L (e.g. `EQ`, `BE`) or `SME` / `EMERGE` when identified |

**Detection (Apps Script):**

- `listing_segment` = `SME` or `EMERGE` → `is_sme = TRUE`
- Company name contains `(SME)` or exchange tag from BSE SME list (manual merge)
- Main-board `EQ` with cap &lt; 500 Cr is **micro**, not necessarily SME platform

## Populating `market_cap_cr`

1. Weekly **Screener.in** export (all stocks or cap filters) → merge on `symbol_nse`
2. Run **Stock Tracker → Classify cap segments** after merge

## `liquidity_flag` (manual / optional)

Suggested heuristics after avg volume import:

| Flag | Guideline |
|------|-----------|
| `high` | Large/mid + avg daily value &gt; INR 5 Cr |
| `medium` | Small cap with reasonable volume |
| `low` | Micro / illiquid |

## BSE-only names

Import BSE list separately (CSV) and append to UNIVERSE with `exchange=BSE`, `symbol_nse` blank, `symbol_bse` set. Run classify after cap merge.
