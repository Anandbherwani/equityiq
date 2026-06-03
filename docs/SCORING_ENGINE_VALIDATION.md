# Scoring Engine Validation Report

**Report type:** Forensic audit of **actual Tab 10 scoring output**  
**Target engine:** 2.1 (`QualityPillarScoring.gs`, `SCORING_ENGINE_VERSION = '2.1'`)  
**Universe size:** 2,376 rows on Tab **10. SCORING MODEL**

---

## Data provenance (read this first)

| Source | What it contains | Engine state |
|--------|------------------|--------------|
| **A — Archived live snapshot** | M distribution + top 20 symbols + tab row counts | **2026-06-03 20:06 IST**, from Apps Script execution log + `LAST_SYSTEM_AUDIT_JSON` embedded in project transcript. **Not Engine 2.1** — audit sample columns still use **v1 labels** (`E_business_moat` on col index 4 = growth in 2.1). Tab **6 = 0 rows**, Tab **4 = 0**, Tab **2 = 50**. |
| **B — Engine 2.1 full forensic** | All metrics below including **median/avg M** and **C–K pillar table** | **Requires you to run** in the Sheet: **Stock Tracker → Run Scoring Engine 2.1 validation** (after paste `ScoringEngineValidation.gs` + `QualityPillarScoring.gs` + **Rebuild scoring pipeline**). |

This file documents **(A)** with verified numbers. Section **(B)** is a template filled by `backend/scripts/generate_scoring_validation_md.py` once you export JSON.

**This environment cannot open your Google Sheet.** Pillar non-zero counts for all 2,376 symbols are **not** in the archived audit JSON.

---

## (A) Verified conviction distribution — 2,376 rows

Captured from Apps Script log `AUDIT conviction distribution` on **2026-06-03 20:06:13 IST** (spreadsheet: *Indian Equity Intelligence*).

| # | Metric | Value | Notes |
|---|--------|------:|-------|
| 1 | Count M > 0 | **49** | 2.06% of universe |
| 2 | Count M > 10 | **17** | |
| 3 | Count M > 20 | **5** | |
| 4 | Count M > 40 | **5** | |
| 5 | Count M > 60 | **0** | Not logged that day; max M = 51 ⇒ **0** |
| 6 | Maximum M | **51** | Symbol **BEL** |
| 7 | Median M | **Not captured** | Run §B validation |
| 8 | Average M | **Not captured** | Run §B validation |

**Stale M:** Not in log; sample audit showed **RELIANCE/TCS M=45 with all scored pillars 0** → stale formula/value (fixed in repo via `reconcileConvictionColumn_` + rebuild).

### Top 20 symbols by M (archived snapshot)

| Rank | Symbol | M |
|-----:|--------|--:|
| 1 | BEL | 51 |
| 2 | HDFCBANK | 45 |
| 3 | INFY | 45 |
| 4 | RELIANCE | 45 |
| 5 | TCS | 45 |
| 6 | ACE | 17 |
| 7 | ACC | 14 |
| 8 | AKI | 14 |
| 9 | BI | 14 |
| 10 | DEN | 14 |
| 11 | ITI | 14 |
| 12 | LT | 14 |
| 13 | TI | 14 |
| 14 | FEL | 12 |
| 15 | GLOBAL | 12 |
| 16 | INA | 12 |
| 17 | PAR | 12 |
| 18 | CTE | 9 |
| 19 | DOLLAR | 9 |
| 20 | FOCUS | 9 |

### Supporting tab row counts (same audit)

| Tab | Data rows | Impact on scoring |
|-----|----------:|-------------------|
| 10 SCORING MODEL | 2,376 | Universe synced |
| 6 FUNDAMENTALS | **0** | C, D, E, F cannot populate from Screener |
| 2 PRICE & TECHNICALS | **50** | I only for ~50 symbols |
| 4 BULK DEALS | **0** | J institutional empty |
| 7 NEWS FLOW | 216 | Weak H unless symbol-tagged |
| 15–18 events | 0–1 each | Helpers N–R mostly 0 |
| 19 SECTOR STRENGTH | 4 | G limited; UNIVERSE sector blank → poor join |

---

## (A) Pillar forensic — limited evidence only

Full pillar statistics for **all 2,376 rows** were **not** in the June 3 audit. Below: **verified sample rows** (4 symbols) using **audit column labels at that time** (v1/v2 transition), plus **structural** conclusions from tab counts.

### Sample symbol pillar values (audit stage C only)

