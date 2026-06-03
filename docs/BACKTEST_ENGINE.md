# Backtest Engine v4

**Version:** 4.0  
**Apps Script:** `backend/automation/BacktestEngine.gs`  
**Sheets:** Tab **22** (snapshots) · **23** (results) · **31** (dashboard) · **36** (validation)  
**API:** `?action=backtest`  
**Benchmarks:** Nifty 50 + sector index (per pick `sector_key`)

Evaluates **historical Tab 11 recommendations** captured in Tab 22. **No synthetic cohorts** and **no current-Tab-11 fallback** — only real snapshot history.

---

## v4 changes (from v3)

| Feature | v4 |
|---------|-----|
| **Paired alpha** | Per trade: stock return − Nifty (and − sector) on **identical** snapshot entry/exit dates |
| **Validation report** | Tab 36 + API `validation` with PASS / PARTIAL / FAIL per list & horizon |
| **Recommendation trades** | Dedicated `evaluateRecommendationSnapshotTrades_()` (not shared with benchmark path) |
| **Synthetic exclusion** | Rows with `source` containing `synthetic` ignored; count in report |

---

## Tracked lists (six Tab 11 lists)

From `RECOMMENDATION_LIST_DEFS` — each list × 4 horizons × 3 benchmarks = **72** result rows when all lists are ready.

---

## Horizons

| Label | Days |
|-------|------|
| 1 Month | 30 |
| 3 Month | 90 |
| 6 Month | 180 |
| 12 Month | 365 |

Trades skipped if `snapshot_date + horizon` is still in the future.

---

## Benchmarks

| `benchmark` | Method |
|-------------|--------|
| **recommendations** | Tab 22 pick: logged `entry_price` or GOOGLEFINANCE close on snapshot date → exit |
| **nifty** | Nifty 50 over same dates per snapshot row |
| **sector** | Sector index proxy (`SECTOR_BENCHMARK_SYMBOLS_`) for pick’s `sector_key` |

**Alpha (recommendations):**

- Tab 23 `alpha_pct` = mean **paired** alpha vs Nifty per trade  
- API `comparison.alpha_vs_sector_avg_pct` = mean pick return − sector benchmark  

---

## Metrics

| Metric | Definition |
|--------|------------|
| **Hit rate %** | % trades with positive return |
| **Average return %** | Mean trade return |
| **Alpha %** | Mean paired alpha vs Nifty (v4) |
| **Sharpe** | `(mean / stdev) × √12`, rf = 0 |
| **Sortino** | `(mean / downside stdev) × √12` |
| **Max drawdown %** | Peak-to-trough on compounded trade equity |

---

## Snapshot requirements

- **≥ 5** Tab 22 rows per list (`BACKTEST_MIN_SNAPSHOT_ROWS_`)  
- **≥ 3** completed trades per horizon for validation **PASS**  
- Daily: `snapshotAllBacktestLists_()` (8 AM + menu)  

---

## Workflow

1. Sync recommendations (Tab 11)  
2. Snapshot all lists → Tab 22 (daily, 30+ days recommended)  
3. **Run backtest engine** → Tab 23, 31, 36  
4. EquityIQ **/backtest** — dashboard + validation report  

---

## API

```json
{
  "engine_version": "4.0",
  "snapshot_only": true,
  "validation": {
    "overall_verdict": "PARTIAL",
    "summary_lines": ["..."],
    "lists": [{ "list_name": "...", "verdict": "PASS", "horizons": [] }]
  },
  "dashboard": { ... },
  "comparison": [ ... ]
}
```

---

## Docs

- [BACKTEST_VALIDATION_REPORT.md](./BACKTEST_VALIDATION_REPORT.md) — Tab 36 verdicts  
- [shared/scoring/BACKTEST.md](../shared/scoring/BACKTEST.md) — CSV schemas  
