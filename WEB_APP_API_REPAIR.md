# Web App API Repair — `Script function not found: doGet`

**Date:** 2026-06-04  
**Error:** `Script function not found: doGet`  
**Root cause:** Deployed Apps Script project has **no `doGet` function** — typically **`WebAppApi.gs` was not pasted**, or deployment predates API files.

---

## 1. Where `doGet` lives (repository)

| File | Function | Role |
|------|----------|------|
| **`backend/automation/Code.gs`** | `doGet(e)` | **Web App entry** (required by Google) |
| **`backend/automation/WebAppApi.gs`** | `handleEquityIQApiGet_(e)` | JSON router (all actions) |

**Verified in repo:** Yes — both exist after this repair.

**Previous layout:** `doGet` existed **only** in `WebAppApi.gs`. If operators pasted `Code.gs` but skipped `WebAppApi.gs`, the project had **zero** `doGet` → exact error you saw.

---

## 2. Missing files / functions (checklist)

| Item | In repo? | In your Apps Script project? |
|------|:--------:|:----------------------------:|
| `Code.gs` | Yes | ☐ Must contain `function doGet` |
| `WebAppApi.gs` | Yes | ☐ Must contain `function handleEquityIQApiGet_` |
| `RecommendationHistoryEngine.gs` | Yes | ☐ Required for history/validation |
| `BacktestEngine.gs` | Yes | ☐ Required for backtest |
| `Code.gs` helpers (`getTop10Data_`, etc.) | In WebAppApi / Code | ☐ |

### Missing functions (if file absent)

| Function | File | Symptom |
|----------|------|---------|
| `doGet` | `Code.gs` | **`Script function not found: doGet`** |
| `handleEquityIQApiGet_` | `WebAppApi.gs` | `doGet` runs but JSON says `missing_file: WebAppApi.gs` |
| `getRecommendationHistoryData_` | `RecommendationHistoryEngine.gs` | `recommendation_history` error |
| `getBacktestResults_` | `BacktestEngine.gs` | `backtest` error |

---

## 3. Correct implementation

### A. `doGet` in `Code.gs` (entry — paste this file)

```javascript
function doGet(e) {
  if (typeof handleEquityIQApiGet_ === 'function') {
    return handleEquityIQApiGet_(e);
  }
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    error: 'EquityIQ API router missing. Paste WebAppApi.gs into this Apps Script project, Save, then create a new Web App deployment.',
    missing_file: 'WebAppApi.gs',
    missing_function: 'handleEquityIQApiGet_'
  })).setMimeType(ContentService.MimeType.JSON);
}
```

### B. Router in `WebAppApi.gs` → `handleEquityIQApiGet_(e)`

Full source: **`backend/automation/WebAppApi.gs`** (lines 13–105).

**Action routing (audited endpoints):**

| `?action=` | Aliases | Handler | Notes |
|------------|---------|---------|-------|
| *(none)* | — | HTML landing page | Browser entry — no `?action=` |
| `app` / `home` / `landing` | — | HTML landing page | Same as bare `/exec` |
| `health` | — | `getApiHealth_()` | Required for API probes (Vercel, curl) |
| `top10` | `watchlist` | `getTop10Data_()` | Tab 11 lists |
| `symbol` | **`stock`** | `getSymbolData_(symbol)` | Use `symbol` or `stock` query param |
| `macro` | **`market_summary`** | `getMacroData_()` | Tab 8 macro dashboard |
| `recommendation_history` | `rec_history` | `getRecommendationHistoryData_()` | Tab 37 |
| `recommendation_validation` | `rec_validation` | `getRecommendationValidationData_()` | Scorecards |
| `backtest` | — | `getBacktestResults_()` | Needs `BacktestEngine.gs` |

**Alias normalization (in router):**

```javascript
if (action === 'stock') action = 'symbol';
else if (action === 'market_summary') action = 'macro';
// symbol branch: e.parameter.symbol || e.parameter.stock
```

**Frontend mapping (EquityIQ Next.js):**

| Frontend | Apps Script action |
|----------|-------------------|
| `getTop10()` | `top10` |
| `getSymbol()` | `symbol` (not `stock`) |
| `getMacro()` | `macro` (not `market_summary`) |
| History / validation / backtest | same names |

Aliases `stock` and `market_summary` are for external/manual probes; both work on the Web App.

---

## 4. Deployment steps (fix in ~10 minutes)

### Step 1 — Paste files

1. Open Google Sheet → **Extensions → Apps Script**
2. For **each** file under `backend/automation/*.gs` (28 files), create or update a script file with the same name.
3. **Critical pair:**
   - `Code.gs` — includes **`doGet`**
   - `WebAppApi.gs` — includes **`handleEquityIQApiGet_`**
4. **File → Save** (or Ctrl/Cmd+S)

### Step 2 — New Web App deployment (required after code change)

Old deployments do **not** pick up new functions automatically.

1. **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. **Deploy** → copy **`/exec`** URL (not `/dev`)

### Step 3 — Verify endpoints

Replace `YOUR_EXEC_URL`:

```text
YOUR_EXEC_URL?action=health
YOUR_EXEC_URL?action=top10
YOUR_EXEC_URL?action=recommendation_history
YOUR_EXEC_URL?action=recommendation_validation
YOUR_EXEC_URL?action=market_summary
YOUR_EXEC_URL?action=stock&symbol=HAL
YOUR_EXEC_URL?action=backtest
```

Or:

```bash
export API_URL="YOUR_EXEC_URL"
python3 scripts/verify_live_api.py
```

**Pass:** JSON with `"ok": true` (backtest/history may be partial if sheet empty).

### Step 4 — Wire frontend

- Vercel / `frontend/.env.local`:  
  `NEXT_PUBLIC_SHEETS_API_URL=YOUR_EXEC_URL`
- Redeploy Vercel or restart `npm run dev`

### Step 5 — Menu sanity check

In the Sheet: **Stock Tracker → Show EquityIQ Web App URL** — should list endpoints and show deployed URL.

---

## 5. Why “function not found” happens

| Cause | Fix |
|-------|-----|
| `WebAppApi.gs` never pasted | Paste file + new deployment |
| `Code.gs` old copy without `doGet` | Re-paste `Code.gs` from repo + new deployment |
| Using `/dev` URL | Use production `/exec` from latest deployment |
| Wrong Apps Script project | Deploy from the project bound to your intelligence Sheet |
| Only updated code, not deployment | **New deployment** after every API change |

---

## 6. Included in deployment instructions?

| Doc | Mentions WebAppApi + doGet? |
|-----|---------------------------|
| `backend/automation/README.md` | **Updated** — explicit Code.gs + WebAppApi.gs |
| `backend/automation/WebAppApi.gs` header | Yes |
| `RELEASE_NOTES.md` | Yes (deploy Web App) |
| `LIVE_API_CHECKLIST.md` | Yes |
| `APPS_SCRIPT_DEPLOYMENT_AUDIT.md` | Yes |
| `docs/EQUITYIQ_SHEETS_BRIDGE.md` | Uses `symbol` / `macro` |

This repair doc is the canonical fix for the `doGet` error.

---

## 7. Status after repo fix

| Check | Status |
|-------|--------|
| `doGet` in repository (`Code.gs`) | **ADDED** |
| Router in repository (`WebAppApi.gs`) | **RENAMED** to `handleEquityIQApiGet_` |
| Aliases `stock`, `market_summary` | **ADDED** |
| Operator re-paste + redeploy | **REQUIRED** on your Sheet |

**Your live Web App will keep failing until you re-paste and create a new deployment.**
