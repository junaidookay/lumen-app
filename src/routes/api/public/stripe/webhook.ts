/**
 * Stripe webhook — verifies signature, then upserts subscription and
 * payment_history rows using the service role client. Never trust the
 * body until the signature verifies.
 */
import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });
        const rawBody = await request.text();

        const { getStripe, getWebhookSecret } = await import("@/lib/billing/stripe.server");
        const stripe = getStripe();
        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, signature, getWebhookSecret());
        } catch (err: any) {
          return new Response(`Invalid signature: ${err?.message ?? ""}`, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        async function upsertSubscription(subIn: Stripe.Subscription, planIdHint?: string) {
          const sub = subIn as any;
          const userId = (sub.metadata?.supabase_user_id as string | undefined) ?? null;
          if (!userId) return;
          const planId = (sub.metadata?.plan_id as string | undefined) ?? planIdHint ?? "premium";
          const status = sub.status as string;
          const patch = {
            user_id: userId,
            plan_id: planId,
            status,
            stripe_subscription_id: sub.id,
            stripe_customer_id: (sub.customer as string) ?? null,
            current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: !!sub.cancel_at_period_end,
          };
          await supabaseAdmin.from("subscriptions").upsert(patch, { onConflict: "user_id" });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              if (session.subscription) {
                const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                await upsertSubscription(sub, (session.metadata?.plan_id as string | undefined));
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              await upsertSubscription(event.data.object as Stripe.Subscription);
              break;
            }
            case "invoice.paid":
            case "invoice.payment_failed": {
              const inv = event.data.object as any;
              const userId = (inv.subscription_details?.metadata?.supabase_user_id as string | undefined)
                || (typeof inv.customer === "string"
                  ? ((await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_customer_id", inv.customer).maybeSingle()).data?.user_id ?? null)
                  : null);
              if (userId) {
                await supabaseAdmin.from("payment_history").upsert({
                  user_id: userId,
                  amount_cents: inv.amount_paid ?? inv.amount_due ?? 0,
                  currency: inv.currency ?? "usd",
                  status: event.type === "invoice.paid" ? "paid" : "failed",
                  description: inv.description ?? inv.lines?.data?.[0]?.description ?? "Subscription",
                  stripe_invoice_id: inv.id,
                  stripe_payment_intent_id: (inv.payment_intent as string | null) ?? null,
                  invoice_url: inv.hosted_invoice_url ?? null,
                  paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : null,
                }, { onConflict: "stripe_invoice_id" });
              }
              break;
            }
            default:
              // ignore
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          return new Response("Handler error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});