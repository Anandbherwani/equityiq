# Fully automated morning pipeline

> **Phase 6 (recommended):** Apps Script `DailyAutomation.gs` — **6:00** data refresh + **8:00** Telegram/email briefing. See **[PHASE6_AUTOMATION.md](./PHASE6_AUTOMATION.md)**.

# Fully automated morning pipeline (8:00 AM IST)

Target: **zero daily manual effort** for the briefing layer. You read Telegram/email; Sheets update in the background.

```
⏰ Schedule (weekdays 08:00 Asia/Kolkata)
     ↓
📡 Data pull (RSS, Sheets read, optional HTTP feeds)
     ↓
🧠 Perplexity API (master prompt + context block)
     ↓
📄 Report (Top 10, boards, checklist excerpt)
     ↓
📲 Telegram + Email + Google Sheets
```

## Two deployment paths

| Path | Effort | Sheets | Telegram | Best for |
|------|--------|--------|----------|----------|
| **A — n8n full** | One-time setup | Auto-updated | Yes | Production desk |
| **B — Perplexity Tasks** | ~5 minutes | Manual paste optional | No (email/push only) | Fastest start |

See [backend/workflows/README.md](../backend/workflows/README.md) for Path A and [Perplexity Tasks setup](#path-b-perplexity-tasks-only) below.

## Stage 1 — Schedule

- **n8n:** Schedule Trigger → cron `0 8 * * 1-5` timezone `Asia/Kolkata`
- **Apps Script (partial):** `installDailyTriggers` runs 6:00 + 15:45 IST — data only, not Perplexity
- **Perplexity Tasks:** Daily 8:00 AM weekdays in product UI

## Stage 2 — Data pull (honest limits)

| Feed | Target tab | Automation | Limitation |
|------|------------|------------|------------|
| RSS (ET, Mint, MC, etc.) | 7 NEWS FLOW | Apps Script `fetchNewsRss` or n8n HTTP | Some feeds fail intermittently |
| News → events (v3) | 15–20, 9, 14 | Apps Script `runNewsIntelligencePipeline` or n8n Section 14 node | Requires `PERPLEXITY_API_KEY`; symbols must be in UNIVERSE |
| NSE EQUITY_L CSV | 1 UNIVERSE | Apps Script / n8n HTTP | NSE may HTTP 403 from cloud IPs |
| NSE announcements | 3, 15 FILINGS | Manual paste or Perplexity in prompt | **No stable public API** without session cookies |
| NSE bulk deals | 4 BULK | Manual or paid middleware | `bulkdeals-data` needs NSE session |
| Screener fundamentals | 6 FUNDAMENTALS | Weekly CSV export | Premium/export limits |
| InsiderScreener | 5, 18 PROMOTER | Manual / Perplexity | No official free API |
| Global Datafeeds news | 7 NEWS FLOW | REST with API key | Paid |
| Prices | 2 PRICE | GOOGLEFINANCE / SheetsFinance add-on | Indian symbols vary by source |

**Recommended hybrid:** Let **Apps Script** run RSS at 6:00 IST (`dailyMaintenance`) including optional Perplexity Section 14 → Tabs 15–20; n8n at 8:00 reads updated Sheets and builds [pipeline context](../backend/config/pipeline-context-template.md) for the morning briefing.

See [NEWS_TO_SCORING.md](NEWS_TO_SCORING.md) for the full NEWS → score path.

## Stage 3 — Perplexity

### 3a — News event extraction (Tabs 15–20)

1. **Prompt:** `backend/intelligence/sections/14-news-to-events-json.md` (JSON only).
2. **Input:** last 30 headlines from Tab 7 + watchlist symbols.
3. **Writer:** Apps Script `runNewsIntelligencePipeline()` (menu or `dailyMaintenance` when `PERPLEXITY_API_KEY` is set).
4. **n8n:** optional `Perplexity News Extraction` node in [workflow-indian-equity-morning.json](../backend/workflows/workflow-indian-equity-morning.json) — same schema; prefer Apps Script for Sheets writes unless you add Sheets append nodes.

### 3b — Morning briefing (Top 10 / Telegram)

1. **System message:** copy from `backend/intelligence/system.md` (replace `{{DATE}}`).
2. **User message:** `backend/intelligence/sections/01-macro.md` + `03-screening.md` + `04-stock-cards.md` (or a single “daily run” prompt you maintain).
3. **Context append:** assembled block from `config/pipeline-context-template.md` (macro, watchlist, last 24h filings/news/events from Sheets).

**API:** `POST https://api.perplexity.ai/chat/completions`  
Model: `sonar-pro` or `sonar-reasoning-pro`  
Header: `Authorization: Bearer {{PERPLEXITY_API_KEY}}`

Ask for **JSON** output schema for Top 10 to simplify n8n parsing (optional).

## Stage 4 — Report build

Parse Perplexity response into:

- Top 10 cards → Tab **10 SCORING** / **11 RANKED WATCHLIST** / **11b DASHBOARD BOARDS**
- Run log → Tab **12 ALERTS LOG**
- Tables A–D → Tab **21 ANALYSIS_OUTPUT**

Then call Apps Script (optional): HTTP POST to deployed web app `refreshDashboardViews` if you expose it.

## Stage 5 — Delivery

Templates: [DELIVERY_TEMPLATES.md](DELIVERY_TEMPLATES.md)

- **Telegram:** Bot token + chat ID
- **Email:** SMTP or Resend
- **Sheets:** n8n Google Sheets node with spreadsheet ID

## Path B — Perplexity Tasks only

1. Go to perplexity.ai → **Tasks** → Schedule Task  
2. Paste system + user prompts from this repo  
3. Daily 8:00 AM, weekdays, email + push  
4. **Does not** update Google Sheets automatically — paste scores when you want archive

Good bridge until n8n is wired.

## Reference dashboard

Dashboard hub: [frontend/index.html](../frontend/index.html). On-demand symbol analysis: [frontend/equityiq.html](../frontend/equityiq.html) (Perplexity or demo). Universe scoring remains in Google Sheets.

## Security

Store in n8n credentials vault: `PERPLEXITY_API_KEY`, `GOOGLE_SHEETS_OAUTH`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `EMAIL_SMTP` or `RESEND_API_KEY`.

Apps Script: **Project settings → Script properties** → `PERPLEXITY_API_KEY` (required for news pipeline). Optional `RUN_PERPLEXITY_DAILY=false` to skip API on 6:00 trigger.

Never commit secrets to this repo.

## Related

- [NEWS_TO_SCORING.md](NEWS_TO_SCORING.md)
- [EVENT_LED_ARCHITECTURE.md](EVENT_LED_ARCHITECTURE.md)
- [NSE_FILINGS_WORKFLOW.md](NSE_FILINGS_WORKFLOW.md)
- [DATA_SOURCES.md](DATA_SOURCES.md)
