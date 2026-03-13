import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ConversationsScreen } from "../screens/messages/ConversationsScreen";
import { ChatScreen } from "../screens/messages/ChatScreen";
import { NewConversationScreen } from "../screens/messages/NewConversationScreen";
import { ContactDetailScreen } from "../screens/contacts/ContactDetailScreen";

export type MessagesStackParamList = {
  Conversations: undefined;
  NewConversation: undefined;
  Chat: { conversationId: string; conversationTitle?: string; contactId?: string };
  ContactDetail: { contactId: string };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
    </Stack.Navigator>
  );
}
