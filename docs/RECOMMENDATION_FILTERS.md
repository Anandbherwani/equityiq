# Recommendation filters v2 (false-positive reduction)

## Goal

Cut marginal Tab 11 picks by roughly **50%** versus legacy gates by rejecting:

- Low quality (weak pillars, low DQ, low quality score)
- News-only theses
- Weak conviction (low opportunity rank)
- **Single-news-driven** rankings (one headline inflating `news_events` / H)
- **Single-order-driven** rankings (one LOA/order line without fundamentals backstop)
- **Stale** recommendations (price ≥14d, fundamentals ≥120d, TAB2/TAB6 stale flags)

## Files

| File | Role |
|------|------|
| `RecommendationAuditEngine.gs` | v2 thresholds, classifiers, last-100 audit, Tab **32. RECOMMENDATION AUDIT** |
| `RecommendationEngine.gs` | `evaluateRecommendationQuality_` uses v2 config + FP filters |
| `Code.gs` | `pickRecommendationCandidates_`, `recommendationSortKey_` penalties |

## v2 thresholds (when `REC_FILTER_V2_ENABLED_ = true`)

| Gate | Legacy | v2 |
|------|--------|-----|
| Data quality % | 60 | **68** |
| Confidence % | 50 | **58** |
| Opportunity rank | 20 | **38** |
| Quality score | 35 | **48** |
| Core pillars (C+F+K+D+E) | — | **≥22** (≥26 if no data gate) |
| Price age (days) | 30 | **14** |
| Fundamentals age (days) | 180 | **120** |

Toggle v2: set `REC_FILTER_V2_ENABLED_ = false` in `RecommendationAuditEngine.gs`.

## Classifiers

| Flag | Meaning |
|------|---------|
| `low_quality` | Fails DQ/quality score/core pillar floor |
| `weak_conviction` | Rank below 38, or rank &lt;50 with weak quality |
| `news_only` | `isNewsOnlyRecommendation_` |
| `single_news_driven` | High H with ≤1 article in 30d, or H dominates immediate sort vs core |
| `single_order_driven` | One orderbook signal, weak core, no filings |
| `stale` | Legacy stale + stricter price/fundamentals age |

## Menu

1. **Stock automation → Audit last 100 recommendations (v2 filters)**  
   Writes Tab 32 and stores summary in script property `LAST_RECOMMENDATION_AUDIT_JSON`.

2. **Audit Tab 11 recommendations** — live engine review (RECOMMENDATION REVIEW sheet).

## Workflow

1. Rebuild scoring pipeline (Tab 10 fresh).
2. **Sync recommendations (Tab 11)**.
3. Run **Audit last 100** — check `v2_pass` vs `legacy_pass` columns.
4. If rejection rate is too high, tune thresholds in `RecommendationAuditEngine.gs` (not legacy constants).

## Sort penalties

Candidates that fail FP checks get `recommendationFalsePositiveSortMultiplier_` **0.42** (blocked at pick). Borderline weak conviction: **0.65**. Immediate list dampens news term when `isSingleNewsDrivenRanking_`.

## Deploy

Paste updated `.gs` files into the Apps Script project, run **Setup tabs** (adds Tab 32), rebuild, sync Tab 11, redeploy Web App if API consumers need audit metadata.
