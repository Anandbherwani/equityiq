# NEWS → Perplexity → Scoring (automated path)

End-to-end flow from RSS headlines to ranked watchlist **without manual Tabs 15–20 entry**.

```
Tab 13 NEWS SOURCES (RSS URLs)
        ↓ fetchNewsRss (6:00 / 15:45 IST)
Tab 7 NEWS FLOW (+ tagNewsSymbols)
        ↓ runNewsIntelligencePipeline (Perplexity Section 14)
Tabs 15–20, 9, 14 (structured events)
        ↓ rebuildScoringPipeline
Tab 10 SCORING → Tab 11 recommendation lists (11b deprecated)
```

## Prerequisites

1. **UNIVERSE** populated and **Rebuild scoring pipeline** run at least once (Tab 10 rows exist).
2. **Tab 7** has recent headlines (`Fetch RSS news`).
3. **Script property** `PERPLEXITY_API_KEY` set (Apps Script → Project settings → Script properties).
4. Optional: `RUN_PERPLEXITY_DAILY=false` to disable API calls on `dailyMaintenance` while keeping RSS.

## Apps Script entry points

| Action | Function |
|--------|----------|
| Menu: **Run news intelligence pipeline (Perplexity)** | `runNewsIntelligencePipeline()` |
| `dailyMaintenance` (6:00 IST trigger) | RSS → tag → Perplexity (if key set) → full rebuild |
| `rebuildScoringPipeline` | Always runs `applyNewsFlowToScores_()` after event helpers |

## What Perplexity extracts (Section 14)

Prompt: [`backend/intelligence/sections/14-news-to-events-json.md`](../backend/intelligence/sections/14-news-to-events-json.md)

| JSON key | Target tab |
|----------|------------|
| `filings` | 15. FILINGS |
| `order_book` | 16. ORDER BOOK TRACKER |
| `promoter_activity` | 18. PROMOTER ACTIVITY |
| `analyst_revisions` | 17. ANALYST REVISIONS |
| `sector_strength` | 19. SECTOR STRENGTH (replaced each run) |
| `macro_beneficiaries` | 20. MACRO BENEFICIARIES (replaced each run) |
| `geopolitics` | 9. GEOPOLITICS FLAGS (append, deduped) |
| `india_impact` | 14. INDIA IMPACT LOG (append, deduped) |

Symbols **must** exist on eligible UNIVERSE rows; unknown tickers are dropped.

## Scoring linkage

1. **`computeHelperSignalsInternal_`** — counts Tab 15–19 rows into Tab 10 columns N–R.
2. **`applyNewsFlowToScores_`** — Tab 7 materiality per symbol → suggested `corporate_trigger` / `filings_intelligence` / `sector_macro` (max caps).
3. **`applyGeopoliticsFlagsToData_`** — Tab 9 active `sectors_helped` → **H news_events** (max +4 geo bonus; see [GEOPOLITICS_SCORING.md](GEOPOLITICS_SCORING.md)).
4. **`applyAutoSubScores_`** — helper counts → sub-scores C–L (preserves higher manual/Perplexity values).

**Tab 19 / 20 are sector-level, not per-symbol.** Perplexity writes rows on **19. SECTOR STRENGTH** (`sector`, `composite_rank`, …) without an NSE ticker. The pipeline joins each Tab 10 symbol to Tab 19 via **1. UNIVERSE** column `sector` (normalized name + aliases), fills helper **R**, then maps rank/scores into **sector_macro (F)**. **20. MACRO BENEFICIARIES** `beneficiaries` tokens (pipe/comma-separated symbols or sectors) get the same sector join or a direct symbol hit. **16. ORDER BOOK** is symbol-level: helper **O** counts rows for that ticker (undated rows still count). Rebuild order: `computeHelperSignalsInternal_` → `applyNewsFlowToScores_` → `applyAutoSubScoresAndRefreshTotals_` (macro + auto sub-scores + conviction **M**). Check Apps Script **Executions → Logs** for `computeHelperSignalsInternal_` and `applyAutoSubScores_` sample lines.

Confirmed exchange events on Tab 15 still outweigh Tab 7 hints (see [SCORING.md](../shared/scoring/SCORING.md)).

## Limits and cost

