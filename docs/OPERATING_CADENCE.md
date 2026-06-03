# Operating cadence (IST)

## Automated (zero daily effort after setup)

Runs without you when n8n + Apps Script triggers are enabled. See [AUTOMATION_PIPELINE.md](AUTOMATION_PIPELINE.md).

| When | System | Delivers |
|------|--------|----------|
| 6:00 IST | Apps Script `dailyMaintenance` | RSS, Perplexity Section 14 → Tabs 15–20 (if API key), scoring rebuild, prices |
| 15:45 IST | Apps Script `fetchNewsRss` | Afternoon news |
| 8:00 IST weekdays | n8n workflow | Perplexity report → Telegram, email, Tab 12 log |
| 8:00 IST (alt.) | Perplexity Tasks | Email/push only — no Sheets |

**Your only required action:** read Telegram (~2 min) at 8:15 IST.

---

## Manual / hybrid (when automation gaps)

Use when NSE blocks cloud fetch, filings need paste, or you want deeper review.

### Daily — pre-market (only if not fully automated)

- [ ] Review Tab 12 alerts + Telegram brief
- [ ] Promote Tab 3 → Tab 15 only for items Perplexity missed (optional)

### Daily — post-close (optional)

- [ ] Review Tab 15–18 rows from morning Perplexity run; correct any `[INTERPRETED]` errors

### 2x per week (Tue / Fri)

- [ ] Cursor Sections 03–04 on shortlist (≤20 symbols)
- [ ] Section 09 for new Tab 15 rows
- [ ] Confirm Tab 10 sub-scores after Perplexity run

### Weekly — Monday

- [ ] Section 02 + 12 → Tabs 19–20
- [ ] Section 07 checklist
- [ ] Screener → Tab 6; refresh UNIVERSE caps

### Weekly — Sunday (optional)

- [ ] Audit stale fundamentals; prune Tab 7

### Monthly

- [ ] Hard filters on Tab 10
- [ ] Rotate `WATCHLIST_SYMBOLS` in n8n env

---

## Time budget

| Mode | Daily minutes |
|------|----------------|
| **Fully automated** | ~2 (read Telegram) |
| **Hybrid** | ~20–30 |
| **Manual research** | ~45–55 (see v2 event-led checklist in repo history) |
