# Geopolitics flags → conviction scoring

Tab **9. GEOPOLITICS FLAGS** feeds Tab **10** column **H** (`news_events`) during the scoring rebuild. Engine 3.1 then uses H in **catalyst_score** (35% weight in Level 4).

## Tab 9 schema

| Col | Field | Scoring use |
|-----|--------|-------------|
| A | event | Display / dedup key only |
| B | status | Must be **active** (not resolved/closed/inactive/archived) |
| C | sectors_helped | Pipe/comma tokens → sector or NSE symbol match |
| D | sectors_hurt | **Not** used for H boost (audit only) |
| E | last_updated | Recency gate (default 120 days; blank = always eligible) |
| F | notes | Display only |

Rows are appended by Perplexity Section 14 (`geopolitics[]`) or entered manually.

## Matching logic

1. Load active, recent Tab 9 rows.
2. Parse `sectors_helped` tokens (same splitter as Tab 20 beneficiaries).
3. Token is an **eligible UNIVERSE symbol** → direct symbol hit.
4. Otherwise normalize token to canonical sector → match Tab 1 `sector` for each Tab 10 row.
5. Suggested H = `min(4, hits × 2)`, then merged: `H = min(10, max(existing H, geo boost))`.

Manual scores and higher Tab 7 / Tab 15–18 automation are preserved (`Math.max`).

## Pillar impact

| Pillar | Effect |
|--------|--------|
| **H news_events** | Primary — up to **+4** from Tab 9 alone (global cap **10**) |
| **G sector_strength** | None (Tab 19 / Tab 20 path unchanged) |
| **M opportunity_rank** | Indirect via Engine 3.1 **catalyst_score** when H rises |

Constants live in `GeopoliticsScoring.gs`: `GEOPOLITICS_H_BONUS_PER_HIT_`, `GEOPOLITICS_H_BONUS_CAP_`, `GEOPOLITICS_FLAG_MAX_DAYS_`.

## When it runs

| Trigger | Function chain |
|---------|----------------|
| **Rebuild scoring pipeline from UNIVERSE** | `rebuildScoringPipeline` → … → `applyAutoSubScoresAndRefreshTotals_` → `applyGeopoliticsFlagsToData_` |
| **Run news intelligence pipeline (Perplexity)** | Writes Tab 9 → `rebuildScoringPipeline(true)` |
| `dailyMaintenance` | Same rebuild after RSS / Perplexity when enabled |

Order inside `applyAutoSubScoresAndRefreshTotals_`:

```
applyMacroBeneficiariesToData_ (G)
applyGeopoliticsFlagsToData_   (H hint)
applyAutoSubScores_            (H/G from helpers N–R + Tab 7 already applied)
→ Conviction Engine 3.1 batch
```

## Operator steps

1. Ensure Tab 9 has active flags (`status` ≠ resolved/closed; `sectors_helped` filled).
2. **Stock Tracker → Rebuild scoring pipeline from UNIVERSE** (or run Perplexity news pipeline).
3. Check Tab 10 **H** for symbols in helped sectors; Apps Script **Executions → Logs** for `applyGeopoliticsFlagsToData_` samples.

## Related docs

- [NEWS_TO_SCORING.md](NEWS_TO_SCORING.md) — Perplexity write path to Tab 9
- [shared/scoring/CONVICTION_SCORE.md](../shared/scoring/CONVICTION_SCORE.md) — H pillar rules
- `backend/automation/GeopoliticsScoring.gs` — implementation
