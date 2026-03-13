import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ContactsListScreen } from "../screens/contacts/ContactsListScreen";
import { ContactDetailScreen } from "../screens/contacts/ContactDetailScreen";
import { AddContactScreen } from "../screens/contacts/AddContactScreen";
import { GroupMembersScreen } from "../screens/contacts/GroupMembersScreen";
import type { Contact } from "../types/contacts";

export type ContactsStackParamList = {
  ContactsList: undefined;
  AddContact: undefined;
  ContactDetail: { contactId: string; contact?: Contact };
  GroupMembers: { groupId: string; groupName?: string };
};

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export function ContactsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ContactsList" component={ContactsListScreen} />
      <Stack.Screen name="AddContact" component={AddContactScreen} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
      <Stack.Screen name="GroupMembers" component={GroupMembersScreen} />
    </Stack.Navigator>
  );
}
