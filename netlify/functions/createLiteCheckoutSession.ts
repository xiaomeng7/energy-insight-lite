import type { Handler, HandlerEvent } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";
import crypto from "crypto";

const LITE_AMOUNT_CENTS = 19900;
const LITE_CURRENCY = "aud";

function hashSnapshot(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const liteSiteUrl = (process.env.LITE_SITE_URL || "").replace(/\/$/, "");
  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!stripeSecret || !liteSiteUrl || !dbUrl?.startsWith("postgres")) {
    return { statusCode: 503, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Service unavailable" }) };
  }
  let body: { name?: string; email?: string; phone?: string; liteSnapshot?: unknown };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Valid email is required" }) };
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const liteSnapshot = body.liteSnapshot != null ? JSON.stringify(body.liteSnapshot) : "{}";
  const stripe = new Stripe(stripeSecret);
  const priceId = process.env.STRIPE_PRICE_ID_LITE_199;
  const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [{ price_data: { currency: LITE_CURRENCY, unit_amount: LITE_AMOUNT_CENTS, product_data: { name: "Energy Decision Tool - Full Result Unlock" } }, quantity: 1 }];
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: liteSiteUrl + "/?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: liteSiteUrl + "/?checkout=cancel",
    customer_email: email,
    metadata: { source: "lite_paid", email, lite_snapshot_hash: hashSnapshot(liteSnapshot) },
  });
  const sql = neon(dbUrl);
  await sql`INSERT INTO advisory_applications (name, mobile, email, suburb, property_type, solar_battery_status, bill_range, contact_time, source, payment_status, lite_snapshot, stripe_checkout_session_id, credit_amount) VALUES (${name || ""}, ${phone || ""}, ${email}, NULL, NULL, NULL, NULL, NULL, 'lite_paid', 'pending', ${liteSnapshot}, ${session.id}, ${LITE_AMOUNT_CENTS})`;
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: session.url }) };
};
