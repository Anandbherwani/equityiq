# Recommendation History Engine v1.0

**Script:** `backend/automation/RecommendationHistoryEngine.gs`  
**Sheet:** Tab **37. RECOMMENDATION HISTORY** (append-only, permanent)  
**API:** `?action=recommendation_history` · `?action=recommendation_validation`  
**Frontend:** `/history` · `/validation`

---

## Purpose

Turn Tab 11 recommendations into a **measurable track record** from day one. Each 8 AM run appends a deduplicated snapshot with full analyst context; the API computes **live** returns and paired alpha vs Nifty and sector from entry to today.

---

## Daily 8 AM snapshot

After `generateRecommendations_()` in `dailyBriefing8am`:

| Field | Source |
|-------|--------|
| `snapshot_date` | Today (IST) — also **entry date** for tracking |
| `recommendation_category` | `RECOMMENDATION_LIST_DEFS.filter` (e.g. `immediate`) |
| `list_name` | Tab 11 list name |
| `symbol`, `rank`, `company_name`, `sector_key` | Tab 11 + universe |
| `entry_price` | Tab 2 live price at snapshot |
| `conviction` | Tab 11 `conviction_total` |
| `thesis` | Tab 11 `bull_case` |
| `target` | Tab 11 `target_horizon` |
| `confidence` | Tab 11 `confidence` |
| `risk` | Tab 11 `bear_case` |
| `risk_score` | Tab 10 safety score when available |

Dedup key: `date|symbol|list_name` — reruns the same day do not duplicate rows.

---

## Live tracking (API)

For each history row:

- **Current price** — Tab 2, else Google Finance on today  
- **Current return** — entry → today  
- **Nifty / sector return** — same dates (paired alpha)  
- **Alpha vs Nifty / sector**

---

## Scorecards (validation API)

Per `recommendation_category`:

- Recommendations issued  
- Hit rate  
- Average return  
- **Average alpha vs Nifty** (`average_alpha_vs_nifty_pct`)  
- **Average alpha vs sector** (`average_alpha_vs_sector_pct`)  
- Best pick / worst pick  

API field `average_alpha_vs_sector_pct` is returned on each scorecard in `?action=recommendation_validation`.

---

## Operations

| Action | How |
|--------|-----|
| Manual snapshot | Stock Tracker → **Recommendation history** → Snapshot history → Tab 37 |
| Backfill today | Run after **Sync recommendations (Tab 11)** |
| Install 8 AM | **Daily automation** → Install triggers |
| Preview JSON | **Preview history JSON** (execution log) |

---

## Related

- Tab **22** — backtest horizons (separate engine)  
- [BACKTEST_ENGINE.md](./BACKTEST_ENGINE.md)  
- `frontend` nav: **History** · **Track record**
