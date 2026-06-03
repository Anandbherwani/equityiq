# Institutional 8 AM Morning Brief

Nine-section morning brief for **Indian Equity Intelligence**, delivered at **08:00 Asia/Kolkata** after the 06:00 data refresh. Implementation: `backend/automation/MorningBriefEngine.gs` (orchestrated by `DailyAutomation.gs`).

## Sections and data sources

| # | Section | Primary tabs / engines | Notes |
|---|---------|------------------------|-------|
| 1 | **Market Outlook** | Tab 8 `MACRO_VERDICT`, top metrics; Tab 10 breadth sample | One-line summary + conviction breadth label |
| 2 | **Top 10 Opportunities** | Tab 11 — *Top 10 Immediate* + five acceptance lists | `buildTop10Immediate_`, `buildAcceptanceListsForBriefing_` |
| 3 | **Sector Winners** | Tab 19 latest `week_ending` | Lowest `composite_rank` / highest narrative+macro |
| 4 | **Sector Losers** | Tab 19 latest week | Inverse of winners |
| 5 | **Government Themes** | Tab 11 *Government Beneficiaries*; Tab 20 policy rows | Tab 20 filters gov/policy/budget/PLI/infra metrics |
| 6 | **Macro Themes** | Tab 20 + Tab 8 metrics (excl. verdict) | Beneficiaries/losers from Perplexity pipeline when populated |
| 7 | **Risk Alerts** | Tab 12 (48h, excl. routine automation); Tab 10 pump/data_gate | Material news alerts from 6 AM RSS |
| 8 | **Watchlist Changes** | Tab 11 Immediate snapshot diff | Script property `MORNING_BRIEF_TAB11_SNAPSHOT` |
| 9 | **Portfolio Actions** | Tab 11 Immediate + conviction/DQ rules | Sheet-ranked actions — not personalized holdings |

## Schedule and dependencies

```
Weekday 06:00 IST  dailyDataRefresh6am
  → RSS news, prices, optional Perplexity → Tabs 15–20
  → rebuildScoringPipeline (Tab 10 + Tab 11)

Weekday 08:00 IST  dailyBriefing8am
  → generateRecommendations_()
  → optional backtest snapshot
  → buildInstitutionalMorningBrief_()
  → Telegram + Email + LAST_MORNING_BRIEFING_JSON
```

**Before the brief is meaningful:**

1. UNIVERSE imported and **Rebuild scoring pipeline** run at least once.
2. Tab 8 has `MACRO_VERDICT` (manual or imported macro row).
3. Tab 19 sector strength populated (Perplexity Section 14 or manual).
4. 6 AM trigger completed same day (recommended).

Install triggers: **Stock Tracker → Daily automation → Install triggers — 6 AM + 8 AM IST**.

## Delivery formats

### Telegram

- **Function:** `sendTelegramBriefing_` → `splitInstitutionalBriefForTelegram_`
- **Chunks:** (1) Outlook + sectors + macro/gov headline, (2) Top 10 Immediate, (3) Risk + watchlist + portfolio actions + sheet link
- **Limit:** 4000 chars per message (auto-truncate)
- **Format:** Plain text (no MarkdownV2) for reliability

**Example (chunk 1):**

```
📊 Indian Equity Intelligence
2026-06-04 08:00 IST

OUTLOOK: Risk-on · FII bias positive · Broad participation (58% ≥50/100)
Breadth: Broad participation

SECTOR WINNERS: DEFENCE, POWER, BFSI
SECTOR LOSERS: REAL ESTATE, MEDIA, TEXTILES
MACRO: MACRO_VERDICT: Accumulate cyclicals on dips
GOV: Government beneficiaries (Tab 11)
```

### Email

- **Function:** `sendMorningBriefingEmail_`
- **Subject:** `[India Stocks] Morning Brief — YYYY-MM-DD — {headline}`
- **Body:** `formatInstitutionalBriefPlain_` + HTML `formatInstitutionalBriefHtml_`
- **Recipients:** Script property `BRIEFING_EMAIL_TO` (comma-separated)

### Dashboard

- **API:** Web App `?action=morning_brief` (cached) or `?action=morning_brief&fresh=true` (rebuild)
- **Frontend:** Next.js `/brief` — reads API via `NEXT_PUBLIC_SHEETS_API_URL`
- **Cache:** Script property `LAST_MORNING_BRIEFING_JSON` after each 8 AM run

**Example API snippet:**

```json
{
  "ok": true,
  "cached": true,
  "brief": {
    "version": "2.0-institutional",
    "date_ist": "2026-06-04 08:00",
    "sections": {
      "market_outlook": { "summary": "...", "breadth": { "label": "Mixed breadth" } },
      "top10_opportunities": { "immediate": [{ "rank": 1, "symbol": "HAL", "conviction_total": 78 }] },
      "sector_winners": { "items": [{ "sector": "DEFENCE", "rank": 1 }] },
      "risk_alerts": { "summary": "3 alert(s) in last 48h" },
      "watchlist_changes": { "added": ["BEL"], "removed": [] },
      "portfolio_actions": { "items": [{ "symbol": "HAL", "action": "Overweight / add on dips" }] }
    }
  }
}
```

## Configuration (Script properties)

| Property | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | For Telegram | BotFather token |
| `TELEGRAM_CHAT_ID` | For Telegram | Chat or group ID |
| `BRIEFING_EMAIL_TO` | For email | Comma-separated recipients |
| `SEND_TELEGRAM` | Optional | `false` disables Telegram |
| `SEND_EMAIL` | Optional | `false` disables email |
| `LAST_MORNING_BRIEFING_JSON` | Written at 8 AM | API cache + audit |
| `MORNING_BRIEF_TAB11_SNAPSHOT` | Written at 8 AM | Watchlist diff baseline |

Feature flags: no separate flag — brief always builds all nine sections; empty tabs yield explicit “empty” stubs in output.

## Manual operator checklist

1. **Paste** `MorningBriefEngine.gs` + updated `DailyAutomation.gs` + `WebAppApi.gs` into Apps Script; Save.
2. **Install** 6 AM + 8 AM triggers (weekdays).
3. Set **Telegram** and/or **email** script properties.
4. **Run 6 AM refresh now** — confirm ALERTS LOG `automation_6am`.
5. **Preview briefing text** or **Preview briefing JSON** from menu.
6. **Run 8 AM briefing now** — verify Telegram/email and `LAST_MORNING_BRIEFING_JSON`.
7. **Deploy** Web App (new version if API changed) → set URL in EquityIQ Settings / `NEXT_PUBLIC_SHEETS_API_URL`.
8. Open **`/brief`** on dashboard — confirm nine sections render.

## Apps Script files

| File | Role |
|------|------|
| `MorningBriefEngine.gs` | Nine-section builder + formatters |
| `DailyAutomation.gs` | `dailyBriefing8am`, triggers, delivery |
| `WebAppApi.gs` | `?action=morning_brief` |

## Known gaps / stubs

| Area | Limitation |
|------|------------|
| Tab 19 empty | Sector winners/losers show “Tab 19 empty” |
| Tab 20 empty | Government/macro themes lean on Tab 11 gov list only |
| Portfolio | Actions derived from Immediate Top 10 — not user portfolio tab (browser localStorage) |
| Nifty live | Outlook uses sheet macro/breadth — no live index API in brief |
| First-day watchlist diff | No “added/removed” until second 8 AM run establishes snapshot |

See also: [PHASE6_AUTOMATION.md](./PHASE6_AUTOMATION.md), [DELIVERY_TEMPLATES.md](./DELIVERY_TEMPLATES.md).
