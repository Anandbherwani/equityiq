# Web App — `Script function not found: doGet`

**Cause:** The `/exec` URL points to an **old deployment** (version 1) created when the project only had `Code.gs` / `runSystemAudit.gs` stubs — **before** `doGet` and `WebAppApi.gs` were pushed.

**Fix:** Use the **new** deployment URL (version 3, 28 files).

---

## Working URL (Indian Equity Intelligence)

```text
https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec
```

**Vercel / `.env.local`:**

```bash
NEXT_PUBLIC_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbyoeWIuPl-G-DLeQD_hMR1c6HBStPmRJrlUffyMjSt4rtnzqOLhQ_Op9fB5TeCheYxeSw/exec
```

---

## Verified (2026-06-04)

| Test | Result |
|------|--------|
| `?action=health` | `ok: true`, sheet **Indian Equity Intelligence** |
| `tab1Rows` | 2378 |
| `tab10Rows` | 2376 |
| `tab11Rows` | 50 |

---

## Do not use (broken)

| Deployment | Issue |
|------------|--------|
| `AKfycbzC-YXhhdW92-5yuItuAaS9gT_RZO963ABc6c3suUsAHNw2XFsqth1zjaGJ67fscVXpgw` | Version **1** — no `doGet` in deployed snapshot |

In Apps Script: **Deploy → Manage deployments** → archive old Web App → use **Web App with doGet + WebAppApi v28** (@3).

---

## Script ID

`1jgkxO-BLow1rf75yDCchjoQ-PHY0wOpNK50B5edBLpUOYG9xk93YfMNT`

`doGet` lives in **Code.gs** (delegates to `handleEquityIQApiGet_` in **WebAppApi.gs**).
