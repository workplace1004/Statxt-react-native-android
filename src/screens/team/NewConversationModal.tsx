import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { ChatBubbleOutlineIcon, ContactIcon } from "../../components/TabIcons";
import { fetchTeamMembers, createTeamChatRoom } from "../../lib/teamChatRoomsApi";
import type { TeamChatUser } from "../../types/teamChat";
import { queryKeys } from "../../lib/queryClient";

type TabType = "direct" | "group" | "channel";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (roomId: string) => void;
};

function getInitials(user: TeamChatUser): string {
  const name = (user.full_name ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const email = (user.email ?? "").trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function NewConversationModal({ visible, onClose, onCreated }: Props) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("group");
  const [groupName, setGroupName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [directMemberId, setDirectMemberId] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: fetchTeamMembers,
    enabled: visible,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (activeTab === "direct") {
        if (!directMemberId) throw new Error("Select a team member");
        const room = await createTeamChatRoom({
          type: "direct",
          member_ids: [directMemberId],
        });
        return room;
      }
      if (activeTab === "group") {
        const name = groupName.trim();
        if (!name) throw new Error("Group name is required");
        return createTeamChatRoom({
          type: "group",
          name,
          description: description.trim() || undefined,
          member_ids: Array.from(selectedMemberIds),
        });
      }
      const name = channelName.trim();
      if (!name) throw new Error("Channel name is required");
      return createTeamChatRoom({
        type: "channel",
        name,
        description: description.trim() || undefined,
        member_ids: Array.from(selectedMemberIds),
      });
    },
    onSuccess: (room) => {
      if (room?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.teamThreads.list() });
        onCreated?.(room.id);
      }
      handleClose();
    },
  });

  const handleClose = useCallback(() => {
    if (!createMutation.isPending) {
      setActiveTab("group");
      setGroupName("");
      setChannelName("");
      setDescription("");
      setSelectedMemberIds(new Set());
      setDirectMemberId(null);
      setFieldError(null);
      onClose();
    }
  }, [createMutation.isPending, onClose]);

  const handleCreate = useCallback(() => {
    setFieldError(null);
    if (activeTab === "direct" && !directMemberId) {
      setFieldError("Select a team member");
      return;
    }
    if (activeTab === "group" && !groupName.trim()) {
      setFieldError("Group name is required");
      return;
    }
    if (activeTab === "channel" && !channelName.trim()) {
      setFieldError("Channel name is required");
      return;
    }
    createMutation.mutate();
  }, [activeTab, directMemberId, groupName, channelName, createMutation]);

  const toggleMember = useCallback((id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canCreate =
    activeTab === "direct" ? !!directMemberId : activeTab === "group" ? !!groupName.trim() : !!channelName.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.backdrop }]} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.sheet, borderColor: colors.borderSubtle }]}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAvoidingView
            style={styles.sheetInner}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>New Conversation</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Start a new conversation with your team members
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.closeX, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs: Direct | Group | Channel */}
            <View style={[styles.tabsRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              {(
                [
                  { key: "direct" as TabType, label: "Direct", Icon: ChatBubbleOutlineIcon },
                  { key: "group" as TabType, label: "Group", Icon: ContactIcon },
                  { key: "channel" as TabType, label: "Channel", Icon: null },
                ] as const
              ).map(({ key, label, Icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.tab, activeTab === key && { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.8}
                >
                  {Icon ? (
                    <Icon color={activeTab === key ? "#FFFFFF" : colors.textMuted} focused={activeTab === key} size={18} />
                  ) : (
                    <Text style={[styles.tabHash, { color: activeTab === key ? "#FFFFFF" : colors.textMuted }]}>#</Text>
                  )}
                  <Text style={[styles.tabLabel, { color: activeTab === key ? "#FFFFFF" : colors.textMuted }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {(activeTab === "group" || activeTab === "channel") && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {activeTab === "group" ? "Group Name" : "Channel Name"}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder={activeTab === "group" ? "e.g., Marketing Team" : "e.g., #general"}
                    placeholderTextColor={colors.textMuted}
                    value={activeTab === "group" ? groupName : channelName}
                    onChangeText={activeTab === "group" ? setGroupName : setChannelName}
                    editable={!createMutation.isPending}
                  />
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.descriptionInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="What is this group about?"
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                    editable={!createMutation.isPending}
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {activeTab === "direct" ? "Select a team member" : "Add members"}
              </Text>

              {membersLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.membersLoader} />
              ) : members.length === 0 ? (
                <Text style={[styles.hint, { color: colors.textMuted }]}>No team members found.</Text>
              ) : (
                <View style={styles.memberList}>
                  {members.map((user) => {
                    const isSelected =
                      activeTab === "direct" ? directMemberId === user.id : selectedMemberIds.has(user.id);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.memberRow, { backgroundColor: colors.surface }]}
                        onPress={() =>
                          activeTab === "direct"
                            ? setDirectMemberId((id) => (id === user.id ? null : user.id))
                            : toggleMember(user.id)
                        }
                        activeOpacity={0.7}
                      >
                        <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "30" }]}>
                          <Text style={[styles.memberInitials, { color: colors.primary }]}>{getInitials(user)}</Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                            {user.full_name || user.email || "—"}
                          </Text>
                          {user.email ? (
                            <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>
                              {user.email}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : "transparent" },
                          ]}
                        >
                          {isSelected ? (
                            <Text style={styles.checkmark}>✓</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {fieldError ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{fieldError}</Text>
              ) : null}
              {createMutation.isError ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  Could not create. Try again.
                </Text>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={handleClose}
                disabled={createMutation.isPending}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary, opacity: createMutation.isPending ? 0.7 : 1 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending || !canCreate}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { minHeight: "100%", justifyContent: "center", alignItems: "center" },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: 1,
    width: "90%",
    height: "80%",
    maxHeight: "85%",
    flexDirection: "column",
  },
  sheetInner: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { ...typography.titleMd },
  subtitle: { ...typography.bodySm, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: { fontSize: 18, fontWeight: "500" },
  tabsRow: {
    flexDirection: "row",
    padding: 4,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabHash: { fontSize: 16, fontWeight: "600" },
  tabLabel: { ...typography.label },
  scroll: { flex: 1, minHeight: 0, maxHeight: 450 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.md },
  labelFirst: { marginTop: spacing.sm },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  descriptionInput: { minHeight: 72, paddingTop: spacing.md, paddingBottom: spacing.md },
  memberList: { marginTop: spacing.sm },
  membersLoader: { marginVertical: spacing.lg },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  memberInitials: { ...typography.titleSm },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { ...typography.body },
  memberEmail: { ...typography.bodySm, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  hint: { ...typography.bodySm, marginTop: spacing.sm },
  errorText: { ...typography.bodySm, marginTop: spacing.xs },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 100,
    flexShrink: 0,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { ...typography.titleSm },
  createBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { ...typography.titleSm, color: "#FFFFFF" },
});
