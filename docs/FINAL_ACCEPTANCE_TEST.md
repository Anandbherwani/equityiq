# Final Acceptance Test — Indian Equity Intelligence

System is **complete** only when every row below is **PASS**.

## Checklist

| ID | Criterion | Status | Notes |
|----|-----------|--------|-------|
| A1 | **06:00 IST** `dailyDataRefresh6am` runs `rebuildScoringPipeline` (Tab 10 + Tab 11) | PASS | `DailyAutomation.gs` |
| A2 | **08:00 IST** `dailyBriefing8am` calls `generateRecommendations_()` before delivery | PASS | Refreshes Tab 11 at briefing time |
| A3 | 8 AM briefing includes **5 Top 10 lists** (Immediate, 3-Month, Compounders, Gov Beneficiaries, Turnarounds) | PASS | `acceptance_lists` in report; Telegram split per list |
| A4 | Each pick includes **Score, Thesis, Catalyst, Risk, Target, Confidence** | PASS | Tab 11 columns + API aliases; email/Telegram formatted |
| B1 | Google Sheets = source of truth (scoring in `Code.gs` only) | PASS | `docs/ARCHITECTURE.md` |
| B2 | EquityIQ frontend reads Web App API; no conviction rescoring | PASS | `frontend/` uses `getTop10` / `getSymbol` |
| B3 | Recommendations page shows all lists with decision fields | PASS | `RecommendationDecisionCard` + persona UX |
| B4 | Dashboard shows acceptance lists snapshot | PASS | Top 2 picks per list on `/` |

**Compounders list name in sheet:** `Top 10 12-Month Compounders` (acceptance name “Compounders”).

**Optional 6th list:** `Top 10 Monopoly Businesses` — not required for acceptance.

---

## Field mapping (Tab 11 → acceptance)

| Acceptance field | Tab 11 column | API alias |
|------------------|---------------|-----------|
| Score | `conviction_total` | `score` |
| Thesis | `bull_case` | `thesis` |
| Catalyst | `catalyst` | `catalyst` |
| Risk | `bear_case` | `risk` |
| Target | `target_horizon` | `target` |
| Confidence | `confidence` | `confidence` |

Narratives are generated in Apps Script by `buildRecommendationNarrative_()` — not recomputed in the frontend.

---

## Manual verification

### 1. Sheet + Apps Script

1. Open the live Google Sheet bound to the Apps Script project.
2. **Stock Tracker → Setup all sheet tabs** (if fresh).
3. **Stock Tracker → Fix Tab 11 headers (keep data)** — ensures `confidence` column exists.
4. **Stock Tracker → Rebuild scoring pipeline from UNIVERSE** — populates Tab 10 + Tab 11.
5. Inspect **Tab 11** — six list names × up to 10 rows; columns through `confidence`.

### 2. Triggers

1. **Stock Tracker → Daily automation → Install triggers — 6 AM + 8 AM IST**
2. **Stock Tracker → Automation setup help** — confirm Telegram/email script properties.
3. **Stock Tracker → Run 6 AM refresh now** — check Executions + `LAST_AUTOMATION_RUN_JSON`.
4. **Stock Tracker → Run 8 AM briefing now** — check Telegram/email + `LAST_MORNING_BRIEFING_JSON`.

### 3. Web App API

Deploy: **Deploy → New deployment → Web app** (Execute as Me, Anyone).

```bash
# Replace with your /exec URL
curl -s "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health" | jq .

curl -s "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=top10" | jq '.lists[] | {name, count: (.items|length), sample: .items[0] | {symbol, score, thesis, catalyst, risk, target, confidence}}'
```

Expect `ok: true`, `listCount` ≥ 5, and each sample item with all six acceptance fields.

### 4. EquityIQ frontend

1. `cd frontend && npm run dev`
2. **Settings** — paste Web App URL → Test connection.
3. **Recommendations** — all six list sections; expand picks (Score + Conf in header; decision blocks for thesis/risk/catalyst/timeline).
4. **Dashboard** — “Top 10 lists (acceptance)” grid with two picks per required list.

```bash
cd frontend && npm run build
```

---

## Deploy steps

| Step | Action |
|------|--------|
| 1 | Paste/update all files from `backend/automation/` into the bound Apps Script project (`Code.gs`, `DailyAutomation.gs`, `WebAppApi.gs`, `BacktestEngine.gs`, `runSystemAudit.gs`). |
| 2 | **Script properties:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `BRIEFING_EMAIL_TO`; optional `PERPLEXITY_API_KEY`. |
| 3 | **Stock Tracker → Install daily automation (IST)** |
| 4 | **Deploy Web app** → copy URL to EquityIQ Settings |
| 5 | Deploy frontend (Vercel or `npm run build` + host) with `SHEETS_WEBAPP_URL` env or user settings URL |
| 6 | **Stock Tracker → Run full system audit** — resolve any FAIL stages |

---

## Script properties reference

| Property | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token |
| `TELEGRAM_CHAT_ID` | For Telegram | Chat ID |
| `BRIEFING_EMAIL_TO` | For email | Comma-separated recipients |
| `SEND_TELEGRAM` | Optional | `false` to disable |
| `SEND_EMAIL` | Optional | `false` to disable |
| `PERPLEXITY_API_KEY` | Optional | 6 AM event pipeline |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Tab 11 empty | Rebuild scoring pipeline; ensure Tab 10 has eligible rows |
| Missing `confidence` column | Fix Tab 11 headers → Sync recommendations |
| API `Tab 11 empty` | Run rebuild in Sheet; redeploy Web app |
| Briefing only Immediate | Redeploy `DailyAutomation.gs` with `acceptance_lists` |
| Frontend no data | Settings → Web App URL; check `?action=health` |

---

*Last updated: final acceptance implementation — Tab 11 `confidence`, 8 AM five-list briefing, API aliases, EquityIQ dashboard.*
