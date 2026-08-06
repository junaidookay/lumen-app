/**
 * PawaPay billing server functions — initiate payments, handle webhooks.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  initiatePawaPayPayment,
  checkPawaPayPayment,
  PAWAPAY_COUNTRIES,
  getPawaPayAmount,
  type PawaPayWebhookPayload,
} from "./pawapay.server";

// ------------------------------------------------------------------
// User: Initiate a PawaPay payment
// ------------------------------------------------------------------

export const initiatePawaPayCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { country: string; msisdn: string }) =>
    z.object({
      country: z.string().length(2),
      msisdn: z.string().min(8).max(15),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const country = PAWAPAY_COUNTRIES.find((c) => c.code === data.country);
    if (!country) throw new Error("Unsupported country");

    const depositId = crypto.randomUUID();
    const amount = getPawaPayAmount(country.currency);

    const payment = await initiatePawaPayPayment({
      country: country.code,
      currency: country.currency,
      amount,
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: data.msisdn,
          provider: country.provider,
        },
      },
      depositId,
    });

    // Store the pending payment with deposit ID for webhook matching
    await supabaseAdmin.from("payment_history").insert({
      user_id: context.userId,
      amount_cents: amount,
      currency: country.currency,
      status: "pending",
      description: `PawaPay - ${country.label} Premium`,
      payment_method: "pawapay",
      provider_reference: depositId,
    });

    return {
      paymentId: payment.paymentId,
      status: payment.status,
      amount,
      currency: country.currency,
      country: country.label,
    };
  });

// ------------------------------------------------------------------
// User: Check payment status (for polling after initiation)
// ------------------------------------------------------------------

export const checkPawaPayStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { paymentId: string }) =>
    z.object({ paymentId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const payment = await checkPawaPayPayment(data.paymentId);

    if (payment.status === "COMPLETED") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Activate subscription
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: context.userId,
          plan_id: "premium",
          status: "active",
          payment_method: "pawapay",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        },
        { onConflict: "user_id" },
      );

      // Update payment history — find by provider_reference for accuracy
      await supabaseAdmin
        .from("payment_history")
        .update({ status: "paid", paid_at: now.toISOString() })
        .eq("provider_reference", data.paymentId)
        .eq("status", "pending");
    }

    return { status: payment.status, paymentId: payment.paymentId };
  });

// ------------------------------------------------------------------
// Server: PawaPay webhook handler (called by Nitro route)
// ------------------------------------------------------------------

export async function handlePawaPayWebhook(payload: PawaPayWebhookPayload): Promise<void> {
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log(`[pawapay:webhook] Deposit ${payload.depositId} status: ${payload.status}`);

  // Find the pending payment by provider_reference (depositId)
  const { data: payment } = await supabase
    .from("payment_history")
    .select("*")
    .eq("provider_reference", payload.depositId)
    .eq("status", "pending")
    .maybeSingle();

  if (!payment) {
    console.warn(`[pawapay:webhook] No pending payment found for ${payload.depositId}`);
    return;
  }

  if (payload.status === "COMPLETED") {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Activate subscription
    await supabase.from("subscriptions").upsert(
      {
        user_id: payment.user_id,
        plan_id: "premium",
        status: "active",
        payment_method: "pawapay",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      },
      { onConflict: "user_id" },
    );

    // Update payment history
    await supabase
      .from("payment_history")
      .update({ status: "paid", paid_at: now.toISOString() })
      .eq("id", payment.id);

    // Audit
    await supabase.from("audit_logs").insert({
      actor_id: payment.user_id,
      action: "payment.pawapay.completed",
      target_type: "payment",
      target_id: payment.id,
      meta: { amount: payload.amount, currency: payload.currency } as any,
    });
  } else if (payload.status === "FAILED") {
    await supabase
      .from("payment_history")
      .update({ status: "failed" })
      .eq("id", payment.id);
  }
}
