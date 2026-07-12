import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { Trailer } from "@/types/media";

export function TrailerModal({ trailer, open, onClose }: { trailer?: Trailer; open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && trailer && (
        <motion.div
          role="dialog" aria-modal="true" aria-label={trailer.title}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[var(--shadow-elevated)]"
          >
            <button aria-label="Close trailer" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full glass"><X className="h-5 w-5" /></button>
            <iframe title={trailer.title} src={trailer.url} allow="autoplay; encrypted-media; picture-in-picture" className="h-full w-full" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}