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
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Failed to resolve permissions");
  const roles = (data ?? []).map((r: any) => r.role as string);
  let ok = roles.includes("admin");
  if (!ok) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

// ---- Resolve a magnet link for a specific content item ----

export const resolveMagnetForContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: {
    contentId: string;
    magnet: string;
  }) =>
    z.object({
      contentId: z.string().uuid(),
      magnet: z.string().min(10),
    }).parse(d),
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
    if (content?.kind === "movie" && torrentInfo.status === "downloaded" && torrentInfo.links?.length > 0) {
      const { unrestrictLink } = await import("../debrid/real-debrid");
      const unrestricted = await unrestrictLink(torrentInfo.links[0]);
      update.video_url = unrestricted.download;
    }

    await supabaseAdmin.from("media_items").update(update).eq("id", data.contentId);

    return {
      ok: true,
      status: torrentInfo.status,
      torrentId,
      episodes,
      filesCount: torrentInfo.files?.length ?? 0,
    };
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
  .validator((d: {
    contentId: string;
    query: string;
    type: "movie" | "tv";
  }) =>
    z.object({
      contentId: z.string().uuid(),
      query: z.string().min(1),
      type: z.enum(["movie", "tv"]),
    }).parse(d),
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
    if (data.type === "movie" && torrentInfo.status === "downloaded" && torrentInfo.links?.length > 0) {
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
