/**
 * Adsterra Interstitial — full-screen ad shown before playing content.
 * Non-premium users see a 5-second countdown before they can skip.
 */
import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { isPremium } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { listAdPlacements } from "@/lib/admin/admin.functions";

const INTERSTITIAL_COUNTDOWN = 5;
const INTERSTITIAL_KEY_PREFIX = "lumen_interstitial_";

export function AdsterraInterstitial({
  mediaId,
  onDismiss,
}: {
  mediaId: string;
  onDismiss: () => void;
}) {
  const { data: perms } = usePermissions();
  const { data: placements } = useQuery({
    queryKey: ["ad-placements"],
    queryFn: () => listAdPlacements(),
    staleTime: 5 * 60 * 1000,
  });
  const [countdown, setCountdown] = useState(INTERSTITIAL_COUNTDOWN);
  const [canSkip, setCanSkip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const placement = (placements ?? []).find((p: any) => p.slot === "interstitial");
  const adsterraConfig = placement?.provider === "adsterra" && placement?.is_enabled
    ? (placement.config as any)
    : null;

  const adCode = adsterraConfig?.interstitial_code ?? "";

  useEffect(() => {
    if (isPremium(perms) || !adsterraConfig) {
      onDismiss();
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanSkip(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [perms, adsterraConfig, onDismiss]);

  if (isPremium(perms) || !adsterraConfig) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90">
      <div className="relative h-full w-full max-w-[900px]">
        {/* Adsterra Interstitial iframe */}
        {adCode && (
          <iframe
            srcDoc={adCode}
            title="Advertisement"
            className="absolute inset-0 h-full w-full border-0"
            sandbox="allow-scripts allow-popups allow-forms"
            loading="eager"
          />
        )}

        {!adCode && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Advertisement</p>
          </div>
        )}

        {/* Skip button */}
        <div className="absolute right-4 top-4">
          {canSkip ? (
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30"
            >
              <X className="h-4 w-4" /> Skip Ad
            </button>
          ) : (
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
              Skip in {countdown}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to determine if interstitial should show for a given media item.
 * Shows once per session per media item.
 */
export function useInterstitialAd(mediaId: string): boolean {
  const [show, setShow] = useState(false);
  const { data: perms } = usePermissions();

  useEffect(() => {
    if (isPremium(perms)) return;
    const key = `${INTERSTITIAL_KEY_PREFIX}${mediaId}`;
    if (!sessionStorage.getItem(key)) {
      setShow(true);
      sessionStorage.setItem(key, "1");
    }
  }, [mediaId, perms]);

  return show;
}
