/**
 * Admin content management server functions — magnet paste, auto-resolve, bulk resolve.
 * Ported from CinefloTV's AdminAutomation + ContentFormModal.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addMagnet, selectFiles, getTorrentInfo } from "../debrid/real-debrid";
import { searchTorrents, scoreTorrent, isTitleRelevant } from "../debrid/torrent-search";
import { buildTvEpisodesFromTorrentInfo } from "../debrid/episode-parser";

// ---- helpers ----

async function ensureAdmin(supabase: any, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Check user_roles via admin client (bypasses RLS)
  const { data, error } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Failed to resolve permissions");
  const roles = (data ?? []).map((r: any) => r.role as string);
  let ok = roles.includes("admin");
  if (!ok) {
    // Also check profiles.is_admin as fallback
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (profile?.is_admin) {
      ok = true;
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: "admin", granted_by: userId },
        { onConflict: "user_id,role" },
      );
    }
  }
  if (!ok) throw new Error("Forbidden");
}

/** Enrich new episodes with existing TMDB titles (preserve rd_link_index). */
async function enrichWithExistingTitles(
  supabaseAdmin: any,
  contentId: string,
  builtEpisodes: any[],
): Promise<any[]> {
  try {
    const { data: existingSeasons } = await supabaseAdmin
      .from("media_item_seasons")
      .select("season_number, episodes")
      .eq("media_item_id", contentId);
    const existingTitleMap = new Map<string, string>();
    for (const s of existingSeasons ?? []) {
      for (const ep of (s.episodes ?? []) as any[]) {
        if (
          ep.title &&
          !ep.title.includes(".") &&
          !ep.title.startsWith("Episode ") &&
          !ep.title.match(/^\d{1,4}$/)
        ) {
          existingTitleMap.set(`${s.season_number}:${ep.episode}`, ep.title);
        }
      }
    }
    return builtEpisodes.map((ep) => {
      const existingTitle = existingTitleMap.get(`${ep.season}:${ep.episode}`);
      if (existingTitle) return { ...ep, title: existingTitle };
      return ep;
    });
  } catch {
    return builtEpisodes;
  }
}

// ---- Resolve a magnet link for a specific content item ----

export const resolveMagnetForContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { contentId: string; magnet: string }) =>
    z
      .object({
        contentId: z.string().uuid(),
        magnet: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Add magnet to RD
    const { id: torrentId } = await addMagnet(data.magnet);
    await selectFiles(torrentId);

    // Wait for processing
    await new Promise((r) => setTimeout(r, 3000));
    const torrentInfo = await getTorrentInfo(torrentId);

    // Build episodes if TV
    const { data: content } = await supabaseAdmin
      .from("media_items")
      .select("id, kind")
      .eq("id", data.contentId)
      .single();

    let episodes: any[] | undefined;
    if (content?.kind === "tv" && torrentInfo.status === "downloaded") {
      episodes = buildTvEpisodesFromTorrentInfo(torrentInfo);
      // Enrich with existing TMDB titles
      episodes = await enrichWithExistingTitles(supabaseAdmin, data.contentId, episodes);
    }

    // Update content with RD metadata
    const update: any = {
      rd_torrent_id: torrentId,
      rd_info_hash: torrentInfo.hash,
    };
    if (episodes && episodes.length > 0) {
      update.episodes = episodes;
    }
    // If movie, set the first video URL
    if (
      content?.kind === "movie" &&
      torrentInfo.status === "downloaded" &&
      torrentInfo.links?.length > 0
    ) {
      const { unrestrictLink } = await import("../debrid/real-debrid");
      const unrestricted = await unrestrictLink(torrentInfo.links[0]);
      update.video_url = unrestricted.download;
    }

    await supabaseAdmin.from("media_items").update(update).eq("id", data.contentId);

    // For TV: also populate per-season rows in media_item_seasons
    if (episodes && episodes.length > 0 && content?.kind === "tv") {
      const seasonGroups = new Map<number, any[]>();
      for (const ep of episodes) {
        const list = seasonGroups.get(ep.season) ?? [];
        list.push(ep);
        seasonGroups.set(ep.season, list);
      }
      for (const [seasonNum, seasonEps] of seasonGroups) {
        await (supabaseAdmin as any).from("media_item_seasons").upsert(
          {
            media_item_id: data.contentId,
            season_number: seasonNum,
            rd_torrent_id: torrentId,
            rd_info_hash: torrentInfo.hash,
            episodes: seasonEps,
            rd_resolved_at: new Date().toISOString(),
          },
          { onConflict: "media_item_id,season_number" },
        );
      }
      // Update seasons_count on media_items
      await supabaseAdmin
        .from("media_items")
        .update({ seasons_count: seasonGroups.size } as any)
        .eq("id", data.contentId);
    }

    return {
      ok: true,
      status: torrentInfo.status,
      torrentId,
      episodes,
      filesCount: torrentInfo.files?.length ?? 0,
    };
  });

// ---- Resolve a magnet link for a specific season ----

