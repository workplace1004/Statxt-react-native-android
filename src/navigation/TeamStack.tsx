import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TeamMainScreen } from "../screens/team/TeamMainScreen";
import { InternalChatScreen } from "../screens/team/InternalChatScreen";
import { TeamChatThreadScreen } from "../screens/team/TeamChatThreadScreen";

export type TeamStackParamList = {
  TeamMain: undefined;
  InternalChat: undefined;
  TeamChatThread: { threadId: string; threadTitle?: string };
};

const Stack = createNativeStackNavigator<TeamStackParamList>();

export function TeamStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeamMain" component={TeamMainScreen} />
      <Stack.Screen name="InternalChat" component={InternalChatScreen} />
      <Stack.Screen name="TeamChatThread" component={TeamChatThreadScreen} />
    </Stack.Navigator>
  );
}
