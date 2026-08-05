/**
 * Server-only PawaPay client. Handles mobile money payments for African markets.
 * Uses PawaPay Merchant API V2: https://docs.pawapay.io/v2/
 */
import { getEnv } from "@/env";

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

function getBaseUrl(): string {
  const { environment } = getConfig();
  return environment === "production" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
}

function headers(): Record<string, string> {
  const { apiKey } = getConfig();
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

// ---- Country config with provider mapping ----
export const PAWAPAY_COUNTRIES = [
  { code: "UG", currency: "UGX", label: "Uganda", provider: "MTN_MOMO_UGA" },
  { code: "TZ", currency: "TZS", label: "Tanzania", provider: "MTN_MOMO_TZA" },
  { code: "NG", currency: "NGN", label: "Nigeria", provider: "MTN_MOMO_NGA" },
  { code: "KE", currency: "KES", label: "Kenya", provider: "MPESA_KEN" },
  { code: "BI", currency: "BIF", label: "Burundi", provider: "LUMICASH_BUR" },
  { code: "RW", currency: "RWF", label: "Rwanda", provider: "MTN_MOMO_RWA" },
] as const;

export const PAWAPAY_PRICE_CENTS = 500;

export function getCountryByCurrency(currency: string) {
  return PAWAPAY_COUNTRIES.find((c) => c.currency === currency.toUpperCase());
}

export function getPawaPayAmount(currency: string): number {
  return PAWAPAY_PRICE_CENTS;
}

// ---- V2 API Types ----

export interface InitiatePaymentRequest {
  country: string;
  currency: string;
  amount: number;
  payer: {
    type: "MMO";
    accountDetails: {
      phoneNumber: string;
      provider: string;
    };
  };
  depositId: string;
}

export interface PawaPayPayment {
  paymentId: string;
  status: "ACCEPTED" | "REJECTED" | "COMPLETED" | "FAILED" | "DUPLICATE_IGNORED";
  amount: number;
  currency: string;
  country: string;
}

export interface PawaPayWebhookPayload {
  depositId: string;
  status: "ACCEPTED" | "COMPLETED" | "FAILED" | "REJECTED" | "REFUNDED";
  amount: number;
  currency: string;
  payer: { type: string; accountDetails: { phoneNumber: string; provider: string } };
  clientReferenceId?: string;
  failureReason?: { failureCode: string; failureMessage: string };
}

// ---- V2 API Methods ----

export async function initiatePawaPayPayment(req: InitiatePaymentRequest): Promise<PawaPayPayment> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/v2/deposits`;

  console.log(`[pawapay] Initiating deposit: ${req.depositId} for ${req.amount} ${req.currency}`);

  const response = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      depositId: req.depositId,
      amount: String(req.amount),
      currency: req.currency,
      payer: req.payer,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.status === "REJECTED") {
    const failure = data.failureReason ?? {};
    console.error(`[pawapay] Deposit rejected: ${response.status}`, data);
    throw new Error(`PawaPay: ${failure.failureCode ?? "UNKNOWN_ERROR"} — ${failure.failureMessage ?? "Payment failed"}`);
  }

  return {
    paymentId: data.depositId ?? req.depositId,
    status: data.status ?? "ACCEPTED",
    amount: req.amount,
    currency: req.currency,
    country: req.country,
  };
}

export async function checkPawaPayPayment(depositId: string): Promise<PawaPayPayment> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/v2/deposits/${depositId}`;

  const response = await fetch(url, { headers: headers() });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[pawapay] Deposit check failed: ${response.status} ${body}`);
    throw new Error(`PawaPay deposit check failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    paymentId: data.depositId ?? depositId,
    status: data.status ?? "ACCEPTED",
    amount: Number(data.amount ?? 0),
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
  return true;
}
