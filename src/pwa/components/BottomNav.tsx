import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Search, Film, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePWA } from "@/pwa/hooks/use-pwa";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Film },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const isMobile = useIsMobile();
  const { isStandalone } = usePWA();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isMobile || !isStandalone) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-surface/90 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                data-touch-target
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
                  active ? "text-brand" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_var(--brand)]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
