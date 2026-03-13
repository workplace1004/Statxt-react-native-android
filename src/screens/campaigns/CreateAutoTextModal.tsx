import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ListRenderItem,
  Switch,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { SearchIcon, DeliveryCheckIcon, ContactIcon, ClockIcon } from "../../components/TabIcons";
import { useContactGroups } from "../../hooks/useContactGroups";
import type { ContactGroup } from "../../types/campaigns";

type Props = {
  visible: boolean;
  onClose: () => void;
  onNext?: (name: string, message: string) => void;
};

const STEPS = [
  { id: 1, label: "Name & message" },
  { id: 2, label: "Audience" },
  { id: 3, label: "Schedule & stop on reply" },
] as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CreateAutoTextModal({ visible, onClose, onNext }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5]));
  const [scheduleTime, setScheduleTime] = useState("9:00 AM");
  const [durationUnit, setDurationUnit] = useState<"weeks" | "months">("months");
  const [durationValue, setDurationValue] = useState("4");
  const [stopOnReply, setStopOnReply] = useState(true);

  const { contactGroups: allGroups = [] } = useContactGroups();
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return allGroups;
    const q = groupSearch.trim().toLowerCase();
    return allGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [allGroups, groupSearch]);

  const selectedRecipientCount = useMemo(() => {
    return allGroups
      .filter((g) => selectedGroupIds.has(g.id))
      .reduce((sum, g) => sum + g.contactCount, 0);
  }, [allGroups, selectedGroupIds]);

  const handleStep1Next = () => setStep(2);
  const handleStep2Next = () => setStep(3);
  const handleStep3Create = () => {
    onNext?.(name.trim(), message.trim());
    handleClose();
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleClose = () => {
    setStep(1);
    setName("");
    setMessage("");
    setGroupSearch("");
    setSelectedGroupIds(new Set());
    setSelectedDays(new Set([1, 2, 3, 4, 5]));
    setScheduleTime("9:00 AM");
    setDurationUnit("months");
    setDurationValue("4");
    setStopOnReply(true);
    onClose();
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const renderGroupItem: ListRenderItem<ContactGroup> = ({ item }) => {
    const isSelected = selectedGroupIds.has(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.groupRow,
          { backgroundColor: isSelected ? `${colors.primary}18` : colors.background, borderColor: isSelected ? colors.primary : colors.border },
        ]}
        onPress={() => toggleGroup(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.groupRowLeft}>
          <Text style={[styles.groupRowName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.groupRowCount, { color: colors.textMuted }]}>
            {item.contactCount} {item.contactCount === 1 ? "contact" : "contacts"}
          </Text>
        </View>
        {isSelected ? (
          <View style={styles.groupRowCheck}>
            <DeliveryCheckIcon size={22} />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sheetInner}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>Create Auto-Text</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Step indicator */}
            <View style={styles.stepIndicatorRow}>
              <View style={styles.stepDots}>
                {STEPS.map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.stepDot,
                      { backgroundColor: step >= s.id ? colors.primary : `${colors.textMuted}66` },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {step === 1 && (
                <>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Step 1) Name & message
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="Auto-text name"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.messageInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="Message"
                    placeholderTextColor={colors.textMuted}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Step 2) Audience
                  </Text>
                  <View
                    style={[
                      styles.searchWrap,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <SearchIcon color={colors.textMuted} size={20} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search groups..."
                      placeholderTextColor={colors.textMuted}
                      value={groupSearch}
                      onChangeText={setGroupSearch}
                    />
                  </View>
                  <FlatList
                    data={filteredGroups}
                    renderItem={renderGroupItem}
                    keyExtractor={(item) => item.id}
                    style={styles.groupList}
                    contentContainerStyle={styles.groupListContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <Text style={[styles.emptyGroups, { color: colors.textMuted }]}>
                        {groupSearch.trim() ? "No groups match your search." : "No groups."}
                      </Text>
                    }
                  />
                  {selectedRecipientCount > 0 && (
                    <View style={styles.recipientsSummary}>
                      <ContactIcon color={colors.primary} focused={false} />
                      <Text style={[styles.recipientsSummaryText, { color: colors.primary }]}>
                        {selectedRecipientCount} recipient{selectedRecipientCount !== 1 ? "s" : ""} selected
                      </Text>
                    </View>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Step 3) Schedule & stop on reply
                  </Text>
                  <Text style={[styles.step3Label, { color: colors.textMuted }]}>Days</Text>
                  <View style={styles.dayRow}>
                    {DAY_LABELS.map((label, index) => {
                      const isSelected = selectedDays.has(index);
                      return (
                        <TouchableOpacity
                          key={label}
                          style={[
                            styles.dayPill,
                            { backgroundColor: isSelected ? colors.primary : "transparent", borderColor: colors.border },
                          ]}
                          onPress={() => toggleDay(index)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.dayPillText, { color: isSelected ? "#FFFFFF" : colors.text }]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={[styles.timeRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <ClockIcon color={colors.textMuted} size={20} />
                    <TextInput
                      style={[styles.timeInput, { color: colors.text }]}
                      value={scheduleTime}
                      onChangeText={setScheduleTime}
                      placeholder="9:00 AM"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.durationRow}>
                    <TouchableOpacity
                      style={[
                        styles.durationPill,
                        { backgroundColor: durationUnit === "weeks" ? colors.primary : colors.background, borderColor: colors.border },
                      ]}
                      onPress={() => setDurationUnit("weeks")}
                    >
                      <Text style={[styles.durationPillText, { color: durationUnit === "weeks" ? "#FFFFFF" : colors.text }]}>
                        Weeks
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.durationPill,
                        { backgroundColor: durationUnit === "months" ? colors.primary : colors.background, borderColor: colors.border },
                      ]}
                      onPress={() => setDurationUnit("months")}
                    >
                      <Text style={[styles.durationPillText, { color: durationUnit === "months" ? "#FFFFFF" : colors.text }]}>
                        Months
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.durationInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      value={durationValue}
                      onChangeText={setDurationValue}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.stopOnReplyRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.stopOnReplyLabel, { color: colors.text }]}>Stop on reply</Text>
                    <Switch
                      value={stopOnReply}
                      onValueChange={setStopOnReply}
                      trackColor={{ false: colors.border, true: `${colors.primary}99` }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <Text style={[styles.timezoneText, { color: colors.textMuted }]}>
                    Timezone: America/New_York
                  </Text>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {step === 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={handleClose}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.nextBtn, { backgroundColor: colors.primary }]}
                    onPress={handleStep1Next}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextBtnText}>Next</Text>
                  </TouchableOpacity>
                </>
              )}
              {step === 2 && (
                <>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={handleBack}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.nextBtn, { backgroundColor: colors.primary }]}
                    onPress={handleStep2Next}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextBtnText}>Next</Text>
                  </TouchableOpacity>
                </>
              )}
              {step === 3 && (
                <>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={handleBack}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.nextBtn, { backgroundColor: colors.primary }]}
                    onPress={handleStep3Create}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextBtnText}>Create Auto-Text</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  sheetInner: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.titleLg, fontWeight: "700" },
  closeBtn: { padding: spacing.xs },
  closeX: { fontSize: 20, fontWeight: "600" },
  stepIndicatorRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  stepDots: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.xs, justifyContent: "center" },
  stepDot: { width: 14, height: 14, borderRadius: 7 },
  stepLabel: { ...typography.caption },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeading: { ...typography.titleSm, fontWeight: "600", marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...typography.body,
  },
  messageInput: { minHeight: 100, textAlignVertical: "top" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  groupList: { maxHeight: 220 },
  groupListContent: { paddingBottom: spacing.sm },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  groupRowLeft: { flex: 1, minWidth: 0 },
  groupRowName: { ...typography.body },
  groupRowCount: { ...typography.bodySm },
  groupRowCheck: { marginLeft: spacing.sm },
  recipientsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  recipientsSummaryText: { ...typography.bodySm, fontWeight: "600" },
  emptyGroups: { ...typography.body, textAlign: "center", paddingVertical: spacing.lg },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
  },
  footerBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  cancelBtn: { backgroundColor: "transparent", borderWidth: 1 },
  cancelBtnText: { ...typography.label, fontWeight: "600" },
  nextBtn: {},
  nextBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  step3Label: { ...typography.caption, marginBottom: spacing.sm },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  dayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  dayPillText: { ...typography.caption, fontWeight: "600" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timeInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  durationPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  durationPillText: { ...typography.bodySm, fontWeight: "600" },
  durationInput: {
    width: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
    textAlign: "center",
  },
  stopOnReplyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  stopOnReplyLabel: { ...typography.body },
  timezoneText: { ...typography.caption, marginTop: spacing.sm },
});
