import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { isPremium } from "@/lib/permissions";
import { listAdPlacements } from "@/lib/admin/admin.functions";
import type { AdSlot as SlotName } from "@/lib/ads/registry";

export function AdSlot({ slot, className }: { slot: SlotName; className?: string }) {
  const { data: perms } = usePermissions();
  const { data: placements } = useQuery({ queryKey: ["ad-placements"], queryFn: () => listAdPlacements(), staleTime: 5 * 60 * 1000 });
  if (isPremium(perms)) return null;
  const placement = (placements ?? []).find((p: any) => p.slot === slot);
  if (!placement?.is_enabled || placement.provider === "none") return null;
  const headline = (placement.config as any)?.headline ?? "Ad placement";
  const body = (placement.config as any)?.body ?? "Configured via admin → Ads.";
  return (
    <div className={`rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground ${className ?? ""}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-brand">Sponsored</p>
      <p className="mt-1 font-medium text-foreground">{headline}</p>
      <p className="text-xs">{body}</p>
    </div>
  );
}