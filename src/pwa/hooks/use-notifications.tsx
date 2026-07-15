import { useState, useEffect, useCallback } from "react";
import {
  getNotificationProvider,
  initializeNotificationProviders,
  getAvailableProviders,
} from "@/pwa/services/notifications";
import { useCapabilities } from "@/pwa/hooks/use-capabilities";
import type { NotificationProvider, NotificationPermission, NotificationProviderConfig } from "@/pwa/types";

export function useNotifications(config?: NotificationProviderConfig) {
  const [provider, setProvider] = useState<NotificationProvider | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [providers, setProviders] = useState<NotificationProvider[]>([]);

  useEffect(() => {
    if (config) {
      initializeNotificationProviders(config);
    }
    const p = getNotificationProvider();
    setProvider(p);
    setProviders(getAvailableProviders());
    if (p) {
      setPermission(p.getPermission());
    }
  }, [config?.provider]);

  const requestPermission = useCallback(async () => {
    if (!provider) return "denied" as NotificationPermission;
    const result = await provider.requestPermission();
    setPermission(result);
    return result;
  }, [provider]);

  const subscribe = useCallback(
    async (vapidPublicKey?: string) => {
      if (!provider) return null;
      return provider.subscribe(vapidPublicKey);
    },
    [provider],
  );

  const unsubscribe = useCallback(async () => {
    if (!provider) return;
    await provider.unsubscribe();
  }, [provider]);

  const sendNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (!provider) return;
      await provider.sendNotification(title, options);
    },
    [provider],
  );

  const switchProvider = useCallback((id: string) => {
    const p = getNotificationProvider(id);
    if (p) {
      setProvider(p);
      setPermission(p.getPermission());
    }
  }, []);

  const capabilities = useCapabilities();

  return {
    provider,
    providers,
    permission,
    isSupported: capabilities.notifications && capabilities.push,
    requestPermission,
    subscribe,
    unsubscribe,
    sendNotification,
    switchProvider,
  };
}
