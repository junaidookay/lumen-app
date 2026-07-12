import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function RatingDisplay({ value, className, size = "md" }: Props) {
  const stars = Math.round((value / 10) * 5);
  const dims = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label={`Rating ${value.toFixed(1)} out of 10`}>
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn(dims, i < stars ? "fill-brand text-brand" : "text-white/20")} />
        ))}
      </div>
      <span className={cn("font-semibold", size === "lg" ? "text-base" : "text-sm")}>{value.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">/ 10</span>
    </div>
  );
}