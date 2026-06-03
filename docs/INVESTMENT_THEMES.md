# Investment Themes

Nine cross-sector themes for Indian equities — tagged on **UNIVERSE** `theme_tags`, tracked on **Tab 26**, and used in **Government Beneficiaries** / morning brief.

| Theme | Example names | Linked sectors |
|-------|---------------|----------------|
| **Defense** | BEL, HAL, BHEL | DEFENCE |
| **Railways** | IRCTC, IRCON, RVNL | INFRASTRUCTURE, INDUSTRIALS |
| **Power** | NTPC, POWERGRID, TATAPOWER | POWER |
| **AI** | PERSISTENT, COFORGE, TCS, INFY | IT SERVICES |
| **Data Centers** | NETWEB, SIFY | IT SERVICES, TELECOM, POWER |
| **EMS** | DIXON, AMBER, KAYNES | INDUSTRIALS, ELECTRICALS |
| **Manufacturing** | LT, BHEL, SIEMENS | INDUSTRIALS |
| **China+1** | DIXON, AMBER (PLI / supply chain) | INDUSTRIALS, TEXTILES |
| **Renewables** | ADANIGREEN, SUZLON, JSWENERGY | POWER |

**Config:** [`shared/config/investment-themes.json`](../shared/config/investment-themes.json)  
**Engine:** `backend/automation/InvestmentThemes.gs`

---

## Operations

| Menu | Action |
|------|--------|
| **Investment themes → Apply theme tags to UNIVERSE** | Infers tags from sector, company name, example symbol lists |
| **Preview themes** | Top 5 names per theme by opportunity rank |
| **Seed Tab 20 THEME:* rows** | Macro beneficiaries placeholders |

**Rebuild pipeline** auto-runs theme tagging after UNIVERSE sync.

---

## Recommendations

**Top 10 Government Beneficiaries** uses `buildThematicBeneficiarySet_()`:

- Tab 20 beneficiaries  
- Any symbol with a theme tag (Defense, Railways, …)  
- Sector keys linked to themes  

---

## Morning brief

Section **`investment_themes`** — count and top symbols per theme (alongside **government_themes**).

---

## Deploy

Paste **`InvestmentThemes.gs`** → **Setup all sheet tabs** → **Apply theme tags** → **Rebuild pipeline**.
