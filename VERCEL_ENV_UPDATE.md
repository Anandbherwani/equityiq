# Vercel production env update — 2026-06-05

## Mental model (Apps Script first)

| Use | URL |
|-----|-----|
| **App entry (bookmark in browser)** | @5 exec — https://script.google.com/macros/s/AKfycbzk31spEt4nFa1e112yloJkuiZRvSpR26hY0iHqANFeL2iylfToFIkdeuEX6rbMqZEtuQ/exec |
| **JSON API (same deployment)** | Same `/exec` + `?action=health`, `?action=top10`, `?action=symbol&symbol=…`, etc. |
| **Vercel dashboard (optional)** | https://equityiq-gamma.vercel.app — proxies to `SHEETS_API_URL` via `/api/sheets?action=…` |

Bare `/exec` (no query) serves an **HTML landing page**. API clients and Vercel must call with an explicit `?action=`.

**Production status:** OK — Web App **@8** (`Anyone`), `SHEETS_API_URL` + gamma proxy verified 2026-06-05.

## Project

| Field | Value |
|-------|--------|
| **Project** | `equityiq` (`anandbherwani-6786s-projects/equityiq`) |
| **Working directory** | `frontend/` (`.vercel/project.json` linked here) |
| **Production alias** | https://equityiq-gamma.vercel.app |
| **Vercel account** | `anandbherwani-6786` |

## Env var naming (codebase vs user request)

The frontend does **not** use `NEXT_PUBLIC_SCRIPT_URL`. Grep shows:

| Variable | Used in code |
|----------|----------------|
| `SHEETS_API_URL` | **Preferred** — server-only (`frontend/src/lib/api-url.ts`, `/api/sheets` proxy) |
| `NEXT_PUBLIC_SHEETS_API_URL` | Legacy public / SSR fallback |
| `NEXT_PUBLIC_SCRIPT_URL` | **Not referenced** |

Before this update, **Production** had only `NEXT_PUBLIC_SHEETS_API_URL` (encrypted). There was no `NEXT_PUBLIC_SCRIPT_URL` or `SHEETS_API_URL` on Vercel.

Per [AUTH_SCRIPT_API.md](AUTH_SCRIPT_API.md), production was migrated to **server-only** `SHEETS_API_URL` and the public legacy var was removed so the exec URL is not embedded in the client bundle.

## Commands run

```bash
cd frontend

# Listed production env (before)
vercel env ls production
# → NEXT_PUBLIC_SHEETS_API_URL only

EXEC_URL='https://script.google.com/macros/s/AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA/exec'

# Remove legacy public var (maps to user's "rm SCRIPT_URL" intent)
vercel env rm NEXT_PUBLIC_SHEETS_API_URL production -y

# Add server-only var (recommended production pattern)
vercel env add SHEETS_API_URL production --value "$EXEC_URL" -y

vercel env ls production
# → SHEETS_API_URL only

vercel --prod
```

**Not run:** `vercel env rm NEXT_PUBLIC_SCRIPT_URL` — variable never existed on this project.

## Final production environment variables

| Name | Environment | Notes |
|------|-------------|--------|
| `SHEETS_API_URL` | Production | Set to Apps Script `/exec` URL (encrypted) |
| ~~`NEXT_PUBLIC_SHEETS_API_URL`~~ | — | **Removed** |
| ~~`NEXT_PUBLIC_SCRIPT_URL`~~ | — | Never present |

## Deployment

| Field | Value |
|-------|--------|
| **Deployment ID** | `dpl_Aaua78c5xZK7wtVvzoyaua64DQrK` |
| **Deployment URL** | https://equityiq-9ebl8pjxe-anandbherwani-6786s-projects.vercel.app |
| **Inspect** | https://vercel.com/anandbherwani-6786s-projects/equityiq/Aaua78c5xZK7wtVvzoyaua64DQrK |
| **Aliased production** | https://equityiq-gamma.vercel.app |
| **Build** | Next.js 15.1.11 — success (~43s) |

## Verification

```bash
curl -sS "https://equityiq-gamma.vercel.app/api/sheets?action=health"
# → {"ok":true,...,"deployedUrl":"https://script.google.com/macros/s/AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA/exec",...}

curl -sS -o /dev/null -w "%{http_code}\n" "https://equityiq-gamma.vercel.app/"
# → 200
```

Live proxy health check **PASS** — production `/api/sheets` reaches the configured Apps Script Web App.

## Web App URL update (2026-06-05 — @8 production)

| Field | Value |
|-------|--------|
| **Clasp deployment** | **@8** — EquityIQ Web API v31 |
| **Deployment ID** | `AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA` |
| **Exec URL** | https://script.google.com/macros/s/AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA/exec |
| **`?action=health`** | **PASS** — HTTP 200, JSON `ok:true` |
| **`?action=top10`** | **PASS** — HTTP 200, JSON `ok:true`, `listCount:5` |
| **Vercel `SHEETS_API_URL`** | Updated to @8 exec URL (production) |
| **Vercel deploy** | `dpl_CQqQXSuERQ3SGCBiXWJrB9RJRLZh` — https://equityiq-gamma.vercel.app |
| **Proxy verify** | `curl equityiq-gamma.vercel.app/api/sheets?action=health` → JSON, `deployedUrl` matches @8 |

