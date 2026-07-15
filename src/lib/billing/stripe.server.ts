/**
 * Server-only Stripe client. Never imported from routes or components.
 * Uses the BYOK STRIPE_SECRET_KEY. Read env vars inside functions so
 * module-level access on Workers does not return undefined.
 */
import Stripe from "stripe";

let _client: Stripe | undefined;

export function getStripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  _client = new Stripe(key, { apiVersion: "2024-06-20" as any });
  return _client;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return secret;
}

export function getAppUrl(fallback: string): string {
  return process.env.APP_URL || process.env.PUBLIC_APP_URL || fallback;
}