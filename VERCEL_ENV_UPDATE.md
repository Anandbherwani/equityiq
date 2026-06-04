# Vercel production env update — 2026-06-04

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
| **Deployment ID** | `dpl_5Ee45CuioCfThNnTByM78mdAEWrR` |
| **Deployment URL** | https://equityiq-6h3oameo2-anandbherwani-6786s-projects.vercel.app |
| **Inspect** | https://vercel.com/anandbherwani-6786s-projects/equityiq/5Ee45CuioCfThNnTByM78mdAEWrR |
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
