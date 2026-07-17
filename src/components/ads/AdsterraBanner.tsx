/**
 * Adsterra Banner — inline banner ad for detail and browse pages.
 * Premium users never see this.
 */
import { usePermissions } from "@/hooks/use-permissions";
import { isPremium } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { listAdPlacements } from "@/lib/admin/admin.functions";
import type { AdSlot } from "@/lib/ads/registry";

export function AdsterraBanner({
  slot = "banner_top",
  className,
}: {
  slot?: AdSlot;
  className?: string;
}) {
  const { data: perms } = usePermissions();
  const { data: placements } = useQuery({
    queryKey: ["ad-placements"],
    queryFn: () => listAdPlacements(),
    staleTime: 5 * 60 * 1000,
  });

  if (isPremium(perms)) return null;

  const placement = (placements ?? []).find((p: any) => p.slot === slot);
  if (!placement?.is_enabled || placement.provider !== "adsterra") return null;

  const adCode = (placement.config as any)?.banner_code ?? "";
  if (!adCode) return null;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] ${className ?? ""}`}
    >
      <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Ad
      </p>
      <iframe
        srcDoc={adCode}
        title="Advertisement"
        className="h-[100px] w-full border-0"
        sandbox="allow-scripts allow-popups allow-forms"
        loading="lazy"
      />
    </div>
  );
}
