import { useMemo, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { TVHero } from "@/components/detail/TVHero";
import { MetadataPanel } from "@/components/detail/MetadataPanel";
import { CastCard } from "@/components/detail/CastCard";
import { ReviewCard } from "@/components/detail/ReviewCard";
import { GalleryCarousel } from "@/components/detail/GalleryCarousel";
import { SeasonSelector } from "@/components/tv/SeasonSelector";
import { EpisodeList } from "@/components/tv/EpisodeList";
import { RecommendationRow, SimilarContentRow } from "@/components/sections/RecommendationRow";
import { showQuery, seasonQuery, getResolvedSeasons } from "@/services/content";

export const Route = createFileRoute("/tv/$id")({
  loader: async ({ params, context }) => {
    try {
      await context.queryClient.ensureQueryData(showQuery(params.id));
    } catch {
      throw notFound();
    }
  },
  head: () => ({ meta: [{ title: "Series — Watch Box" }] }),
  component: TVDetail,
});

function TVDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(showQuery(id));
  const show = data.item;
  const similar = data.similar;
  const recs = data.recommendations;
  const [activeSeason, setActiveSeason] = useState(1);
  const seasons = show.seasons ?? [];

  // Check which seasons have RD data
  const { data: resolvedSeasonRows } = useQuery({
    queryKey: ["resolved-seasons", id],
    queryFn: async () => {
      const seasonNums = await getResolvedSeasons({ data: { id } });
      return seasonNums.map((n: number) => ({ season_number: n }));
    },
  });

  const resolvedSeasonNums = useMemo(() => {
    const nums = new Set<number>(resolvedSeasonRows?.map((s: any) => s.season_number) ?? []);
    // Also check title-level episodes (from raw DB, not mapped MediaItem)
    const rawItem = show as any;
    if (rawItem.episodes) {
      for (const ep of rawItem.episodes as any[]) nums.add(ep.season);
    }
    // Check if media_item has rd_torrent_id (title-level magnet covers all seasons in episodes)
    return nums;
  }, [resolvedSeasonRows, (show as any).episodes]);

  // Filter seasons: show only resolved ones if any exist, otherwise show all
  const visibleSeasons = useMemo(() => {
    if (resolvedSeasonNums.size === 0) return seasons;
    return seasons.filter((s) => resolvedSeasonNums.has(s.seasonNumber));
  }, [seasons, resolvedSeasonNums]);

  // Auto-correct active season
  if (visibleSeasons.length > 0 && !visibleSeasons.find((s) => s.seasonNumber === activeSeason)) {
    setActiveSeason(visibleSeasons[0].seasonNumber);
  }

  const seasonNumber =
    visibleSeasons.find((s) => s.seasonNumber === activeSeason)?.seasonNumber ??
    visibleSeasons[0]?.seasonNumber ??
    1;
  const seasonDetail = useQuery(seasonQuery(show.id, seasonNumber));
  const season = seasonDetail.data ?? visibleSeasons.find((s) => s.seasonNumber === seasonNumber);

  return (
    <AppShell>
      <TVHero item={show} />

      <div className="mx-auto max-w-[1400px] space-y-16 px-4 py-16 sm:px-6 lg:px-10">
        {show.cast.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">Cast</h2>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
              {show.cast.map((c: any, i: number) => (
                <CastCard key={c.id} member={c} index={i} />
              ))}
            </div>
          </section>
        )}

        {visibleSeasons.length > 0 && season && (
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">Episodes</h2>
              <SeasonSelector
                seasons={visibleSeasons}
                activeSeason={activeSeason}
                onChange={setActiveSeason}
              />
            </div>
            <EpisodeList episodes={season.episodes} keyId={`${show.id}-s${activeSeason}`} />
          </section>
        )}

        {visibleSeasons.length === 0 && (
          <section className="text-center py-16">
            <p className="text-muted-foreground">
              No episodes available yet. Content is being processed.
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Details</h2>
          <MetadataPanel item={show} />
        </section>
      </div>

      {show.gallery?.length ? <GalleryCarousel images={show.gallery} /> : null}

      {show.reviews?.length ? (
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Reviews</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {show.reviews.slice(0, 4).map((r: any) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-12 py-8">
        <SimilarContentRow items={similar} />
        <RecommendationRow title="Recommended for you" items={recs} />
      </div>
    </AppShell>
  );
}
