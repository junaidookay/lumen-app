import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { onSWUpdate, applyUpdate } from "@/pwa/services/sw-register";
import { useVideoPlayback } from "@/pwa/hooks/use-video-playback";
import { cn } from "@/lib/utils";

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isPlaying = useVideoPlayback();

  useEffect(() => {
    return onSWUpdate((available) => {
      setUpdateAvailable(available && !isPlaying);
    });
  }, [isPlaying]);

  if (!updateAvailable || isPlaying) return null;

  const handleRefresh = () => {
    setRefreshing(true);
    applyUpdate();
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 py-2">
      <div
        className={cn(
          "mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 px-4 py-3",
          "bg-surface/95 shadow-[var(--shadow-elevated)] backdrop-blur-xl"
        )}
      >
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">New version available</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Refresh to get the latest</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
