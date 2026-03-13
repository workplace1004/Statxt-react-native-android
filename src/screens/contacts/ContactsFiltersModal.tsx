import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { CheckIcon } from "../../components/TabIcons";

export type SortOption = "az" | "created" | "last_contacted";
export type StatusOption = "all" | "active" | "unsubscribed";
export type LastContactedOption = "any" | "never" | "7d" | "30d" | "custom";

export interface ContactFiltersState {
  sortBy: SortOption;
  status: StatusOption;
  groupId: string | null;
  lastContacted: LastContactedOption;
}

export type GroupItem = { id: string | null; name: string };

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "az", label: "A-Z" },
  { key: "created", label: "Created date" },
  { key: "last_contacted", label: "Last contacted" },
];

const STATUS_OPTIONS: { key: StatusOption; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "unsubscribed", label: "Unsubscribed" },
];

const LAST_CONTACTED_OPTIONS: { key: LastContactedOption; label: string }[] = [
  { key: "any", label: "Any" },
  { key: "never", label: "Never" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom" },
];

/** Show at most 5 group rows; scroll to see the rest. */
const GROUPS_VISIBLE_COUNT = 5;
const GROUP_ROW_HEIGHT = 44;
const GROUPS_LIST_MAX_HEIGHT = GROUPS_VISIBLE_COUNT * GROUP_ROW_HEIGHT;

type Props = {
  visible: boolean;
  onClose: () => void;
  initialFilters: ContactFiltersState;
  groups?: GroupItem[];
  onApply: (filters: ContactFiltersState) => void;
};

export function ContactsFiltersModal({
  visible,
  onClose,
  initialFilters,
  groups = [],
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [sortBy, setSortBy] = useState<SortOption>(initialFilters.sortBy);
  const [status, setStatus] = useState<StatusOption>(initialFilters.status);
  const [groupId, setGroupId] = useState<string | null>(initialFilters.groupId);
  const [lastContacted, setLastContacted] = useState<LastContactedOption>(
    initialFilters.lastContacted
  );

  useEffect(() => {
    if (visible) {
      setSortBy(initialFilters.sortBy);
      setStatus(initialFilters.status);
      setGroupId(initialFilters.groupId);
      setLastContacted(initialFilters.lastContacted);
    }
  }, [visible, initialFilters.sortBy, initialFilters.status, initialFilters.groupId, initialFilters.lastContacted]);

  const handleApply = () => {
    onApply({ sortBy, status, groupId, lastContacted });
    onClose();
  };

  if (!visible) return null;

  const allGroups: GroupItem[] = [{ id: null, name: "All groups" }, ...groups];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.sheet,
              borderColor: colors.borderSubtle,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.text }]}>Filters</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.closeX, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sort */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Sort</Text>
            <View style={styles.pillRow}>
              {SORT_OPTIONS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: sortBy === key ? colors.primary : colors.surfaceSubtle,
                      borderColor: sortBy === key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSortBy(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: sortBy === key ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
            <View style={styles.pillRow}>
              {STATUS_OPTIONS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: status === key ? colors.primary : colors.surfaceSubtle,
                      borderColor: status === key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setStatus(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: status === key ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Groups: show 5 rows, scroll for more */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Groups</Text>
            <ScrollView
              style={[styles.groupsScroll, { maxHeight: GROUPS_LIST_MAX_HEIGHT, borderColor: colors.border }]}
              contentContainerStyle={styles.groupsScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              <View style={[styles.groupList, { backgroundColor: colors.surface }]}>
                {allGroups.map((group, index) => {
                  const selected = groupId === group.id;
                  const isLast = index === allGroups.length - 1;
                  return (
                    <TouchableOpacity
                      key={group.id ?? "all"}
                      style={[
                        styles.groupRow,
                        {
                          borderBottomColor: colors.borderSubtle,
                          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        },
                      ]}
                      onPress={() => setGroupId(group.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                        {group.name}
                      </Text>
                      {selected && (
                        <CheckIcon color={colors.primary} size={22} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Last contacted */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Last contacted
            </Text>
            <View style={styles.pillRowWrap}>
              {LAST_CONTACTED_OPTIONS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: lastContacted === key ? colors.primary : colors.surfaceSubtle,
                      borderColor: lastContacted === key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setLastContacted(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: lastContacted === key ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Apply button */}
          <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { ...typography.titleMd },
  closeBtn: {
    position: "absolute",
    right: spacing.lg,
    top: spacing.md,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: { fontSize: 18, fontWeight: "500" },
  scroll: { maxHeight: 600 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pillRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: { ...typography.bodySm, fontWeight: "500" },
  groupsScroll: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupsScrollContent: {
    flexGrow: 1,
  },
  groupList: {
    overflow: "hidden",
  },
  groupRow: {
    minHeight: GROUP_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupName: { ...typography.body, flex: 1 },
  footer: {},
  applyBtn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: { ...typography.titleSm, color: "#FFFFFF" },
});
