# Git Status Report

**Generated:** 4 June 2026  
**Repository:** `/Users/anandbherwani/Documents/Stock automation`  
**Branch:** `main`  
**Context:** Initial repository commit (no prior history)

---

## Summary

| Category | Count |
|----------|------:|
| **Modified** | 0 |
| **New (staged)** | 271 |
| **Deleted** | 0 |
| **Untracked (remaining)** | 0 |

---

## Repository setup notes

- **Initialized** new git repository at project root (`git init`).
- **Removed** nested `frontend/.git` so the monorepo includes all frontend source in one commit (was an embedded submodule/gitlink).
- **Added** root `.gitignore` (excludes `node_modules`, `.next`, `.env*`, `.cursor`, etc.).

---

## Modified files

*None.*

---

## New files (271)

### By top-level area

| Directory | Files |
|-----------|------:|
| `frontend/` | 105 |
| `docs/` | 65 |
| `backend/` | 56 |
| `shared/` | 36 |
| `scripts/` | 2 |
| `sheets/` | 1 |
| `prompts/` | 1 |
| `n8n/` | 1 |
| `dashboard/` | 1 |
| `config/` | 1 |
| `README.md` | 1 |
| `.gitignore` | 1 |

### Highlights (new)

**Backend / automation**

- `backend/automation/RecommendationHistoryEngine.gs`
- `backend/automation/WebAppApi.gs`
- `backend/automation/DailyAutomation.gs`
- `backend/automation/DataCoverageEngine.gs`
- `backend/automation/SmeAlphaEngine.gs`
- `backend/automation/IpoIntelligenceEngine.gs`
- Plus scoring, backtest, portfolio, morning brief, and related engines

**Frontend**

- `frontend/src/app/` — dashboard, recommendations, history, validation, stock, settings, etc.
- `frontend/src/lib/server-preview.ts`, `sheets-api.ts`, `demo-data.ts`
- `frontend/src/components/` — terminal cards, validation panels, search

**Docs**

- `docs/BUILD_VERIFICATION_REPORT.md`
- `docs/FINAL_DEPLOYMENT_AUDIT.md`
- `docs/DEPLOYMENT_FIX_REPORT.md`
- `docs/RECOMMENDATION_HISTORY.md`
- `docs/UI_POLISH_REPORT.md`
- Plus architecture, audit, and engine completion reports

**Shared**

- `shared/schemas/37-recommendation-history.csv`
- `shared/api/webapp-v1.json`
- Scoring and schema CSV headers

**Scripts**

- `scripts/test_recommendation_history_scorecard.py`
- `scripts/generate_backtest_v4_status.py`

---

## Deleted files

*None.*

---

## Ignored (not committed)

Per `.gitignore`:

- `frontend/node_modules/`
- `frontend/.next/`
- `frontend/.env*` (except `.env.local.example` if present)
- `.cursor/`
- `.DS_Store`

---

## Post-commit reference

See `docs/COMMIT_REPORT.md` for commit hash and tag recommendation.
