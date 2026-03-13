import React, { useState } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { createContactGroup } from "../../lib/contactGroupsApi";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AddGroupModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => createContactGroup(groupName.trim(), description.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contactGroups.all });
      setGroupName("");
      setDescription("");
      setFieldError(null);
      onClose();
    },
  });

  const handleCreate = () => {
    const name = groupName.trim();
    if (!name) {
      setFieldError("Group name is required");
      return;
    }
    setFieldError(null);
    createMutation.mutate();
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      setGroupName("");
      setDescription("");
      setFieldError(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.backdrop }]} onPress={handleClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.sheet,
              alignSelf: "center",
              borderColor: colors.borderSubtle,
              ...styles.sheetShadow,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAvoidingView
            style={styles.sheetInner}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.title, { color: colors.text }]}>Add Group</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.closeX, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.label, styles.labelFirst, { color: colors.textSecondary }]}>
                Group name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: fieldError ? colors.destructive : colors.border,
                  },
                ]}
                placeholder="e.g. VIP customers"
                placeholderTextColor={colors.textMuted}
                value={groupName}
                onChangeText={(t) => {
                  setGroupName(t);
                  if (fieldError) setFieldError(null);
                }}
                autoCapitalize="words"
                editable={!createMutation.isPending}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Description (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.descriptionInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Brief description of the group"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!createMutation.isPending}
              />

              {fieldError ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{fieldError}</Text>
              ) : null}
              {createMutation.isError ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  Could not create group. Try again.
                </Text>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleClose}
                disabled={createMutation.isPending}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: createMutation.isPending ? 0.7 : 1,
                  },
                ]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderWidth: 1,
    width: "95%",
    height: "45%",
  },
  sheetShadow: {
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  sheetInner: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { ...typography.titleMd },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: { fontSize: 18, fontWeight: "500" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.lg },
  labelFirst: { marginTop: spacing.md },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  descriptionInput: {
    minHeight: 80,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  errorText: { ...typography.bodySm, marginTop: spacing.xs },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
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
