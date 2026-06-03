# Backtest v4 — Status Report

**Generated:** 2026-06-04 (local generator)
**Engine:** BacktestEngine.gs v4.0 · snapshot-only
**Data source:** **No Tab 22/23 data in repo** — export sheets or run Apps Script menu **Generate BACKTEST_V4 status (markdown)** after snapshots exist.

## Executive summary

| Field | Value |
|-------|-------|
| Overall validation verdict | **FAIL** |
| Total Tab 22 rows (tracked lists, non-synthetic) | **0** |
| Lists with ≥5 snapshots | **0** / 6 |
| Longest horizon to PASS (max across lists) | **366** calendar days (estimate) |

### Thresholds (v4)

- **5+** Tab 22 rows per list before horizons evaluate
- **3+** completed trades per horizon for **PASS**
- **30+** unique snapshot dates recommended for interpretable hit rates

### Days-to-meaningful (method)

Per list, estimated calendar days until PASS on the slowest horizon, using:

1. One trading day to reach min row count (daily Top 10 snapshot ≈10 rows/list).
2. `snapshot_date + horizon_days ≤ today` for mature trade counts.
3. Roadmap interpretability: 30 unique snapshot dates.
4. 12M horizon requires ~365 days from the **oldest** snapshot in the cohort.

Re-run after **Run backtest engine** for paired alpha from Google Finance (Tab 23).
Mature-trade counts here do not require price fetches.

---

## Per recommendation list

### Top 10 Immediate Opportunities

| Metric | Value |
|--------|-------|
| Tab 22 snapshot rows | **0** (min 5 required) |
| Earliest snapshot | — |
| Latest snapshot | — |
| Evaluation mode | `insufficient_snapshots` |

#### Completed trades by horizon

| Horizon | Mature trades (date window) | Tab 23 sample (if run) | Verdict |
|---------|---------------------------|------------------------|---------|
| 1 Month | 0 | — | **FAIL** |
| 3 Month | 0 | — | **FAIL** |
| 6 Month | 0 | — | **FAIL** |
| 12 Month | 0 | — | **FAIL** |

| List validation verdict | **FAIL** |
| Any horizon PASS? | No |
| Alpha vs Nifty (12M rec. row, Tab 23) | — |
| Alpha vs sector (12M, Tab 23) | — |
| Est. days to meaningful stats (this list) | **366** calendar days |

### Top 10 3-Month Opportunities

| Metric | Value |
|--------|-------|
| Tab 22 snapshot rows | **0** (min 5 required) |
| Earliest snapshot | — |
| Latest snapshot | — |
| Evaluation mode | `insufficient_snapshots` |

#### Completed trades by horizon

| Horizon | Mature trades (date window) | Tab 23 sample (if run) | Verdict |
|---------|---------------------------|------------------------|---------|
| 1 Month | 0 | — | **FAIL** |
| 3 Month | 0 | — | **FAIL** |
| 6 Month | 0 | — | **FAIL** |
| 12 Month | 0 | — | **FAIL** |

| List validation verdict | **FAIL** |
| Any horizon PASS? | No |
| Alpha vs Nifty (12M rec. row, Tab 23) | — |
| Alpha vs sector (12M, Tab 23) | — |
| Est. days to meaningful stats (this list) | **366** calendar days |

### Top 10 12-Month Compounders

| Metric | Value |
|--------|-------|
| Tab 22 snapshot rows | **0** (min 5 required) |
| Earliest snapshot | — |
| Latest snapshot | — |
| Evaluation mode | `insufficient_snapshots` |

#### Completed trades by horizon

| Horizon | Mature trades (date window) | Tab 23 sample (if run) | Verdict |
|---------|---------------------------|------------------------|---------|
| 1 Month | 0 | — | **FAIL** |
| 3 Month | 0 | — | **FAIL** |
| 6 Month | 0 | — | **FAIL** |
| 12 Month | 0 | — | **FAIL** |

| List validation verdict | **FAIL** |
| Any horizon PASS? | No |
| Alpha vs Nifty (12M rec. row, Tab 23) | — |
| Alpha vs sector (12M, Tab 23) | — |
| Est. days to meaningful stats (this list) | **366** calendar days |

### Top 10 Monopoly Businesses

| Metric | Value |
|--------|-------|
| Tab 22 snapshot rows | **0** (min 5 required) |
| Earliest snapshot | — |
| Latest snapshot | — |
| Evaluation mode | `insufficient_snapshots` |

#### Completed trades by horizon

| Horizon | Mature trades (date window) | Tab 23 sample (if run) | Verdict |
|---------|---------------------------|------------------------|---------|
| 1 Month | 0 | — | **FAIL** |
| 3 Month | 0 | — | **FAIL** |
| 6 Month | 0 | — | **FAIL** |
| 12 Month | 0 | — | **FAIL** |

| List validation verdict | **FAIL** |
| Any horizon PASS? | No |
| Alpha vs Nifty (12M rec. row, Tab 23) | — |
| Alpha vs sector (12M, Tab 23) | — |
| Est. days to meaningful stats (this list) | **366** calendar days |

### Top 10 Government Beneficiaries

| Metric | Value |
|--------|-------|
| Tab 22 snapshot rows | **0** (min 5 required) |
| Earliest snapshot | — |
| Latest snapshot | — |
| Evaluation mode | `insufficient_snapshots` |

#### Completed trades by horizon

| Horizon | Mature trades (date window) | Tab 23 sample (if run) | Verdict |
|---------|---------------------------|------------------------|---------|
| 1 Month | 0 | — | **FAIL** |
| 3 Month | 0 | — | **FAIL** |
| 6 Month | 0 | — | **FAIL** |
| 12 Month | 0 | — | **FAIL** |

| List validation verdict | **FAIL** |
| Any horizon PASS? | No |
| Alpha vs Nifty (12M rec. row, Tab 23) | — |
| Alpha vs sector (12M, Tab 23) | — |
| Est. days to meaningful stats (this list) | **366** calendar days |

### Top 10 Turnarounds

| Metric | Value |
|--------|-------|
| Tab 22 snapshot rows | **0** (min 5 required) |
| Earliest snapshot | — |
| Latest snapshot | — |
| Evaluation mode | `insufficient_snapshots` |

#### Completed trades by horizon

| Horizon | Mature trades (date window) | Tab 23 sample (if run) | Verdict |
|---------|---------------------------|------------------------|---------|
| 1 Month | 0 | — | **FAIL** |
| 3 Month | 0 | — | **FAIL** |
| 6 Month | 0 | — | **FAIL** |
| 12 Month | 0 | — | **FAIL** |

| List validation verdict | **FAIL** |
| Any horizon PASS? | No |
| Alpha vs Nifty (12M rec. row, Tab 23) | — |
| Alpha vs sector (12M, Tab 23) | — |
| Est. days to meaningful stats (this list) | **366** calendar days |

---

## Regenerate this file

**From spreadsheet (authoritative):**
Stock Tracker → Backtest (Phase 7) → **Generate BACKTEST_V4 status (markdown)**
(runs engine if needed; copies markdown to log).

**From CSV exports:**
```bash
python scripts/generate_backtest_v4_status.py
```

See [BACKTEST_ENGINE.md](./BACKTEST_ENGINE.md) · [BACKTEST_VALIDATION_REPORT.md](./BACKTEST_VALIDATION_REPORT.md).