export const resolveMagnetForSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { mediaItemId: string; seasonNumber: number; magnet: string }) =>
    z
      .object({
        mediaItemId: z.string().uuid(),
        seasonNumber: z.number().min(1),
        magnet: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { id: torrentId } = await addMagnet(data.magnet);
    await selectFiles(torrentId);
    await new Promise((r) => setTimeout(r, 3000));
    const torrentInfo = await getTorrentInfo(torrentId);

    let episodes = buildTvEpisodesFromTorrentInfo(torrentInfo);
    // Filter to only episodes matching this season
    episodes = episodes.filter((ep) => ep.season === data.seasonNumber);
    // Enrich with existing TMDB titles
    episodes = await enrichWithExistingTitles(supabaseAdmin, data.mediaItemId, episodes);

    await (supabaseAdmin as any).from("media_item_seasons").upsert(
      {
        media_item_id: data.mediaItemId,
        season_number: data.seasonNumber,
        rd_torrent_id: torrentId,
        rd_info_hash: torrentInfo.hash,
        episodes,
        rd_resolved_at: new Date().toISOString(),
      },
      { onConflict: "media_item_id,season_number" },
    );

    // Update seasons_count
    const { count } = await (supabaseAdmin as any)
      .from("media_item_seasons")
      .select("id", { count: "exact", head: true })
      .eq("media_item_id", data.mediaItemId);
    await supabaseAdmin
      .from("media_items")
      .update({ seasons_count: count ?? 0 } as any)
      .eq("id", data.mediaItemId);

    return {
      ok: true,
      status: torrentInfo.status,
      torrentId,
      episodes,
      filesCount: torrentInfo.files?.length ?? 0,
    };
  });

// ---- Import TMDB seasons & episodes metadata ----

export const importTmdbSeasons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { mediaItemId: string }) => z.object({ mediaItemId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mediaItem } = await supabaseAdmin
      .from("media_items")
      .select("id, tmdb_id, kind, title")
      .eq("id", data.mediaItemId)
      .single();

    if (!mediaItem) throw new Error("Media item not found");
    if (mediaItem.kind !== "tv") throw new Error("TMDB season import is only for TV shows");
    if (!mediaItem.tmdb_id)
      throw new Error("No TMDB ID set on this title. Add it via the content editor first.");

    const tmdbId = mediaItem.tmdb_id;
    const { tmdbFetch } = await import("@/lib/tmdb/client.server");

    // Fetch show details to get season list
    const show = await tmdbFetch<any>(`/tv/${tmdbId}`, {
      query: { append_to_response: "seasons" },
    });
    const tmdbSeasons = (show.seasons ?? []) as Array<{
      season_number: number;
      name: string;
      overview: string;
      poster_path: string | null;
      air_date: string | null;
    }>;

    let seasonsImported = 0;
    let episodesImported = 0;

    for (const s of tmdbSeasons) {
      if (s.season_number === 0) continue; // skip specials

      // Upsert season metadata (don't overwrite RD data)
      const { data: existingSeason } = await (supabaseAdmin as any)
        .from("media_item_seasons")
        .select("id, rd_torrent_id, episodes")
        .eq("media_item_id", data.mediaItemId)
        .eq("season_number", s.season_number)
        .maybeSingle();

      const seasonMeta = {
        name: s.name,
        overview: s.overview || null,
        poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
        air_date: s.air_date || null,
      };

      if (existingSeason) {
        // Only enrich metadata, don't overwrite episodes/RD data
        await (supabaseAdmin as any)
          .from("media_item_seasons")
          .update(seasonMeta)
          .eq("id", existingSeason.id);
      } else {
        await (supabaseAdmin as any).from("media_item_seasons").upsert(
          {
            media_item_id: data.mediaItemId,
            season_number: s.season_number,
            ...seasonMeta,
            episodes: [],
          },
          { onConflict: "media_item_id,season_number" },
        );
      }
      seasonsImported++;

      // Fetch episode details for this season
      try {
        const epData = await tmdbFetch<any>(`/tv/${tmdbId}/season/${s.season_number}`);
        const tmdbEps = (epData.episodes ?? []) as Array<{
          episode_number: number;
          name: string;
          overview: string;
          still_path: string | null;
          air_date: string | null;
          runtime: number | null;
        }>;

        // Enrich existing episodes with TMDB titles (preserve rd_link_index)
        if (existingSeason?.episodes && Array.isArray(existingSeason.episodes)) {
          const tmdbEpMap = new Map<number, any>();
          for (const ep of tmdbEps) {
            tmdbEpMap.set(ep.episode_number, {
              title: ep.name,
              overview: ep.overview,
              still: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null,
              airDate: ep.air_date,
              runtime: ep.runtime,
            });
          }
          const enriched = existingSeason.episodes.map((ep: any) => {
            const tmdb = tmdbEpMap.get(ep.episode);
            if (tmdb && tmdb.title) return { ...ep, title: tmdb.title };
            return ep;
          });
          await (supabaseAdmin as any)
            .from("media_item_seasons")
            .update({ episodes: enriched })
            .eq("id", existingSeason.id);
        }
        episodesImported += tmdbEps.length;
      } catch {
        // Season detail fetch failed — skip episodes for this season
      }
    }

    // Update seasons_count on media_items
    const { count } = await (supabaseAdmin as any)
      .from("media_item_seasons")
      .select("id", { count: "exact", head: true })
      .eq("media_item_id", data.mediaItemId);
    await supabaseAdmin
      .from("media_items")
      .update({ seasons_count: count ?? 0, tmdb_id: tmdbId } as any)
      .eq("id", data.mediaItemId);

    return { ok: true, seasonsImported, episodesImported };
  });

