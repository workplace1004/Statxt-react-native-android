import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { SearchIcon, ChatBubbleOutlineIcon } from "../../components/TabIcons";
import { useTeamThreads } from "../../hooks/useTeamThreads";
import { NewConversationModal } from "./NewConversationModal";
import type { TeamThread } from "../../types/campaigns";
import type { TeamStackParamList } from "../../navigation/TeamStack";

type Nav = NativeStackNavigationProp<TeamStackParamList, "TeamMain">;

type TabValue = "all" | "direct" | "groups" | "channels";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function TeamMainScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [newConversationModalVisible, setNewConversationModalVisible] = useState(false);

  const { teamThreads: allThreads = [], isLoading, refetch, isRefetching } = useTeamThreads();
  const threads = useMemo(() => {
    let list = allThreads;
    if (activeTab === "direct") list = list.filter((t) => t.type === "direct");
    else if (activeTab === "groups") list = list.filter((t) => t.type === "group");
    else if (activeTab === "channels") list = list.filter((t) => t.type === "channel");
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (t) => t.title.toLowerCase().includes(q) || t.lastMessagePreview.toLowerCase().includes(q)
    );
  }, [allThreads, activeTab, search]);

  const onThreadPress = useCallback(
    (item: TeamThread) => {
      navigation.navigate("TeamChatThread", { threadId: item.id, threadTitle: item.title });
    },
    [navigation]
  );

  const threadCount = allThreads.length;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header: title + subtitle + add button (like Contacts) */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Team Chat</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {threadCount} {threadCount === 1 ? "thread" : "threads"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconButton, styles.addButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          onPress={() => setNewConversationModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.addButtonText, { color: colors.primary }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs: All | Direct | Groups | Channels */}
      <View style={[styles.segmentedWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(["all", "direct", "groups", "channels"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.segment, activeTab === tab && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === tab ? "#FFFFFF" : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {tab === "all" ? "All" : tab === "direct" ? "Direct" : tab === "groups" ? "Groups" : "Channels"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar (like Contacts) */}
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

      {/* Loading, list, or empty state */}
      {isLoading && !isRefetching ? (
        <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : threads.length > 0 ? (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
          renderItem={({ item }: { item: TeamThread }) => (
            <TouchableOpacity
              style={[styles.threadRow, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
              onPress={() => onThreadPress(item)}
            >
              <View style={[styles.threadAvatar, { backgroundColor: colors.primary + "30" }]}>
                <Text style={[styles.threadAvatarText, { color: colors.primary }]}>
                  {item.title.charAt(0)}
                </Text>
              </View>
              <View style={styles.threadContent}>
                <View style={styles.threadRowTop}>
                  <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.threadTime, { color: colors.textMuted }]}>
                    {formatTime(item.lastMessageAt)}
                  </Text>
                </View>
                <Text style={[styles.threadPreview, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.lastMessagePreview}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={[styles.threadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.threadBadgeText}>
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.emptyWrap}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
        >
          <ChatBubbleOutlineIcon color={colors.textMuted} size={80} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {search.trim() ? "No matches" : "No conversations yet"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {search.trim()
              ? "Try a different search."
              : "Start chatting with a team member"}
          </Text>
        </ScrollView>
      )}

      <NewConversationModal
        visible={newConversationModalVisible}
        onClose={() => setNewConversationModalVisible(false)}
        onCreated={(roomId) => {
          setNewConversationModalVisible(false);
          navigation.navigate("TeamChatThread", { threadId: roomId, threadTitle: undefined });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {},
  addButtonText: { fontSize: 22, fontWeight: "400", lineHeight: 26 },
  title: { ...typography.displayMd },
  subtitle: { ...typography.bodySm, marginTop: 2 },
  segmentedWrap: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    padding: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { ...typography.bodySm, fontWeight: "500" },
  segmentTextActive: { color: "#FFFFFF" },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
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
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
  },
  emptyTitle: {
    ...typography.titleLg,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  emptySubtitle: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing["3xl"] },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  threadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  threadAvatarText: { ...typography.titleLg },
  threadContent: { flex: 1, minWidth: 0 },
  threadRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  threadTitle: { ...typography.titleSm },
  threadTime: { ...typography.caption },
  threadPreview: { ...typography.bodySm },
  threadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  threadBadgeText: { ...typography.caption, color: "#FFFFFF" },
});
