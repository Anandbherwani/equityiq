# Sector Intelligence Audit

**Version:** 1.0  
**Apps Script:** `backend/automation/SectorIntelligence.gs`  
**Config:** [`shared/config/sector-taxonomy.json`](../shared/config/sector-taxonomy.json)  
**Goal:** **100%** Tab 1 symbol → Tab 19 sector join success

---

## Canonical taxonomy

25 canonical sectors (NSE-style buckets), e.g. `IT SERVICES`, `BFSI`, `PHARMACEUTICALS`, `OIL & GAS`, `DEFENCE`, …

All raw labels normalize through `canonicalSector_(raw)` (alias map + substring match + fallback `MISCELLANEOUS`).

### IT cluster (example)

These labels all map to **`IT SERVICES`**:

| Raw label |
|-----------|
| IT |
| Information Technology |
| Technology Services |
| Technology |
| Software |
| Computer Software |
| IT & Software |

---

## Tabs in scope

| Tab | Role | Sector field |
|-----|------|--------------|
| **1. UNIVERSE** | Every EQ symbol | Column `sector` (D) |
| **19. SECTOR STRENGTH** | Sector ranks & scores | Column `sector` (B) |
| **20. MACRO BENEFICIARIES** | Macro → symbols/sectors | `beneficiaries`, `losers` (comma/pipe tokens) |

Join path for scoring:

```
Tab 1 sector → canonicalSector_() → sectorKey
                    ↓
Tab 19 sector (normalized) → buildSectorStrengthLookup_()[sectorKey]
                    ↓
Tab 10 column G (sector_strength) + helper R (sector_strength_rank)
```

Tab 20 tokens resolve to **symbol** (UNIVERSE) or **canonical sector** present in Tab 19 lookup.

---

## Metrics reported

| Metric | Definition |
|--------|------------|
| **Sector coverage %** | Share of Tab 1 symbols with a non-empty raw `sector` column |
| **Canonical %** | Share with resolved canonical sector (non-empty after `canonicalSector_`) |
| **Sector join rate %** | Share of Tab 1 symbols whose `sectorKey` exists in latest-week Tab 19 lookup |
| **Tab 20 join rate %** | Share of beneficiary/loser tokens that match a symbol or Tab 19 sector |
| **Missing sectors** | Symbols with empty sector or no Tab 19 row for their canonical key |
| **Duplicate sectors** | Multiple **raw** labels collapsing to one canonical (informational — expected after normalization) |
| **Tab 19 duplicates** | Multiple raw sector strings on Tab 19 mapping to same canonical (repair merges text) |
| **Unmapped Tab 19** | Raw Tab 19 labels that fell through to `MISCELLANEOUS` unexpectedly |
| **Unmapped Tab 20** | Tokens that neither match UNIVERSE nor Tab 19 sector keys |

**Pass criteria (audit `pass: true`):**

- `sector_join_rate_pct` ≥ **100**
- `sector_coverage_pct` ≥ **100**

---

## Menu actions

| Menu | Function |
|------|----------|
| **Audit sector mapping** | `auditSectorMapping` → sheet **SECTOR AUDIT** + script property `LAST_SECTOR_INTELLIGENCE_AUDIT_JSON` |
| **Repair sector mapping (Tab 1/19/20)** | `repairSectorMapping` — rewrites sectors to canonical, re-runs audit |

### Repair behavior

1. **Tab 1** — column `sector` → canonical label (e.g. `Information Technology` → `IT SERVICES`).  
2. **Tab 19** — column `sector` → canonical (dedupe text variants).  
3. **Tab 20** — each token in `beneficiaries` / `losers` normalized (symbols unchanged, sectors canonicalized).

After repair: **Rebuild scoring pipeline** so Tab 10 sector strength picks up Tab 19 joins.

---

## SECTOR AUDIT sheet

Written on each audit run:

| Row | Content |
|-----|---------|
| Summary metrics | coverage %, join rate %, tab counts |
| `missing_or_unjoined_symbols` | Up to 50 symbols (or `SYM:no_tab19_CANON`) |

---

## Achieving 100% join rate

1. **UNIVERSE** — every row must have sector filled (Screener import or manual).  
2. **Repair sector mapping** — align Tab 1/19/20 wording to taxonomy.  
3. **Tab 19** — at least one row per canonical sector used in UNIVERSE (latest `week_ending` wins in lookup).  
   - Run sector strength pipeline / paste Section 12 output with **canonical** sector names only.  
4. **Audit sector mapping** — confirm `sector_join_rate_pct` = 100.  
5. **Rebuild scoring pipeline** — refresh Tab 10 `sector_strength` and rank column R.

### If join rate &lt; 100%

| Symptom | Fix |
|---------|-----|
| `SYM:no_tab19_IT SERVICES` | Add Tab 19 row for `IT SERVICES` (current week) |
| Empty sector on Tab 1 | Fill from Screener sector column on import |
| Tab 19 uses `IT` not `IT SERVICES` | Run **Repair sector mapping** |
| Tab 20 token `Technology` | Repair normalizes to `IT SERVICES`; ensure Tab 19 has that sector |

---

## API / code reference

| Function | Purpose |
|----------|---------|
| `canonicalSector_(raw)` | Single normalization entry point |
| `normalizeSectorName_` / `normalizeSectorKey_` | Delegates to `canonicalSector_` in `Code.gs` |
| `buildSectorStrengthLookup_(tab19rows)` | Latest week → `{ sectorKey: { rank, narrative, … } }` |
| `resolveSectorStrengthForSymbol_(sym, universe, lookup)` | Tab 10 sector strength suggestion |
| `buildSectorIntelligenceAudit_(ss)` | Full JSON report |

---

## Example audit summary

```
Tab 1 coverage: 100%
Tab 1 → Tab 19 join rate: 97.2% (goal 100%)
Missing: TCS:no_tab19_IT SERVICES  (→ add Tab 19 row)
Duplicate raw groups: 3 (IT, Information Technology → IT SERVICES) — OK after repair
```

---

## Related docs

- [`docs/FULL_SYSTEM_AUDIT.md`](FULL_SYSTEM_AUDIT.md) — system-wide audit  
- [`docs/DATA_QUALITY_ENGINE.md`](DATA_QUALITY_ENGINE.md) — `sector_mapping` dimension (10%)  
- [`shared/scoring/DATA_QUALITY.md`](../shared/scoring/DATA_QUALITY.md) — `TAB6_SECTOR_NORM`, `UNIVERSE_SECTOR`  
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — sector taxonomy in scoring engine