- Max **30** headlines per Perplexity call (`PERPLEXITY_NEWS_MAX_HEADLINES`).
- **48h** lookback on Tab 7 (`PERPLEXITY_NEWS_HOURS_LOOKBACK`).
- API cost: one `sonar-pro` call per pipeline run (~$0.01–0.05 depending on plan).
- Perplexity may hallucinate — review Tab 12 alerts (`news_intelligence`, `perplexity_error`).

## n8n alternative

Morning workflow can run the same Section 14 call before the briefing Perplexity node; see [AUTOMATION_PIPELINE.md](AUTOMATION_PIPELINE.md). **Apps Script is the canonical writer** for Tabs 15–20 when using Google-only automation.

## Quick test (manual)

1. Set `PERPLEXITY_API_KEY`.
2. **Fetch RSS news** → **Tag news symbols**.
3. **Run news intelligence pipeline (Perplexity)**.
4. Check Tabs 15–20, then Tab 11 recommendation lists for non-zero conviction on symbols with events.

## Troubleshooting (pipeline reports success but Tabs 15–20 empty)

### View the last run log

- Menu: **Stock Tracker → View last news pipeline log** (reads Script Property `LAST_NEWS_PIPELINE_SUMMARY`).
- Or Apps Script → **Executions** → open latest run → **Logs** for lines starting with `NEWS_PIPELINE_SUMMARY` and stage logs (`fetchRecentNewsContext_`, `callPerplexityNewsExtraction_`, `writeExtractedEventsToSheets_`).
- Tab **12. ALERTS LOG** gets a one-line `news_intelligence` summary per run.

### Read the summary fields

| Field | Meaning |
|-------|---------|
| `news.headlinesSent` | Headlines actually sent to Perplexity (max 30) |
| `news.eligibleUniverseCount` | Symbols on Tab 1 passing eligibility filters |
| `extractedRaw.*` | Array lengths in parsed JSON **before** symbol filter |
| `filters.droppedSymbol` | Rows dropped because symbol missing or not in eligible UNIVERSE |
| `filters.droppedDedup` | Rows skipped as duplicates on append tabs |
| `written.counts` | Rows **added** per category (0 = nothing new written) |

### Common causes

1. **Perplexity returned empty arrays** — `extractedRaw` all zeros. Re-run after more Tab 7 headlines; check `perplexity_parse_error` on Tab 12.
2. **Symbols not in UNIVERSE** — high `filters.droppedSymbol` for filings/order_book/etc. Run **Rebuild scoring pipeline** / ensure symbol is on Tab 1 and passes pledge/NCLT/mcap rules.
3. **Headlines untagged** — `news.withEligibleSymbol` is 0; run **Tag news symbols** so Tab 7 column K has NSE tickers.
4. **Dedup only** — `extractedRaw` > 0 but `written.counts` = 0 and `droppedDedup` high; events already exist from a prior run.
5. **Tabs 19–20 cleared but not filled** — `getRange(row, col, numRows, numCols)` uses **row count**, not end row. For 8 data rows starting at row 2 use `getRange(2, 1, 8, numCols)` — not `getRange(2, 1, 9, numCols)` (that mismatch triggers “data has 8 but range has 9”).
6. **Wrong JSON keys** — model returned `orderbook` instead of `order_book`; normalization now maps common aliases.
7. **No API key / no headlines** — pipeline exits early; summary `error` explains skip (not a silent success).

### Example Logger output

```
fetchRecentNewsContext_: {"newsRowsTotal":142,"inLookback":38,"withHeadline":38,"withEligibleSymbol":12,"headlinesSent":30,"eligibleUniverseCount":487}
callPerplexityNewsExtraction_: HTTP 200 responseLength=8421
callPerplexityNewsExtraction_: parsedKeys=filings,order_book,promoter_activity,...
callPerplexityNewsExtraction_: rawCounts={"filings":3,"order_book":1,...}
writeExtractedEventsToSheets_: counts={"filings":2,"order_book":1,...} droppedSymbol={"filings":1} droppedDedup={"filings":0}
NEWS_PIPELINE_SUMMARY {"startedAt":"2026-06-03T06:15:00","success":true,"news":{...},"written":{"counts":{...}}}
```
