import { motion, AnimatePresence } from "motion/react";
import type { Episode } from "@/types/media";
import { EpisodeCard } from "./EpisodeCard";

export function EpisodeList({ episodes, keyId }: { episodes: Episode[]; keyId: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="grid gap-3"
      >
        {episodes.map((e, i) => (
          <EpisodeCard key={e.id} episode={e} index={i} />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}