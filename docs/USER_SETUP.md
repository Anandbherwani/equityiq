# User setup & end-to-end test

Complete after copying Apps Script and creating the spreadsheet.

## Checklist

- [ ] Google Sheet created
- [ ] Apps Script pasted from `apps-script/Code.gs`
- [ ] **Stock Tracker → Setup all sheet tabs**
- [ ] Full NSE import OR **Import sample universe**
- [ ] Merge Screener `market_cap_cr` → **Classify cap segments**
- [ ] Weekly Screener exports → **Import Screener CSV to Tab 6** (see below)
- [ ] **Rebuild scoring pipeline from UNIVERSE** (Tab 10 + Tab 11 recommendations — no manual symbols)
- [ ] **Sync news sources** → **Fetch RSS news**
- [ ] **Log test alert**
- [ ] Script property `PERPLEXITY_API_KEY` + **Run news intelligence pipeline** (Section 14 → Tabs 15–20)
- [ ] Optional: Perplexity Section 4 to refine sub-scores on Tab 10

## Step 1 — Universe (source of truth)

**Full market:** **Import full NSE universe (EQ)** → ~1,800+ rows.

**Quick test:** **Import sample universe** (RELIANCE, TCS, INFY).

Merge Screener `market_cap_cr` when available → **Classify cap segments**.

Eligibility rules (in `Code.gs`): `MIN_MARKET_CAP_CR` 500, `MAX_PLEDGE_PCT` 30, no NCLT/qualified audit, liquidity or large/mid cap or mcap ≥ 5000 Cr.

### Weekly Screener → Tab 6 (full universe)

Screener.in caps exports at ~1,000 rows per screen. For ~1,800 NSE names, run **4–5 cap-band exports** each week:

1. Create screens (or watchlists) by market cap band, e.g. Large (≥20k Cr), Upper mid (5k–20k), Lower mid (1k–5k), Small (500–1k), plus any gap band for SMEs.
2. Export CSV with: NSE Code, Market Cap, ROCE, ROE, Sales growth, Profit growth, Debt/Equity, Current ratio, P/E, P/B, Dividend yield, Promoter holding, FII holding, Sector, OPM (margin).
3. Paste each export on a scratch sheet (or combine), select header + rows → **Stock Tracker → Import Screener CSV to Tab 6** (merges on `symbol`, sets `last_updated`, `stale_flag` if quarter >60 days old).
4. Import updates Tab 1 `sector` (normalized) and `market_cap_cr` where present.
5. **Rebuild scoring pipeline from UNIVERSE** — refreshes Tab 10 E/G/H from Tab 6, `data_gate_flag`, `quality_rank`, and Tab 11 lists.

## Step 2 — Scoring pipeline (automatic)

Run **Rebuild scoring pipeline from UNIVERSE** once. This:

1. Filters eligible symbols from Tab 1
2. Writes Tab **10. SCORING MODEL** (symbol + company; sub-scores start at 0 or auto-suggested from helpers)
3. Fills helper columns N–R from Tabs 15–18
4. Applies optional auto-suggestions to C–L (`APPLY_AUTO_SUB_SCORES = true`)
5. Sets conviction formula in column M
6. Refreshes Tab **2. PRICE & TECHNICALS** (top 100 symbols)
7. `populateQuantitativeScores_()` from Tab 6/2/4
8. Builds Tab **11. RANKED WATCHLIST** (six Top-10 recommendation lists with bull/bear/evidence)

**No manual symbol entry on Tab 10.**

To refine scores after Perplexity stock cards, paste sub-scores into columns C–L and run **Compute scoring helpers** or full rebuild (existing rows for those symbols are preserved on rebuild).

## Step 3 — Event-led tabs (optional)

Tab 3 announcements → **Parse announcement keywords** → Tab 12 suggestions.

Tab 15 → Section 9 filing interpretation in Cursor.

## Step 4 — News

**Fetch RSS news** → **Tag news symbols** → Section 8 in Cursor.

## Step 5 — Perplexity (optional refinement)

1. `backend/intelligence/system.md`
2. `backend/intelligence/sections/04-stock-cards.md` for symbols from Tab 11
3. Paste sub-scores into Tab 10 columns C–L → **Compute scoring helpers** or **Rebuild pipeline**

## Step 6 — Triggers

**Install daily triggers** — `dailyMaintenance` runs RSS + full scoring pipeline + prices.

## Success

| Criterion | Pass? |
|-----------|-------|
| UNIVERSE populated | |
| Tab 10 has eligible rows (no hand-typed symbols) | |
| Tab 11 watchlist ranked | |
| Tab 11 has six list_name blocks (≤10 rows each) | |
| Tab 6 fundamentals imported for top names | |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Tab 10 empty after rebuild | Add `market_cap_cr` on UNIVERSE; run Classify cap segments |
| Too few eligible rows | Lower `MIN_MARKET_CAP_CR` in Code.gs (line ~18) |
| NSE import 403 | Manual EQUITY_L.csv → UNIVERSE |
| Conviction all 0 | Set `APPLY_AUTO_SUB_SCORES true` or paste Perplexity sub-scores |
| Audit: M>0 but C–L all 0 | Stale column M — run **Rebuild scoring pipeline** (reconciles M from C–L) |
| `sectorJoinOk` false / empty `universeSector` | NSE CSV omits sector — merge Screener **sector** on Tab 1, then rebuild |
| Tab 11 header mismatch | **Fix Tab 11 headers (keep data)** then **Sync recommendations (Tab 11)** |
