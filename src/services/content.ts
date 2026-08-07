/**
 * Content services — client-side facade over the server functions.
 * Every function returns a TanStack Query `queryOptions` so the same
 * cache key is shared between loaders and components.
 */
import { queryOptions } from "@tanstack/react-query";
import {
  getDiscover,
  getHome,
  getMovie,
  getSeason,
  getShow,
  runDiscover,
  runSearch,
  getMediaByRefs,
  getTrendingSearches,
  getResolvedSeasons,
  type DiscoverInput,
} from "@/lib/content.functions";
import type { MediaKind } from "@/types/media";

const HOUR = 1000 * 60 * 60;

export const homeQuery = () =>
  queryOptions({
    queryKey: ["home"],
    queryFn: () => getHome(),
    staleTime: 15 * 60 * 1000,
    gcTime: HOUR,
  });

export const discoverPageQuery = () =>
  queryOptions({
    queryKey: ["discover"],
    queryFn: () => getDiscover(),
    staleTime: 30 * 60 * 1000,
    gcTime: HOUR,
  });

export const discoverFilterQuery = (filters: Partial<DiscoverInput>) =>
  queryOptions({
    queryKey: ["discover", "filter", filters],
    queryFn: () => runDiscover({ data: filters }),
    staleTime: 10 * 60 * 1000,
  });

export const searchQuery = (q: string, page = 1) =>
  queryOptions({
    queryKey: ["search", q, page],
    queryFn: () => runSearch({ data: { q, page } }),
    staleTime: 5 * 60 * 1000,
    enabled: q.trim().length > 0,
  });

export const trendingSearchesQuery = () =>
  queryOptions({
    queryKey: ["search", "trending"],
    queryFn: () => getTrendingSearches(),
    staleTime: HOUR,
  });

export const movieQuery = (id: string) =>
  queryOptions({
    queryKey: ["movie", id],
    queryFn: () => getMovie({ data: { id } }),
    staleTime: HOUR,
  });

export const showQuery = (id: string) =>
  queryOptions({
    queryKey: ["tv", id],
    queryFn: () => getShow({ data: { id } }),
    staleTime: HOUR,
  });

export const seasonQuery = (showId: string, seasonNumber: number) =>
  queryOptions({
    queryKey: ["tv", showId, "season", seasonNumber],
    queryFn: () => getSeason({ data: { showId, seasonNumber } }),
    staleTime: HOUR,
  });

export const mediaBatchQuery = (refs: { id: string; kind: MediaKind }[]) =>
  queryOptions({
    queryKey: ["media-batch", refs],
    queryFn: () => getMediaByRefs({ data: { refs } }),
    staleTime: HOUR,
    enabled: refs.length > 0,
  });

export { getResolvedSeasons };