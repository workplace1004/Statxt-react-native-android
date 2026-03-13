import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItem,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { ConversationFilterType } from "../../lib/messagesApi";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { useConversations } from "../../hooks/useConversations";
import { ComposeIcon, MessagesIcon, SearchIcon } from "../../components/TabIcons";
import type { Conversation } from "../../types/messages";
import type { MessagesStackParamList } from "../../navigation/MessagesStack";

type Nav = NativeStackNavigationProp<MessagesStackParamList, "Conversations">;

function formatTime(iso?: string | null): string {
  const d = new Date(iso ?? 0);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 24 * 60 * 60 * 1000) return "1d";
  if (diff < 2 * 24 * 60 * 60 * 1000) return "1d";
  if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + "d";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(title?: string | null): string {
  const s = (title ?? "").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return s.slice(0, 2).toUpperCase() || "?";
}

export function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ConversationFilterType>("all");

  const {
    conversations = [],
    totalCount,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations(search, filterType);
  const displayCount = totalCount ?? conversations.length;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onConversationPress = useCallback(
    (item: Conversation) => {
      navigation.navigate("Chat", {
        conversationId: item.id,
        conversationTitle: item.title ?? "—",
        contactId: item.contactId ?? undefined,
      });
    },
    [navigation]
  );

  const renderItem: ListRenderItem<Conversation> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => onConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {item.avatarUri ? (
              <Image source={{ uri: item.avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(item.title ?? "")}</Text>
            )}
          </View>
          <View
            style={[
              styles.onlineDot,
              { backgroundColor: colors.primary, borderColor: colors.surface },
            ]}
          />
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title ?? "—"}
            </Text>
            <Text style={[styles.rowTime, { color: colors.textMuted }]}>
              {formatTime(item.lastMessageAt ?? "")}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[
                styles.rowPreview,
                { color: colors.textMuted },
                item.unreadCount > 0 && { color: colors.text, fontWeight: "600" },
              ]}
              numberOfLines={1}
            >
              {(item.last_message_preview ?? item.lastMessagePreview ?? "").trim() || "No messages yet"}
            </Text>
            {item.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [colors, onConversationPress]
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const listFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null,
    [isFetchingNextPage, colors.primary]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header: title + count left, green compose icon right */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isLoading ? "Loading..." : `${displayCount} conversation${displayCount === 1 ? "" : "s"}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButtonWrap}
          onPress={() => navigation.navigate("NewConversation")}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ComposeIcon color={colors.primary} size={26} />
        </TouchableOpacity>
      </View>

      {/* Search bar with icon */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SearchIcon color={colors.textMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filter pills: All | Unread | Archived | Stopped */}
      <View style={styles.filterWrap}>
        <View style={styles.filterRow}>
          {(
            [
              { key: "all" as const, label: "All" },
              { key: "unread" as const, label: "Unread" },
              { key: "archived" as const, label: "Archived" },
              { key: "stopped" as const, label: "Stopped" },
            ] as const
          ).map(({ key, label }) => {
            const active = filterType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : "transparent",
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilterType(key)}
              >
                <Text style={[styles.filterChipText, { color: active ? "#FFFFFF" : colors.textMuted }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Could not load conversations.
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={[styles.emptyWrap, styles.emptyWrapScrollable]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
        >

          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <MessagesIcon color={colors.primary} focused={false} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {filterType !== "all" || search.trim()
              ? "No matching conversations."
              : "Your conversations will appear here."}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={listFooter}
          refreshControl={
            <AppRefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: { flex: 1 },
  addButtonWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.displayMd },
  subtitle: { ...typography.bodySm, marginTop: 2 },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  filterWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 36,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: { ...typography.label },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing["3xl"] },
  footerLoader: { paddingVertical: spacing.lg, alignItems: "center", justifyContent: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatarWrap: { position: "relative", marginRight: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...typography.titleLg, color: "#FFFFFF" },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    left: 40,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  rowTitle: { ...typography.titleSm, flex: 1 },
  rowTime: { ...typography.caption },
  rowBottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowPreview: { ...typography.bodySm, flex: 1 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { ...typography.caption, color: "#FFFFFF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  errorText: { ...typography.body },
  flex1: { flex: 1 },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyWrapScrollable: {
    minHeight: "100%",
  },
  emptyRefreshingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyRefreshingText: {
    ...typography.body,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...typography.titleLg, fontWeight: "600", marginBottom: spacing.sm, textAlign: "center" },
  emptySubtitle: { ...typography.body, textAlign: "center" },
});
