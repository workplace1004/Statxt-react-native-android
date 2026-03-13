import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
} from "react-native";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import { useContacts } from "../../hooks/useContacts";
import type { Contact } from "../../types/contacts";
import type { MessagesStackParamList } from "../../navigation/MessagesStack";

type Nav = NativeStackNavigationProp<MessagesStackParamList, "NewConversation">;

function conversationIdFromContact(contact: Contact): string {
  const raw = contact.id.replace("local_", "").replace(/^contact-/, "");
  return raw ? `conv-${raw}` : `conv-${contact.id}`;
}

export function NewConversationScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch, isRefetching } = useContacts({ search: search || undefined });
  const contacts = data?.contacts ?? [];

  const onSelectContact = useCallback(
    (contact: Contact) => {
      navigation.navigate("Chat", {
        conversationId: conversationIdFromContact(contact),
        conversationTitle: contact.name,
      });
    },
    [navigation]
  );

  const renderItem: ListRenderItem<Contact> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[styles.contactRow, { backgroundColor: colors.surface }]}
        onPress={() => onSelectContact(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary + "30" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.subtitle ? (
            <Text style={[styles.contactSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [colors, onSelectContact]
  );

  const keyExtractor = useCallback((item: Contact) => item.id, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 10 },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BackArrowIcon color={colors.primary} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          New conversation
        </Text>
      </View>

      <View style={styles.selectSection}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          Select contact
        </Text>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Search contacts"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.placeholder, { color: colors.textMuted }]}>
            Could not load contacts.
          </Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.placeholder, { color: colors.textMuted }]}>
            {search.trim() ? "No contacts match your search." : "No contacts yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: spacing.md },
  title: { ...typography.titleMd, flex: 1 },
  selectSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionLabel: { ...typography.label, marginBottom: spacing.sm },
  searchInput: {
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing["3xl"] },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: { ...typography.titleLg },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { ...typography.titleSm },
  contactSubtitle: { ...typography.bodySm, marginTop: 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  placeholder: { ...typography.body, textAlign: "center" },
});
