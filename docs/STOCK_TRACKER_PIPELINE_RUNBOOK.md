# Stock Tracker — run all scripts in order

**Live sheet:** [Indian Equity Intelligence](https://docs.google.com/spreadsheets/d/1mWuTNDL2WhBmetQYceCAIlQDX7NyBZy6O_sudddh0KE/edit)

Remote `clasp run` / Apps Script API execution from this machine returns **permission denied** (the CLI account is not authorized to execute the bound script). Use the sheet menu or Apps Script editor instead.

---

## Fastest path (one menu click)

1. Open the spreadsheet above.
2. Reload the page (so **Stock Tracker** menu refreshes after the latest script push).
3. **Stock Tracker → Run full pipeline (all steps in order)**

This runs, in order:

| Step | What it does |
|------|----------------|
| classify_cap_segments | Cap buckets on Tab 1 |
| theme_tags | Investment theme tags on UNIVERSE |
| data_ingestion_v2 | NSE → Tabs 4, 6, 24 (+ coverage Tab 33) |
| news_sources | Sync Tab 13 sources |
| rss_and_tags | RSS fetch + symbol tagging |
| announcements | Keyword parse on filings |
| scoring_rebuild | Tab 10 scores + Tab 11 lists |
| peer_comparison | Peer engine batch (if deployed) |
| risk_engine | Risk grades on Tab 10 |
| theme_intelligence | Theme engine (if deployed) |
| recommendations | Regenerate Tab 11 lists |
| history_snapshot | Tab 37 history row for today |
| backtest_snapshots | Tab 22 list snapshots |

**Log:** Apps Script → **Executions**, or Script property **`LAST_FULL_PIPELINE_JSON`**.

**Note:** Full run can exceed the 6-minute Apps Script limit on a large universe (~2,377 symbols). If it times out, use the split path below.

---

## Split path (if timeout)

Run these **in order** from **Stock Tracker**:

1. **Classify cap segments**
2. **Data ingestion → Run ingestion v2 (full pipeline)**
3. **Fetch RSS news** → **Tag news symbols**
4. **Rebuild scoring pipeline from UNIVERSE**
5. **Sync recommendations (Tab 11)**
6. **Recommendation history → Snapshot history → Tab 37 (today)**

Optional (Perplexity key required):

- **Run news intelligence pipeline (Perplexity)** — before rebuild if you want event scores in Tab 10 H.

Daily automation equivalent:

- **Run 6 AM refresh now** (news, ingestion subset, prices, rebuild)
- **Run 8 AM briefing now** (Tab 11 sync, history, brief JSON)

---

## Current health (API)

```text
GET https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec?action=health
```

Recent snapshot: Tab 1 ≈ 2377, Tab 10 ≈ 2375, Tab 11 ≈ 42, **Tab 6 = 0** (fundamentals empty until ingestion v2 or Screener CSV import).

---

## Enable remote `clasp run` (optional)

1. Apps Script project → **Project settings** → enable **Google Apps Script API**.
2. In the editor, run any function once and complete OAuth as the **sheet owner**.
3. `appsscript.json` already has `"executionApi": { "access": "MYSELF" }`.
4. `clasp run runStockTrackerFullPipelineMenu` from `backend/automation/`.

The Google account in `~/.clasprc.json` must be the same account that owns **Indian Equity Intelligence**.
