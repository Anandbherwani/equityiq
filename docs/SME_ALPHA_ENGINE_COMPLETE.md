# SME Alpha Engine — Complete

**Script:** `SmeAlphaEngine.gs` v1.0  
**Tab 11 list:** **Top 10 SME Opportunities**

## `sme_alpha_score`

Composite 0–100 for universe rows flagged SME (`is_sme`, cap segment). Weights: growth, fundamentals, moat, institutional flow, opportunity rank, data quality.

## Tracks (`recommendation_category`)

| Track id | Label |
|----------|--------|
| `sme_compounder` | SME compounders |
| `sme_migration` | SME migration candidates |
| `sme_export` | SME export stories |
| `sme_gov` | SME government beneficiaries |

Stored in Tab 11 `evidence` JSON: `{ "sme_track", "recommendation_category", "sme_alpha_score" }`.

## Integration

- **Recommendations:** `appendSmeOpportunitiesToTab11_` called from `generateRecommendations_` after theme lists  
- **History:** Tab 37 snapshot via `resolveRecommendationCategory_` + evidence meta  
- **Validation:** Scorecards per `sme_*` category when history exists  
- **API:** `?action=sme_alpha`

## Requirements

- NSE SME universe import (`importNseSmeSymbolList`)  
- Tab 10 scored before sync  
