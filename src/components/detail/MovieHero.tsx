import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Bookmark, Heart, Play, Share2, Star, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/types/media";
import { TrailerModal } from "@/components/dialogs/TrailerModal";
import { ShareDialog } from "@/components/dialogs/ShareDialog";
import { WatchlistButton } from "@/components/library/LibraryButtons";
import { FavoriteButton } from "@/components/library/LibraryButtons";
import { usePermissions } from "@/hooks/use-permissions";
import { isPremium } from "@/lib/permissions";
import { resolveDownloadUrl } from "@/lib/billing/downloads.functions";

export function MovieHero({ item }: { item: MediaItem }) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { data: perms } = usePermissions();
  const premium = isPremium(perms);

  async function handleDownload() {
    if (!premium) {
      toast.error("Premium subscription required for downloads");
      return;
    }
    setDownloading(true);
    try {
      const res = await resolveDownloadUrl({
        data: {
          contentId: item.id,
          kind: item.kind === "tv" ? "tv" : "movie",
          season: 1,
          episode: 1,
        },
      });
      window.open(res.url, "_blank");
      toast.success(`Downloading ${res.title}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="relative isolate min-h-[90vh] w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <img src={item.backdrop} alt="" className="h-full w-full object-cover" />
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />

      <div className="relative z-10 flex min-h-[90vh] items-end pb-16 pt-32">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-end lg:px-10">
          <motion.img
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            src={item.poster} alt={`${item.title} poster`}
            className="hidden aspect-[2/3] w-[260px] shrink-0 rounded-3xl border border-white/10 object-cover shadow-[var(--shadow-elevated)] md:block"
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-2xl"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="rounded-full bg-brand/15 px-2 py-0.5 font-medium text-brand">{item.kind === "tv" ? "Series" : "Feature"}</span>
              {item.ageRating && <span className="rounded-full border border-white/10 px-2 py-0.5">{item.ageRating}</span>}
              <span>{new Date(item.releaseDate).getFullYear()}</span>
              <span>·</span>
              <span>{item.runtime}m</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-brand text-brand" />{item.rating.toFixed(1)}</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{item.title}</h1>
            {item.tagline && <p className="mt-2 text-lg italic text-muted-foreground">{item.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {item.genres.map((g) => (
                <span key={g} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">{g}</span>
              ))}
            </div>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">{item.overview}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full shadow-[var(--shadow-glow)]">
                <Link to="/watch/$kind/$id" params={{ kind: item.kind, id: item.id }} search={{ season: 1, episode: 1 }}>
                  <Play className="mr-2 h-4 w-4 fill-current" /> Play now
                </Link>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={handleDownload}
                disabled={downloading}
                className="rounded-full glass border border-white/10 hover:bg-white/10"
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading ? "Resolving..." : "Download"}
              </Button>
              {item.trailers?.length ? (
                <Button size="lg" variant="secondary" onClick={() => setTrailerOpen(true)} className="rounded-full glass border border-white/10 hover:bg-white/10">
                  Watch trailer
                </Button>
              ) : null}
              <WatchlistButton mediaId={item.id} mediaKind={item.kind} />
              <FavoriteButton mediaId={item.id} mediaKind={item.kind} />
              <IconAction label="Share" onClick={() => setShareOpen(true)}><Share2 /></IconAction>
            </div>
          </motion.div>
        </div>
      </div>

      <TrailerModal trailer={item.trailers?.[0]} open={trailerOpen} onClose={() => setTrailerOpen(false)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} title={item.title} url={typeof window !== "undefined" ? window.location.href : ""} />
    </section>
  );
}

function IconAction({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label} aria-pressed={active}
      className={"grid h-11 w-11 place-items-center rounded-full border transition " + (active ? "border-brand bg-brand/20 text-brand" : "border-white/10 glass hover:bg-white/10")}
    >
      <span className="grid h-5 w-5 place-items-center [&>svg]:h-5 [&>svg]:w-5">{children}</span>
    </button>
  );
}
