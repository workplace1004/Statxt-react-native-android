import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import {
  getTeamMembers,
  removeTeamMember,
  type TeamMember,
} from "../../lib/api";

const AVATAR_COLORS = ["#10B981", "#3B82F6", "#8B5CF6"];

function LinkIcon({ size = 18, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <Path
        d="M15 3.5L6.5 3.5M6.5 3.5C6.5 2.39543 5.60457 1.5 4.5 1.5C3.39543 1.5 2.5 2.39543 2.5 3.5M6.5 3.5C6.5 4.60457 5.60457 5.5 4.5 5.5C3.39543 5.5 2.5 4.60457 2.5 3.5M2.5 3.5L0 3.5M15 11.5L12.5 11.5M12.5 11.5C12.5 10.3954 11.6046 9.5 10.5 9.5C9.39543 9.5 8.5 10.3954 8.5 11.5M12.5 11.5C12.5 12.6046 11.6046 13.5 10.5 13.5C9.39543 13.5 8.5 12.6046 8.5 11.5M8.5 11.5H1.27146e-07"
        stroke={color}
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ size = 20, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.755,20.283,4,8H20L18.245,20.283A2,2,0,0,1,16.265,22H7.735A2,2,0,0,1,5.755,20.283ZM21,4H16V3a1,1,0,0,0-1-1H9A1,1,0,0,0,8,3V4H3A1,1,0,0,0,3,6H21a1,1,0,0,0,0-2Z"
        fill={color}
      />
    </Svg>
  );
}

const ROLE_OPTIONS = ["Admin", "Manager", "Member", "Viewer"];
const MEMBER_TYPE_OPTIONS = ["Employee", "Contractor", "Agency", "Partner"];

