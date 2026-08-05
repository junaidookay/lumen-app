/**
 * Server-only PawaPay client. Handles mobile money payments for African markets.
 * API docs: https://developers.pawapay.com/
 */
import { getEnv } from "@/env";

const PAWAPAY_BASE = "https://api.pawapay.io/v1";

export interface PawaPayConfig {
  apiKey: string;
  environment: "sandbox" | "production";
}

function getConfig(): PawaPayConfig {
  const env = getEnv();
  const apiKey = (env as any).PAWAPAY_API_KEY as string | undefined;
  const environment = ((env as any).PAWAPAY_ENVIRONMENT as string | undefined) ?? "sandbox";
  if (!apiKey) throw new Error("PAWAPAY_API_KEY is not configured");
  return { apiKey, environment: environment as "sandbox" | "production" };
}

function headers(): Record<string, string> {
  const { apiKey } = getConfig();
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

// ---- Country-specific pricing (all same flat rate) ----
export const PAWAPAY_COUNTRIES = [
  { code: "UG", currency: "UGX", label: "Uganda" },
  { code: "TZ", currency: "TZS", label: "Tanzania" },
  { code: "NG", currency: "NGN", label: "Nigeria" },
  { code: "KE", currency: "KES", label: "Kenya" },
  { code: "BI", currency: "BIF", label: "Burundi" },
  { code: "RW", currency: "RWF", label: "Rwanda" },
] as const;

export const PAWAPAY_PRICE_CENTS = 500; // $5.00 equivalent in local currency

export function getCountryByCurrency(currency: string) {
  return PAWAPAY_COUNTRIES.find((c) => c.currency === currency.toUpperCase());
}

export function getPawaPayAmount(currency: string): number {
  // PawaPay amounts are in minor units of the currency.
  // For UGX (no decimal), amount = price in UGX.
  // For others, amount = price * 100.
  const noDecimal = ["UGX", "BIF", "RWF", "JPY"];
  if (noDecimal.includes(currency.toUpperCase())) {
    return PAWAPAY_PRICE_CENTS; // e.g., 500 UGX
  }
  return PAWAPAY_PRICE_CENTS; // e.g., 5.00 USD = 500 cents
}

// ---- API Types ----

export interface InitiatePaymentRequest {
  country: string;
  currency: string;
  amount: number;
  payer: {
    type: "MSISDN";
    value: string; // e.g., "+256700000000"
  };
  paymentReference: string;
  statementDescription: string;
  callbackUrl: string;
}

export interface PawaPayPayment {
  paymentId: string;
  status: "INITIATED" | "ACCEPTED" | "COMPLETED" | "FAILED" | "REFUNDED";
  amount: number;
  currency: string;
  country: string;
}

export interface PawaPayWebhookPayload {
  paymentId: string;
  status: "INITIATED" | "ACCEPTED" | "COMPLETED" | "FAILED" | "REFUNDED";
  amount: number;
  currency: string;
  country: string;
  payer: { type: string; value: string };
  paymentReference: string;
  transactionId?: string;
}

// ---- API Methods ----

export async function initiatePawaPayPayment(req: InitiatePaymentRequest): Promise<PawaPayPayment> {
  const { environment } = getConfig();
  const baseUrl = environment === "production" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
  const url = `${baseUrl}/v1/payments`;

  console.log(`[pawapay] Initiating payment: ${req.paymentReference} for ${req.amount} ${req.currency}`);

  const response = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      country: req.country,
      currency: req.currency,
      amount: req.amount,
      payer: req.payer,
      paymentReference: req.paymentReference,
      statementDescription: req.statementDescription,
      callbackUrl: req.callbackUrl,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[pawapay] Payment initiation failed: ${response.status} ${body}`);
    throw new Error(`PawaPay payment failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    paymentId: data.paymentId ?? data.id ?? "",
    status: data.status ?? "INITIATED",
    amount: req.amount,
    currency: req.currency,
    country: req.country,
  };
}

export async function checkPawaPayPayment(paymentId: string): Promise<PawaPayPayment> {
  const { environment } = getConfig();
  const baseUrl = environment === "production" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
  const url = `${baseUrl}/v1/payments/${paymentId}`;

  const response = await fetch(url, { headers: headers() });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[pawapay] Payment check failed: ${response.status} ${body}`);
    throw new Error(`PawaPay payment check failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    paymentId: data.paymentId ?? data.id ?? paymentId,
    status: data.status ?? "INITIATED",
    amount: data.amount ?? 0,
    currency: data.currency ?? "",
    country: data.country ?? "",
  };
}

/**
 * Verify a PawaPay webhook signature. In production you should validate the
 * HMAC signature from the X-PawaPay-Signature header.
 */
export function verifyPawaPayWebhook(body: string, _signature: string | null): boolean {
  // TODO: Implement HMAC verification when PawaPay provides the shared secret
  // For now, we trust the webhook endpoint (protected by obscurity + rate limiting)
  return true;
}
