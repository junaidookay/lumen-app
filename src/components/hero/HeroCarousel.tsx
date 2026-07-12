import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Info, Play, Star } from "lucide-react";
import type { MediaItem } from "@/types/media";
import { Button } from "@/components/ui/button";

interface HeroCarouselProps {
  items: MediaItem[];
  interval?: number;
}

export function HeroCarousel({ items, interval = 7000 }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const active = items[index];

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      interval,
    );
    return () => window.clearInterval(id);
  }, [items.length, interval]);

  if (!active) return null;

  return (
    <section
      className="relative isolate h-[85vh] min-h-[560px] w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img src={active.backdrop} alt="" className="h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>

      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />

      <div className="relative z-10 flex h-full items-end pb-24 pt-32">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span className="rounded-full bg-brand/15 px-2 py-0.5 font-medium text-brand">
                  {active.kind === "tv" ? "Series" : "Feature"}
                </span>
                <span>{new Date(active.releaseDate).getFullYear()}</span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-brand text-brand" />
                  {active.rating.toFixed(1)}
                </span>
                <span>{active.genres.slice(0, 2).join(" • ")}</span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                {active.title}
              </h1>
              {active.tagline && (
                <p className="mt-3 text-lg italic text-muted-foreground">{active.tagline}</p>
              )}
              <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">
                {active.overview}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="rounded-full bg-brand text-brand-foreground shadow-[var(--shadow-glow)] hover:bg-brand/90">
                  <Play className="mr-2 h-4 w-4 fill-current" /> Play
                </Button>
                <Button size="lg" variant="secondary" className="rounded-full glass border border-white/10 hover:bg-white/10">
                  <Info className="mr-2 h-4 w-4" /> More info
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-8 right-6 z-10 flex items-center gap-2 sm:right-10">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            aria-label={`Show ${it.title}`}
            onClick={() => setIndex(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === index ? 32 : 10,
              background: i === index ? "var(--gradient-brand)" : "oklch(1 0 0 / 0.25)",
            }}
          />
        ))}
      </div>
    </section>
  );
}