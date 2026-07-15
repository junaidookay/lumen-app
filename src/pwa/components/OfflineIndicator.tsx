import { useNetwork } from "@/pwa/hooks/use-network";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { status } = useNetwork();

  if (status === "online") return null;

  return (
    <div
      className={cn(
        "fixed top-16 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium",
        "bg-destructive/90 text-destructive-foreground backdrop-blur-sm"
      )}
    >
      {status === "offline" ? "You're offline — some features may be limited" : "Syncing..."}
    </div>
  );
}
