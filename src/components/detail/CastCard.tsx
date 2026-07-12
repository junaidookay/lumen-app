import { motion } from "motion/react";
import type { CastMember } from "@/types/media";

export function CastCard({ member, index = 0 }: { member: CastMember; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(index, 10) * 0.03 }}
      className="w-[140px] shrink-0"
    >
      <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/5 bg-surface">
        {member.photo ? (
          <img src={member.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand/30 to-brand-glow/10" />
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium">{member.name}</p>
      {member.character && (
        <p className="line-clamp-1 text-xs text-muted-foreground">{member.character}</p>
      )}
    </motion.div>
  );
}