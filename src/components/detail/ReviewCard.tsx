import { Star } from "lucide-react";
import type { Review } from "@/types/media";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-2xl border border-white/5 bg-surface/50 p-5">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-elevated">
          {review.avatar && <img src={review.avatar} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{review.author}</p>
          <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full glass px-2 py-0.5 text-xs">
          <Star className="h-3 w-3 fill-brand text-brand" />
          {review.rating.toFixed(1)}
        </div>
      </header>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{review.content}</p>
    </article>
  );
}