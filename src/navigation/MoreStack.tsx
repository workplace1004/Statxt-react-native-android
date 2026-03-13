import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MoreMenuScreen } from "../screens/more/MoreMenuScreen";
import { DialerScreen } from "../screens/dialer/DialerScreen";

export type MoreStackParamList = {
  MoreMenu: undefined;
  Dialer: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <Stack.Screen name="Dialer" component={DialerScreen} />
    </Stack.Navigator>
  );
}
