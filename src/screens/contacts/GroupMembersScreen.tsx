import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon, ContactIcon, SearchIcon } from "../../components/TabIcons";
import { useContactGroup } from "../../hooks/useContactGroups";
import type { Contact } from "../../types/contacts";
import type { ContactsStackParamList } from "../../navigation/ContactsStack";

type Nav = NativeStackNavigationProp<ContactsStackParamList, "GroupMembers">;
type GroupMembersRouteProp = RouteProp<ContactsStackParamList, "GroupMembers">;

function getInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return (name ?? "?").slice(0, 2).toUpperCase() || "?";
}

export function GroupMembersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<GroupMembersRouteProp>();
  const { groupId, groupName } = route.params;

  const [search, setSearch] = useState("");
  const { groupDetail, isLoading, error, refetch, isRefetching } = useContactGroup(groupId, true);
  const members = groupDetail?.contacts ?? [];
  const group = groupDetail?.group;
  const title = groupName ?? group?.name ?? "Group Members";

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.first_name ?? "").toLowerCase().includes(q) ||
        (c.last_name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.subtitle ?? "").toLowerCase().includes(q)
    );
  }, [members, search]);

  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  const onAddMember = useCallback(() => {
    // TODO: open Add member to group flow (e.g. contact picker or AddMemberToGroup screen)
    refetch();
  }, [refetch]);

  const onMemberPress = useCallback(
    (contact: Contact) => {
      navigation.navigate("ContactDetail", { contactId: contact.id, contact });
    },
    [navigation]
  );

  const renderMember: ListRenderItem<Contact> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[styles.memberRow, { backgroundColor: colors.surface }]}
        onPress={() => onMemberPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary + "40" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
            {item.name || "—"}
          </Text>
          {item.subtitle ? (
            <Text style={[styles.memberSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [colors, onMemberPress]
  );

  const keyExtractor = useCallback((item: Contact) => item.id, []);

  if (isLoading && !groupDetail) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <BackArrowIcon color={colors.primary} size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {members.length} {members.length === 1 ? "member" : "members"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onAddMember}
          activeOpacity={0.7}
        >
          <Text style={[styles.addBtnText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SearchIcon color={colors.textMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search members..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Could not load group members.</Text>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <ContactIcon color={colors.primary} focused={false} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No members</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            This group has no contacts yet.
          </Text>
        </View>
      ) : filteredMembers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching members</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Try a different search.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMember}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </KeyboardAvoidingView>
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
  headerTitleWrap: { flex: 1, minWidth: 0 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  addBtnText: { fontSize: 22, fontWeight: "400", lineHeight: 26 },
  title: { ...typography.titleMd },
  subtitle: { ...typography.bodySm, marginTop: 2 },
  searchWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
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
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing["3xl"] },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
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
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { ...typography.titleSm },
  memberSubtitle: { ...typography.bodySm, marginTop: 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  errorText: { ...typography.body },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...typography.titleLg, fontWeight: "600", marginBottom: spacing.sm, textAlign: "center" },
  emptySubtitle: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.xl },
});
