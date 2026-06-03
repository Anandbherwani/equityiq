# IPO Intelligence Engine — Complete

**Script:** `IpoIntelligenceEngine.gs` v1.0  
**Sheet:** Tab **38. IPO INTELLIGENCE**  
**Tab 11 list:** **IPO Intelligence**

## Status buckets

- Upcoming  
- Open  
- Recent  

(Stored in `status` column; operator or future NSE feed updates rows.)

## Verdicts

| Verdict | Rule of thumb |
|---------|----------------|
| **Strong Subscribe** | score ≥ 75, GMP ≥ 15%, subscription ≥ 3x |
| **Subscribe** | score ≥ 58, GMP ≥ 0 |
| **Watch** | score ≥ 40 |
| **Avoid** | below Watch thresholds |

## Integration

- `appendIpoIntelligenceToTab11_` in `generateRecommendations_`  
- Tab 37 category `ipo` via evidence JSON  
- **API:** `?action=ipo_intelligence`  
- Sample rows seeded when Tab 38 empty (replace with live IPO calendar)

## Operator workflow

1. **Setup all sheet tabs** (creates Tab 38)  
2. Paste live IPO rows or edit sample  
3. **Sync recommendations** — IPO list appears on Tab 11  
4. **Snapshot history** — track record includes IPO picks  
