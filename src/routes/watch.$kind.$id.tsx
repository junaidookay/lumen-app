import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { SeasonSelector } from "@/components/tv/SeasonSelector";
import { EpisodeCard } from "@/components/tv/EpisodeCard";
import { SimilarContentRow, RecommendationRow } from "@/components/sections/RecommendationRow";
import { movieQuery, showQuery, seasonQuery, getResolvedSeasons } from "@/services/content";
import { getPlaybackSources, DEFAULT_PREFS } from "@/lib/streaming/service";
import type { PlaybackPreferences } from "@/lib/streaming/types";
import { useAuth } from "@/hooks/use-auth";
import {
  listContinueWatching,
  upsertContinueWatching,
  logHistory,
  getSettings,
  updateSettings,
} from "@/services/library";

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
  head: () => ({ meta: [{ title: "Watch — Watch Box" }, { name: "robots", content: "noindex" }] }),
  component: WatchPage,
});

function WatchPage() {
  const { kind, id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const isTV = kind === "tv";
  const movieData = useQuery({ ...movieQuery(id), enabled: !isTV });
  const tvData = useQuery({ ...showQuery(id), enabled: isTV });
  const detail = isTV ? tvData.data : movieData.data;

  // Load user prefs (or defaults) and hold locally so player writes are instant.
  const [prefs, setPrefs] = useState<PlaybackPreferences>(DEFAULT_PREFS);
  useEffect(() => {
    if (!user) return;
    void getSettings(user.id).then((s) => {
      if (!s) return;
      setPrefs({
        audioLanguage: s.language ?? "en",
        subtitleLanguage:
          (s as unknown as { subtitle_language?: string }).subtitle_language ?? "en",
        subtitlesEnabled:
          (s as unknown as { subtitles_enabled?: boolean }).subtitles_enabled ?? true,
        quality: s.quality ?? "auto",
        playbackSpeed: Number((s as unknown as { playback_speed?: number }).playback_speed ?? 1),
        preferredProvider:
          (s as unknown as { preferred_provider?: string }).preferred_provider ?? "sample",
      });
    });
  }, [user]);

  // Streaming sources
  const sourceReq = useMemo(
    () => ({
      kind: (kind === "tv" ? "tv" : "movie") as "tv" | "movie",
      mediaId: id,
      season: isTV ? search.season : undefined,
      episode: isTV ? search.episode : undefined,
    }),
    [kind, id, isTV, search.season, search.episode],
  );
  const { data: sourcesData } = useQuery({
    queryKey: ["playback-sources", sourceReq, prefs.preferredProvider, prefs.preferredSourceId],
    queryFn: () => getPlaybackSources({ data: { req: sourceReq, prefs } }),
    staleTime: 5 * 60 * 1000,
  });

  // Resume position from continue_watching
  const { data: continueRows } = useQuery({
    queryKey: ["continue-watching", user?.id],
    queryFn: () => listContinueWatching(),
    enabled: !!user,
  });
  const resumeSeconds = useMemo(() => {
    if (!continueRows) return 0;
    const row = continueRows.find(
      (r) =>
        r.media_id === id &&
        (isTV ? r.season === search.season && r.episode === search.episode : true),
    );
    return row?.progress_seconds ?? 0;
  }, [continueRows, id, isTV, search.season, search.episode]);

  // Throttle progress writes to Supabase (every ~15s while playing)
  const lastSaveRef = useRef(0);
  const lastHistoryRef = useRef(0);

  // Derived values from detail (must be before any early return)
  const item = detail?.item;
  const seasons = item?.seasons ?? [];
  const [activeSeason, setActiveSeason] = useState(search.season);

  // Check resolved seasons for auto-redirect
  const { data: resolvedSeasonRows } = useQuery({
    queryKey: ["resolved-seasons", id],
    queryFn: async () => {
      const seasonNums = await getResolvedSeasons({ data: { id } });
      return seasonNums.map((n: number) => ({ season_number: n }));
    },
    enabled: isTV,
  });

  const resolvedSeasonNums = useMemo(() => {
    const nums = new Set<number>(resolvedSeasonRows?.map((s: any) => s.season_number) ?? []);
    // Also check title-level episodes (from raw DB, not mapped MediaItem)
    const rawItem = item as any;
    if (rawItem.episodes) {
      for (const ep of rawItem.episodes as any[]) nums.add(ep.season);
    }
    return nums;
  }, [resolvedSeasonRows, (item as any)?.episodes]);

  // Auto-redirect to first available season if current season has no data
  useEffect(() => {
    if (isTV && resolvedSeasonNums.size > 0 && !resolvedSeasonNums.has(activeSeason)) {
      const firstAvailable = Math.min(...resolvedSeasonNums);
      navigate({
        to: "/watch/$kind/$id",
        params: { kind, id },
        search: { season: firstAvailable, episode: 1 },
        replace: true,
      });
    }
  }, [activeSeason, resolvedSeasonNums, isTV]);

  const seasonBase = seasons.find((s) => s.seasonNumber === activeSeason) ?? seasons[0];
  const seasonFull = useQuery({
    ...seasonQuery(item?.id ?? "", seasonBase?.seasonNumber ?? 1),
    enabled: isTV && !!seasonBase && !!item,
  });
  const season = seasonFull.data ?? seasonBase;
  const currentEp =
    season?.episodes.find((e) => e.episodeNumber === search.episode) ?? season?.episodes[0];
  const upNext = season?.episodes.find(
    (e) => e.episodeNumber === (currentEp?.episodeNumber ?? 0) + 1,
  );

  if (!detail || !item) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-32 sm:px-6 lg:px-10">
          <div className="h-96 animate-pulse rounded-3xl bg-white/5" />
        </div>
      </AppShell>
    );
  }

  const similar = detail.similar.slice(0, 8);
  const recs = detail.recommendations.slice(0, 8);

  const goEpisode = (n: number) =>
    navigate({
      to: "/watch/$kind/$id",
      params: { kind: item.kind, id: item.id },
      search: { season: activeSeason, episode: n },
    });

  const handlePreferenceChange = (patch: Partial<PlaybackPreferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    if (!user) return;
    const map: Record<string, unknown> = {};
    if (patch.audioLanguage !== undefined) map.language = patch.audioLanguage;
    if (patch.subtitleLanguage !== undefined) map.subtitle_language = patch.subtitleLanguage;
    if (patch.subtitlesEnabled !== undefined) map.subtitles_enabled = patch.subtitlesEnabled;
    if (patch.quality !== undefined) map.quality = patch.quality;
    if (patch.playbackSpeed !== undefined) map.playback_speed = patch.playbackSpeed;
    if (patch.preferredProvider !== undefined) map.preferred_provider = patch.preferredProvider;
    if (Object.keys(map).length) void updateSettings(user.id, map as never);
  };

  const handleProgress = (info: {
    positionSeconds: number;
    durationSeconds: number;
    percent: number;
    sourceId: string;
  }) => {
    if (!user || !info.durationSeconds) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 15_000) return;
    lastSaveRef.current = now;
    void upsertContinueWatching(user.id, {
      media_id: item.id,
      media_kind: item.kind,
      season: isTV ? search.season : undefined,
      episode: isTV ? search.episode : undefined,
      progress_seconds: Math.floor(info.positionSeconds),
      duration_seconds: Math.floor(info.durationSeconds),
    });
    if (now - lastHistoryRef.current > 5 * 60_000) {
      lastHistoryRef.current = now;
      void logHistory(user.id, {
        media_id: item.id,
        media_kind: item.kind,
        season: isTV ? search.season : undefined,
        episode: isTV ? search.episode : undefined,
        progress_seconds: Math.floor(info.positionSeconds),
        duration_seconds: Math.floor(info.durationSeconds),
      });
    }
  };

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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {sourcesData && sourcesData.sources.length > 0 ? (
              <VideoPlayer
                mediaId={item.id}
                mediaKind={item.kind}
                season={isTV ? search.season : undefined}
                episode={isTV ? search.episode : undefined}
                title={item.title}
                subtitle={
                  currentEp
                    ? `S${currentEp.seasonNumber}E${currentEp.episodeNumber} · ${currentEp.title}`
                    : item.tagline
                }
                poster={currentEp?.still ?? item.backdrop}
                sources={sourcesData.sources}
                resumeSeconds={resumeSeconds}
                preferences={prefs}
                onPreferenceChange={handlePreferenceChange}
                onProgress={handleProgress}
                onPrev={
                  currentEp && currentEp.episodeNumber > 1
                    ? () => goEpisode(currentEp.episodeNumber - 1)
                    : undefined
                }
                onNext={upNext ? () => goEpisode(upNext.episodeNumber) : undefined}
                upNext={
                  upNext
                    ? {
                        title: upNext.title,
                        still: upNext.still,
                        onPlay: () => goEpisode(upNext.episodeNumber),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="aspect-video w-full animate-pulse rounded-3xl bg-white/5" />
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
                {currentEp && (
                  <p className="text-sm text-muted-foreground">
                    Season {currentEp.seasonNumber} · Episode {currentEp.episodeNumber} —{" "}
                    {currentEp.title}
                  </p>
                )}
              </div>
              {seasons.length > 0 && (
                <SeasonSelector
                  seasons={seasons}
                  activeSeason={activeSeason}
                  onChange={setActiveSeason}
                />
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
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Episodes · Season {activeSeason}
                </p>
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
