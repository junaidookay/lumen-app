/**
 * Embed fallback streaming provider — uses TMDB ID to generate embed URLs.
 * Lowest priority, used when no RD source exists.
 */
import type { StreamRequest, StreamingSource } from "../types";
import type { StreamingProvider } from "./registry";
import { EMBED_SOURCES } from "../../debrid/embed-sources";

async function resolveEmbedSources(req: StreamRequest): Promise<StreamingSource[]> {
  try {
    // Fetch TMDB ID from media_items
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: content } = await supabaseAdmin
      .from("media_items")
      .select("id, tmdb_id, kind, title")
      .eq("id", req.mediaId)
      .single();

    if (!content?.tmdb_id) return [];

    const tmdbId = String(content.tmdb_id);
    const type = content.kind as "movie" | "tv";

    return EMBED_SOURCES.map((source: (typeof EMBED_SOURCES)[number]) => ({
      id: `embed-${source.name.toLowerCase().replace(/\./g, "")}-${content.id}`,
      provider: source.name,
      providerId: `embed-${source.name.toLowerCase().replace(/\./g, "")}`,
      label: `${content.title} (${source.name})`,
      language: "en",
      container: "mp4" as const,
      codec: "unknown" as const,
      url: source.getEmbedUrl(tmdbId, type, req.season, req.episode),
      qualities: [{ id: "auto", label: "Auto" }],
      subtitles: [],
      audioTracks: [],
      default: false,
      health: "unknown" as const,
    }));
  } catch {
    return [];
  }
}

export const embedFallbackProvider: StreamingProvider = {
  id: "embed-fallback",
  name: "Embed Fallbacks",
  list: resolveEmbedSources,
};
