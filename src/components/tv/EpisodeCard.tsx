import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Play, Star, Download } from "lucide-react";
import { toast } from "sonner";
import type { Episode } from "@/types/media";
import { usePermissions } from "@/hooks/use-permissions";
import { isPremium } from "@/lib/permissions";
import { resolveDownloadUrl } from "@/lib/billing/downloads.functions";

export function EpisodeCard({ episode, index = 0 }: { episode: Episode; index?: number }) {
  const [downloading, setDownloading] = useState(false);
  const { data: perms } = usePermissions();
  const premium = isPremium(perms);

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      const res = await resolveDownloadUrl({
        data: {
          contentId: episode.showId,
          kind: "tv",
          season: episode.seasonNumber,
          episode: episode.episodeNumber,
        },
      });
      window.open(res.url, "_blank");
      toast.success(`Downloading ${res.title} E${episode.episodeNumber}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04 }}
    >
      <Link
        to="/tv/$id/season/$season/episode/$episode"
        params={{
          id: episode.showId,
          season: String(episode.seasonNumber),
          episode: String(episode.episodeNumber),
        }}
        className="group flex flex-col gap-3 rounded-2xl border border-white/5 bg-surface/40 p-3 transition hover:bg-white/5 sm:flex-row"
      >
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-[240px]">
          <img src={episode.still} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-foreground shadow-[var(--shadow-glow)]"><Play className="h-5 w-5 fill-current" /></span>
          </div>
          {typeof episode.progress === "number" && (
            <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-brand" style={{ width: `${episode.progress * 100}%` }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>E{episode.episodeNumber}</span>
            <span>·</span>
            <span>{episode.runtime}m</span>
            <span>·</span>
            <span>{new Date(episode.airDate).toLocaleDateString()}</span>
            <span className="ml-auto flex items-center gap-1"><Star className="h-3 w-3 fill-brand text-brand" />{episode.rating.toFixed(1)}</span>
          </div>
          <h3 className="mt-1 text-base font-semibold tracking-tight">{episode.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{episode.overview}</p>
          {premium && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              {downloading ? "Resolving..." : "Download"}
            </button>
          )}
        </div>
      </Link>
    </motion.div>
  );
}