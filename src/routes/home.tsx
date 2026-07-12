import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { HeroCarousel } from "@/components/hero/HeroCarousel";
import { MediaRow } from "@/components/sections/MediaRow";
import { homeQuery } from "@/services/content";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Lumen" },
      { name: "description", content: "Your streaming home. Trending, popular, top-rated and personalized picks." },
      { property: "og:title", content: "Home — Lumen" },
      { property: "og:description", content: "Your streaming home. Trending, popular, top-rated and personalized picks." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery()),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery());
  return (
    <AppShell>
      <HeroCarousel items={data.hero} />
      <div className="space-y-14 py-16">
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