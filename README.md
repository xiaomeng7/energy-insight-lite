# Energy Insight Lite

**Product name: Lite.** Standalone landing page for the Lite product: instant energy profile + locked full result (unlock $199). No build step, vanilla HTML/CSS/JS.

- **Single file:** `index.html` (embedded CSS + JS)
- **Product:** Energy Insight (Lite), AUD $199 one-off
- **Flow:** 2-minute check (6 steps) → free energy profile → unlock CTA (payment placeholder)

## Run locally

Open `index.html` in a browser, or use any static server:

```bash
npx serve .
# or: python3 -m http.server 8080
```

## Deploy

Push to a repo and deploy as static site (Netlify, Vercel, GitHub Pages, etc.). No build required.

**Console:** If you see `WebSocket connection to 'ws://localhost:8081/' failed` — that comes from Netlify Dev / live-reload (or a browser extension), not from this repo. Safe to ignore on production.

## Tracking

Events are logged to `console` and `window.__events` for QA. No GA4 in this repo.
