import type { Genre } from "@/types/media";

/**
 * Curated static genre list used for the visual "Browse by Genre" tiles.
 * Each entry maps to a TMDB genre id (movie namespace). The ids are stable
 * per TMDB and match what /discover/movie?with_genres= expects.
 */
export const STATIC_GENRES: (Genre & { tmdbId: number })[] = [
  { id: "action", name: "Action", gradient: "linear-gradient(135deg,#ef4444,#f97316)", tmdbId: 28 },
  { id: "drama", name: "Drama", gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)", tmdbId: 18 },
  { id: "scifi", name: "Sci-Fi", gradient: "linear-gradient(135deg,#06b6d4,#3b82f6)", tmdbId: 878 },
  { id: "comedy", name: "Comedy", gradient: "linear-gradient(135deg,#f59e0b,#ec4899)", tmdbId: 35 },
  { id: "romance", name: "Romance", gradient: "linear-gradient(135deg,#ec4899,#f43f5e)", tmdbId: 10749 },
  { id: "thriller", name: "Thriller", gradient: "linear-gradient(135deg,#0f172a,#7c3aed)", tmdbId: 53 },
  { id: "animation", name: "Animation", gradient: "linear-gradient(135deg,#10b981,#06b6d4)", tmdbId: 16 },
  { id: "horror", name: "Horror", gradient: "linear-gradient(135deg,#111827,#ef4444)", tmdbId: 27 },
  { id: "documentary", name: "Documentary", gradient: "linear-gradient(135deg,#64748b,#0ea5e9)", tmdbId: 99 },
  { id: "fantasy", name: "Fantasy", gradient: "linear-gradient(135deg,#a855f7,#6366f1)", tmdbId: 14 },
  { id: "mystery", name: "Mystery", gradient: "linear-gradient(135deg,#1e293b,#0ea5e9)", tmdbId: 9648 },
  { id: "adventure", name: "Adventure", gradient: "linear-gradient(135deg,#f97316,#eab308)", tmdbId: 12 },
];