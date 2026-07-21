import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, Sparkles, CreditCard, Smartphone, Gift, Globe } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getMyBilling,
  listSubscriptionPlans,
  createCheckoutSession,
  createPortalSession,
  cancelMySubscription,
} from "@/lib/billing/billing.functions";
import {
  initiatePawaPayCheckout,
  checkPawaPayStatus,
} from "@/lib/billing/pawapay.functions";
import { redeemCode, checkDownloadEligibility } from "@/lib/billing/redemption.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: BillingPage,
});

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

const PAWAPAY_COUNTRIES = [
  { code: "UG", currency: "UGX", label: "Uganda", phone: "+256" },
  { code: "TZ", currency: "TZS", label: "Tanzania", phone: "+255" },
  { code: "NG", currency: "NGN", label: "Nigeria", phone: "+234" },
  { code: "KE", currency: "KES", label: "Kenya", phone: "+254" },
  { code: "BI", currency: "BIF", label: "Burundi", phone: "+257" },
  { code: "RW", currency: "RWF", label: "Rwanda", phone: "+250" },
];

function BillingPage() {
  const qc = useQueryClient();
  const billing = useQuery({ queryKey: ["billing", "me"], queryFn: () => getMyBilling() });
  const plans = useQuery({ queryKey: ["billing", "plans"], queryFn: () => listSubscriptionPlans() });
  const downloads = useQuery({ queryKey: ["billing", "downloads"], queryFn: () => checkDownloadEligibility() });
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stripe" | "pawapay" | "code">("stripe");

  // PawaPay state
  const [selectedCountry, setSelectedCountry] = useState(PAWAPAY_COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [pawaPayBusy, setPawaPayBusy] = useState(false);
  const [pawaPayPolling, setPawaPayPolling] = useState<string | null>(null);

  // Code redemption state
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
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

  async function startPawaPay() {
    if (!phone) { toast.error("Enter your mobile number"); return; }
    setPawaPayBusy(true);
    try {
      const res = await initiatePawaPayCheckout({ data: { country: selectedCountry.code, msisdn: phone } });
      toast.success(`Payment initiated. Check your phone for ${res.currency} ${res.amount} prompt.`);
      // Start polling
      setPawaPayPolling(res.paymentId);
      pollPawaPay(res.paymentId);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not initiate payment");
    } finally {
      setPawaPayBusy(false);
    }
  }

  async function pollPawaPay(paymentId: string) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await checkPawaPayStatus({ data: { paymentId } });
        if (res.status === "COMPLETED") {
          toast.success("Payment confirmed! You now have Premium access.");
          setPawaPayPolling(null);
          qc.invalidateQueries({ queryKey: ["billing"] });
          qc.invalidateQueries({ queryKey: ["permissions"] });
          return;
        }
        if (res.status === "FAILED") {
          toast.error("Payment failed. Please try again.");
          setPawaPayPolling(null);
          return;
        }
      } catch {
        // continue polling
      }
    }
    toast("Payment still processing. Check back later.");
    setPawaPayPolling(null);
  }

  async function handleRedeemCode() {
    if (!code.trim()) { toast.error("Enter a code"); return; }
    setRedeeming(true);
    try {
      const res = await redeemCode({ data: { code: code.trim() } });
      toast.success(`Activated! Premium access for ${res.durationDays} day(s). ${res.downloadsPerDay} downloads/day.`);
      setCode("");
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["permissions"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid code");
    } finally {
      setRedeeming(false);
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

        {/* Current plan */}
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
              {sub?.payment_method && sub?.payment_method !== "stripe" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Payment via {sub.payment_method === "pawapay" ? "Mobile Money" : "Redemption Code"}
                </p>
              )}
              {downloads?.data && sub?.payment_method === "code" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Downloads today: {downloads.data.remaining} remaining
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

        {/* Payment method tabs */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Upgrade to Premium</h2>
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("stripe")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${activeTab === "stripe" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
            >
              <CreditCard className="h-4 w-4" /> Card
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pawapay")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${activeTab === "pawapay" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
            >
              <Smartphone className="h-4 w-4" /> Mobile Money
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${activeTab === "code" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
            >
              <Gift className="h-4 w-4" /> Have a Code?
            </button>
          </div>

          {/* Stripe Plans */}
          {activeTab === "stripe" && (
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
                        <Button onClick={() => startCheckout(plan.id)} disabled={checkoutBusy === plan.id} className="rounded-full">
                          {checkoutBusy === plan.id ? "Redirecting..." : "Upgrade"}
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
          )}

          {/* PawaPay Mobile Money */}
          {activeTab === "pawapay" && (
            <div className="max-w-lg space-y-6 rounded-3xl border border-white/5 glass p-8">
              <div>
                <h3 className="text-lg font-semibold">Pay with Mobile Money</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pay securely with MTN, Airtel, M-Pesa, or other mobile money providers.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Country</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {PAWAPAY_COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCountry(c)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition ${
                        selectedCountry.code === c.code
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-white/5 hover:bg-white/5"
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Mobile Number</label>
                <div className="mt-2 flex gap-2">
                  <span className="flex items-center rounded-xl border border-white/5 bg-white/5 px-3 text-sm text-muted-foreground">
                    {selectedCountry.phone}
                  </span>
                  <Input
                    placeholder="700 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  You will receive a payment prompt on your phone.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-sm font-medium">Premium — 30 days</p>
                <p className="text-2xl font-semibold">~500 {selectedCountry.currency}</p>
                <p className="text-xs text-muted-foreground">Same price in all countries</p>
              </div>

              <Button
                onClick={startPawaPay}
                disabled={pawaPayBusy || !phone || !!pawaPayPolling}
                className="w-full rounded-full"
              >
                {pawaPayBusy ? "Initiating..." : pawaPayPolling ? "Waiting for payment..." : "Pay Now"}
              </Button>

              {pawaPayPolling && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Check your phone and approve the payment. This page will update automatically.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Code Redemption */}
          {activeTab === "code" && (
            <div className="max-w-lg space-y-6 rounded-3xl border border-white/5 glass p-8">
              <div>
                <h3 className="text-lg font-semibold">Redeem a Code</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Got a code from an admin? Enter it below to activate your premium access.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter code (e.g. ABCD1234)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="flex-1 font-mono text-lg tracking-widest"
                  maxLength={12}
                />
                <Button
                  onClick={handleRedeemCode}
                  disabled={redeeming || !code.trim()}
                  className="rounded-full"
                >
                  {redeeming ? "Redeeming..." : "Redeem"}
                </Button>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm">
                <p className="font-medium">What you get:</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand" /> Premium streaming access</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand" /> 3 downloads per day</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand" /> Ad-free experience</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand" /> 4K & HDR playback</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Payment history */}
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
