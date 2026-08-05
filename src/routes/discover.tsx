import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { SlidersHorizontal, Search, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MediaRow } from "@/components/sections/MediaRow";
import { GenreTile } from "@/components/discover/GenreTile";
import { FilterDrawer } from "@/components/filters/FilterDrawer";
import { SortDropdown } from "@/components/filters/SortDropdown";
import { MediaCard } from "@/components/cards/MediaCard";
import { discoverPageQuery, discoverFilterQuery } from "@/services/content";
import { STATIC_GENRES } from "@/constants/genres";
import type { CatalogueFilters } from "@/services/media";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Watch Box" },
      { name: "description", content: "Explore genres, curated collections, trending titles and editorial picks." },
      { property: "og:title", content: "Discover — Watch Box" },
      { property: "og:description", content: "Explore genres, curated collections, trending titles and editorial picks." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(discoverPageQuery()),
  component: Discover,
});

function Discover() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<CatalogueFilters>({ kind: "all", genres: [], sort: "trending" });
  const hasFilter = (filters.genres?.length ?? 0) > 0 || filters.minYear || filters.minRating || filters.kind !== "all";
  const { data: page } = useSuspenseQuery(discoverPageQuery());

  // Map local filter keys (genre names) to TMDB ids for the server call.
  const tmdbSort = useMemo(() => {
    switch (filters.sort) {
      case "rating": return "rating" as const;
      case "newest": return "newest" as const;
      case "oldest": return "oldest" as const;
      case "title": return "title" as const;
      default: return "popularity" as const;
    }
  }, [filters.sort]);
  const genreIds = useMemo(() => {
    const byName = new Map(STATIC_GENRES.map((g) => [g.name.toLowerCase(), g.tmdbId]));
    return (filters.genres ?? [])
      .map((n) => byName.get(n.toLowerCase()))
      .filter((x): x is number => typeof x === "number");
  }, [filters.genres]);

  const filterInput = useMemo(
    () => ({
      kind: (filters.kind ?? "all") as "all" | "movie" | "tv",
      page: 1,
      sort: tmdbSort,
      genres: genreIds,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      minRating: filters.minRating,
    }),
    [filters.kind, tmdbSort, genreIds, filters.minYear, filters.maxYear, filters.minRating],
  );

  const filteredQuery = useQuery({ ...discoverFilterQuery(filterInput), enabled: !!hasFilter });
  const filtered = filteredQuery.data?.items ?? [];

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-8 pt-32 sm:px-6 lg:px-10">
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[420px]" style={{ background: "var(--gradient-radial)" }} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Discover</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
            A quiet way to find your <span className="text-gradient-brand">next favorite</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Explore hand-picked collections, moody genres, and the titles everyone is watching this week.
          </p>
          <Link
            to="/search"
            className="mt-8 inline-flex items-center gap-2 rounded-full glass border border-white/10 px-5 py-3 text-sm transition hover:bg-white/10"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Search movies, series, genres…</span>
          </Link>
        </motion.div>
      </section>

      {/* Filter bar */}
      <section className="px-4 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 rounded-2xl glass border border-white/10 p-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters{hasFilter ? ` · ${(filters.genres?.length ?? 0) + (filters.minYear ? 1 : 0) + (filters.minRating ? 1 : 0) + (filters.kind !== "all" ? 1 : 0)}` : ""}
          </button>
          <SortDropdown
            value={filters.sort ?? "trending"}
            onChange={(v) => setFilters({ ...filters, sort: v as CatalogueFilters["sort"] })}
            options={[
              { value: "trending", label: "Trending" },
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
              { value: "rating", label: "Top rated" },
              { value: "title", label: "A → Z" },
            ]}
          />
        </div>
      </section>

      {hasFilter && (
        <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {filteredQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {filtered.length} title{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          >
            {filtered.map((item, i) => (
              <MediaCard key={item.id} item={item} index={i} className="w-full" />
            ))}
          </motion.div>
        </section>
      )}

      {/* Categories / genres */}
      <section className="px-4 py-10 sm:px-6 lg:px-10">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Genres</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick a mood.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {STATIC_GENRES.map((g, i) => (
            <GenreTile key={g.id} genre={g} index={i} />
          ))}
        </div>
      </section>

      {/* Rails */}
      <div className="space-y-14 py-8">
        {page.rows.map((row) => (
          <MediaRow key={row.id} row={row} />
        ))}
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} value={filters} onChange={setFilters} />
    </AppShell>
  );
}