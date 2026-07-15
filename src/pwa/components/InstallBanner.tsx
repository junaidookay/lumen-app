import { X, Download } from "lucide-react";
import { useInstall } from "@/pwa/hooks/use-install";
import { cn } from "@/lib/utils";

export function InstallBanner() {
  const { platform, canInstall, isInstalled, install, dismiss, wasDismissed } = useInstall();

  if (isInstalled || !canInstall || wasDismissed()) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm">
      <div
        className={cn(
          "relative rounded-2xl border border-white/10 p-4 shadow-[var(--shadow-elevated)]",
          "bg-surface/95 backdrop-blur-xl"
        )}
      >
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Install Lumen</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {platform === "ios"
                ? "Tap the share button, then 'Add to Home Screen'"
                : "Add to your home screen for quick access"}
            </p>
          </div>
        </div>

        {platform !== "ios" && (
          <button
            type="button"
            onClick={install}
            className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-medium text-brand-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
