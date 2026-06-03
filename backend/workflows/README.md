# n8n — Indian Equity Morning Workflow

**Phase 6 default:** Apps Script handles **6:00** data + **8:00** Telegram/email ([docs/PHASE6_AUTOMATION.md](../../docs/PHASE6_AUTOMATION.md)). Use n8n when you want Perplexity-heavy briefing orchestration outside Sheets.

Import [workflow-indian-equity-morning.json](workflow-indian-equity-morning.json) into n8n Cloud or self-hosted instance.

## Prerequisites

| Credential | Used by |
|------------|---------|
| Google Sheets OAuth2 | Read/write spreadsheet |
| Perplexity API (HTTP Header Auth) | News extraction + morning briefing nodes |
| Telegram Bot API | Morning report |
| SMTP or Resend | Email delivery |

## Environment variables (n8n)

Set in n8n **Settings → Variables**:

| Variable | Example |
|----------|---------|
| `SHEET_ID` | Google Spreadsheet ID from URL |
| `TELEGRAM_CHAT_ID` | Your chat or group ID |
| `WATCHLIST_SYMBOLS` | `RELIANCE,TCS,INFY,...` (max ~30 for token limits) |

## Node order (after import)

1. **Schedule Trigger** — Weekdays 08:00 `Asia/Kolkata`
2. **Google Sheets — Read** — Tabs: `8. MACRO DASHBOARD`, `11. RANKED WATCHLIST`, `15. FILINGS`, `7. NEWS FLOW` (last N rows)
3. **Section 14 chain** — `Build News Events Context` → `Perplexity News Extraction` → `Parse Events JSON` (from Tab 7 headlines)
4. **Code — Build context** — Merge rows + events summary per `config/pipeline-context-template.md`
5. **HTTP Request — Perplexity** — POST chat/completions (morning briefing)

**Sheets write for Tabs 15–20:** use Apps Script `runNewsIntelligencePipeline` at 6:00 IST (canonical). n8n Section 14 feeds the 8:00 briefing context unless you add Sheets append nodes.

6. **Code — Parse response** — Extract Top 10 JSON or markdown sections
7. **Google Sheets — Append** — `12. ALERTS LOG` (map columns manually first run)
8. **Telegram — Send Message** — Template from `docs/DELIVERY_TEMPLATES.md`
9. **Send Email** — HTML body same content

## NSE HTTP nodes (placeholders)

Workflow includes **disabled** HTTP nodes for:

- `https://archives.nseindia.com/content/equities/EQUITY_L.csv`
- NSE bulk deals API (commented — requires cookie middleware)

Enable only if your n8n instance IP is not blocked. Otherwise rely on Apps Script in the Sheet (6:00 IST trigger) and read results in step 2.

## Perplexity node

If using native **Perplexity node** instead of HTTP:

- Model: `sonar-pro`
- System prompt: paste from repo `backend/intelligence/system.md`
- User prompt: `{{ $json.contextBlock }}\n\n` + shortened instruction to output Top 10 table with conviction scores

## Self-host vs Cloud

| | Cloud | Self-host VPS |
|---|-------|----------------|
| Setup | Fastest | Docker `n8nio/n8n` |
| Cron TZ | UI timezone | Set `GENERIC_TIMEZONE=Asia/Kolkata` |
| Cost | Subscription | ~$5/mo VPS |

## Testing

1. Disable Schedule Trigger → use **Manual Execute**
2. Set `WATCHLIST_SYMBOLS` to 3 symbols
3. Verify Telegram test message before enabling cron

## References

- [n8n Perplexity integration](https://n8n.io/integrations/perplexity/)
- [Real-time stock monitor template (IN/US)](https://n8n.io/workflows/7701-real-time-stock-monitor-with-smart-alerts-for-indian-and-us-markets/)
- [docs/AUTOMATION_PIPELINE.md](../docs/AUTOMATION_PIPELINE.md)
