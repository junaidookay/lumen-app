type AnalyticsEvent =
  | { name: "banner.shown"; properties?: Record<string, unknown> }
  | { name: "banner.dismissed"; properties?: { method?: string } }
  | { name: "banner.install_clicked"; properties?: { platform?: string } }
  | { name: "install.completed"; properties?: { platform?: string; method?: "prompt" | "manual" } }
  | { name: "install.manual_viewed"; properties?: { platform?: string } }
  | { name: "reminder.shown"; properties?: { dismissCount?: number } }
  | { name: "install_page.viewed"; properties?: { platform?: string } };

type AnalyticsHandler = (event: AnalyticsEvent) => void;

let handler: AnalyticsHandler | null = null;

export function setAnalyticsHandler(h: AnalyticsHandler): void {
  handler = h;
}

export function trackInstallEvent(event: AnalyticsEvent): void {
  if (handler) {
    handler(event);
  }
}
