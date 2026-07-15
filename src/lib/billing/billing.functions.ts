/**
 * Billing server functions — one facade for the client.
 * Stripe communication only happens on the server; secret keys never
 * touch the browser bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSubscriptionPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("subscription_plans").select("*").eq("is_active", true).order("sort_order");
  return data ?? [];
});

export const getMyBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [subRes, paymentsRes] = await Promise.all([
      context.supabase.from("subscriptions").select("*, subscription_plans(name, description, price_cents, currency, interval, features)").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("payment_history").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return { subscription: subRes.data, payments: paymentsRes.data ?? [] };
  });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planId: string; returnUrl?: string }) => z.object({ planId: z.string().min(1), returnUrl: z.string().url().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe, getAppUrl } = await import("./stripe.server");

    const { data: plan } = await supabaseAdmin.from("subscription_plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan || !plan.stripe_price_id) throw new Error("Selected plan is not available for purchase yet");

    const stripe = getStripe();
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("stripe_customer_id").eq("user_id", context.userId).maybeSingle();
    let customerId = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const customer = await stripe.customers.create({
        email: userRes?.user?.email ?? undefined,
        metadata: { supabase_user_id: context.userId },
      });
      customerId = customer.id;
      await supabaseAdmin.from("subscriptions").upsert({ user_id: context.userId, plan_id: "free", stripe_customer_id: customerId }, { onConflict: "user_id" });
    }

    const base = getAppUrl(data.returnUrl ?? "https://example.com");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${base}/billing?checkout=success`,
      cancel_url: `${base}/billing?checkout=cancel`,
      metadata: { supabase_user_id: context.userId, plan_id: plan.id },
      subscription_data: { metadata: { supabase_user_id: context.userId, plan_id: plan.id } },
    });
    return { url: session.url };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { returnUrl?: string }) => z.object({ returnUrl: z.string().url().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe, getAppUrl } = await import("./stripe.server");
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("stripe_customer_id").eq("user_id", context.userId).maybeSingle();
    if (!sub?.stripe_customer_id) throw new Error("No billing account on file");
    const stripe = getStripe();
    const base = getAppUrl(data.returnUrl ?? "https://example.com");
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${base}/billing`,
    });
    return { url: portal.url };
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("./stripe.server");
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("stripe_subscription_id").eq("user_id", context.userId).maybeSingle();
    if (!sub?.stripe_subscription_id) throw new Error("No active subscription");
    const stripe = getStripe();
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    await supabaseAdmin.from("subscriptions").update({ cancel_at_period_end: true }).eq("user_id", context.userId);
    return { ok: true };
  });