import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Bell, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NAV_LINKS } from "@/constants/site";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/navigation/AccountMenu";
import { getBranding } from "@/lib/admin/settings.functions";
import { usePermissions } from "@/hooks/use-permissions";
import { isPremium } from "@/lib/permissions";
import { listNotifications } from "@/services/library";
import { useAuth } from "@/hooks/use-auth";
import { useInstall } from "@/pwa/hooks/use-install";
import { useAppName } from "@/hooks/use-app-name";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { data: perms } = usePermissions();
  const premium = isPremium(perms);
  const appName = useAppName();
  const { canInstall, install } = useInstall();

  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    enabled: !!user,
  });
  const unread = (notifs ?? []).filter((n: any) => !n.read).length;

  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoDisplay, setLogoDisplay] = useState<string>("both");

  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => getBranding(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (branding) {
      if (branding.logoUrl) setLogoUrl(branding.logoUrl);
      if (branding.logoDisplay) setLogoDisplay(branding.logoDisplay);
    }
  }, [branding]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            {logoDisplay !== "logo_only" && (
              <span className="text-lg font-semibold tracking-tight">{appName}</span>
            )}
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
              aria-label={premium ? "Manage subscription" : "Subscribe"}
              data-touch-target
              className={cn(
                "h-10 items-center justify-center rounded-full px-4 text-xs font-medium text-white shadow-[var(--shadow-glow)] hover:opacity-90 inline-flex",
                premium
                  ? "bg-emerald-600"
                  : "bg-gradient-to-r from-[#1a5fb4] to-[#e65100]",
              )}
            >
              {premium ? "Premium" : "Subscribe"}
            </Link>
            {user && (
              <Link
                to="/notifications"
                aria-label="Notifications"
                data-touch-target
                className="relative grid h-10 w-10 place-items-center rounded-full glass transition hover:bg-white/10"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            )}
            <AccountMenu />
            {canInstall && (
              <button
                type="button"
                aria-label="Install app"
                onClick={install}
                data-touch-target
                className="grid h-10 w-10 place-items-center rounded-full glass transition hover:bg-white/10"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

    </>
  );
}