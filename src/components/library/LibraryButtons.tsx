import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  listWatchlist, addToWatchlist, removeFromWatchlist,
  listFavorites, addToFavorites, removeFromFavorites,
  type MediaKind,
} from "@/services/library";

function useGuard() {
  const { user } = useAuth();
  const nav = useNavigate();
  return { user, guard: () => { if (!user) { toast("Sign in to save titles", { action: { label: "Sign in", onClick: () => nav({ to: "/auth" }) } }); return false; } return true; } };
}

export function WatchlistButton({ mediaId, mediaKind, className }: { mediaId: string; mediaKind: MediaKind; className?: string }) {
  const { user, guard } = useGuard();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["watchlist"], queryFn: listWatchlist, enabled: !!user });
  const inList = !!data?.some((r) => r.media_id === mediaId);
  const mut = useMutation({
    mutationFn: async () => { if (inList) await removeFromWatchlist(mediaId); else await addToWatchlist(user!.id, mediaId, mediaKind); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["watchlist"] }); toast.success(inList ? "Removed from watchlist" : "Added to watchlist"); },
  });
  return (
    <button onClick={() => guard() && mut.mutate()} className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition", inList ? "border-brand/40 bg-brand/10 text-brand" : "border-white/10 glass hover:bg-white/10", className)}>
      {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {inList ? "In Watchlist" : "Watchlist"}
    </button>
  );
}

export function FavoriteButton({ mediaId, mediaKind, className }: { mediaId: string; mediaKind: MediaKind; className?: string }) {
  const { user, guard } = useGuard();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["favorites"], queryFn: listFavorites, enabled: !!user });
  const isFav = !!data?.some((r) => r.media_id === mediaId);
  const mut = useMutation({
    mutationFn: async () => { if (isFav) await removeFromFavorites(mediaId); else await addToFavorites(user!.id, mediaId, mediaKind); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["favorites"] }); toast.success(isFav ? "Removed from favorites" : "Added to favorites"); },
  });
  return (
    <button onClick={() => guard() && mut.mutate()} aria-label="Favorite" className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full border transition", isFav ? "border-brand/40 bg-brand/10 text-brand" : "border-white/10 glass hover:bg-white/10", className)}>
      <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
    </button>
  );
}