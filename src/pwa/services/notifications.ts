import type { NotificationProvider, NotificationPermission, NotificationProviderConfig } from "@/pwa/types";

class WebPushProvider implements NotificationProvider {
  readonly id = "web-push";
  readonly name = "Web Push";

  isSupported(): boolean {
    return "Notification" in window && "PushManager" in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return "denied";
    const result = await Notification.requestPermission();
    return result as NotificationPermission;
  }

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return "denied";
    return Notification.permission as NotificationPermission;
  }

  async subscribe(vapidPublicKey?: string): Promise<PushSubscription | null> {
    if (!this.isSupported() || !vapidPublicKey) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });
    } catch {
      return null;
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch {
      // Ignore
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  }

  async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (this.getPermission() !== "granted") return;
    new Notification(title, options);
  }
}

class OneSignalProvider implements NotificationProvider {
  readonly id = "onesignal";
  readonly name = "OneSignal";
  private appId: string;

  constructor(config: { oneSignalAppId?: string }) {
    this.appId = config.oneSignalAppId ?? "";
  }

  isSupported(): boolean {
    return !!this.appId && "Notification" in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return "denied";
    // OneSignal SDK would be loaded here
    return Notification.requestPermission() as Promise<NotificationPermission>;
  }

  getPermission(): NotificationPermission {
    return Notification.permission as NotificationPermission;
  }

  async subscribe(): Promise<PushSubscription | null> {
    // OneSignal handles subscription internally
    return null;
  }

  async unsubscribe(): Promise<void> {
    // OneSignal handles unsubscription internally
  }

  async getSubscription(): Promise<PushSubscription | null> {
    return null;
  }

  async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (this.getPermission() !== "granted") return;
    new Notification(title, options);
  }
}

class SupabaseEdgeProvider implements NotificationProvider {
  readonly id = "supabase-edge";
  readonly name = "Supabase Edge Functions";
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor(config: { supabaseUrl?: string; supabaseAnonKey?: string }) {
    this.supabaseUrl = config.supabaseUrl ?? "";
    this.supabaseAnonKey = config.supabaseAnonKey ?? "";
  }

  isSupported(): boolean {
    return !!(this.supabaseUrl && this.supabaseAnonKey) && "Notification" in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return "denied";
    return Notification.requestPermission() as Promise<NotificationPermission>;
  }

  getPermission(): NotificationPermission {
    return Notification.permission as NotificationPermission;
  }

  async subscribe(vapidPublicKey?: string): Promise<PushSubscription | null> {
    if (!this.isSupported() || !vapidPublicKey) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });
      // Store subscription in Supabase via edge function
      await fetch(`${this.supabaseUrl}/functions/v1/push-subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
        body: JSON.stringify({ subscription: sub }),
      });
      return sub;
    } catch {
      return null;
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${this.supabaseUrl}/functions/v1/push-unsubscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.supabaseAnonKey}`,
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } catch {
      // Ignore
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  }

  async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (this.getPermission() !== "granted") return;
    new Notification(title, options);
  }
}

class FCMProvider implements NotificationProvider {
  readonly id = "fcm";
  readonly name = "Firebase Cloud Messaging";

  isSupported(): boolean {
    return "Notification" in window && "PushManager" in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    return Notification.requestPermission() as Promise<NotificationPermission>;
  }

  getPermission(): NotificationPermission {
    return Notification.permission as NotificationPermission;
  }

  async subscribe(): Promise<PushSubscription | null> {
    // FCM SDK would handle this
    return null;
  }

  async unsubscribe(): Promise<void> {}
  async getSubscription(): Promise<PushSubscription | null> { return null; }
  async sendNotification(): Promise<void> {}
}

class NativeProvider implements NotificationProvider {
  readonly id = "native";
  readonly name = "Native App";

  isSupported(): boolean {
    return false; // Only available in native wrapper
  }

  async requestPermission(): Promise<NotificationPermission> { return "denied"; }
  getPermission(): NotificationPermission { return "denied"; }
  async subscribe(): Promise<PushSubscription | null> { return null; }
  async unsubscribe(): Promise<void> {}
  async getSubscription(): Promise<PushSubscription | null> { return null; }
  async sendNotification(): Promise<void> {}
}

// ---- Registry ----

const providers = new Map<string, NotificationProvider>();

export function registerNotificationProvider(provider: NotificationProvider): void {
  providers.set(provider.id, provider);
}

export function getNotificationProvider(id?: string): NotificationProvider | null {
  if (id) return providers.get(id) ?? null;
  // Return first supported provider
  for (const provider of providers.values()) {
    if (provider.isSupported()) return provider;
  }
  return null;
}

export function getAvailableProviders(): NotificationProvider[] {
  return Array.from(providers.values());
}

export function initializeNotificationProviders(config: NotificationProviderConfig): void {
  providers.clear();
  registerNotificationProvider(new WebPushProvider());
  registerNotificationProvider(new OneSignalProvider(config));
  registerNotificationProvider(new SupabaseEdgeProvider(config));
  registerNotificationProvider(new FCMProvider());
  registerNotificationProvider(new NativeProvider());
}
