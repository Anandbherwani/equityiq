# Indian Stock Intelligence — Frontend

Next.js presentation layer for the Indian equity research platform. **Scoring and analyst notes live in Google Sheets**; this app reads the deployed Web App API only.

## Quick start

```bash
npm install
npm run dev
```

Enable **Demo mode** under Settings if you do not have an API URL yet.

## Environment

```bash
# .env.local
NEXT_PUBLIC_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT/exec
```

## Documentation

See [docs/FRONTEND_TERMINAL.md](../docs/FRONTEND_TERMINAL.md) for routes, features, and deployment.