| Symbol | C | D | E | F | G | H | I | J | K | L | M |
|--------|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| BEL | 4 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **51** |
| HAL | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **3** |
| RELIANCE | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **45** (stale) |
| TCS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **45** (stale) |

*In Engine 2.1, columns are **C fundamentals (15)**, **K business_moat (10)**, **D valuation**, **F financial strength**, etc. — see `shared/scoring/CONVICTION_SCORE.md`.*

### Structural findings (archived sheet — not guessed)

| Pillar (2.1) | Non-zero count | Average | Missing | Confidence | Evidence |
|--------------|---------------:|--------:|--------:|------------|----------|
| **C** Fundamentals | **~49** (≤ M>0) | — | **~2327** | — | Tab 6 empty; only rows with news/auto or stale M |
| **D** Valuation | **Low** | — | **~2327** | — | Tab 6 empty |
| **E** Growth | **0** (samples) | — | **2376** | — | Tab 6 empty |
| **F** Financial Strength | **0** (samples) | — | **2376** | — | Tab 6 empty |
| **G** Sector Strength | **Very low** | — | **~2372** | — | Tab 19 = 4 rows; UNIVERSE sector empty |
| **H** News & Events | **Sparse** | — | **Most** | — | Tab 7 exists; few symbol links |
| **I** Price Momentum | **≤50** | — | **~2326** | — | Tab 2 = 50 rows only |
| **J** Institutional Flow | **0** (samples) | — | **2376** | — | Tab 4 empty |
| **K** Business Moat | **N/A** | — | **2376** | — | Column not populated pre-2.1 |

### Diagnosis (archived snapshot)

| Question | Finding |
|----------|---------|
| **Weak pillars** | **E, F, D, G, J, K** — Tab 6/4 empty; sector join broken; price on 50 symbols only |
| **Dominant contributors** | **H + legacy auto C/D** on a handful of symbols (e.g. BEL); **stale M** inflated RELIANCE/TCS/HDFCBANK/INFY |
| **Never contribute** | **E, F, J** at sample level; **K** not implemented yet |

**Verdict (archived):** Engine **did not** deliver 2.1-style universe coverage. **2.06%** of symbols with M > 0 is a **data starvation** result, not a 2.1 logic result.

---

## (B) Engine 2.1 validation — run in Sheet (required)

After deploying:

1. `ScoringEngineValidation.gs`, `QualityPillarScoring.gs`, updated `Code.gs`
2. **Rebuild scoring pipeline from UNIVERSE**
3. **Stock Tracker → Run Scoring Engine 2.1 validation**

Then either:

- Read tab **`SCORING VALIDATION`**, or  
- Copy Script property **`SCORING_ENGINE_VALIDATION_JSON`**, save as `data/scoring_validation.json`, run:

```bash
python3 backend/scripts/generate_scoring_validation_md.py data/scoring_validation.json
```

That regenerates this document with **complete** median/avg M and **C–K** tables (non-zero count, average, missing, confidence per pillar).

### Expected shift after 2.1 + rebuild (hypothesis — verify with §B)

| Metric | Archived (A) | Expected after 2.1 rebuild |
|--------|----------------|----------------------------|
| M > 0 | 49 (2%) | **Majority** of 2,376 (universe fallbacks on C,K,D,F,I,J) |
| Median M | — | **> 0** (often 8–15 without Tab 6) |
| K Business Moat | 0 | **Non-zero** on most rows (fallback 2–6) |
| Stale M | Present | **0** after reconcile |

---

## (B) Placeholder — paste post-validation JSON below

*After you run §B, replace this section by re-running the Python script or paste JSON summary here.*

```json
{
  "status": "PENDING",
  "instruction": "Run runScoringEngineForensicValidation in Apps Script, then generate_scoring_validation_md.py"
}
```

---

## Files

| File | Purpose |
|------|---------|
| `backend/automation/ScoringEngineValidation.gs` | Full Tab 10 forensic scan |
| `backend/scripts/generate_scoring_validation_md.py` | JSON → this markdown |
| `shared/scoring/QUALITY_PILLARS.md` | 2.1 pillar formulas |

---

## Summary

| Item | Status |
|------|--------|
| M distribution (8 metrics) | **Partial** — 6/8 from archived log; median/avg need §B |
| Pillar table (9 pillars × 4 metrics) | **Blocked** until §B run on live 2.1 Tab 10 |
| Engine 2.1 validated? | **No** — archived data is **pre-2.1**; run menu validation after rebuild |

**Next step:** Rebuild pipeline → **Run Scoring Engine 2.1 validation** → regenerate this file from JSON.
