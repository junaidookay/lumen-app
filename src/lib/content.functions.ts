/**
 * Content server functions. Public (no auth) — TMDB reads only.
 * Components/loaders call these; TMDB access never happens on the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Episode, MediaItem, MediaRow, Season } from "@/types/media";

// ---------------- home ----------------

export interface HomePayload {
  hero: MediaItem[];
  rows: MediaRow[];
}

export const getHome = createServerFn({ method: "GET" }).handler(async (): Promise<HomePayload> => {
  const {
    trending,
    popularMovies,
    popularTV,
    topRatedMovies,
    upcomingMovies,
    nowPlayingMovies,
    onTheAirTV,
  } = await import("./tmdb/repositories.server");
  const { mapListItems } = await import("./tmdb/mappers");

  const [tr, pm, pt, tm, up, np, ota] = await Promise.all([
    trending("all", "week"),
    popularMovies(),
    popularTV(),
    topRatedMovies(),
    upcomingMovies(),
    nowPlayingMovies(),
    onTheAirTV(),
  ]);

  const trendingItems = mapListItems(tr.results);

  const rows: MediaRow[] = [
    { id: "trending", title: "Trending Now", subtitle: "What everyone is watching this week", items: trendingItems.slice(0, 20) },
    { id: "popular-movies", title: "Popular Movies", items: mapListItems(pm.results, "movie").slice(0, 20) },
    { id: "popular-tv", title: "Popular Shows", items: mapListItems(pt.results, "tv").slice(0, 20) },
    { id: "top-rated", title: "Top Rated", items: mapListItems(tm.results, "movie").slice(0, 20) },
    { id: "upcoming", title: "Coming Soon", items: mapListItems(up.results, "movie").slice(0, 20) },
    { id: "now-playing", title: "In Theaters Now", items: mapListItems(np.results, "movie").slice(0, 20) },
    { id: "on-the-air", title: "On The Air", items: mapListItems(ota.results, "tv").slice(0, 20) },
  ];

  return { hero: trendingItems.slice(0, 5), rows };
});

// ---------------- discover ----------------

export interface DiscoverPayload {
  rows: MediaRow[];
  genres: { movie: { id: number; name: string }[]; tv: { id: number; name: string }[] };
}

export const getDiscover = createServerFn({ method: "GET" }).handler(async (): Promise<DiscoverPayload> => {
  const {
    trending, popularMovies, popularTV, topRatedMovies, upcomingMovies,
    onTheAirTV, airingTodayTV, movieGenres, tvGenres,
  } = await import("./tmdb/repositories.server");
  const { mapListItems } = await import("./tmdb/mappers");

  const [tr, pm, pt, tm, up, ota, at, mg, tg] = await Promise.all([
    trending("all", "day"),
    popularMovies(),
    popularTV(),
    topRatedMovies(),
    upcomingMovies(),
    onTheAirTV(),
    airingTodayTV(),
    movieGenres(),
    tvGenres(),
  ]);

  const rows: MediaRow[] = [
    { id: "trending-disc", title: "Trending Today", items: mapListItems(tr.results).slice(0, 20) },
    { id: "top-rated-disc", title: "Top Rated Movies", items: mapListItems(tm.results, "movie").slice(0, 20) },
    { id: "upcoming-disc", title: "Upcoming", items: mapListItems(up.results, "movie").slice(0, 20) },
    { id: "popular-movies-disc", title: "Popular Movies", items: mapListItems(pm.results, "movie").slice(0, 20) },
    { id: "popular-tv-disc", title: "Popular Shows", items: mapListItems(pt.results, "tv").slice(0, 20) },
    { id: "on-the-air-disc", title: "On The Air", items: mapListItems(ota.results, "tv").slice(0, 20) },
    { id: "airing-today-disc", title: "Airing Today", items: mapListItems(at.results, "tv").slice(0, 20) },
  ];

  return {
    rows,
    genres: {
      movie: mg.genres.map((g) => ({ id: g.id, name: g.name })),
      tv: tg.genres.map((g) => ({ id: g.id, name: g.name })),
    },
  };
});

// ---------------- filter / discover query ----------------

const discoverInput = z.object({
  kind: z.enum(["movie", "tv", "all"]).default("all"),
  page: z.number().int().min(1).max(500).default(1),
  sort: z.enum(["popularity", "rating", "newest", "oldest", "title"]).default("popularity"),
  genres: z.array(z.number().int()).default([]),
  minYear: z.number().int().optional(),
  maxYear: z.number().int().optional(),
  minRating: z.number().min(0).max(10).optional(),
});

export type DiscoverInput = z.infer<typeof discoverInput>;

function sortToTMDB(sort: DiscoverInput["sort"], kind: "movie" | "tv"): string {
  switch (sort) {
    case "rating": return "vote_average.desc";
    case "newest": return kind === "movie" ? "primary_release_date.desc" : "first_air_date.desc";
    case "oldest": return kind === "movie" ? "primary_release_date.asc" : "first_air_date.asc";
    case "title": return kind === "movie" ? "title.asc" : "name.asc";
    default: return "popularity.desc";
  }
}

export const runDiscover = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => discoverInput.parse(raw))
  .handler(async ({ data }) => {
    const { discover } = await import("./tmdb/repositories.server");
    const { mapListItems } = await import("./tmdb/mappers");

    const shared = {
      page: data.page,
      with_genres: data.genres.length ? data.genres.join(",") : undefined,
      "vote_average.gte": data.minRating,
    };

    async function run(kind: "movie" | "tv") {
      const query = {
        ...shared,
        sort_by: sortToTMDB(data.sort, kind),
        ...(kind === "movie"
          ? {
              "primary_release_date.gte": data.minYear ? `${data.minYear}-01-01` : undefined,
              "primary_release_date.lte": data.maxYear ? `${data.maxYear}-12-31` : undefined,
            }
          : {
              "first_air_date.gte": data.minYear ? `${data.minYear}-01-01` : undefined,
              "first_air_date.lte": data.maxYear ? `${data.maxYear}-12-31` : undefined,
            }),
      };
      const res = await discover({ kind, ...query });
      return { items: mapListItems(res.results, kind), totalPages: res.total_pages, page: res.page };
    }

    if (data.kind === "movie" || data.kind === "tv") {
      return run(data.kind);
    }
    // "all" → interleave movies + tv
    const [m, t] = await Promise.all([run("movie"), run("tv")]);
    const items: MediaItem[] = [];
    const max = Math.max(m.items.length, t.items.length);
    for (let i = 0; i < max; i++) {
      if (m.items[i]) items.push(m.items[i]);
      if (t.items[i]) items.push(t.items[i]);
    }
    return { items, totalPages: Math.min(m.totalPages, t.totalPages), page: data.page };
  });

// ---------------- details ----------------

const idInput = z.object({ id: z.string().min(1) });

export const getMovie = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => idInput.parse(raw))
  .handler(async ({ data }): Promise<{
    item: MediaItem;
    similar: MediaItem[];
    recommendations: MediaItem[];
    collectionItems: MediaItem[] | null;
  }> => {
    const { movieDetail, collectionDetail } = await import("./tmdb/repositories.server");
    const { mapMovieDetail, mapListItems } = await import("./tmdb/mappers");

    const d = await movieDetail(data.id);
    const item = mapMovieDetail(d);
    const similar = mapListItems(d.similar?.results ?? [], "movie");
    const recommendations = mapListItems(d.recommendations?.results ?? [], "movie");

    let collectionItems: MediaItem[] | null = null;
    if (d.belongs_to_collection) {
      try {
        const c = await collectionDetail(d.belongs_to_collection.id);
        collectionItems = mapListItems(c.parts ?? [], "movie").filter((m) => m.id !== item.id);
      } catch {
        collectionItems = null;
      }
    }

    return { item, similar, recommendations, collectionItems };
  });

export const getShow = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => idInput.parse(raw))
  .handler(async ({ data }): Promise<{
    item: MediaItem;
    similar: MediaItem[];
    recommendations: MediaItem[];
  }> => {
    const { tvDetail } = await import("./tmdb/repositories.server");
    const { mapTVDetail, mapListItems } = await import("./tmdb/mappers");
    const d = await tvDetail(data.id);
    return {
      item: mapTVDetail(d),
      similar: mapListItems(d.similar?.results ?? [], "tv"),
      recommendations: mapListItems(d.recommendations?.results ?? [], "tv"),
    };
  });

const seasonInput = z.object({ showId: z.string(), seasonNumber: z.number().int().min(0) });

export const getSeason = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => seasonInput.parse(raw))
  .handler(async ({ data }): Promise<Season> => {
    const { seasonDetail } = await import("./tmdb/repositories.server");
    const { mapSeasonDetail } = await import("./tmdb/mappers");
    const s = await seasonDetail(data.showId, data.seasonNumber);
    return mapSeasonDetail(data.showId, s);
  });

const episodeInput = z.object({
  showId: z.string(),
  seasonNumber: z.number().int().min(0),
  episodeNumber: z.number().int().min(1),
});

export const getEpisode = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => episodeInput.parse(raw))
  .handler(async ({ data }): Promise<Episode> => {
    const { episodeDetail } = await import("./tmdb/repositories.server");
    const { mapEpisode } = await import("./tmdb/mappers");
    const e = await episodeDetail(data.showId, data.seasonNumber, data.episodeNumber);
    return mapEpisode(data.showId, e);
  });

// ---------------- search ----------------

const searchInput = z.object({ q: z.string().default(""), page: z.number().int().min(1).max(500).default(1) });

export const runSearch = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => searchInput.parse(raw))
  .handler(async ({ data }): Promise<{ items: MediaItem[]; page: number; totalPages: number }> => {
    const q = data.q.trim();
    if (!q) return { items: [], page: 1, totalPages: 0 };
    const { searchMulti } = await import("./tmdb/repositories.server");
    const { mapMultiSearchItem } = await import("./tmdb/mappers");
    const res = await searchMulti({ query: q, page: data.page });
    const items = res.results
      .map(mapMultiSearchItem)
      .filter((x): x is MediaItem => !!x)
      .filter((x) => !!x.poster || !!x.backdrop);
    return { items, page: res.page, totalPages: res.total_pages };
  });

// ---------------- batch lookup (for library pages) ----------------

const batchInput = z.object({
  refs: z.array(z.object({ id: z.string(), kind: z.enum(["movie", "tv"]) })).max(200),
});

export const getMediaByRefs = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => batchInput.parse(raw))
  .handler(async ({ data }): Promise<MediaItem[]> => {
    if (!data.refs.length) return [];
    const { movieDetail, tvDetail } = await import("./tmdb/repositories.server");
    const { mapMovieDetail, mapTVDetail } = await import("./tmdb/mappers");

    const results = await Promise.allSettled(
      data.refs.map((r) =>
        r.kind === "movie"
          ? movieDetail(r.id).then(mapMovieDetail)
          : tvDetail(r.id).then(mapTVDetail),
      ),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<MediaItem> => r.status === "fulfilled")
      .map((r) => r.value);
  });

// ---------------- trending searches ----------------

export const getTrendingSearches = createServerFn({ method: "GET" }).handler(async (): Promise<string[]> => {
  const { trending } = await import("./tmdb/repositories.server");
  const res = await trending("all", "day");
  return res.results
    .slice(0, 10)
    .map((r) => ("title" in r ? (r as { title: string }).title : (r as { name: string }).name))
    .filter(Boolean);
});