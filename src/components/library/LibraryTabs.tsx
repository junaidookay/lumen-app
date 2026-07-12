import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/library", label: "Watchlist" },
  { to: "/library/favorites", label: "Favorites" },
  { to: "/library/continue", label: "Continue Watching" },
  { to: "/library/history", label: "History" },
] as const;

export function LibraryTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mb-8 flex flex-wrap gap-2 border-b border-white/5 pb-1">
      {TABS.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition",
              active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}