### clasp deployments map (2026-06-05)

| @N | Deployment ID | Description |
|----|---------------|-------------|
| HEAD | `AKfycbzlJ68erlXDCdGhwdaxQwYb7VuVSl41oFoMcRSQwB-Z` | Latest code (not a versioned Web App unless deployed) |
| @1 | `AKfycbzC-YXhhdW92-5yuItuAaS9gT_RZO963ABc6c3suUsAHNw2XFsqth1zjaGJ67fscVXpgw` | EquityIQ |
| @4 | `AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw` | Web API fast top10/symbol v29 (previous production) |
| @5 | `AKfycbzk31spEt4nFa1e112yloJkuiZRvSpR26hY0iHqANFeL2iylfToFIkdeuEX6rbMqZEtuQ` | (sign-in HTML if not Anyone) |
| @6 | `AKfycbwbDUlm6VfkahjLImRukFMMRvAHIubv-TP1QtyvX_6mC2dOZvmpE_mn5y5z8AKICPH8ug` | EquityIQ Web API pipeline_status v30 |
| @7 | `AKfycbyYCORjT2Yga38kus-_Kuz6GkyoncLTbms2fnuCCa5BF8GT5L1vHyCgqE6RVI3le9pndQ` | (sign-in HTML — redeploy Anyone) |
| **@8** | `AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA` | **EquityIQ Web API v31 — recommended production** |

**Recommended production URL:** @8 exec URL above.

## Web App URL update (2026-06-05)

| Deployment | Exec URL | `?action=health` |
|------------|----------|------------------|
| **@8 (clasp v31 — production)** | `AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA` | **OK** JSON — `SHEETS_API_URL` on Vercel (2026-06-05 deploy) |
| **@4** | `AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw` | **OK** JSON — previous production fallback |
| **@7 (UI)** | `AKfycbyYCORjT2Yga38kus-_Kuz6GkyoncLTbms2fnuCCa5BF8GT5L1vHyCgqE6RVI3le9pndQ` | **302→sign-in HTML** — Deploy → Web app → **Anyone** |
| **@5 (clasp)** | `AKfycbzk31spEt4nFa1e112yloJkuiZRvSpR26hY0iHqANFeL2iylfToFIkdeuEX6rbMqZEtuQ` | **200 HTML** (Google sign-in) — **Anyone** |
| Other UI deploy | `AKfycbyNpQDZMj0vuWjWPH7dBs0hmn0pDBOB8uwUQLQmUPNEg4SaRpzP` | Was **404** — verify deployment exists |

**EquityIQ Settings:** paste the latest `/exec` URL into **Sheets Web App URL** (or set `SHEETS_API_URL` on Vercel).

```bash
cd frontend
EXEC_URL='https://script.google.com/macros/s/AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA/exec'
curl -sSL "${EXEC_URL}?action=health" | head -c 300   # must return JSON before switching Vercel

vercel env rm SHEETS_API_URL production -y
vercel env add SHEETS_API_URL production --value "$EXEC_URL" -y
vercel --prod
```

## Optional follow-up

- Add `SHEETS_API_URL` to **Preview** if preview deployments need live data:  
  `vercel env add SHEETS_API_URL preview --value "$EXEC_URL" -y`
- Local dev: set `SHEETS_API_URL` or `NEXT_PUBLIC_SHEETS_API_URL` in `frontend/.env.local`

## A/B compare (2026-06-05)

Both deployments updated with `clasp push --force` then `clasp deploy -i …` (clasp version **@9**). Vercel `SHEETS_API_URL` unchanged (gamma stays on @8); compare manually.

| Deployment | Exec URL | Health (`?action=health`) |
|------------|----------|---------------------------|
| **@5** | https://script.google.com/macros/s/AKfycbzk31spEt4nFa1e112yloJkuiZRvSpR26hY0iHqANFeL2iylfToFIkdeuEX6rbMqZEtuQ/exec | **200** `application/json` — `ok:true` |
| **@8** | https://script.google.com/macros/s/AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA/exec | **200** `application/json` — `ok:true` |

```bash
# @5
curl -sSL 'https://script.google.com/macros/s/AKfycbzk31spEt4nFa1e112yloJkuiZRvSpR26hY0iHqANFeL2iylfToFIkdeuEX6rbMqZEtuQ/exec?action=health' | head -c 400

# @8 (current Vercel gamma)
curl -sSL 'https://script.google.com/macros/s/AKfycbzBJT3IMOulO-35ymJoedKsydceP4c7zu7KCoERGHCyifD2_E1Larac20Atg4WauLHAiA/exec?action=health' | head -c 400
```

If either returns **HTML** or a **Google sign-in** page, open Apps Script → **Deploy** → **Manage deployments** → that Web app → set **Who has access** to **Anyone**, then redeploy.
