import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Play, Plus, Star } from "lucide-react";
import type { MediaItem } from "@/types/media";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  item: MediaItem;
  variant?: "poster" | "landscape";
  className?: string;
  onClick?: (item: MediaItem) => void;
  index?: number;
}

export function MediaCard({ item, variant = "poster", className, onClick, index = 0 }: MediaCardProps) {
  const isLandscape = variant === "landscape";
  const to = item.kind === "tv" ? "/tv/$id" : "/movie/$id";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.03 }}
      whileHover={{ y: -6 }}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-surface text-left",
        "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)]",
        isLandscape ? "aspect-video w-[320px]" : "aspect-[2/3] w-[180px] sm:w-[200px]",
        className,
      )}
    >
    <Link
      to={to}
      params={{ id: item.id }}
      onClick={() => onClick?.(item)}
      aria-label={`${item.title} — ${item.kind === "tv" ? "TV series" : "movie"}`}
      className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={isLandscape ? item.backdrop : item.poster}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90" />
      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[11px] font-medium">
        <Star className="h-3 w-3 fill-brand text-brand" />
        {item.rating.toFixed(1)}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-1 text-sm font-semibold tracking-tight">{item.title}</p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {new Date(item.releaseDate).getFullYear()} • {item.genres.slice(0, 2).join(" · ")}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-foreground shadow-[var(--shadow-glow)]">
          <Play className="h-5 w-5 fill-current" />
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-full glass">
          <Plus className="h-5 w-5" />
        </span>
      </div>
    </Link>
    </motion.div>
  );
}