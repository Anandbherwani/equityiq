# Delivery templates (Telegram + Email)

Use after Perplexity returns `top10` JSON in n8n Code node.

## Telegram (MarkdownV2 — escape special chars in production)

```
📊 *Indian Equity Intelligence*
🕐 {{DATE_IST}} IST | Run {{RUN_ID}}

*Macro:* {{MACRO_ONE_LINER}}

*Top 10*
{{#each top10}}
{{rank}}. *{{symbol}}* — {{conviction_total}}/100
{{thesis_one_line}}
Action: {{action_label}} | {{horizon}}
{{/each}}

*Hot sectors:* {{SECTORS_HOT}}

*Alerts:* {{ALERT_COUNT}} new since yesterday

_Sheets updated · Not investment advice_
```

### Plain Telegram (simpler, no MarkdownV2)

```
Indian Equity Intelligence — {{DATE_IST}}

MACRO: {{MACRO_ONE_LINER}}

TOP 10:
1. RELIANCE — 82 — Accumulate on dips
   Thesis: ...

...

Open Sheet: https://docs.google.com/spreadsheets/d/{{SHEET_ID}}
```

## Email subject

```
[India Stocks] Top 10 — {{DATE_IST}} — {{MACRO_BIAS}}
```

## Email HTML outline

```html
<!DOCTYPE html>
<html>
<body style="font-family: system-ui; max-width: 640px;">
  <h1>Indian Equity Intelligence</h1>
  <p><strong>{{DATE_IST}}</strong> IST · Reference mockup layout: see repo dashboard/</p>
  <section id="macro">
    <h2>Macro snapshot</h2>
    <p>{{MACRO_VERDICT}}</p>
    <ul>{{MACRO_BULLETS}}</ul>
  </section>
  <section id="top10">
    <h2>Top 10 opportunities</h2>
    {{TOP10_CARDS_HTML}}
  </section>
  <section id="watchlist">
    <h2>Monitoring</h2>
    <table border="1" cellpadding="6">{{WATCHLIST_TABLE}}</table>
  </section>
  <section id="checklist">
    <h2>7-day checklist (excerpt)</h2>
    <ol>{{CHECKLIST_ITEMS}}</ol>
  </section>
  <footer>
    <p>Probability ranking only — not investment advice.</p>
    <a href="https://docs.google.com/spreadsheets/d/{{SHEET_ID}}">Open live Google Sheet</a>
  </footer>
</body>
</html>
```

### Card HTML snippet (per stock)

```html
<div style="border:1px solid #ddd; border-radius:8px; padding:12px; margin:8px 0;">
  <strong>{{symbol}}</strong> — Conviction {{conviction_total}}/100
  <span style="background:#e8f5e9; padding:2px 8px; border-radius:4px;">{{action_label}}</span>
  <p>{{thesis_one_line}}</p>
  <small>Horizon: {{horizon}} · {{tags}}</small>
</div>
```

## n8n expression hints

- `{{ $json.top10[0].symbol }}` — first symbol
- Join array: `$json.top10.map((s,i) => `${i+1}. ${s.symbol} — ${s.conviction_total}`).join('\n')`

## Sheets write mapping

| AI field | Tab | Column |
|----------|-----|--------|
| conviction_total | 10. SCORING MODEL | M |
| sub-scores | 10 | C–L |
| action_label | 10 | X (action_label col per schema) |
| board row | 11b DASHBOARD BOARDS | append via Apps Script or manual |
| run log | 12. ALERTS LOG | append row `perplexity_morning` |

Verify column letters against [SCORING.md](../shared/scoring/SCORING.md) after setup.
