# Build Verification Report

**Project:** EquityIQ frontend (`frontend/`)  
**Date:** 4 June 2026  
**Next.js:** 15.1.0  
**Node environment:** production build (`next build`)

---

## Commands executed

| Step | Command | Exit code | Result |
|------|---------|-----------|--------|
| 1 | `npm install` | 0 | 740 packages audited, up to date |
| 2 | `npm run lint` | 0 | No ESLint warnings or errors |
| 3 | `npm run build` | 0 | Compiled successfully; types checked during build |
| 4 | `npx tsc --noEmit` (after build) | 0 | No TypeScript errors |

**Note:** `npx tsc --noEmit` **before** `npm run build` fails with missing `.next/types/**/*.ts` files (stale or absent generated types). CI should run **`npm run build` before `tsc --noEmit`**, or only rely on Next’s built-in type check (included in build).

---

## Verdict checklist

| Check | Status |
|-------|--------|
| Build succeeds | **PASS** |
| Static pages generated | **PASS** (16/16 generation steps; see routing note below) |
| Dynamic routes generated | **PASS** (`/stock/[symbol]`) |
| No TypeScript errors | **PASS** (via build + post-build `tsc`) |
| No lint errors | **PASS** |

---

## Build output summary

```
▲ Next.js 15.1.0
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (16/16)
ƒ  (Dynamic)  server-rendered on demand
```

**Errors:** none  
**Build warnings:** none from Next.js / ESLint / TypeScript

---

## Route inventory

**Total app routes in build table:** 14 pages + `/_not-found` = **15 listed routes**  
**Build generation count:** **16** (includes internal steps, e.g. favicon pipeline)

| Route | Render mode (build) | Page size | First Load JS |
|-------|---------------------|-----------|---------------|
| `/` | ƒ Dynamic | 3.45 kB | 123 kB |
| `/_not-found` | ƒ Dynamic | 989 B | 107 kB |
| `/alerts` | ƒ Dynamic | 3.15 kB | 132 kB |
| `/backtest` | ƒ Dynamic | 6.74 kB | 231 kB |
| `/brief` | ƒ Dynamic | 923 B | 110 kB |
| `/compare` | ƒ Dynamic | 4.28 kB | 136 kB |
| `/history` | ƒ Dynamic | 3.5 kB | 121 kB |
| `/peers` | ƒ Dynamic | 2.6 kB | 135 kB |
| `/portfolio` | ƒ Dynamic | 7.33 kB | 132 kB |
| `/recommendations` | ƒ Dynamic | 4.03 kB | 129 kB |
| `/settings` | ƒ Dynamic | 3.07 kB | 124 kB |
| `/stock/[symbol]` | ƒ Dynamic | 14.5 kB | 246 kB |
| `/validation` | ƒ Dynamic | 3.49 kB | 121 kB |
| `/watchlist` | ƒ Dynamic | 3.13 kB | 127 kB |

**Shared First Load JS:** 106 kB  
- `chunks/4bd1b696-…` — 53 kB  
- `chunks/517-…` — 50.7 kB  
- other shared — 1.92 kB  

**Largest route (First Load JS):** `/stock/[symbol]` — **246 kB**

### Static vs dynamic (manifest)

From `.next/routes-manifest.json`:

| Type | Count | Routes |
|------|-------|--------|
| **Dynamic route patterns** | 1 | `/stock/[symbol]` |
| **Static route entries** | 14 | `/`, `/alerts`, `/backtest`, `/brief`, `/compare`, `/history`, `/peers`, `/portfolio`, `/recommendations`, `/settings`, `/validation`, `/watchlist`, `/_not-found`, `/favicon.ico` |

All pages show **ƒ** in the build table because the root layout uses `cookies()` (theme/demo), so Next.js treats them as **server-rendered on demand** — expected for this app and compatible with Vercel.

---

## Build size (disk)

| Artifact | Size |
|----------|------|
| `.next/` (total) | **402 MB** (includes cache, server bundles, traces) |
| `.next/static/` | **1.7 MB** (client static assets) |

Vercel uploads the production output subset; local `.next` includes dev cache and is larger than deploy artifact.

---

## Warnings (non-blocking)

| Source | Detail |
|--------|--------|
| `npm install` | **2 vulnerabilities** (1 moderate, 1 critical) in dependency tree — `npm audit` suggests `npm audit fix`; not a build failure |
| `npm fund` | 238 packages request funding — informational |
| Standalone `tsc` | Fails if run **before** `next build` when `.next/types` is missing — ordering only |

No ESLint warnings. No Next.js compile warnings. No TypeScript errors during or after build.

---

## Errors

**None** in `npm install`, `npm run lint`, or `npm run build`.

---

## Vercel deployment notes

1. **Root directory:** set to `frontend` (or monorepo equivalent).
2. **Build command:** `npm run build`
3. **Install command:** `npm install`
4. **Output:** Next.js default (Framework Preset: Next.js)
5. **Environment (recommended):** `NEXT_PUBLIC_SHEETS_API_URL` = deployed Google Apps Script Web App URL  
   - Optional for deploy; app serves preview data without it (see `DEPLOYMENT_FIX_REPORT.md`).

---

## READY_FOR_VERCEL

```
READY_FOR_VERCEL = YES
```

**Rationale:** `npm install`, `npm run lint`, and `npm run build` all succeed with zero compile/lint/type errors. All routes are generated; dynamic segment `/stock/[symbol]` is present. Remaining items are dependency audit advisories and production env configuration, not build blockers.
