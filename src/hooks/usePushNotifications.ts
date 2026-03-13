import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useAuth } from "../providers/AuthProvider";

export type PushNotificationData = {
  type?: "new_message" | "incoming_call" | "missed_call";
  conversationId?: string;
  [key: string]: unknown;
};

export type NavigationRefForPush = {
  navigateToMessagesChat?: (conversationId: string) => void;
  navigateToMessagesTab?: () => void;
  navigateToDialer?: () => void;
};

let navigationRefForPush: NavigationRefForPush | null = null;

export function setNavigationRefForPush(ref: NavigationRefForPush | null) {
  navigationRefForPush = ref;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * On auth: request permission and register push token.
 * On app active: clear badge.
 * Notification tap: route via navigation ref (new_message → Messages/Chat; incoming_call | missed_call → Dialer).
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      if (!Device.isDevice) return;
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== "granted") return;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      // TODO: send token to backend (e.g. PATCH /api/users/me/push-token)
      console.log("[Push] Token:", token);
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData;
      const type = data?.type;

      if (type === "new_message") {
        if (data.conversationId && navigationRefForPush?.navigateToMessagesChat) {
          navigationRefForPush.navigateToMessagesChat(data.conversationId);
        } else if (navigationRefForPush?.navigateToMessagesTab) {
          navigationRefForPush.navigateToMessagesTab();
        }
      } else if (type === "incoming_call" || type === "missed_call") {
        navigationRefForPush?.navigateToDialer?.();
      }
    });
    listenerRef.current = sub;
    return () => {
      listenerRef.current?.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = Notifications.addNotificationReceivedListener(() => {});
    return () => sub.remove();
  }, [isAuthenticated]);
}

/**
 * Clear badge when app becomes active.
 */
export function useClearBadgeOnActive() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = Notifications.addNotificationReceivedListener(() => {
      // App is in foreground; badge will be cleared on next focus
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    const { remove } = Notifications.addNotificationResponseReceivedListener(() => {
      Notifications.setBadgeCountAsync(0);
    });
    return remove;
  }, []);
}
