/**
 * Download server function — resolves RD links for direct file download.
 * Checks eligibility, resolves the stream URL, records the download.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveStream } from "@/lib/debrid/resolve-stream";

export const resolveDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { contentId: string; kind: "movie" | "tv"; season?: number; episode?: number }) =>
      z
        .object({
          contentId: z.string(),
          kind: z.enum(["movie", "tv"]),
          season: z.number().optional(),
          episode: z.number().optional(),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check download eligibility
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("payment_method, downloads_today, downloads_reset_at, code_id, plan_id, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!sub || sub.plan_id === "free" || sub.status !== "active") {
      throw new Error("Premium subscription required for downloads");
    }

    // Code-based subs: check daily limit
    if (sub.payment_method === "code") {
      const now = new Date();
      const resetAt = sub.downloads_reset_at ? new Date(sub.downloads_reset_at) : null;
      let currentCount = sub.downloads_today ?? 0;
      if (!resetAt || now.toDateString() !== resetAt.toDateString()) {
        currentCount = 0;
      }
      const { data: codeRow } = sub.code_id
        ? await supabaseAdmin
            .from("redemption_codes")
            .select("max_downloads_per_day")
            .eq("id", sub.code_id)
            .maybeSingle()
        : { data: null };
      const maxDownloads = codeRow?.max_downloads_per_day ?? 3;
      if (currentCount >= maxDownloads) {
        throw new Error("Daily download limit reached. Try again tomorrow.");
      }
    }

    // 2. Fetch content metadata
    const { data: content } = await supabaseAdmin
      .from("media_items")
      .select("id, kind, rd_torrent_id, rd_info_hash, episodes, video_url, title")
      .eq("id", data.contentId)
      .single();

    if (!content) throw new Error("Content not found");

    // Check season-level RD data for TV
    let rdTorrentId = content.rd_torrent_id;
    let rdInfoHash = content.rd_info_hash;
    let episodes = (content.episodes as any[]) ?? undefined;

    if (content.kind === "tv" && data.season != null) {
      const { data: seasonRow } = await (supabaseAdmin as any)
        .from("media_item_seasons")
        .select("rd_torrent_id, rd_info_hash, episodes")
        .eq("media_item_id", data.contentId)
        .eq("season_number", data.season)
        .single();

      if (seasonRow?.rd_torrent_id) {
        rdTorrentId = seasonRow.rd_torrent_id;
        rdInfoHash = seasonRow.rd_info_hash;
        episodes = seasonRow.episodes ?? [];
      }
    }

    if (!rdTorrentId && !content.video_url) {
      throw new Error("No download source available for this content");
    }

    // 3. Resolve the stream URL (RD unrestricted URL is a direct download link)
    const result = await resolveStream({
      data: {
        contentId: content.id,
        kind: (content.kind || data.kind) as "movie" | "tv",
        season: data.season,
        episode: data.episode,
        rdTorrentId: rdTorrentId ?? undefined,
        rdInfoHash: rdInfoHash ?? undefined,
        episodes,
        videoEmbedUrl: content.video_url ?? undefined,
      },
    });

    if ("error" in result) {
      throw new Error(result.error || "Failed to resolve download source");
    }

    // 4. Record the download
    if (sub.payment_method === "code") {
      const now = new Date();
      const { data: currentSub } = await supabaseAdmin
        .from("subscriptions")
        .select("downloads_today, downloads_reset_at")
        .eq("user_id", context.userId)
        .maybeSingle();

      let currentCount = currentSub?.downloads_today ?? 0;
      const resetAt = currentSub?.downloads_reset_at ? new Date(currentSub.downloads_reset_at) : null;
      if (!resetAt || now.toDateString() !== resetAt.toDateString()) {
        currentCount = 0;
      }

      await supabaseAdmin
        .from("subscriptions")
        .update({ downloads_today: currentCount + 1, downloads_reset_at: now.toISOString() })
        .eq("user_id", context.userId);
    }

    return { url: result.stream_url, title: content.title };
  });
