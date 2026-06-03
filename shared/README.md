# Shared — contracts only (no runtime logic)

Non-executable artifacts shared across the sheet, Apps Script, and frontend.

| Path | Purpose |
|------|---------|
| `schemas/*.csv` | Tab column headers for Google Sheets setup |
| `scoring/CONVICTION_SCORE.md` | **Scoring Engine 2.0** — every point explained (canonical) |
| `scoring/DATA_QUALITY.md` | **Data Quality %** — missing, stale, completeness, source reliability |
| `scoring/SCORING.md` | Tab 10 workflow, helpers, pipelines |
| `api/webapp-v1.json` | Web App `doGet` request/response shapes |
| `templates/` | Sample CSV rows (e.g. universe) |

**Sector taxonomy:** [`shared/config/sector-taxonomy.json`](config/sector-taxonomy.json) + `SectorIntelligence.gs` (`canonicalSector_`). See [`docs/SECTOR_INTELLIGENCE_AUDIT.md`](../docs/SECTOR_INTELLIGENCE_AUDIT.md). EquityIQ `SECTOR_MEDIANS` is display-only — not used for sheet scoring.
