import React, { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { usePushNotifications, setNavigationRefForPush } from "../hooks/usePushNotifications";

export type NotificationNavigationRef = {
  navigateToMessagesChat?: (conversationId: string) => void;
  navigateToMessagesTab?: () => void;
  navigateToDialer?: () => void;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  navigationRef?: NotificationNavigationRef | null;
}

/**
 * Registers push token when authenticated and clears badge when app becomes active.
 * Call setNavigationRefForPush / pass navigationRef so tap handling can route.
 */
export function NotificationProvider({ children, navigationRef }: NotificationProviderProps) {
  usePushNotifications();

  useEffect(() => {
    setNavigationRefForPush(navigationRef ?? null);
    return () => setNavigationRefForPush(null);
  }, [navigationRef]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        Notifications.setBadgeCountAsync(0);
      }
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
