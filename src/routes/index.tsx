import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Film, Play, Sparkles, Tv, Wand2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HeroCarousel } from "@/components/hero/HeroCarousel";
import { MediaRow } from "@/components/sections/MediaRow";
import { GenreTile } from "@/components/discover/GenreTile";
import { Button } from "@/components/ui/button";
import { homeQuery } from "@/services/content";
import { STATIC_GENRES } from "@/constants/genres";
import { SITE } from "@/constants/site";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(homeQuery()),
  component: Landing,
});

const FEATURES = [
  {
    icon: Film,
    title: "Hand-picked cinema",
    body: "Editorial collections curated by film lovers, not algorithms alone. Every rail is a recommendation you can trust.",
  },
  {
    icon: Wand2,
    title: "Tuned to your taste",
    body: "The more you watch, the sharper it gets. Discover shows that feel made for you — without endless scrolling.",
  },
  {
    icon: Tv,
    title: "One quiet library",
    body: "Movies, series, documentaries and anime — all in a calm, cinematic interface built to disappear behind the story.",
  },
  {
    icon: Sparkles,
    title: "Beautifully everywhere",
    body: "Pick up where you left off across every device. Ambient art, silky transitions, and a UI that respects the film.",
  },
] as const;

const FAQ = [
  {
    q: `What is ${SITE.name}?`,
    a: `${SITE.name} is a modern streaming platform that reimagines how you discover and watch films and series — with a calm, cinematic interface and editorial curation.`,
  },
  {
    q: "Do I need an account?",
    a: "Not to explore. Browse the landing page, Home, and Discover freely. Sign-in, watchlists and personalization arrive in the next milestone.",
  },
  {
    q: "How much does it cost?",
    a: "This is a design/engineering preview. Subscriptions, tiers, and payments will be introduced later, alongside the account system.",
  },
  {
    q: "Where does the catalogue come from?",
    a: "The current experience uses realistic mock data. In future milestones this will be replaced by a live movie API without any change to the interface.",
  },
];

function Landing() {
  const { data: home } = useSuspenseQuery(homeQuery());

  const findRow = (id: string, title: string, subtitle?: string) => {
    const row = home.rows.find((r) => r.id === id);
    return row ?? { id, title, subtitle, items: [] };
  };

  const pinnedSections = [
    findRow("trending", "Trending Now", "What the world is watching this week"),
    findRow("popular_movies", "Popular Movies"),
    findRow("popular_tv", "Popular Shows"),
    findRow("top_rated", "Top Rated Movies"),
    findRow("coming_soon", "Coming Soon"),
    findRow("in_theaters", "In Theater Now"),
    findRow("on_the_air", "On The Air"),
  ];

  // Include auto-generated rows (imported-movies, imported-tv, all-content)
  const autoRowIds = new Set(["trending", "popular_movies", "popular_tv", "top_rated", "coming_soon", "in_theaters", "on_the_air"]);
  const autoRows = home.rows.filter((r) => !autoRowIds.has(r.id));

  const allSections = [...pinnedSections, ...autoRows];

  return (
    <AppShell>
      {home.hero.length > 0 && <HeroCarousel items={home.hero} />}

      {/* Feature strip */}
      <section className="relative -mt-20 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-4 rounded-3xl border border-white/5 glass p-6 shadow-[var(--shadow-elevated)] sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex flex-col gap-3 p-3"
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand"
                aria-hidden
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="space-y-14 py-16">
        {allSections.map((row) => (
          row.items.length > 0
            ? <MediaRow key={row.id} row={row} />
            : (
              <section key={row.id} className="px-4 sm:px-6 lg:px-10">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{row.title}</h2>
                  {row.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{row.subtitle}</p>}
                </div>
                <div className="rounded-3xl border border-white/5 glass p-8 text-center text-sm text-muted-foreground">
                  Nothing here yet. Pin items to "{row.title}" from the admin Content tab.
                </div>
              </section>
            )
        ))}

        {/* Genres */}
        <section className="px-4 sm:px-6 lg:px-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Browse by Genre</h2>
            <p className="mt-1 text-sm text-muted-foreground">Find your mood in a single click.</p>
            </div>
            <Link to="/discover" className="hidden items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {STATIC_GENRES.map((g, i) => (
              <GenreTile key={g.id} genre={g} index={i} />
            ))}
          </div>
        </section>
      </div>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Frequently asked</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you were going to ask
          </h2>
        </div>
        <div className="mt-10 divide-y divide-white/5 rounded-3xl border border-white/5 glass">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium">
                <span>{f.q}</span>
                <span className="text-brand transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-white/5 p-10 shadow-[var(--shadow-elevated)] sm:p-16" style={{ background: "var(--gradient-brand)" }}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative">
            <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready when the lights go down.
            </h3>
            <p className="mt-3 max-w-lg text-white/85">
              Explore the full library, discover collections, and find your next favorite film — all in a beautifully quiet interface.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-white/90">
                <Link to="/home"><Play className="mr-2 h-4 w-4 fill-current" /> Start watching</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/15">
                <Link to="/discover">Explore Discover</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
