import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeProvider";
import {
  TeamIcon,
  ContactIcon,
  MessagesIcon,
  CampaignsIcon,
  SettingsIcon,
} from "../components/TabIcons";
import { TeamStack } from "./TeamStack";
import { ContactsStack } from "./ContactsStack";
import { MessagesStack } from "./MessagesStack";
import { CampaignsStack } from "./CampaignsStack";
import { SettingsStack } from "./SettingsStack";

export type MainTabsParamList = {
  TeamTab: undefined;
  ContactsTab: undefined;
  MessagesTab: undefined;
  CampaignsTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICON_MAP = {
  TeamTab: TeamIcon,
  ContactsTab: ContactIcon,
  MessagesTab: MessagesIcon,
  CampaignsTab: CampaignsIcon,
  SettingsTab: SettingsIcon,
} as const;

export function MainTabs() {
  const { colors } = useTheme();

  const baseTabBarStyle = {
    backgroundColor: colors.background,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    height: 56,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const IconComponent = TAB_ICON_MAP[route.name] ?? SettingsIcon;
        const focusedRouteName = getFocusedRouteNameFromRoute(route);
        const hideTabBar =
          (route.name === "TeamTab" && focusedRouteName === "TeamChatThread") ||
          (route.name === "MessagesTab" && focusedRouteName === "Chat");
        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
          tabBarStyle: hideTabBar ? { display: "none" } : baseTabBarStyle,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDim,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <IconComponent color={color} focused={focused} />
            </View>
          ),
        };
      }}
    >
      <Tab.Screen
        name="TeamTab"
        component={TeamStack}
        options={{ title: "Team Chat" }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsStack}
        options={{ title: "Contacts" }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack}
        options={{ title: "Messages" }}
      />
      <Tab.Screen
        name="CampaignsTab"
        component={CampaignsStack}
        options={{ title: "Campaigns" }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
  },
});
