import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EpisodeCard } from "@/components/tv/EpisodeCard";
import { getShow, getSeason, getEpisode, getAdjacentEpisode } from "@/services/media";

export const Route = createFileRoute("/tv/$id/season/$season/episode/$episode")({
  loader: ({ params }) => {
    const show = getShow(params.id);
    const season = getSeason(params.id, Number(params.season));
    const episode = getEpisode(params.id, Number(params.season), Number(params.episode));
    if (!show || !season || !episode) throw notFound();
    const prev = getAdjacentEpisode(params.id, Number(params.season), Number(params.episode), -1);
    const next = getAdjacentEpisode(params.id, Number(params.season), Number(params.episode), 1);
    return { show, season, episode, prev, next };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found — Lumen" }, { name: "robots", content: "noindex" }] };
    const { show, episode } = loaderData;
    return {
      meta: [
        { title: `${show.title} · S${episode.seasonNumber}E${episode.episodeNumber} — Lumen` },
        { name: "description", content: episode.overview.slice(0, 160) },
        { property: "og:title", content: `${show.title} · ${episode.title}` },
        { property: "og:image", content: episode.still },
      ],
    };
  },
  component: EpisodeDetail,
});

function EpisodeDetail() {
  const { show, season, episode, prev, next } = Route.useLoaderData();
  const related = season.episodes.filter((e: any) => e.id !== episode.id);
  const continueList = (show.seasons ?? []).flatMap((s: any) => s.episodes).filter((e: any) => typeof e.progress === "number").slice(0, 6);

  return (
    <AppShell>
      <section className="relative isolate w-full overflow-hidden pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
          className="absolute inset-0 -z-10"
        >
          <img src={episode.still} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        </motion.div>
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-12 pt-8 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-10">
          <div>
            <motion.img
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              src={episode.still} alt="" className="aspect-video w-full rounded-3xl border border-white/10 object-cover shadow-[var(--shadow-elevated)]"
            />
          </div>
          <div>
            <Link to="/tv/$id" params={{ id: show.id }} className="text-xs uppercase tracking-[0.2em] text-brand hover:underline">
              {show.title}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">Season {season.seasonNumber} · Episode {episode.episodeNumber}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{episode.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{episode.runtime}m</span>
              <span>·</span>
              <span>{new Date(episode.airDate).toLocaleDateString()}</span>
              <span className="ml-2 flex items-center gap-1"><Star className="h-3 w-3 fill-brand text-brand" />{episode.rating.toFixed(1)}</span>
            </div>
            <p className="mt-5 text-base leading-relaxed text-foreground/85">{episode.overview}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/watch/$kind/$id"
                params={{ kind: "tv", id: show.id }}
                search={{ season: episode.seasonNumber, episode: episode.episodeNumber }}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-[var(--shadow-glow)]"
              >
                <Play className="h-4 w-4 fill-current" /> Play
              </Link>
              {prev && (
                <Link
                  to="/tv/$id/season/$season/episode/$episode"
                  params={{ id: show.id, season: String(prev.seasonNumber), episode: String(prev.episodeNumber) }}
                  className="inline-flex items-center gap-1 rounded-full glass border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              )}
              {next && (
                <Link
                  to="/tv/$id/season/$season/episode/$episode"
                  params={{ id: show.id, season: String(next.seasonNumber), episode: String(next.episodeNumber) }}
                  className="inline-flex items-center gap-1 rounded-full glass border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-14 px-4 py-8 sm:px-6 lg:px-10">
        <section>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">More from Season {season.seasonNumber}</h2>
          <div className="grid gap-3">
            {related.map((e: any, i: number) => <EpisodeCard key={e.id} episode={e} index={i} />)}
          </div>
        </section>
        {continueList.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">Continue watching</h2>
            <div className="grid gap-3">
              {continueList.map((e: any, i: number) => <EpisodeCard key={e.id} episode={e} index={i} />)}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}