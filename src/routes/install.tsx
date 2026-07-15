import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Download,
  Wifi,
  Play,
  Bell,
  Smartphone,
  Monitor,
  Zap,
  ChevronLeft,
  ChevronRight,
  Check,
  Share,
  Plus,
  Moon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useInstall } from "@/pwa/hooks/use-install";
import { useCapabilities } from "@/pwa/hooks/use-capabilities";
import { trackInstallEvent } from "@/pwa/services/install-analytics";

export const Route = createFileRoute("/install")({
  component: InstallPage,
});

function InstallPage() {
  const { platform, canInstall, isInstalled, install } = useInstall();
  const capabilities = useCapabilities();

  const handleInstall = async () => {
    trackInstallEvent({ name: "install_page.viewed", properties: { platform } });
    await install();
    trackInstallEvent({ name: "install.completed", properties: { platform, method: "prompt" } });
  };

  const benefits = [
    {
      icon: Wifi,
      title: "Offline access",
      description: "Watch saved content without an internet connection",
    },
    {
      icon: Zap,
      title: "Faster launch",
      description: "Open Lumen instantly from your home screen",
    },
    {
      icon: Play,
      title: "Continue Watching",
      description: "Pick up right where you left off, across sessions",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Get notified about new releases and updates",
    },
  ];

  const faqs = [
    {
      question: "What is a PWA?",
      answer: "A Progressive Web App is a website that works like a native app. You can install it on your device, use it offline, and get a native-like experience without visiting an app store.",
    },
    {
      question: "Will it use much storage?",
      answer: "Lumen is designed to be lightweight. The app itself uses minimal storage. Cached content can be managed from your device settings.",
    },
    {
      question: "How do I remove it?",
      answer: "You can uninstall Lumen like any other app. On Android, long-press the icon and select Uninstall. On iOS, long-press and tap Remove App.",
    },
    {
      question: "Does it cost anything?",
      answer: "No. Installing Lumen is completely free. You keep the same account and subscription you already have.",
    },
  ];

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-radial)" }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl" style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}>
              <span className="text-3xl font-bold text-white">L</span>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand">Install Lumen</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
              Your cinema,<br />always within reach
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">
              Install Lumen for instant access, offline viewing, and a native app experience — right from your browser.
            </p>
          </motion.div>

          {isInstalled ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-6 py-3 text-sm font-medium text-emerald-400"
            >
              <Check className="h-4 w-4" />
              Lumen is installed
            </motion.div>
          ) : canInstall ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-8"
            >
              <Button
                size="lg"
                onClick={handleInstall}
                className="rounded-full bg-brand px-8 text-brand-foreground shadow-[var(--shadow-glow)] hover:bg-brand/90"
              >
                <Download className="mr-2 h-4 w-4" />
                Install Lumen
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                {platform === "android" && "Tap Install, then Add to Home Screen"}
                {platform === "ios" && "Tap Share, then Add to Home Screen"}
                {platform === "desktop" && "Click Install in your browser's address bar"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-8"
            >
              <ManualInstructions platform={platform} />
            </motion.div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Why install Lumen?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Everything you love, but faster and always available</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card className="h-full border-white/5 bg-surface">
                  <CardContent className="p-6">
                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-white/5">
                      <b.icon className="h-5 w-5 text-brand" />
                    </div>
                    <h3 className="font-semibold tracking-tight">{b.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How to install</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {platform === "ios"
                ? "A few taps and Lumen is on your home screen"
                : platform === "android"
                  ? "Install Lumen in one tap"
                  : "Add Lumen to your desktop in seconds"}
            </p>
          </div>

          {platform === "ios" ? (
            <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-3">
              {[
                { step: "1", title: "Tap Share", icon: Share, description: "Tap the share button in Safari's toolbar" },
                { step: "2", title: "Add to Home Screen", icon: Plus, description: "Scroll down and tap 'Add to Home Screen'" },
                { step: "3", title: "Open Lumen", icon: Moon, description: "Find Lumen on your home screen and open it" },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Card className="border-white/5 bg-surface text-center">
                    <CardContent className="p-6">
                      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                        {s.step}
                      </div>
                      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/5">
                        <s.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold tracking-tight">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : platform === "android" ? (
            <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-3">
              {[
                { step: "1", title: "Tap Install", icon: Download, description: "Tap the Install button when prompted by your browser" },
                { step: "2", title: "Confirm", icon: Check, description: "Confirm the installation in the dialog" },
                { step: "3", title: "Open Lumen", icon: Play, description: "Find Lumen on your home screen and open it" },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Card className="border-white/5 bg-surface text-center">
                    <CardContent className="p-6">
                      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                        {s.step}
                      </div>
                      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/5">
                        <s.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold tracking-tight">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-3">
              {[
                { step: "1", title: "Click the install icon", icon: Download, description: "Look for the install icon in your browser's address bar" },
                { step: "2", title: "Confirm installation", icon: Check, description: "Click 'Install' in the confirmation dialog" },
                { step: "3", title: "Launch Lumen", icon: Play, description: "Open Lumen from your desktop or applications" },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Card className="border-white/5 bg-surface text-center">
                    <CardContent className="p-6">
                      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                        {s.step}
                      </div>
                      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/5">
                        <s.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold tracking-tight">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Supported devices */}
      <section className="px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Works on your device</h2>
            <p className="mt-1 text-sm text-muted-foreground">Lumen is available on all modern devices and browsers</p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { icon: Smartphone, label: "Android", detail: "Chrome, Samsung Internet, Edge" },
              { icon: Smartphone, label: "iPhone & iPad", detail: "Safari" },
              { icon: Monitor, label: "Desktop", detail: "Chrome, Edge, Firefox, Safari" },
            ].map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card className="border-white/5 bg-surface text-center">
                  <CardContent className="p-6">
                    <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/5">
                      <d.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold tracking-tight">{d.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{d.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="border-white/5 bg-surface">
                  <CardContent className="p-6">
                    <h3 className="font-semibold tracking-tight">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 pb-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div
            className="relative overflow-hidden rounded-3xl border border-white/5 p-10 shadow-[var(--shadow-elevated)] sm:p-16"
            style={{ background: "var(--gradient-brand)" }}
          >
            <div className="relative z-10 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready to install?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
                Get the full Lumen experience — faster, offline-ready, and always available.
              </p>
              {canInstall && !isInstalled ? (
                <Button
                  size="lg"
                  onClick={handleInstall}
                  className="mt-6 rounded-full bg-white px-8 text-black shadow-lg hover:bg-white/90"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Install Lumen
                </Button>
              ) : isInstalled ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-sm font-medium text-white">
                  <Check className="h-4 w-4" />
                  Already installed
                </div>
              ) : (
                <ManualInstructions platform={platform} variant="light" />
              )}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function ManualInstructions({ platform, variant = "dark" }: { platform: string; variant?: "dark" | "light" }) {
  const instructions = (() => {
    switch (platform) {
      case "ios":
        return [
          { step: "1", label: "Tap the Share button in Safari" },
          { step: "2", label: "Scroll down and tap 'Add to Home Screen'" },
          { step: "3", label: "Tap 'Add' to confirm" },
        ];
      case "android":
        return [
          { step: "1", label: "Tap the three-dot menu in Chrome" },
          { step: "2", label: "Tap 'Install app' or 'Add to Home Screen'" },
          { step: "3", label: "Confirm the installation" },
        ];
      default:
        return [
          { step: "1", label: "Click the install icon in the address bar" },
          { step: "2", label: "Click 'Install' in the dialog" },
        ];
    }
  })();

  return (
    <div className={`mt-6 rounded-2xl border ${variant === "light" ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"} p-6 text-left`}>
      <p className={`mb-4 text-sm font-medium ${variant === "light" ? "text-white" : "text-foreground"}`}>
        Manual installation
      </p>
      <div className="space-y-3">
        {instructions.map((s) => (
          <div key={s.step} className="flex items-start gap-3">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${variant === "light" ? "bg-white/20 text-white" : "bg-brand/15 text-brand"}`}>
              {s.step}
            </span>
            <span className={`text-sm ${variant === "light" ? "text-white/80" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
