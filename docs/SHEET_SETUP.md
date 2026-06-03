# Google Sheets setup

## 1. Create spreadsheet

Name: **Indian Equity Intelligence**

## 2. Create tabs (exact names)

Apps Script `setupAllSheets()` creates **21 numbered tabs** (Tab 11b removed; recommendations live on Tab 11):

| Tab name | Schema file |
|----------|-------------|
| 1. UNIVERSE | `shared/schemas/01-universe.csv` |
| 2. PRICE & TECHNICALS | `shared/schemas/02-price-technicals.csv` |
| 3. NSE/BSE ANNOUNCEMENTS | `shared/schemas/03-announcements.csv` |
| 4. BULK & LARGE DEALS | `shared/schemas/04-bulk-deals.csv` |
| 5. INSIDER/PROMOTER | `shared/schemas/05-insider-promoter.csv` |
| 6. FUNDAMENTALS | `shared/schemas/06-fundamentals.csv` |
| 7. NEWS FLOW | `shared/schemas/07-news-flow.csv` |
| 8. MACRO DASHBOARD | `shared/schemas/08-macro-dashboard.csv` |
| 9. GEOPOLITICS FLAGS | `shared/schemas/09-geopolitics-flags.csv` |
| 10. SCORING MODEL | `shared/schemas/10-scoring-model.csv` |
| 11. RANKED WATCHLIST | `shared/schemas/11-ranked-watchlist.csv` |
| 12. ALERTS LOG | `shared/schemas/12-alerts-log.csv` |
| 13. NEWS SOURCES | `shared/schemas/13-news-sources.csv` |
| 14. INDIA IMPACT LOG | `shared/schemas/14-india-impact-log.csv` |
| 15. FILINGS | `shared/schemas/15-filings.csv` |
| 16. ORDER BOOK TRACKER | `shared/schemas/16-order-book-tracker.csv` |
| 17. ANALYST REVISIONS | `shared/schemas/17-analyst-revisions.csv` |
| 18. PROMOTER ACTIVITY | `shared/schemas/18-promoter-activity.csv` |
| 19. SECTOR STRENGTH | `shared/schemas/19-sector-strength.csv` |
| 20. MACRO BENEFICIARIES | `shared/schemas/20-macro-beneficiaries.csv` |
| 21. ANALYSIS_OUTPUT | `shared/schemas/21-analysis-output.csv` |

Or import each CSV: **File → Import** → paste row 1 as headers.

### Macro: Tab 8 vs Tab 20 (avoid confusion)

| Tab | Name | Purpose |
|-----|------|---------|
| **8** | MACRO DASHBOARD | **Daily levels** — USDINR, Brent, FII/DII, `MACRO_VERDICT` row |
| **20** | MACRO BENEFICIARIES | **Who wins/loses** per metric — beneficiaries, losers, bias |

Do not merge these tabs. Section 1 macro → Tab 8; Section 12 → Tab 20 beneficiary map.

### Migration from v1

- Rename old sheet `ANALYSIS_OUTPUT` → `21. ANALYSIS_OUTPUT`.
- Re-run **Setup all sheet tabs** to add 15–20 (and Tab 21). Delete legacy `11b DASHBOARD BOARDS` if present.
- Replace Tab 10 headers with v2 schema; update conviction formula to column **M** (see [shared/scoring/SCORING.md](../shared/scoring/SCORING.md)).

## 3. Named ranges

| Name | Refers to |
|------|-----------|
| `MacroVerdict` | Tab 8 verdict cell (e.g. `'8. MACRO DASHBOARD'!$B$8` for MACRO_VERDICT row) |

## 4. Tab 8 seed metrics

Apps Script seeds USDINR, BRENT, US10Y, INDIA_VIX, FII_NET, DII_NET, MACRO_VERDICT.

## 5. Full market UNIVERSE

Unchanged from v1 — see [docs/CAP_SEGMENTS.md](../docs/CAP_SEGMENTS.md).

## 6. Tab 10 formulas (v2)

**Conviction total (column M):** sub-scores C–L:

```excel
=ROUND(
  MIN(C2,15)+MIN(D2,15)+MIN(E2,10)+MIN(F2,10)+MIN(G2,10)+MIN(H2,10)+MIN(I2,10)+MIN(J2,15)+MIN(K2,10)+MIN(L2,5)
,0)
```

**Exclude from watchlist:** see SCORING.md for column letter on your row.

**Helpers N–R:** run **Stock Tracker → Compute scoring helpers** or use formulas in SCORING.md.

## 7. Tab 11 RANKED WATCHLIST

**Stock Tracker → Rebuild scoring pipeline from UNIVERSE** fills Tab 11 with six Top-10 lists (`list_name`: Immediate, 3-Month, 12-Month Compounders, Monopoly, Government Beneficiaries, Turnarounds). See [shared/scoring/SCORING.md](../shared/scoring/SCORING.md).

Import weekly **Screener.in CSV** into Tab 6 before rebuild for quantitative sub-scores (E, G, H, I, L).

## 8. Event tabs 15–18

Manual paste + Perplexity — see [docs/NSE_FILINGS_WORKFLOW.md](../docs/NSE_FILINGS_WORKFLOW.md) and [docs/EVENT_LED_ARCHITECTURE.md](../docs/EVENT_LED_ARCHITECTURE.md).

## 9. Install Apps Script

1. **Extensions → Apps Script**  
2. Paste `apps-script/Code.gs` and `runSystemAudit.gs`  
3. **Stock Tracker → Setup all sheet tabs**  
4. **Sync news sources** → **Install daily triggers**

## 10. Privacy

Public RSS and NSE CSV only. No NSE authenticated API in v2.
