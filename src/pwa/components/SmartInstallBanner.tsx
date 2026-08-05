import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { X, Download } from "lucide-react";
import { useInstall } from "@/pwa/hooks/use-install";
import { useVideoPlayback } from "@/pwa/hooks/use-video-playback";
import { trackInstallEvent } from "@/pwa/services/install-analytics";
import { useAppName } from "@/hooks/use-app-name";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lumen-install-reminder";
const DISMISS_KEY = "pwa-install-dismissed";

interface ReminderState {
  dismissCount: number;
  lastDismissed: string | null;
  neverRemind: boolean;
  installed: boolean;
}

function getReminderState(): ReminderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissCount: 0, lastDismissed: null, neverRemind: false, installed: false };
    return JSON.parse(raw);
  } catch {
    return { dismissCount: 0, lastDismissed: null, neverRemind: false, installed: false };
  }
}

function setReminderState(state: ReminderState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

function shouldShowReminder(): boolean {
  const state = getReminderState();
  if (state.neverRemind || state.installed) return false;
  if (state.dismissCount === 0) return true;
  if (!state.lastDismissed) return true;

  const lastDismiss = new Date(state.lastDismissed).getTime();
  const now = Date.now();
  const daysSinceDismiss = (now - lastDismiss) / (1000 * 60 * 60 * 24);

  if (state.dismissCount === 1 && daysSinceDismiss >= 7) return true;
  if (state.dismissCount === 2 && daysSinceDismiss >= 14) return true;
  if (state.dismissCount >= 3 && daysSinceDismiss >= 30) return true;

  return false;
}

export function SmartInstallBanner() {
  const { platform, canInstall, isInstalled, install, wasDismissed } = useInstall();
  const appName = useAppName();
  const isPlaying = useVideoPlayback();
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0]);

  useEffect(() => {
    if (isInstalled) {
      setReminderState({ ...getReminderState(), installed: true });
      return;
    }
    if (isPlaying) return;
    if (wasDismissed() || !shouldShowReminder()) return;
    // On iOS there's no beforeinstallprompt, so canInstall is always false.
    // Still show the banner with manual instructions for iOS users.
    if (!canInstall && platform !== "ios") return;

    const timer = setTimeout(() => {
      setVisible(true);
      trackInstallEvent({ name: "banner.shown" });
    }, 2000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, isPlaying, wasDismissed, platform]);

  const dismiss = useCallback((method: string) => {
    setVisible(false);
    const state = getReminderState();
    setReminderState({
      ...state,
      dismissCount: state.dismissCount + 1,
      lastDismissed: new Date().toISOString(),
    });
    trackInstallEvent({ name: "banner.dismissed", properties: { method } });
  }, []);

  const handleInstall = useCallback(async () => {
    trackInstallEvent({ name: "banner.install_clicked", properties: { platform } });
    setRefreshing(true);
    await install();
    setReminderState({ ...getReminderState(), installed: true });
    trackInstallEvent({ name: "install.completed", properties: { platform, method: "prompt" } });
    setVisible(false);
  }, [install, platform]);

  const handleNeverRemind = useCallback(() => {
    setReminderState({ ...getReminderState(), neverRemind: true });
    dismiss("never_remind");
  }, [dismiss]);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
      dismiss("swipe");
    }
  }, [dismiss]);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss("escape");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm"
        role="status"
        aria-live="polite"
      >
        <motion.div
          style={{ x, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={handleDragEnd}
          className={cn(
            "relative rounded-2xl border border-white/10 p-4 shadow-[var(--shadow-elevated)]",
            "bg-surface/95 backdrop-blur-xl touch-pan-y"
          )}
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss("close")}
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
              <p className="text-sm font-medium text-foreground">Install {appName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {platform === "ios"
                  ? "Tap Share, then 'Add to Home Screen'"
                  : "Add to your home screen for quick access"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {canInstall && platform !== "ios" && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={refreshing}
                className="flex-1 rounded-full bg-brand py-2.5 text-sm font-medium text-brand-foreground shadow-[var(--shadow-glow)] transition hover:opacity-90 disabled:opacity-50"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss("maybe_later")}
              className={cn(
                "rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-white/10",
                canInstall && platform !== "ios" ? "" : "flex-1"
              )}
            >
              Maybe later
            </button>
          </div>
          <button
            type="button"
            onClick={handleNeverRemind}
            className="mt-2 w-full text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground"
          >
            Don&apos;t remind me again
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function markInstalled(): void {
  setReminderState({ ...getReminderState(), installed: true });
}

export function resetReminderState(): void {
  setReminderState({ dismissCount: 0, lastDismissed: null, neverRemind: false, installed: false });
}
