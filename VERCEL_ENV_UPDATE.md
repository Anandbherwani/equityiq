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

EXEC_URL='https://script.google.com/macros/s/AKfycbyNpQDZMj0vuWjWPH7dBs0hmn0pDBOB8uwUQLQmUPNEg4SaRpzP/exec'

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
| **Deployment ID** | `dpl_6Vz74t2bC5dpsDJdHFYMTZpN4wzd` |
| **Deployment URL** | https://equityiq-pxomjetmb-anandbherwani-6786s-projects.vercel.app |
| **Inspect** | https://vercel.com/anandbherwani-6786s-projects/equityiq/6Vz74t2bC5dpsDJdHFYMTZpN4wzd |
| **Aliased production** | https://equityiq-gamma.vercel.app |
| **Build** | Next.js 15.1.11 — success (~43s) |

## Verification

```bash
curl -sS "https://equityiq-gamma.vercel.app/api/sheets?action=health"
# → {"ok":true,"version":"1.0.0",...,"deployedUrl":"https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_.../exec",...}

curl -sS -o /dev/null -w "%{http_code}\n" "https://equityiq-gamma.vercel.app/"
# → 200
```

Live proxy health check **PASS** — production `/api/sheets` reaches the configured Apps Script Web App.

## Web App URL update (2026-06-05)

| Deployment | Exec URL | `?action=health` |
|------------|----------|------------------|
| **Latest (Apps Script UI)** | `AKfycbyNpQDZMj0vuWjWPH7dBs0hmn0pDBOB8uwUQLQmUPNEg4SaRpzP` | **404** at time of check — verify Deploy → Web app → **Anyone** |
| **Previous (working)** | `AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw` | **OK** (Indian Equity Intelligence) |

**EquityIQ Settings:** paste the latest `/exec` URL into **Sheets Web App URL** (or set `SHEETS_API_URL` on Vercel).

```bash
cd frontend
EXEC_URL='https://script.google.com/macros/s/AKfycbyNpQDZMj0vuWjWPH7dBs0hmn0pDBOB8uwUQLQmUPNEg4SaRpzP/exec'
curl -sSL "${EXEC_URL}?action=health" | head -c 300   # must return JSON before switching Vercel

vercel env rm SHEETS_API_URL production -y
vercel env add SHEETS_API_URL production --value "$EXEC_URL" -y
vercel --prod
```

## Optional follow-up

- Add `SHEETS_API_URL` to **Preview** if preview deployments need live data:  
  `vercel env add SHEETS_API_URL preview --value "$EXEC_URL" -y`
- Local dev: set `SHEETS_API_URL` or `NEXT_PUBLIC_SHEETS_API_URL` in `frontend/.env.local`
