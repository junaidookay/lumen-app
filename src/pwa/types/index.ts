export interface PWAState {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isOnline: boolean;
  isSyncing: boolean;
}

export interface InstallPrompt {
  platform: "ios" | "android" | "desktop" | "unknown";
  canInstall: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
}

export interface OfflineQueueItem {
  id: string;
  action: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

export interface DeviceCapabilities {
  install: boolean;
  share: boolean;
  clipboard: boolean;
  wakeLock: boolean;
  pictureInPicture: boolean;
  orientation: boolean;
  fullscreen: boolean;
  notifications: boolean;
  push: boolean;
  bluetooth: boolean;
  airplay: boolean;
  chromecast: boolean;
  backgroundPlayback: boolean;
  mediaSession: boolean;
  webWorkers: boolean;
  CacheStorage: boolean;
  IndexedDB: boolean;
  navigationPreload: boolean;
}

export type NotificationPermission = "granted" | "denied" | "default";

export interface NotificationProvider {
  readonly id: string;
  readonly name: string;
  isSupported(): boolean;
  requestPermission(): Promise<NotificationPermission>;
  getPermission(): NotificationPermission;
  subscribe(vapidPublicKey?: string): Promise<PushSubscription | null>;
  unsubscribe(): Promise<void>;
  getSubscription(): Promise<PushSubscription | null>;
  sendNotification(title: string, options?: NotificationOptions): Promise<void>;
}

export interface NotificationProviderConfig {
  provider: "web-push" | "fcm" | "onesignal" | "supabase-edge" | "native";
  vapidPublicKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  oneSignalAppId?: string;
  fcmSenderId?: string;
}
