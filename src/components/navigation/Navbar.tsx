import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, Search, X } from "lucide-react";
import { NAV_LINKS, SITE } from "@/constants/site";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/navigation/AccountMenu";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
          scrolled ? "glass border-b border-white/5" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              <span className="text-lg font-bold leading-none text-white">L</span>
            </span>
            <span className="text-lg font-semibold tracking-tight">{SITE.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => {
              const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
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
              to="/search"
              aria-label="Search"
              className="grid h-10 w-10 place-items-center rounded-full glass transition hover:bg-white/10"
            >
              <Search className="h-4 w-4" />
            </Link>
            <AccountMenu />
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
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
                <span className="text-lg font-semibold">{SITE.name}</span>
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