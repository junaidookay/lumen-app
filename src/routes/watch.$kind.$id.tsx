import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { VideoPlayerUI } from "@/components/player/VideoPlayerUI";
import { SeasonSelector } from "@/components/tv/SeasonSelector";
import { EpisodeCard } from "@/components/tv/EpisodeCard";
import { SimilarContentRow, RecommendationRow } from "@/components/sections/RecommendationRow";
import { movieQuery, showQuery, seasonQuery } from "@/services/content";

export const Route = createFileRoute("/watch/$kind/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    season: Number(s.season ?? 1) || 1,
    episode: Number(s.episode ?? 1) || 1,
  }),
  loader: async ({ params, context }) => {
    try {
      if (params.kind === "movie") {
        await context.queryClient.ensureQueryData(movieQuery(params.id));
      } else if (params.kind === "tv") {
        await context.queryClient.ensureQueryData(showQuery(params.id));
      } else {
        throw notFound();
      }
    } catch {
      throw notFound();
    }
  },
  head: () => ({ meta: [{ title: "Watch — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: WatchPage,
});

function WatchPage() {
  const { kind, id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const isTV = kind === "tv";
  const movieData = useQuery({ ...movieQuery(id), enabled: !isTV });
  const tvData = useQuery({ ...showQuery(id), enabled: isTV });
  const detail = isTV ? tvData.data : movieData.data;
  if (!detail) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-32 sm:px-6 lg:px-10">
          <div className="h-96 animate-pulse rounded-3xl bg-white/5" />
        </div>
      </AppShell>
    );
  }
  const item = detail.item;
  const similar = detail.similar.slice(0, 8);
  const recs = detail.recommendations.slice(0, 8);
  const seasons = item.seasons ?? [];
  const [activeSeason, setActiveSeason] = useState(search.season);
  const seasonBase = seasons.find((s) => s.seasonNumber === activeSeason) ?? seasons[0];
  const seasonFull = useQuery({
    ...seasonQuery(item.id, seasonBase?.seasonNumber ?? 1),
    enabled: isTV && !!seasonBase,
  });
  const season = seasonFull.data ?? seasonBase;
  const currentEp = season?.episodes.find((e) => e.episodeNumber === search.episode) ?? season?.episodes[0];
  const upNext = season?.episodes.find((e) => e.episodeNumber === (currentEp?.episodeNumber ?? 0) + 1);

  const goEpisode = (n: number) =>
    navigate({ to: "/watch/$kind/$id", params: { kind: item.kind, id: item.id }, search: { season: activeSeason, episode: n } });

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 sm:px-6 lg:px-10">
        <Link
          to={item.kind === "tv" ? "/tv/$id" : "/movie/$id"}
          params={{ id: item.id }}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to details
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <VideoPlayerUI
              poster={currentEp?.still ?? item.backdrop}
              title={item.title}
              subtitle={currentEp ? `S${currentEp.seasonNumber}E${currentEp.episodeNumber} · ${currentEp.title}` : item.tagline}
              progress={currentEp?.progress ?? 0.32}
              onPrev={currentEp && currentEp.episodeNumber > 1 ? () => goEpisode(currentEp.episodeNumber - 1) : undefined}
              onNext={upNext ? () => goEpisode(upNext.episodeNumber) : undefined}
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
                {currentEp && (
                  <p className="text-sm text-muted-foreground">
                    Season {currentEp.seasonNumber} · Episode {currentEp.episodeNumber} — {currentEp.title}
                  </p>
                )}
              </div>
              {seasons.length > 0 && (
                <SeasonSelector seasons={seasons} activeSeason={activeSeason} onChange={setActiveSeason} />
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/80">
              {currentEp?.overview ?? item.overview}
            </p>
          </motion.div>

          <aside className="space-y-6">
            {upNext && (
              <section>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-brand">Up next</p>
                <EpisodeCard episode={upNext} />
              </section>
            )}
            {season && (
              <section>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Episodes · Season {activeSeason}</p>
                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {season.episodes.map((e: any, i: number) => (
                    <EpisodeCard key={e.id} episode={e} index={i} />
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <div className="space-y-12 pb-16">
        <SimilarContentRow items={similar} />
        <RecommendationRow title="Recommended for you" items={recs} />
      </div>
    </AppShell>
  );
}