# Energy Insight Lite

**Product name: Lite.** Standalone landing page for the Lite product: instant energy profile + locked full result; unlock via Stripe ($199). Vanilla HTML/CSS/JS + Netlify Functions for checkout.

- **Front:** `index.html` (embedded CSS + JS)
- **Back:** `netlify/functions` — createLiteCheckoutSession, verifyLitePayment, stripeWebhook
- **Product:** Energy Insight (Lite), AUD $199 one-off (credit toward Pro)
- **Flow:** 2-minute check → free preview → Unlock $199 → Stripe Checkout → return → verify → show full result

## Run locally

Static only: open `index.html` in a browser. With Stripe/DB (Netlify):

```bash
npm install
netlify dev
```

## Deploy (Netlify)

1. Connect repo; publish directory: `.`; functions: `netlify/functions`.
2. Env vars (same DB as Pro/admin):
   - `NEON_DATABASE_URL` — Postgres (run migration 004 on this DB)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Webhooks (endpoint: `/.netlify/functions/stripeWebhook`)
   - `LITE_SITE_URL` — deployed Lite URL (e.g. `https://lite.example.com`)
   - Optional: `STRIPE_PRICE_ID_LITE_199` — or price is created inline ($199 AUD)
3. Run migration 004 (in the Pro/landing-page repo):  
   `psql "$NEON_DATABASE_URL" -f migrations/004_advisory_lite_payment.sql`

## Tracking

Events: `page_open`, `lite_unlock_click`, `lite_checkout_redirect`, `lite_payment_verified` (and existing snapshot events). Logged to `console` and `window.__events`.
