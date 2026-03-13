import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SectionList,
  ListRenderItem,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import {
  SearchIcon,
  FilterIcon,
  TrashIcon,
  ChevronRightIcon,
  MessagesIcon,
  ContactIcon,
} from "../../components/TabIcons";
import { useContacts } from "../../hooks/useContacts";
import { contactsLog } from "../../lib/logger";
import { useContactGroups } from "../../hooks/useContactGroups";
import type { ContactGroup } from "../../types/campaigns";
import { AddContactModal } from "./AddContactModal";
import { AddGroupModal } from "./AddGroupModal";
import {
  ContactsFiltersModal,
  type ContactFiltersState,
  type GroupItem,
} from "./ContactsFiltersModal";
import type { Contact } from "../../types/contacts";
import type { ContactsStackParamList } from "../../navigation/ContactsStack";

type Nav = NativeStackNavigationProp<ContactsStackParamList, "ContactsList">;

type TabType = "contacts" | "groups";

const defaultFilters: ContactFiltersState = {
  sortBy: "created",
  status: "all",
  groupId: null,
  lastContacted: "any",
};

function filtersToParams(f: ContactFiltersState) {
  const sortBy =
    f.sortBy === "az"
      ? "last_name"
      : f.sortBy === "last_contacted"
        ? "last_contacted_at"
        : "created_at";
  const sortOrder = f.sortBy === "az" ? "asc" : "desc";
  return {
    sortBy,
    sortOrder: sortOrder as "asc" | "desc",
    status: f.status === "all" ? undefined : f.status,
    groupId: f.groupId ?? undefined,
  };
}

type ContactSection = { title: string; data: Contact[] };

function buildSections(contacts: Contact[]): ContactSection[] {
  const byLetter = new Map<string, Contact[]>();
  for (const c of contacts) {
    const name = (c.name || "").trim();
    const first = name.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(first) ? first : "#";
    if (!byLetter.has(key)) byLetter.set(key, []);
    byLetter.get(key)!.push(c);
  }
  for (const arr of byLetter.values()) {
    arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  }
  const order = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].filter((k) => byLetter.has(k));
  return order.map((title) => ({ title, data: byLetter.get(title)! }));
}

