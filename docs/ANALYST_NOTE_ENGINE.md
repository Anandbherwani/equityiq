# Analyst Note Engine v2

**Version:** 2.0  
**Apps Script:** `backend/automation/AnalystNoteEngine.gs`

Every Tab 11 equity recommendation ships a **professional analyst note** with nine required sections. Thin sections are auto-expanded before publish; incomplete picks are backfilled from the candidate pool.

---

## Required sections (every recommendation)

| Section | Tab 11 / API field |
|---------|-------------------|
| **Investment Thesis** | `investment_thesis` · lead paragraph + drivers |
| **Bull Case** | `bull_case` · bulleted upside drivers |
| **Bear Case** | `bear_case` · bulleted downside scenarios |
| **Catalysts** | `catalysts` · near-term trigger calendar |
| **Risks** | `risks` · Risk Engine + DQ / monitorables |
| **Valuation Summary** | `valuation_summary` (alias `valuation`) · multiples vs peers |
| **Peer Comparison** | `peer_comparison` · relative Q/V/G, ROCE vs median |
| **Theme Exposure** | `theme_exposure` · UNIVERSE tags + Theme Intelligence |
| **Confidence** | `confidence` (0–100) + `confidence_rationale` |

Minimum **48 characters** per text section (theme list rows: relaxed).

---

## Professional format

- Section leads (e.g. “Bull case — key upside drivers:”)  
- Bullets prefixed with `•`  
- Full document in Tab 11 `bull_case` with uppercase headers  
- Structured JSON in `evidence`: `{ v: "2.0", analyst_note: {...}, score_breakdown }`

---

## Data sources (no rescoring)

| Section | Inputs |
|---------|--------|
| Thesis | List name, opportunity rank, Engine 3 stage, data gate, action |
| Bull | Engine 3 why-stock, pillars, orders, sector rank, R/R |
| Bear | Flags, risk grade, legacy bear narrative |
| Catalysts | why-now, filings, upgrades, news pillar |
| Risks | `buildRiskRecommendationBlock_`, DQ, stale flags |
| Valuation | Tab 6 P/E/P/B, relative valuation score, sector medians |
| Peers | `buildWhyBetterThanPeers_`, Tab 25 medians |
| Themes | Tab 10 theme cols 57–63, UNIVERSE tags |
| Confidence | `computeRecommendationConfidence_` + rationale bullets |

---

## Pipeline

1. `pickRecommendationCandidates_`  
2. `finalizeRecommendationPicksWithAnalystNotes_` — build note → `finalizeAnalystNoteForPublish_` → completeness check → backfill to 10  
3. Theme lists via `buildThemeListAnalystNote_`  
4. `buildRecommendationNarrativeV2_` / `buildInstitutionalRecommendationNarrative_` use the same engine  

---

## API / EquityIQ

- `item.analyst_note` — full structured object on `?action=top10`  
- `item.decision` — `buildDecisionFromAnalystNote_` (why = thesis, risk = risks section)  
- `item.thesis` — set from `investment_thesis` when note present  
- Client: `AnalystNoteSections` renders all nine sections + timeline  

---

## Deploy

1. Paste **`AnalystNoteEngine.gs`** (+ `RecommendationEngine.gs`, `ConvictionEngine3.gs`, `WebAppApi.gs` if updated).  
2. **Sync recommendations (Tab 11)** to regenerate all lists.  
3. Redeploy Web App / refresh EquityIQ for structured notes.
