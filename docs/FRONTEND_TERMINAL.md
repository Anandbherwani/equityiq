# Indian Stock Intelligence — Frontend

Production UI for non-technical investors. **All conviction, risk, and analyst content comes from the Google Sheets research engine** via the Apps Script Web App API — the frontend never recomputes scores.

## Stack

- **Next.js 15** (App Router) — builds to optimized HTML/JS/CSS
- Tailwind + shadcn/ui — Bloomberg-style dark terminal
- Recharts — market and metric charts

## Run locally

```bash
cd frontend
cp .env.local.example .env.local   # optional: NEXT_PUBLIC_SHEETS_API_URL
npm install
npm run dev
```

Open http://localhost:3000

**No API yet?** Settings → **Enable demo mode** to explore with sample data.

## Production build

```bash
npm run build
npm start
```

Deploy to Vercel or any Node host. Set `NEXT_PUBLIC_SHEETS_API_URL` to your deployed Web App `/exec` URL.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Home — market overview, top picks preview, quick search |
| `/recommendations` | Six conviction lists with full analyst notes |
| `/stock/[symbol]` | Company terminal — fundamentals, valuation, technicals, peers, news, research note |
| `/compare` | Side-by-side up to 3 symbols |
| `/peers` | Sector peer comparison for one symbol |
| `/watchlist` | Personal buckets (browser storage) |
| `/portfolio` | Holdings + model portfolio from API |
| `/alerts` | Risk/data flags on current recommendations |
| `/backtest` | Recommendation performance vs Nifty & sector |
| `/settings` | API URL + demo mode |

## Features

- **Search-first** — global search with recent history
- **Export** — text, JSON, print on compare and recommendations
- **Loading skeletons** and **error states**
- **Demo mode** — no spreadsheet connection required for UX review
- **No sheet jargon** — user-facing labels only

## API

See `shared/api/webapp-v1.json` and `backend/automation/WebAppApi.gs`.
