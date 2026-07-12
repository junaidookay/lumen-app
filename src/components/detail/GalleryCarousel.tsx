import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function GalleryCarousel({ images }: { images: string[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * (scroller.current.clientWidth * 0.85), behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-between px-4 sm:px-6 lg:px-10">
        <h2 className="text-2xl font-semibold tracking-tight">Gallery</h2>
        <div className="flex gap-2">
          <button aria-label="Previous" onClick={() => scrollBy(-1)} className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Next" onClick={() => scrollBy(1)} className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-10">
        {images.map((src, i) => (
          <motion.button
            key={src}
            type="button"
            onClick={() => setLightbox(i)}
            whileHover={{ scale: 1.02 }}
            className="snap-start aspect-video w-[360px] shrink-0 overflow-hidden rounded-2xl border border-white/5"
          >
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-6"
            onClick={() => setLightbox(null)}
          >
            <button aria-label="Close" className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full glass"><X /></button>
            <motion.img
              key={images[lightbox]}
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              src={images[lightbox]} alt="" className="max-h-[85vh] max-w-full rounded-3xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}