// ---- Search torrents for a content item ----

export const searchTorrentsForContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { query: string; type: "movie" | "tv" }) =>
    z.object({ query: z.string().min(1), type: z.enum(["movie", "tv"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);

    const results = await searchTorrents({
      query: data.query,
      type: data.type,
      maxResults: 50,
    });

    // Score and filter by relevance
    const scored = results
      .filter((t) => isTitleRelevant(t.name, data.query))
      .map((t) => ({
        ...t,
        score: scoreTorrent(t, data.type === "tv"),
      }))
      .sort((a, b) => b.score - a.score);

    return {
      results: scored.slice(0, 20),
      totalFound: results.length,
      relevantCount: scored.length,
    };
  });

// ---- Auto-resolve: search + pick best + add to RD ----

export const autoResolveContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { contentId: string; query: string; type: "movie" | "tv" }) =>
    z
      .object({
        contentId: z.string().uuid(),
        query: z.string().min(1),
        type: z.enum(["movie", "tv"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Search torrents
    const results = await searchTorrents({ query: data.query, type: data.type, maxResults: 50 });

    // Filter by relevance + score
    const scored = results
      .filter((t) => isTitleRelevant(t.name, data.query))
      .map((t) => ({ ...t, score: scoreTorrent(t, data.type === "tv") }))
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return { ok: false, error: "No relevant torrents found" };
    }

    const best = scored[0];

    // Add to RD
    const { id: torrentId } = await addMagnet(best.magnet);
    await selectFiles(torrentId);
    await new Promise((r) => setTimeout(r, 3000));
    const torrentInfo = await getTorrentInfo(torrentId);

    // Build episodes if TV
    let episodes: any[] | undefined;
    if (data.type === "tv" && torrentInfo.status === "downloaded") {
      episodes = buildTvEpisodesFromTorrentInfo(torrentInfo);
    }

    // Update content
    const update: any = {
      rd_torrent_id: torrentId,
      rd_info_hash: torrentInfo.hash,
    };
    if (episodes && episodes.length > 0) update.episodes = episodes;
    if (
      data.type === "movie" &&
      torrentInfo.status === "downloaded" &&
      torrentInfo.links?.length > 0
    ) {
      const { unrestrictLink } = await import("../debrid/real-debrid");
      const unrestricted = await unrestrictLink(torrentInfo.links[0]);
      update.video_url = unrestricted.download;
    }

    await supabaseAdmin.from("media_items").update(update).eq("id", data.contentId);

    return {
      ok: true,
      status: torrentInfo.status,
      torrentId,
      selectedTorrent: best.name,
      score: best.score,
      episodes,
    };
  });

// ---- List media items for admin dropdown ----

export const listMediaItemsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("media_items")
      .select("id, title, kind, year, rd_torrent_id")
      .order("title");
    return (data ?? []) as Array<{
      id: string;
      title: string;
      kind: string;
      year: number | null;
      rd_torrent_id: string | null;
    }>;
  });

// ---- Check instant availability for a list of info hashes ----

export const checkInstantAvailabilityForHashes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { hashes: string[] }) => z.object({ hashes: z.array(z.string()) }).parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { checkInstantAvailability } = await import("@/lib/debrid/real-debrid");
    return checkInstantAvailability(data.hashes);
  });

// ------------------------------------------------------------------
// Admin: List all content (movies + TV shows)
// ------------------------------------------------------------------

export const listAllContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("media_items")
      .select("id, title, kind, year, status, tags, poster_path, rd_torrent_id, tmdb_id, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

// ------------------------------------------------------------------
// Admin: Update tags for a media item
// ------------------------------------------------------------------

export const updateContentTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { mediaItemId: string; tags: string[] }) =>
    z.object({ mediaItemId: z.string().uuid(), tags: z.array(z.string()) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("media_items")
      .update({ tags: data.tags })
      .eq("id", data.mediaItemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------------------
// Admin: List all unique tags across content
// ------------------------------------------------------------------

export const listContentTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("media_items").select("tags");
    const tagSet = new Set<string>();
    for (const row of data ?? []) {
      if (Array.isArray(row.tags)) row.tags.forEach((t: string) => tagSet.add(t));
    }
    return Array.from(tagSet).sort();
  });