function getInitial(name: string): string {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

function roleToDisplay(role: string): string {
  if (!role) return role;
  const r = role.toLowerCase();
  if (r === "owner") return "Owner";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function roleToApi(role: string): string {
  return role.toLowerCase();
}

export function TeamMembersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [sendMember, setSendMember] = useState("");
  const [sendAmount, setSendAmount] = useState("25");
  const [sendNote, setSendNote] = useState("Thanks");
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteMemberType, setInviteMemberType] = useState("Employee");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [memberTypeDropdownOpen, setMemberTypeDropdownOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMemberDropdownOpen, setTeamMemberDropdownOpen] = useState(false);
  const [selectedSendMember, setSelectedSendMember] = useState<TeamMember | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getTeamMembers();
      setTeamMembers(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team members");
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  const handleRemove = (member: TeamMember) => {
    const name = member.full_name || member.email || "this member";
    Alert.alert(
      "Remove member",
      `Remove ${name} from the team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeTeamMember(member.id);
              setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
              if (selectedSendMember?.id === member.id) setSelectedSendMember(null);
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const isOwner = (member: TeamMember) => member.role?.toLowerCase() === "owner";
  const canRemove = (member: TeamMember) => !isOwner(member);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Team Members</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Manage your team and their permissions.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setInviteModalVisible(true);
            setRoleDropdownOpen(false);
            setMemberTypeDropdownOpen(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.inviteBtnText}>Invite Member</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Internal Team modal */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setInviteModalVisible(false);
            setRoleDropdownOpen(false);
            setMemberTypeDropdownOpen(false);
          }}
        >
          <Pressable style={[styles.modalCard, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            {(roleDropdownOpen || memberTypeDropdownOpen) && (
              <Pressable
                style={[styles.dropdownBackdrop, { zIndex: 5 }]}
                onPress={() => {
                  setRoleDropdownOpen(false);
                  setMemberTypeDropdownOpen(false);
                }}
              />
            )}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Invite Internal Team</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Creates a shareable invite link.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setInviteModalVisible(false);
                  setRoleDropdownOpen(false);
                  setMemberTypeDropdownOpen(false);
                }}
                hitSlop={12}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Email</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary }]}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="name@company.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Role</Text>
            <View style={styles.dropdownWrap}>
              <TouchableOpacity
                style={[styles.modalSelect, { backgroundColor: colors.background, borderColor: colors.primary }]}
                onPress={() => {
                  setMemberTypeDropdownOpen(false);
                  setRoleDropdownOpen((v) => !v);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalSelectText, { color: colors.text }]}>{inviteRole}</Text>
                <Ionicons name={roleDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {roleDropdownOpen && (
                <View style={[styles.dropdownPanel, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                  {ROLE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.dropdownOption,
                        { backgroundColor: inviteRole === opt ? colors.border + "40" : "transparent" },
                      ]}
                      onPress={() => {
                        setInviteRole(opt);
                        setRoleDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dropdownOptionText, { color: colors.text }]}>{opt}</Text>
                      {inviteRole === opt && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Member type</Text>
            <View style={styles.dropdownWrap}>
              <TouchableOpacity
                style={[styles.modalSelect, { backgroundColor: colors.background, borderColor: colors.primary }]}
                onPress={() => {
                  setRoleDropdownOpen(false);
                  setMemberTypeDropdownOpen((v) => !v);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalSelectText, { color: colors.text }]}>{inviteMemberType}</Text>
                <Ionicons name={memberTypeDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {memberTypeDropdownOpen && (
                <View style={[styles.dropdownPanel, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                  {MEMBER_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.dropdownOption,
                        { backgroundColor: inviteMemberType === opt ? colors.border + "40" : "transparent" },
                      ]}
                      onPress={() => {
                        setInviteMemberType(opt);
                        setMemberTypeDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dropdownOptionText, { color: colors.text }]}>{opt}</Text>
                      {inviteMemberType === opt && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { borderColor: colors.primary }]}
                onPress={() => {
                  setInviteModalVisible(false);
                  setRoleDropdownOpen(false);
                  setMemberTypeDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalCloseButtonText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setInviteModalVisible(false);
                  setRoleDropdownOpen(false);
                  setMemberTypeDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCreateBtnText}>Create Invite</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        onScroll={() => setTeamMemberDropdownOpen(false)}
        scrollEventThrottle={16}
      >
        {teamMemberDropdownOpen && (
          <Pressable
            style={[styles.dropdownBackdrop, { zIndex: 5 }]}
            onPress={() => setTeamMemberDropdownOpen(false)}
          />
        )}
        {/* Two cards row - raise above backdrop when team member dropdown is open so options are tappable */}
        <View style={[styles.twoCardsRow, teamMemberDropdownOpen && { zIndex: 10, elevation: 10 }]}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Allocate organization credits</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Admins can allocate org credits to users.
            </Text>
          </View>
          <View style={[styles.sendCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Send credits to teammate</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Move credits from your balance to another user.
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Team member</Text>
            <View style={styles.dropdownWrap}>
              <TouchableOpacity
                style={[styles.selectInput, { backgroundColor: colors.background, borderColor: colors.primary }]}
                onPress={() => setTeamMemberDropdownOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.selectPlaceholder,
                    { color: selectedSendMember ? colors.text : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {selectedSendMember
                    ? selectedSendMember.full_name || selectedSendMember.email
                    : "Select..."}
                </Text>
                <Ionicons
                  name={teamMemberDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {teamMemberDropdownOpen && (
                <View style={[styles.dropdownPanel, styles.teamMemberDropdownPanel, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                  {teamMembers.length === 0 ? (
                    <Text style={[styles.dropdownOptionText, { color: colors.textMuted, padding: spacing.md }]}>
                      No team members
                    </Text>
                  ) : (
                    <ScrollView style={styles.teamMemberDropdownScroll} nestedScrollEnabled>
                      {teamMembers.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.dropdownOption,
                            { backgroundColor: selectedSendMember?.id === m.id ? colors.border + "40" : "transparent" },
                          ]}
                          onPress={() => {
                            setSelectedSendMember(m);
                            setTeamMemberDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dropdownOptionText, { color: colors.text }]} numberOfLines={1}>
                            {m.full_name || m.email}
                          </Text>
                          {selectedSendMember?.id === m.id && (
                            <Ionicons name="checkmark" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary }]}
              value={sendAmount}
              onChangeText={setSendAmount}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Note (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary }]}
              value={sendNote}
              onChangeText={setSendNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team table */}
        <View style={[styles.tableCard, styles.tableCardRelative, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {loading ? (
            <View style={styles.tableLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading team members…</Text>
            </View>
          ) : error ? (
            <View style={styles.tableLoading}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : (
            teamMembers.map((member, index) => (
              <View
                key={member.id}
                style={[styles.tableRow, { borderBottomColor: colors.border, minWidth:"100%", flexDirection: "row", justifyContent: "space-between" }]}
              >
                <View style={[styles.memberCell, {minWidth:250}]}>
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] },
                      ]}
                    >
                      <Text style={styles.avatarText}>{getInitial(member.full_name)}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={[styles.memberName, { color: colors.text }]}>{member.full_name || member.email}</Text>
                    <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>
                </View>
                <View style={styles.roleCell}>
                  <Text style={[styles.roleText, { color: colors.text }]}>{roleToDisplay(member.role)}</Text>
                </View>
                <View style={styles.statusCell}>
                  <View style={[styles.statusPill, { backgroundColor: colors.success + "33" }]}>
                    <Text style={[styles.statusPillText, { color: colors.success }]}>Active</Text>
                  </View>
                </View>
                {/* <View style={styles.actionsCell}>
                  {canRemove(member) ? (
                    <>
                      <TouchableOpacity style={styles.actionIcon} activeOpacity={0.8}>
                        <LinkIcon size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={() => handleRemove(member)}
                        activeOpacity={0.8}
                      >
                        <TrashIcon size={20} color={colors.destructive} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={[styles.noAction, { color: colors.textMuted }]}>—</Text>
                  )}
                </View> */}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: spacing.sm },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.titleLg, fontWeight: "700" },
  headerSubtitle: { ...typography.bodySm, marginTop: 2 },
  inviteBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  inviteBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.titleLg, fontWeight: "700" },
  modalSubtitle: { ...typography.bodySm, marginTop: 2 },
  modalCloseBtn: { padding: spacing.xs },
  modalInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    marginBottom: spacing.sm,
  },
  modalSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalSelectText: { ...typography.body },
  dropdownWrap: { position: "relative", marginBottom: spacing.sm },
  dropdownPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 40,
    zIndex: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  teamMemberDropdownPanel: {
    maxHeight: 200,
  },
  teamMemberDropdownScroll: {
    maxHeight: 196,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownOptionText: { ...typography.body },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  modalCloseButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modalCloseButtonText: { ...typography.label, fontWeight: "600" },
  modalCreateBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  modalCreateBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl },
  twoCardsRow: { flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" },
  infoCard: {
    flex: 1,
    minWidth: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  sendCard: {
    flex: 1,
    minWidth: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardTitle: { ...typography.titleSm, fontWeight: "700", marginBottom: spacing.xs },
  cardSubtitle: { ...typography.bodySm, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.sm },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectPlaceholder: { ...typography.body },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  sendBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  sendBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  tableCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: "hidden",
    width:"100%",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  tableCardRelative: { position: "relative", flexDirection: "column", width:"100%", justifyContent: "space-between" },
  tableRow: {
    minWidth:"100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberCell: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tableLoading: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  loadingText: { ...typography.bodySm },
  errorText: { ...typography.bodySm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { ...typography.titleSm, color: "#FFFFFF", fontWeight: "700" },
  memberName: { ...typography.body, fontWeight: "600" },
  memberEmail: { ...typography.caption },
  roleCell: { flex: 0.8, minWidth: 0 },
  roleCellWrap: { position: "relative" },
  roleOptionsPanel: {
    position: "absolute",
    left: 0,
    top: 28,
    zIndex: 10,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  roleDropdown: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  roleText: { ...typography.bodySm },
  statusCell: { flex: 0.6 },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: { ...typography.caption, fontWeight: "600" },
  actionsCell: { flex: 0.8, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionIcon: {},
  noAction: { ...typography.bodySm },
});
