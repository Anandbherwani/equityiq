# Theme Intelligence Engine v2

**Apps Script:** `ThemeIntelligenceEngine.gs` + `InvestmentThemes.gs`  
**Config:** `shared/config/investment-themes.json`  
**Version:** 2.0

---

## Themes (10)

| ID | Label |
|----|--------|
| `DEFENSE` | Defense |
| `RAILWAYS` | Railways |
| `POWER` | Power |
| `DATA_CENTERS` | Data Centers |
| `AI` | AI |
| `EMS` | EMS |
| `MANUFACTURING` | Manufacturing |
| `CHINA_PLUS_1` | China+1 |
| `RENEWABLES` | Renewables |
| `CAPITAL_GOODS` | Capital Goods |

Tags are inferred on **Tab 1 UNIVERSE** (`theme_tags`) from sector, keywords, and example symbols.

---

## Per-stock outputs

Every symbol with theme membership gets scores on **Tab 28** (one row per symbol × theme):

| Field | Meaning |
|-------|---------|
| **theme_exposure** | 0–100 — how strongly the name expresses that theme |
| **theme_strength** | 0–100 — blend of theme sector strength + stock quality/sector pillars |
| **theme_momentum** | 0–100 — blend of theme momentum + technical/catalyst/horizon |
| **stock_theme_conviction** | Geometric blend (not sum) of theme conviction + exposure + strength + momentum + opportunity rank |

**Tab 10** aggregates across memberships:

| Column | Field |
|--------|--------|
| 57 | `theme_conviction_score` — best stock×theme conviction |
| 58 | `primary_theme_id` |
| 61 | `theme_exposure` — JSON map `{DEFENSE:92,RAILWAYS:70,...}` |
| 62 | `theme_strength` — exposure-weighted average |
| 63 | `theme_momentum` — exposure-weighted average |

---

## Theme-level scores (Tab 27)

Per theme, five dimensions → **theme_conviction_score**:

| Dimension | Weight |
|-----------|--------|
| theme_strength | 25% |
| theme_momentum | 20% |
| government_support | 20% |
| capex_cycle | 20% |
| order_momentum | 15% |

Inputs: Tab 19 sector ranks, Tab 16 orders, Tab 3 LOA headlines, Tab 20 `THEME:*` macro rows.

---

## Tab 11 recommendation lists

After the six core Top-10 lists, **Sync recommendations** appends:

| List | Content |
|------|---------|
| **Top Themes** | Highest `theme_conviction_score` on Tab 27 |
| **Theme Winners** | Best stock per top theme (one winner per theme) |
| **Theme Conviction** | Top 10 symbols by Tab 10 `theme_conviction_score` |
| **Top 10 Theme Stocks** | Global best stock×theme convictions (deduped by symbol) |

Each stock row includes analyst narratives with theme exposure, strength, and momentum in catalyst/evidence.

---

## Recommendation engine integration

| Hook | Behavior |
|------|----------|
| `rebuildScoringPipeline` | Runs theme engine before `generateRecommendations_` |
| `appendThemeIntelligenceTab11Lists_` | Writes four theme lists to Tab 11 |
| `pickRecommendationCandidates_` | `theme_stocks` filter requires `themeConvictionScore ≥ 38`, `themeStrength ≥ 35` |
| `recommendationSortKey_` | `theme_stocks` uses conviction + strength + momentum + rank |
| `buildInstitutionalRecommendationNarrative_` | `theme_exposure` section on analyst notes |
| Government Beneficiaries | Boosted by `themeConvictionScore` / theme tags |

---

## API

```
GET ?action=theme_intelligence
```

Returns:

```json
{
  "ok": true,
  "intelligence": {
    "version": "2.0",
    "top_themes": [],
    "theme_winners": [],
    "theme_conviction": [],
    "top_theme_stocks": []
  }
}
```

---

## Operations

| Menu | Action |
|------|--------|
| **Investment themes → Apply theme tags** | Prerequisite — UNIVERSE `theme_tags` |
| **Investment themes → Run Theme Intelligence Engine** | Tab 27/28 + Tab 10 cols 57–58, 61–63 |
| **Preview Top 10 Themes / Stocks** | Alert: Top Themes, Theme Winners, Theme Conviction |
| **Sync recommendations (Tab 11)** | Includes theme lists |

---

## Deploy

1. Paste `ThemeIntelligenceEngine.gs`, `InvestmentThemes.gs`, updated `Code.gs`.
2. **Setup all sheet tabs** (Tab 10 now 64 columns; Tab 28 new headers).
3. **Apply theme tags to UNIVERSE**.
4. **Run Theme Intelligence Engine** → **Rebuild scoring pipeline** → **Sync recommendations**.

---

## Related

- [`INVESTMENT_THEMES.md`](INVESTMENT_THEMES.md)
- [`PEER_COMPARISON_ENGINE.md`](PEER_COMPARISON_ENGINE.md)
