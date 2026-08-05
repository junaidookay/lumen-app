import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NAV_LINKS, SITE } from "@/constants/site";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/navigation/AccountMenu";
import { getBranding } from "@/lib/admin/settings.functions";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Start with static defaults to avoid hydration mismatch, then update from DB
  const [appName, setAppName] = useState<string>(SITE.name);
  const [logoUrl, setLogoUrl] = useState<string>("");

  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => getBranding(),
    staleTime: 5 * 60 * 1000,
  });

  // Sync query result after mount (client-only, avoids SSR mismatch)
  useEffect(() => {
    if (branding) {
      if (branding.name) setAppName(branding.name);
      if (branding.logoUrl) setLogoUrl(branding.logoUrl);
    }
  }, [branding]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          "pt-[env(safe-area-inset-top)]",
          scrolled ? "glass border-b border-white/5" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-9 w-9 rounded-xl object-contain" />
            ) : (
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
              >
                <span className="text-lg font-bold leading-none text-white">{appName.charAt(0)}</span>
              </span>
            )}
            <span className="text-lg font-semibold tracking-tight">{appName}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => {
              const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  aria-current={active ? "page" : undefined}
                  data-touch-target
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-white/10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/billing"
              aria-label="Subscribe"
              data-touch-target
              className="h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#1a5fb4] to-[#e65100] px-4 text-xs font-medium text-white shadow-[var(--shadow-glow)] hover:opacity-90 inline-flex"
            >
              Subscribe
            </Link>
            <AccountMenu />
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              data-touch-target
              className="grid h-10 w-10 place-items-center rounded-full glass transition hover:bg-white/10 md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col bg-surface p-6 shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{appName}</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full glass"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="mt-10 flex flex-col gap-1">
                {NAV_LINKS.map((l) => {
                  const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-lg font-medium transition",
                        active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5",
                      )}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </nav>
              <Link
                to="/home"
                className="mt-auto rounded-full bg-brand py-3 text-center text-sm font-medium text-brand-foreground shadow-[var(--shadow-glow)]"
              >
                Start watching
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}