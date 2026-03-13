import React, { forwardRef } from "react";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { linking } from "./linking";
import { CallScreen } from "../screens/calls/CallScreen";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Call: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onReady?: () => void;
}

export const RootNavigator = forwardRef<
  NavigationContainerRef<RootStackParamList>,
  RootNavigatorProps
>(function RootNavigator({ onReady }, ref) {
  const { isLoading, isAuthenticated, requires2fa } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const showMainTabs = isAuthenticated && !requires2fa;

  return (
    <NavigationContainer ref={ref} onReady={onReady} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showMainTabs ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
        <Stack.Screen
          name="Call"
          component={CallScreen}
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
});

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0f1a",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#94A3B8",
  },
});
