import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SettingsScreen } from "../screens/main/SettingsScreen";
import { HelpCenterScreen } from "../screens/settings/HelpCenterScreen";
import { EditProfileScreen } from "../screens/settings/EditProfileScreen";
import { NotificationSettingsScreen } from "../screens/settings/NotificationSettingsScreen";
import { SecuritySettingsScreen } from "../screens/settings/SecuritySettingsScreen";
import { AppearanceSettingsScreen } from "../screens/settings/AppearanceSettingsScreen";
import { BillingScreen } from "../screens/settings/BillingScreen";
import { TeamMembersScreen } from "../screens/settings/TeamMembersScreen";
import { SupportScreen } from "../screens/settings/SupportScreen";

export type SettingsStackParamList = {
  SettingsMain: undefined;
  HelpCenter: undefined;
  Support: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  SecuritySettings: undefined;
  AppearanceSettings: undefined;
  Billing: undefined;
  TeamMembers: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
      <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="TeamMembers" component={TeamMembersScreen} />
    </Stack.Navigator>
  );
}
