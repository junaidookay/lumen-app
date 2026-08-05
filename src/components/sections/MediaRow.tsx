import { useRef, useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import type { MediaItem, MediaRow as MediaRowType } from "@/types/media";
import { MediaCard } from "@/components/cards/MediaCard";
import { cn } from "@/lib/utils";

interface MediaRowProps {
  row: MediaRowType;
  variant?: "poster" | "landscape";
  className?: string;
  onSelect?: (item: MediaItem) => void;
}

export function MediaRow({ row, variant = "poster", className, onSelect }: MediaRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = touchStart - e.touches[0].clientX;
    setTouchDelta(delta);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    const threshold = 50;
    if (Math.abs(touchDelta) > threshold) {
      scrollBy(touchDelta > 0 ? 1 : -1);
    }
    setTouchStart(null);
    setTouchDelta(0);
  }, [touchDelta, scrollBy]);

  return (
    <section className={cn("group/rail relative", className)} aria-label={row.title}>
      <div className="mb-4 flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-lg font-semibold tracking-tight sm:text-xl"
          >
            {row.title}
          </motion.h2>
          {row.subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{row.subtitle}</p>
          )}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            data-touch-target
            className="grid h-9 w-9 place-items-center rounded-full glass transition hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            data-touch-target
            className="grid h-9 w-9 place-items-center rounded-full glass transition hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-4 sm:px-6 lg:px-10"
      >
        {row.items.map((item, i) => (
          <div key={item.id + i} className="snap-start">
            <MediaCard item={item} variant={variant} onClick={onSelect} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