export function ContactsListScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addGroupModalVisible, setAddGroupModalVisible] = useState(false);
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("contacts");
  const [filters, setFilters] = useState<ContactFiltersState>(defaultFilters);
  const [deletedContactIds, setDeletedContactIds] = useState<Set<string>>(() => new Set());
  const openSwipeableRef = useRef<Swipeable | null>(null);
  const swipeableRefsMap = useRef<Map<string, Swipeable>>(new Map());

  const contactsQuery = useContacts({
    search: search || undefined,
    page: 1,
    ...filtersToParams(filters),
  });
  const { data, isLoading, error, refetch: refetchContacts, isRefetching: contactsRefetching } = contactsQuery;
  const contacts = data?.contacts ?? [];

  const { contactGroups: allGroups = [], refetch: refetchGroups, isRefetching: groupsRefetching } = useContactGroups();
  const refreshRefetching = contactsRefetching || groupsRefetching;
  const onRefresh = useCallback(() => {
    refetchContacts();
    refetchGroups();
  }, [refetchContacts, refetchGroups]);

  const visibleContacts = useMemo(
    () => contacts.filter((c) => !deletedContactIds.has(c.id)),
    [contacts, deletedContactIds]
  );
  const sections = useMemo(() => buildSections(visibleContacts), [visibleContacts]);
  const totalContactCount = data?.pagination?.total ?? visibleContacts.length;
  const contactCount = visibleContacts.length;

  const groupsForFilter: GroupItem[] = useMemo(
    () => allGroups.map((g) => ({ id: g.id, name: g.name })),
    [allGroups]
  );
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return allGroups;
    const q = search.trim().toLowerCase();
    return allGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [allGroups, search]);

  useEffect(() => {
    contactsLog("ContactsListScreen state", {
      isLoading,
      isError: !!error,
      errorMessage: error instanceof Error ? error.message : null,
      contactsLength: contacts.length,
      contactCount,
      hasData: !!data,
    });
  }, [isLoading, error, contacts.length, contactCount, data]);

  const onContactPress = useCallback(
    (contact: Contact) => {
      navigation.navigate("ContactDetail", { contactId: contact.id, contact });
    },
    [navigation]
  );

  const onDeleteContact = useCallback((contact: Contact) => {
    setDeletedContactIds((prev) => new Set(prev).add(contact.id));
  }, []);

  const onChatContact = useCallback(
    (contact: Contact) => {
      const tabNav = navigation.getParent();
      (tabNav as { navigate: (name: string, params?: object) => void } | undefined)?.navigate(
        "MessagesTab",
        { screen: "Chat", params: { conversationId: `conv-${contact.id}`, conversationTitle: contact.name, contactId: contact.id } }
      );
    },
    [navigation]
  );

  const onGroupContact = useCallback(() => {
    // Placeholder: Add to group – could open group picker later
  }, []);

  const renderContactRow = useCallback(
    ({ item }: { item: Contact }) => {
      const initials =
        item.name
          .trim()
          .split(/\s+/)
          .map((s) => s.charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 2) || item.name.charAt(0).toUpperCase();
      return (
        <Swipeable
          ref={(r) => {
            if (r) swipeableRefsMap.current.set(item.id, r);
          }}
          onSwipeableOpen={() => {
            const thisRef = swipeableRefsMap.current.get(item.id);
            if (openSwipeableRef.current && openSwipeableRef.current !== thisRef) {
              openSwipeableRef.current.close();
            }
            openSwipeableRef.current = thisRef ?? null;
          }}
          onSwipeableClose={() => {
            const thisRef = swipeableRefsMap.current.get(item.id);
            if (openSwipeableRef.current === thisRef) {
              openSwipeableRef.current = null;
            }
          }}
          renderRightActions={() => (
            <TouchableOpacity
              style={[styles.swipeRightAction, styles.deleteAction]}
              onPress={() => onDeleteContact(item)}
              activeOpacity={0.8}
            >
              <TrashIcon color="#fff" size={22} />
              <Text style={styles.swipeActionLabel}>Delete</Text>
            </TouchableOpacity>
          )}
          renderLeftActions={() => (
            <View style={styles.swipeLeftActions}>
              <TouchableOpacity
                style={[styles.swipeLeftAction, { backgroundColor: colors.primary }]}
                onPress={() => onChatContact(item)}
                activeOpacity={0.8}
              >
                <MessagesIcon color="#fff" focused={false} />
                <Text style={styles.swipeActionLabel}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.swipeLeftAction, { backgroundColor: colors.primary }]}
                onPress={() => onGroupContact()}
                activeOpacity={0.8}
              >
                <ContactIcon color="#fff" focused={false} />
                <Text style={styles.swipeActionLabel}>Group</Text>
              </TouchableOpacity>
            </View>
          )}
        >
          <TouchableOpacity
            style={[styles.contactRow, { backgroundColor: colors.surface }]}
            onPress={() => onContactPress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary + "30" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
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
            <ChevronRightIcon color={colors.textMuted} size={20} />
          </TouchableOpacity>
        </Swipeable>
      );
    },
    [colors, onContactPress, onDeleteContact, onChatContact, onGroupContact]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ContactSection }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionHeaderText, { color: colors.text }]}>{section.title}</Text>
      </View>
    ),
    [colors]
  );

  const keyExtractor = useCallback((item: Contact) => item.id, []);

  const onGroupPress = useCallback(
    (group: ContactGroup) => {
      navigation.navigate("GroupMembers", { groupId: group.id, groupName: group.name });
    },
    [navigation]
  );

  const renderGroupItem: ListRenderItem<ContactGroup> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[styles.groupCard, { backgroundColor: colors.surface }]}
        onPress={() => onGroupPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.groupIconWrap, { backgroundColor: colors.primary + "22" }]}>
          <ContactIcon color={colors.primary} focused={false} />
        </View>
        <View style={styles.groupCardInfo}>
          <Text style={[styles.groupCardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.groupCardCount, { color: colors.textMuted }]}>
            {item.contactCount} {item.contactCount === 1 ? "contact" : "contacts"}
          </Text>
        </View>
        <ChevronRightIcon color={colors.textMuted} size={20} />
      </TouchableOpacity>
    ),
    [colors, onGroupPress]
  );
  const groupKeyExtractor = useCallback((item: ContactGroup) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header: title + subtitle left; filter + add right */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Contacts</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {totalContactCount} contacts • {allGroups.length} groups
          </Text>
        </View>
        <View style={styles.headerRight}>
          {activeTab === "contacts" ? (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setFiltersModalVisible(true)}
              activeOpacity={0.7}
            >
              <FilterIcon color={colors.text} size={20} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.iconButton, styles.addButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={() => (activeTab === "groups" ? setAddGroupModalVisible(true) : setAddModalVisible(true))}
            activeOpacity={0.7}
          >
            <Text style={[styles.addButtonText, { color: colors.primary }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented: Contacts | Groups */}
      <View style={[styles.segmentedWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.segment, activeTab === "contacts" && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab("contacts")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, { color: colors.text }, activeTab === "contacts" && styles.segmentTextActive]}>
            Contacts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeTab === "groups" && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab("groups")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, { color: colors.textMuted }, activeTab === "groups" && styles.segmentTextActive]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search bar with icon */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SearchIcon color={colors.textMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      {/* Status filter pills (All / Active / Unsubscribed) – content sits under this */}
      <View style={styles.pillsCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
          style={styles.pillsScroll}
        >
          {[
            { key: "all" as const, label: "All" },
            { key: "active" as const, label: "Active" },
            { key: "unsubscribed" as const, label: "Unsubscribed" },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.pill,
                {
                  backgroundColor: filters.status === key ? colors.primary + "22" : "transparent",
                  borderColor: filters.status === key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilters((f) => ({ ...f, status: key }))}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: filters.status === key ? colors.text : colors.textMuted },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Groups / Contacts content – always placed under the filter pills card */}
      <View style={styles.mainContent}>
      {activeTab === "groups" ? (
        filteredGroups.length === 0 ? (
          <ScrollView
            style={styles.flex1}
            contentContainerStyle={styles.emptyGroupsWrap}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl
                refreshing={refreshRefetching}
                onRefresh={onRefresh}
              />
            }
          >
            <View style={[styles.emptyGroupsIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <ContactIcon color={colors.primary} focused={false} size={48} />
            </View>
            <Text style={[styles.emptyGroupsTitle, { color: colors.text }]}>No groups</Text>
            <Text style={[styles.emptyGroupsSubtitle, { color: colors.textMuted }]}>
              {search.trim() ? "No groups match your search." : "Create groups in Contacts to organize and message your contacts."}
            </Text>
          </ScrollView>
        ) : (
          <FlatList
            data={filteredGroups}
            renderItem={renderGroupItem}
            keyExtractor={groupKeyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl
                refreshing={refreshRefetching}
                onRefresh={onRefresh}
              />
            }
          />
        )
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Could not load contacts.
          </Text>
        </View>
      ) : visibleContacts.length === 0 ? (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.emptyGroupsWrap}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshRefetching}
              onRefresh={onRefresh}
            />
          }
        >
          <View style={[styles.emptyGroupsIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <ContactIcon color={colors.primary} focused={false} size={48} />
          </View>
          <Text style={[styles.emptyGroupsTitle, { color: colors.text }]}>No contacts</Text>
          <Text style={[styles.emptyGroupsSubtitle, { color: colors.textMuted }]}>
            {search.trim()
              ? "No contacts match your search."
              : "Add contacts with the + button to get started."}
          </Text>
          <Text style={[styles.emptyGroupsSubtitle, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Pull down to refresh.
          </Text>
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderContactRow}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshRefetching}
              onRefresh={onRefresh}
            />
          }
        />
      )}

      </View>

      <AddContactModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />

      <AddGroupModal
        visible={addGroupModalVisible}
        onClose={() => setAddGroupModalVisible(false)}
      />

      <ContactsFiltersModal
        visible={filtersModalVisible}
        onClose={() => setFiltersModalVisible(false)}
        initialFilters={filters}
        groups={groupsForFilter}
        onApply={setFilters}
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
    paddingBottom: spacing.sm,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.displayMd },
  subtitle: { ...typography.bodySm, marginTop: 2 },
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
  pillsCard: { marginBottom: spacing.sm },
  pillsScroll: { maxHeight: 64 },
  pillsContent: {
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 64,
  },
  pill: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: { ...typography.bodySm, fontWeight: "500" },
  refreshingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  refreshingText: { ...typography.bodySm, fontWeight: "600" },
  mainContent: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing["3xl"] },
  sectionHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionHeaderText: { ...typography.titleSm, fontWeight: "600" },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  swipeRightAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: spacing.sm,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  deleteAction: { backgroundColor: "#c62828" },
  swipeLeftActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: spacing.sm,
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
    overflow: "hidden",
  },
  swipeLeftAction: {
    width: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeActionLabel: { color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 4 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: { ...typography.titleLg },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  groupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  groupCardInfo: { flex: 1, minWidth: 0 },
  groupCardName: { ...typography.titleSm },
  groupCardCount: { ...typography.bodySm, marginTop: 2 },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { ...typography.titleSm },
  contactSubtitle: { ...typography.bodySm, marginTop: 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  emptyText: { ...typography.body, textAlign: "center" },
  emptyGroupsWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    minHeight: 220,
  },
  emptyGroupsIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyGroupsTitle: { ...typography.titleLg, fontWeight: "600", marginBottom: spacing.sm },
  emptyGroupsSubtitle: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.xl },
});
