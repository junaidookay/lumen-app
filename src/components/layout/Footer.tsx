import { Link } from "@tanstack/react-router";
import { SITE } from "@/constants/site";

const cols = [
  {
    title: "Explore",
    links: [
      { label: "Home", to: "/home" },
      { label: "Discover", to: "/discover" },
      { label: "Search", to: "/search" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Press", to: "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
      { label: "Cookies", to: "/" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: "radial-gradient(ellipse at top, oklch(0.72 0.19 25 / 0.12), transparent 70%)" }}
      />
      <div className="mx-auto grid max-w-[1800px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-[2fr_repeat(3,1fr)] lg:px-10">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: "var(--gradient-brand)" }}
            >
              <span className="text-lg font-bold text-white">L</span>
            </span>
            <span className="text-lg font-semibold">{SITE.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">{SITE.description}</p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold tracking-tight">{col.title}</p>
            <ul className="mt-4 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-10">
          <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
          <span>Crafted with care · Demo project</span>
        </div>
      </div>
    </footer>
  );
}