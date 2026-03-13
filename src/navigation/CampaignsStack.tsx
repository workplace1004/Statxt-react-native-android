import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CampaignsListScreen } from "../screens/campaigns/CampaignsListScreen";
import { CampaignDetailScreen } from "../screens/campaigns/CampaignDetailScreen";
import { CampaignCreateScreen } from "../screens/campaigns/CampaignCreateScreen";
import { AutoBlastsScreen } from "../screens/campaigns/AutoBlastsScreen";

export type CampaignsStackParamList = {
  CampaignsList: undefined;
  CampaignDetail: { campaignId: string };
  CampaignCreate: undefined;
  AutoBlasts: undefined;
};

const Stack = createNativeStackNavigator<CampaignsStackParamList>();

export function CampaignsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CampaignsList" component={CampaignsListScreen} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
      <Stack.Screen name="CampaignCreate" component={CampaignCreateScreen} />
      <Stack.Screen name="AutoBlasts" component={AutoBlastsScreen} />
    </Stack.Navigator>
  );
}
