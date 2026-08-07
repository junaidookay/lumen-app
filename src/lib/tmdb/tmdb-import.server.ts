/**
 * TMDB Import — server functions for searching and importing titles.
 * Uses the existing tmdbFetch (v4 Bearer token) for API calls.
 * Writes to media_items table (cinema-core schema).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Check user_roles via admin client (bypasses RLS)
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (roles.includes("admin")) return roles;
  // Also check profiles.is_admin as fallback
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.is_admin) return roles;
  throw new Error("Forbidden");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- Search TMDB (multi-search: movies + TV) ----

export const searchTmdbTitles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { query: string }) => z.object({ query: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { tmdbFetch } = await import("@/lib/tmdb/client.server");

    const result = await tmdbFetch<any>("/search/multi", {
      query: { query: data.query, include_adult: false, language: "en-US" },
    });

    return (result.results ?? [])
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 20)
      .map((r: any) => {
        const isTv = r.media_type === "tv";
        const title = isTv ? r.name : r.title;
        const date = isTv ? r.first_air_date : r.release_date;
        const year = date ? Number(String(date).slice(0, 4)) : null;
        return {
          tmdbId: r.id,
          mediaType: r.media_type,
          title,
          year,
          overview: r.overview ?? null,
          posterPath: r.poster_path ?? null,
          backdropPath: r.backdrop_path ?? null,
          rating: r.vote_average ?? 0,
        };
      });
  });

// ---- Import a single title from TMDB ----

export const importTmdbTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { tmdbId: number; mediaType: "movie" | "tv" }) =>
    z.object({ tmdbId: z.number(), mediaType: z.enum(["movie", "tv"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tmdbFetch } = await import("@/lib/tmdb/client.server");

    // Check for duplicate by tmdb_id + kind
    const { data: existing } = await (supabaseAdmin as any)
      .from("media_items")
      .select("id, title")
      .eq("tmdb_id", data.tmdbId)
      .eq("kind", data.mediaType)
      .maybeSingle();
    if (existing) {
      return { ok: true, id: existing.id, title: existing.title, duplicate: true };
    }

    // Fetch full details from TMDB
    const endpoint = data.mediaType === "tv" ? `/tv/${data.tmdbId}` : `/movie/${data.tmdbId}`;
    const detail = await tmdbFetch<any>(endpoint, {
      query: { append_to_response: "credits,videos,images" },
    });

    const isTv = data.mediaType === "tv";
    const title = isTv ? detail.name : detail.title;
    const date = isTv ? detail.first_air_date : detail.release_date;
    const year = date ? Number(String(date).slice(0, 4)) : null;

    // Build episodes JSONB for TV shows
    const episodes: any[] = [];
    if (isTv && detail.seasons) {
      for (const s of detail.seasons) {
        if (s.season_number === 0) continue; // skip specials
        try {
          const seasonDetail = await tmdbFetch<any>(`/tv/${data.tmdbId}/season/${s.season_number}`);
          for (const ep of seasonDetail.episodes ?? []) {
            episodes.push({
              season: s.season_number,
              episode: ep.episode_number,
              title: ep.name ?? `Episode ${ep.episode_number}`,
              overview: ep.overview ?? null,
              still: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null,
              airDate: ep.air_date ?? null,
              runtime: ep.runtime ?? null,
            });
          }
        } catch {
          // Season detail fetch failed — skip episodes for this season
        }
      }
    }

    const kind = data.mediaType;
    const rowData: Record<string, any> = {
      tmdb_id: data.tmdbId,
      kind,
      title,
      overview: detail.overview ?? null,
      poster_path: detail.poster_path
        ? `https://image.tmdb.org/t/p/w780${detail.poster_path}`
        : null,
      backdrop_path: detail.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}`
        : null,
      year,
      status: "published",
    };

    if (isTv) {
      rowData.episodes = episodes;
    }

    const { data: inserted, error } = await (supabaseAdmin as any)
      .from("media_items")
      .insert(rowData)
      .select("id, title")
      .single();

    if (error) throw new Error(`Failed to insert: ${error.message}`);

    return { ok: true, id: inserted.id, title: inserted.title, duplicate: false };
  });

// ---- Batch import multiple titles from TMDB ----

export const batchImportTmdbTitles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { items: Array<{ tmdbId: number; mediaType: "movie" | "tv" }> }) =>
    z
      .object({
        items: z.array(z.object({ tmdbId: z.number(), mediaType: z.enum(["movie", "tv"]) })),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tmdbFetch } = await import("@/lib/tmdb/client.server");

    const results: Array<{
      tmdbId: number;
      ok: boolean;
      id?: string;
      title?: string;
      error?: string;
      duplicate?: boolean;
    }> = [];

    for (const item of data.items) {
      try {
        // Check duplicate
        const { data: existing } = await (supabaseAdmin as any)
          .from("media_items")
          .select("id, title")
          .eq("tmdb_id", item.tmdbId)
          .eq("kind", item.mediaType)
          .maybeSingle();
        if (existing) {
          results.push({
            tmdbId: item.tmdbId,
            ok: true,
            id: existing.id,
            title: existing.title,
            duplicate: true,
          });
          continue;
        }

        const endpoint = item.mediaType === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;
        const detail = await tmdbFetch<any>(endpoint, {
          query: { append_to_response: "credits,videos,images" },
        });

        const isTv = item.mediaType === "tv";
        const title = isTv ? detail.name : detail.title;
        const date = isTv ? detail.first_air_date : detail.release_date;
        const year = date ? Number(String(date).slice(0, 4)) : null;

        const episodes: any[] = [];
        if (isTv && detail.seasons) {
          for (const s of detail.seasons) {
            if (s.season_number === 0) continue;
            try {
              const seasonDetail = await tmdbFetch<any>(
                `/tv/${item.tmdbId}/season/${s.season_number}`,
              );
              for (const ep of seasonDetail.episodes ?? []) {
                episodes.push({
                  season: s.season_number,
                  episode: ep.episode_number,
                  title: ep.name ?? `Episode ${ep.episode_number}`,
                  overview: ep.overview ?? null,
                  still: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null,
                  airDate: ep.air_date ?? null,
                  runtime: ep.runtime ?? null,
                });
              }
            } catch {
              // Skip episodes for this season
            }
          }
        }

        const rowData: Record<string, any> = {
          tmdb_id: item.tmdbId,
          kind: item.mediaType,
          title,
          overview: detail.overview ?? null,
          poster_path: detail.poster_path
            ? `https://image.tmdb.org/t/p/w780${detail.poster_path}`
            : null,
          backdrop_path: detail.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}`
            : null,
          year,
          status: "published",
        };
        if (isTv) {
          rowData.episodes = episodes;
        }

        const { data: inserted, error } = await (supabaseAdmin as any)
          .from("media_items")
          .insert(rowData)
          .select("id, title")
          .single();

        if (error) throw new Error(`Failed to insert: ${error.message}`);
        results.push({
          tmdbId: item.tmdbId,
          ok: true,
          id: inserted.id,
          title: inserted.title,
          duplicate: false,
        });
      } catch (err: any) {
        results.push({ tmdbId: item.tmdbId, ok: false, error: err?.message ?? "Failed" });
      }
    }

    return results;
  });
