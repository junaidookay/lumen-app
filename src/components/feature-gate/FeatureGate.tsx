import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/use-permissions";
import { can, type FeatureKey } from "@/lib/permissions";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  soft?: boolean;
}

export function FeatureGate({ feature, children, fallback, soft }: FeatureGateProps) {
  const { data } = usePermissions();
  const allowed = can(feature, data);
  if (allowed) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  if (soft) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div aria-hidden className="pointer-events-none select-none opacity-40 blur-[2px]">{children}</div>
        <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm">
          <UpgradeCTA />
        </div>
      </div>
    );
  }
  return <UpgradeCTA />;
}

export function UpgradeCTA() {
  return (
    <Link
      to="/billing"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/10"
    >
      <Lock className="h-3.5 w-3.5" /> Unlock with Premium
    </Link>
  );
}