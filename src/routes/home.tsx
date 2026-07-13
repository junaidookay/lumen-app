import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Play, Info } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MediaRow } from "@/components/sections/MediaRow";
import { Button } from "@/components/ui/button";
import { homeQuery } from "@/services/content";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Browse — Lumen" },
      { name: "description", content: "Browse trending, popular and top-rated films and series, tailored to you." },
      { property: "og:title", content: "Browse — Lumen" },
      { property: "og:description", content: "Browse trending, popular and top-rated films and series, tailored to you." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery()),
  component: Home,
});

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(user: { user_metadata?: Record<string, unknown>; email?: string | null } | null) {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const raw = (meta.full_name as string) || (meta.name as string) || (meta.display_name as string) || user.email || "";
  if (!raw) return null;
  return String(raw).split(/[\s@]/)[0];
}

function Home() {
  const { data } = useSuspenseQuery(homeQuery());
  const { user } = useAuth();
  const featured = data.hero[0];
  const name = firstName(user);

  return (
    <AppShell>
      {/* Compact welcome banner */}
      {featured && (
        <section className="px-4 pt-24 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto max-w-[1600px] overflow-hidden rounded-3xl border border-white/5 shadow-[var(--shadow-elevated)]"
          >
            <div
              className="relative aspect-[21/9] w-full sm:aspect-[24/8] lg:aspect-[32/9]"
            >
              <img
                src={featured.backdrop}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

              <div className="relative flex h-full flex-col justify-end gap-4 p-6 sm:p-10 lg:max-w-2xl">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-brand">
                    {greeting()}{name ? `, ${name}` : ""}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
                    {featured.title}
                  </h1>
                  {featured.tagline && (
                    <p className="mt-2 line-clamp-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                      {featured.tagline}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="rounded-full">
                    <Link
                      to="/watch/$kind/$id"
                      params={{ kind: featured.kind, id: featured.id }}
                      search={{ season: 1, episode: 1 }}
                    >
                      <Play className="mr-2 h-4 w-4 fill-current" /> Play featured
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10">
                    <Link
                      to={featured.kind === "tv" ? "/tv/$id" : "/movie/$id"}
                      params={{ id: featured.id }}
                    >
                      <Info className="mr-2 h-4 w-4" /> More info
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      <div className="space-y-12 py-12">
        {data.rows.map((row) => (
          <MediaRow
            key={row.id}
            row={row}
            variant="poster"
          />
        ))}
      </div>
    </AppShell>
  );
}