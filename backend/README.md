# Backend — Automation & intelligence

All **executable** backend logic for this project lives here. The Google Sheet stores data; these components **read and write** the sheet.

## automation/ (Apps Script)

Paste into **Extensions → Apps Script** in your bound spreadsheet:

| File | Layer |
|------|--------|
| `Code.gs` | Automation + **decision** (scoring, recommendations, RSS, Screener, Perplexity pipeline) |
| `runSystemAudit.gs` | Automation (live audit) |
| `WebAppApi.gs` | Automation (JSON API for EquityIQ) |

See [automation/README.md](automation/README.md).

**Do not copy scoring formulas into the frontend.** Tab 10/11 are written only from here.

## intelligence/ (Perplexity prompts)

- `system.md` — global rules
- `sections/01`–`14` — MCP / manual / Section 14 news→events JSON

Section **14** is wired in `Code.gs` (`runNewsIntelligencePipeline`). Other sections are manual or n8n context unless you extend Apps Script.

## config/

- `news-sources.json` — feed catalog (keep in sync with `NEWS_SOURCES` in `Code.gs`)
- `pipeline-context-template.md` — n8n morning brief context

## workflows/

- `workflow-indian-equity-morning.json` — 08:00 IST read Sheets + Telegram/email

n8n does **not** replace Apps Script for writing Tabs 15–20 or Tab 10/11.
