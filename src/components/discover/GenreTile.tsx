import { motion } from "motion/react";
import type { Genre } from "@/types/media";

export function GenreTile({ genre, index = 0 }: { genre: Genre; index?: number }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative h-32 overflow-hidden rounded-2xl border border-white/5 text-left shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ backgroundImage: genre.gradient }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex items-end p-4">
        <span className="text-lg font-semibold tracking-tight text-white drop-shadow">
          {genre.name}
        </span>
      </div>
    </motion.button>
  );
}