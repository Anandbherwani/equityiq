# Phase 8 — User Experience

Phase 8 makes EquityIQ usable for three investor personas without duplicating conviction scoring in the frontend.

## Personas

| Persona | UI behavior |
|---------|-------------|
| **Beginner** | Plain-language section labels ("Why we like it", "What to do"), qualitative conviction tier instead of raw score, metrics hidden behind accordions |
| **Professional** | Standard Why / What / Risk / Catalyst / Timeline labels plus conviction, data quality badge, price/target in expandable details |
| **Portfolio Manager** | Compact two-column table per pick, monospace export line for copy/paste into notes or CRM |

Persona is stored in `localStorage` (`equityiq_persona_v1`) and selected from the header switcher. It affects **presentation only** — all data still comes from the Sheets Web App API.

## Decision block (five fields)

Every recommendation exposes a `decision` object from Apps Script:

| Field | Source |
|-------|--------|
| **why** | Conviction tier, top scoring pillars (Tab 10 C–J), data quality %, Tab 11 evidence/bull |
| **what** | List-specific action thesis (Immediate, Compounders, etc.) — template from list name + conviction |
| **risk** | Tab 11 bear_case + data gate / pump flags |
| **catalyst** | Tab 11 catalyst or order/filing helpers |
| **timeline** | Tab 11 target_horizon + list default horizons |

Built by `buildDecisionNarrativeFromScores_()` in `backend/automation/Code.gs` and attached in `WebAppApi.gs` on `?action=top10` and `?action=symbol`. **No rescoring** — templates only.

If the deployed Web App is older, the frontend falls back via `frontend/src/lib/decision-narrative.ts`.

## Frontend surfaces

- **Dashboard** — Immediate Top 5 as `RecommendationDecisionCard` (dashboard variant)
- **`/recommendations`** — Full cards per Tab 11 list
- **`/stock/[symbol]`** — `RecommendationDecisionPanel` on Overview and AI Analysis tabs; Tab 10 breakdown collapsed under "View details"

## Deploy

1. Paste updated `Code.gs` and `WebAppApi.gs` into the Apps Script project.
2. **Deploy → Manage deployments → New version** (Web app).
3. Optional: **Stock Tracker → Sync recommendations** to refresh Tab 11 narratives.
4. In `frontend/`: `npm run build` and redeploy Next.js as usual.

## Vocabulary

Reuse labels from:

- `shared/scoring/CONVICTION_SCORE.md` — pillar names and caps
- `shared/scoring/DATA_QUALITY.md` — data quality % and gate language
