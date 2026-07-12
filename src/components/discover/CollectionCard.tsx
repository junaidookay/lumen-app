import { motion } from "motion/react";
import type { Collection } from "@/types/media";

export function CollectionCard({ collection, index = 0 }: { collection: Collection; index?: number }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      whileHover={{ y: -6 }}
      className="group relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/5 text-left shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={collection.cover}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand">Collection</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight">{collection.title}</h3>
        {collection.subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{collection.subtitle}</p>
        )}
      </div>
    </motion.button>
  );
}