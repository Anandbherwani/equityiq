# Data Ingestion v2 — Complete

**Script:** `DataIngestionEngineV2.gs` v2.0.0  
**Docs:** `docs/DATA_INGESTION.md` (if present) · Tab **33** coverage · Tab **34** history

## Automated datasets

| Dataset | Tab | v2 registry id |
|---------|-----|----------------|
| Fundamentals | 6 | `fundamentals`, `fundamentals_company` |
| Shareholding | 24 | `shareholding` |
| FII ownership | 24 + 6 | `fii_ownership` |
| DII ownership | 24 + 6 | `dii_ownership` |
| Mutual fund ownership | 24 | `mf_ownership` |
| Bulk deals | 4 | `bulk_deals` |
| Block deals | 4 | `block_deals` |
| Quarterly results | 6 | `quarterly_results` |
| Corporate actions | 3 | `corporate_actions` |

## Robustness (implemented)

- **Retry:** `INGESTION_V2_RETRY_MAX_` = 3, exponential backoff base 600ms  
- **Rate limit:** 400ms between NSE calls; `INGESTION_V2_MAX_API_CALLS_PER_RUN_` = 220  
- **Source health:** Last run JSON in `LAST_DATA_INGESTION_V2_JSON`; per-dataset errors in summary  
- **Coverage metrics:** `computeIngestionUniverseCoverage_()` → weighted % vs 80% target  
- **Rotation cursors:** Per-dataset symbol queues for multi-day universe fill  

## Operations

| Action | Menu |
|--------|------|
| Run pipeline | **Run data ingestion v2** |
| Coverage report | **View ingestion coverage** → Tab 33 |
| Last log | **View last ingestion v2 log** |

6 AM `dailyDataRefresh6am` calls v2 when `DATA_INGESTION_V2_ENABLED` is true (default after deploy).

## Sprint hardening

No duplicate v1/v2 rewrite — v2 is canonical. Pair with **DataCoverageEngine** and audit stage **H_dataIngestion** + **J_pillarCoverage** for end-to-end visibility.
