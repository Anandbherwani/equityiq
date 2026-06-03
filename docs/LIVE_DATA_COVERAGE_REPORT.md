# Live Data Coverage Report

**Engine:** `DataCoverageEngine.gs` v1.0  
**Target:** **80%+** populated per scoring pillar (Tab 10)  
**API:** `?action=data_coverage`  
**UI:** `/validation` — Data pillar coverage table (no new page)

---

## Pillars scored

| Pillar | Tab 10 column |
|--------|----------------|
| Fundamentals | `fundamentals` |
| Valuation | `valuation` |
| Growth | `growth` |
| Financial Strength | `financial_strength` |
| Sector Strength | `sector_strength` |
| News | `news_events` |
| Momentum | `technical_momentum` |
| Institutional Flow | `institutional_flow` |
| Business Moat | `business_moat` (+ `moat_confidence_pct`) |

## Metrics per pillar

- **coverage_pct** — % rows with score &gt; 0  
- **stale_pct** — % rows with age &gt; 90d or stale flags  
- **null_pct** — % rows empty/zero  
- **confidence_pct** — mean DQ / moat confidence where applicable  
- **meets_target** — coverage ≥ 80%

## Ingestion overlay

Report includes `ingestion` block from `DataIngestionEngineV2` when deployed (fundamentals, shareholding, FII/DII/MF, deals, quarterly).

## How to refresh

1. **Rebuild scoring pipeline** — populate Tab 10 pillars  
2. **Run ingestion v2** — fill Tabs 4/6/24  
3. Menu: preview via Apps Script `previewDataCoverageReport`  
4. Frontend: open **Track record** with API URL set  

## Audit

Stage **J_pillarCoverage** in `runFullSystemAudit` lists pillars below target.

---

*Static repo note: Demo mode shows illustrative 78–90% pillar coverage. Live sheet values depend on Screener CSV + NSE ingestion cadence.*
