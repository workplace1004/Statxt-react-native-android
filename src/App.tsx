import React, { useRef, useCallback, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./providers/AuthProvider";
import { CallsProvider } from "./providers/CallsProvider";
import { RealtimeProvider } from "./providers/RealtimeProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { RootNavigator, RootStackParamList } from "./navigation/RootNavigator";
import { RootNavigationRefProvider } from "./navigation/RootNavigationRefContext";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { useFonts } from "./hooks/useFonts";
import type { NotificationNavigationRef } from "./providers/NotificationProvider";

function AppShell({
  navigationRef,
  onReady,
  pushCallbacks,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList>>;
  onReady: () => void;
  pushCallbacks: NotificationNavigationRef | null;
}) {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CallsProvider>
              <RealtimeProvider>
                <NotificationProvider navigationRef={pushCallbacks}>
                  <RootNavigationRefProvider navigationRef={navigationRef}>
                    <RootNavigator ref={navigationRef} onReady={onReady} />
                    <StatusBar style={theme === "dark" ? "light" : "dark"} />
                  </RootNavigationRefProvider>
                </NotificationProvider>
              </RealtimeProvider>
            </CallsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [pushCallbacks, setPushCallbacks] = useState<NotificationNavigationRef | null>(null);
  const { fontsLoaded, onLayoutRootView } = useFonts();

  const handleNavigationReady = useCallback(() => {
    const nav = navigationRef.current;
    setPushCallbacks({
      navigateToMessagesChat: (conversationId) =>
        (nav as any)?.navigate("Main", {
          screen: "MessagesTab",
          params: { screen: "Chat", params: { conversationId } },
        }),
      navigateToMessagesTab: () =>
        (nav as any)?.navigate("Main", { screen: "MessagesTab" }),
      navigateToDialer: () =>
        (nav as any)?.navigate("Main", { screen: "SettingsTab" }),
    });
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.loading, { flex: 1 }]} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider>
        <AppShell
          navigationRef={navigationRef}
          onReady={handleNavigationReady}
          pushCallbacks={pushCallbacks}
        />
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#94A3B8", marginTop: 12, fontSize: 16 },
});
