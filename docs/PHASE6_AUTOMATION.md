# Phase 6 — Full daily automation

Hands-off morning pipeline in **Google Apps Script** (`DailyAutomation.gs`). Optional **n8n** workflow remains for teams that prefer external orchestration.

## Schedule (Asia/Kolkata)

| Time | Function | What runs |
|------|----------|-----------|
| **06:00** | `dailyDataRefresh6am` | RSS **news** → tag symbols → announcement keywords → **prices** (Tab 2) → **events** (Perplexity → Tabs 15–20, if key set) → **scores** (full `rebuildScoringPipeline`: Tab 10 + Tab 11) |
| **08:00** | `dailyBriefing8am` | Nine-section **institutional morning brief** (Tab 8/10/11/12/19/20) → **Telegram** + **email** + API cache — see **[MORNING_BRIEF_TEMPLATE.md](./MORNING_BRIEF_TEMPLATE.md)** |

## One-time setup

1. Paste **`DailyAutomation.gs`**, **`MorningBriefEngine.gs`** into the same Apps Script project as `Code.gs`, `WebAppApi.gs`, `runSystemAudit.gs`.
2. **Stock Tracker → Daily automation → Install triggers — 6 AM + 8 AM IST**
3. Set **Script properties** (Project settings → Script properties):

| Property | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | For Telegram | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | For Telegram | Your chat or group id |
| `BRIEFING_EMAIL_TO` | For email | Comma-separated recipients |
| `PERPLEXITY_API_KEY` | Optional | 6 AM news → events extraction |
| `RUN_PERPLEXITY_DAILY` | Optional | Set `false` to skip Perplexity at 6 AM |
| `SEND_TELEGRAM` | Optional | Set `false` to disable Telegram |
| `SEND_EMAIL` | Optional | Set `false` to disable email |

4. Authorize scopes when prompted: **Spreadsheets**, **URL Fetch** (RSS + Telegram), **Mail** (briefing email).

## Test without waiting for triggers

- **Run 6 AM refresh now** — data only  
- **Preview briefing text** — see message body  
- **Run 8 AM briefing now** — sends Telegram/email if properties set  

Check **12. ALERTS LOG** and **Executions** for errors. Last run JSON: Script property `LAST_AUTOMATION_RUN_JSON`; last briefing: `LAST_MORNING_BRIEFING_JSON`.

## 8 AM message contents

1. **Macro outlook** — Tab 8 `MACRO_VERDICT` row + top metrics  
2. **Top sector themes** — Tab 19 latest `week_ending`, best `composite_rank`  
3. **Top 10 immediate opportunities** — Tab 11 list with conviction + Data Quality %  
4. Link to the live Google Sheet  

Templates: [DELIVERY_TEMPLATES.md](./DELIVERY_TEMPLATES.md)

## n8n (optional)

[backend/workflows/workflow-indian-equity-morning.json](../backend/workflows/workflow-indian-equity-morning.json) — weekday **08:00** cron, Sheets read + Perplexity + Telegram. Use **either**:

- **Apps Script only** (recommended if sheet is already maintained at 6 AM), or  
- **n8n at 8 AM** for richer Perplexity narrative (does not replace 6 AM scoring unless you duplicate steps).

## Audit

**Run full system audit** → stage **D_triggers** expects `dailyDataRefresh6am` + `dailyBriefing8am`.

## Related

- [AUTOMATION_PIPELINE.md](./AUTOMATION_PIPELINE.md)  
- [NEWS_TO_SCORING.md](./NEWS_TO_SCORING.md)  
- [backend/automation/README.md](../backend/automation/README.md)
