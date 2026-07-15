import { useState, useEffect } from "react";
import { WifiOff, Check, Loader2, Clock } from "lucide-react";
import { useNetwork } from "@/pwa/hooks/use-network";
import { getStats } from "@/pwa/services/sync-queue";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  "watch-progress": "Watch progress",
  "favorite-add": "Favorite added",
  "favorite-remove": "Favorite removed",
  "watchlist-add": "Watchlist updated",
  "settings-update": "Settings updated",
};

export function OfflineQueueInspector() {
  const { status } = useNetwork();
  const [stats, setStats] = useState<{ total: number; byAction: Record<string, number> }>({ total: 0, byAction: {} });

  useEffect(() => {
    const load = () => getStats().then(setStats).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (status === "online" && stats.total === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 max-w-xs">
      <div
        className={cn(
          "rounded-2xl border border-white/10 p-4 shadow-[var(--shadow-elevated)]",
          "bg-surface/95 backdrop-blur-xl"
        )}
      >
        <div className="flex items-center gap-2">
          {status === "offline" ? (
            <WifiOff className="h-4 w-4 text-destructive" />
          ) : status === "syncing" ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand" />
          ) : (
            <Check className="h-4 w-4 text-emerald-400" />
          )}
          <span className="text-sm font-medium text-foreground">
            {status === "offline" ? "Offline" : status === "syncing" ? "Syncing..." : "All synchronized"}
          </span>
        </div>

        {stats.total > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {stats.total} pending change{stats.total !== 1 ? "s" : ""}
            </p>
            {Object.entries(stats.byAction).map(([action, count]) => (
              <div key={action} className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {ACTION_LABELS[action] || action}
                  {count > 1 ? ` (${count})` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {status === "online" && stats.total === 0 && (
          <p className="mt-2 text-xs text-emerald-400">All changes synchronized</p>
        )}
      </div>
    </div>
  );
}
