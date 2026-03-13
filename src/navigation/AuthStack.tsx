import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { TwoFactorVerifyScreen } from "../screens/auth/TwoFactorVerifyScreen";
import { useAuth } from "../providers/AuthProvider";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  TwoFactorVerify: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  const { isAuthenticated, requires2fa } = useAuth();
  const initialRoute =
    isAuthenticated && requires2fa ? "TwoFactorVerify" : "Login";

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#05080f" },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="TwoFactorVerify" component={TwoFactorVerifyScreen} />
    </Stack.Navigator>
  );
}
