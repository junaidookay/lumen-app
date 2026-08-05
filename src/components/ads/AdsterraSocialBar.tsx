/**
 * Adsterra Social Bar — sticky bottom ad that appears for non-premium users.
 * Shows for 10 seconds, then user can dismiss. Reappears on app reopen.
 */
import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { isPremium } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { listAdPlacements } from "@/lib/admin/admin.functions";
import { useAppName } from "@/hooks/use-app-name";

const DISMISS_KEY = "lumen_ad_social_bar_dismissed";
const VIEW_DURATION_MS = 10_000;

export function AdsterraSocialBar() {
  const { data: perms } = usePermissions();
  const appName = useAppName();
  const { data: placements } = useQuery({
    queryKey: ["ad-placements"],
    queryFn: () => listAdPlacements(),
    staleTime: 5 * 60 * 1000,
  });
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(VIEW_DURATION_MS / 1000));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const placement = (placements ?? []).find((p: any) => p.slot === "social_bar");
  const adsterraConfig = placement?.provider === "adsterra" && placement?.is_enabled
    ? (placement.config as any)
    : null;

  useEffect(() => {
    if (isPremium(perms) || !adsterraConfig) return;
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === "true";
    if (wasDismissed) return;

    // Show after 3 seconds
    const showTimer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(showTimer);
  }, [perms, adsterraConfig]);

  useEffect(() => {
    if (!visible || dismissed) return;
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, dismissed]);

  if (isPremium(perms) || !adsterraConfig || !visible) return null;

  const adCode = adsterraConfig.social_bar_code ?? "";

  function handleDismiss() {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, "true");
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/5 bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-auto flex h-16 max-w-[1200px] items-center justify-center px-4">
        {countdown > 0 ? (
          <p className="text-xs text-muted-foreground">
            Ad closes in {countdown}s
          </p>
        ) : null}

        {/* Adsterra Social Bar iframe */}
        {adCode && (
          <iframe
            srcDoc={adCode}
            title="Sponsored"
            className="absolute inset-0 h-full w-full border-0"
            sandbox="allow-scripts allow-popups allow-forms"
            loading="lazy"
          />
        )}

        {!adCode && (
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-brand">Sponsored</p>
            <p className="text-sm text-muted-foreground">Support {appName} — view this ad</p>
          </div>
        )}

        {countdown === 0 && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-muted-foreground hover:bg-white/20"
            aria-label="Dismiss ad"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
