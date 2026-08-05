import { useEffect } from "react";
import { toast } from "sonner";
import { markInstalled } from "@/pwa/components/SmartInstallBanner";
import { useAppName } from "@/hooks/use-app-name";

export function useInstallDetection() {
  const appName = useAppName();
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstalled = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as Record<string, boolean>).standalone === true;

      if (standalone) {
        const state = localStorage.getItem("lumen-install-reminder");
        const parsed = state ? JSON.parse(state) : {};
        if (!parsed.installed) {
          markInstalled();
          toast.success(`${appName} is installed!`, {
            description: `You can now access ${appName} from your home screen.`,
            duration: 5000,
          });
        }
      }
    };

    checkInstalled();

    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) checkInstalled();
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [appName]);
}
