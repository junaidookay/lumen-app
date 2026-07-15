import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  getMyBilling,
  listSubscriptionPlans,
  createCheckoutSession,
  createPortalSession,
  cancelMySubscription,
} from "@/lib/billing/billing.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: BillingPage,
});

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function BillingPage() {
  const qc = useQueryClient();
  const billing = useQuery({ queryKey: ["billing", "me"], queryFn: () => getMyBilling() });
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: () => listSubscriptionPlans() });
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  useEffect(() => {
    // Reflect checkout result banner via query param.
    const url = new URL(window.location.href);
    const result = url.searchParams.get("checkout");
    if (result === "success") toast.success("Welcome to Premium — enjoy the show.");
    if (result === "cancel") toast("Checkout canceled.");
    if (result) { url.searchParams.delete("checkout"); window.history.replaceState({}, "", url.toString()); }
  }, []);

  const portal = useMutation({
    mutationFn: () => createPortalSession({ data: { returnUrl: window.location.origin } }),
    onSuccess: (res) => { if (res.url) window.location.href = res.url; },
    onError: (e: any) => toast.error(e?.message ?? "Could not open billing portal"),
  });
  const cancel = useMutation({
    mutationFn: () => cancelMySubscription(),
    onSuccess: () => { toast.success("Cancellation scheduled at period end."); qc.invalidateQueries({ queryKey: ["billing"] }); qc.invalidateQueries({ queryKey: ["permissions"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not cancel"),
  });

  async function startCheckout(planId: string) {
    setCheckoutBusy(planId);
    try {
      const { url } = await createCheckoutSession({ data: { planId, returnUrl: window.location.origin } });
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout");
    } finally {
      setCheckoutBusy(null);
    }
  }

  const sub: any = billing.data?.subscription ?? null;
  const currentPlan = sub?.subscription_plans;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Account</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Billing & subscription</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your plan, invoices, and payment options.</p>
        </header>

        <section className="rounded-3xl border border-white/5 glass p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Current plan</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {currentPlan?.name ?? (sub?.plan_id === "premium" ? "Premium" : "Free")}
                {sub?.cancel_at_period_end && <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">Cancels at period end</span>}
              </h2>
              {currentPlan?.description && <p className="mt-1 text-sm text-muted-foreground">{currentPlan.description}</p>}
              {sub?.current_period_end && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Renews {new Date(sub.current_period_end).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {sub?.stripe_customer_id && (
                <Button variant="secondary" onClick={() => portal.mutate()} disabled={portal.isPending}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Manage in portal
                </Button>
              )}
              {sub?.status === "active" && !sub?.cancel_at_period_end && sub?.plan_id !== "free" && (
                <Button variant="ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                  Cancel plan
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Plans</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(plans.data ?? []).map((plan: any) => {
              const active = sub?.plan_id === plan.id && ["active", "trialing"].includes(sub?.status ?? "");
              const purchasable = plan.id !== "free" && !!plan.stripe_price_id && !active;
              return (
                <div key={plan.id} className="flex flex-col rounded-3xl border border-white/5 glass p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-lg font-semibold">
                        {plan.name}
                        {plan.id === "premium" && <Sparkles className="h-4 w-4 text-brand" />}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{plan.price_cents ? formatMoney(plan.price_cents, plan.currency) : "Free"}</p>
                      {plan.interval && plan.interval !== "none" && <p className="text-xs text-muted-foreground">per {plan.interval}</p>}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {(plan.features as string[] | null)?.map((f) => (
                      <li key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand" /> {f}</li>
                    ))}
                  </ul>
                  <div className="mt-6 flex items-center gap-2">
                    {active ? (
                      <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">Current plan</span>
                    ) : purchasable ? (
                      <Button onClick={() => startCheckout(plan.id)} disabled={checkoutBusy === plan.id} className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90">
                        {checkoutBusy === plan.id ? "Redirecting…" : "Upgrade"}
                      </Button>
                    ) : plan.id !== "free" && !plan.stripe_price_id ? (
                      <span className="text-xs text-muted-foreground">Stripe price not configured yet.</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Default plan for every account.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Payment history</h2>
          <div className="overflow-hidden rounded-3xl border border-white/5 glass">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(billing.data?.payments ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No payments yet.</td></tr>
                )}
                {(billing.data?.payments ?? []).map((p: any) => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="px-4 py-3">{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{p.description ?? "Subscription"}</td>
                    <td className="px-4 py-3 capitalize">{p.status}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(p.amount_cents, p.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.invoice_url && <a href={p.invoice_url} target="_blank" rel="noreferrer" className="text-brand underline-offset-4 hover:underline">View</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}