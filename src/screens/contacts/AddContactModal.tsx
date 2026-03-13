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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { useAuth } from "../../providers/AuthProvider";
import { insertContactLocal } from "../../lib/offlineContacts";
import { syncPendingContactsToSupabase } from "../../lib/contactsSync";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AddContactModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const contact = await insertContactLocal(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      await syncPendingContactsToSupabase();
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      onClose();
    },
  });

  const handleCreate = () => {
    if (!phone.trim()) {
      setFieldError("Phone is required");
      return;
    }
    setFieldError(null);
    createMutation.mutate();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.backdrop }]} onPress={onClose}>
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
                <Text style={[styles.title, { color: colors.text }]}>Add Contact</Text>
                <TouchableOpacity
                  onPress={onClose}
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
                  First name (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="First name"
                  placeholderTextColor={colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  editable={!createMutation.isPending}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Last name (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Last name"
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  editable={!createMutation.isPending}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Phone *</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: fieldError ? colors.destructive : colors.border,
                    },
                  ]}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (fieldError) setFieldError(null);
                  }}
                  keyboardType="phone-pad"
                  editable={!createMutation.isPending}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Email (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!createMutation.isPending}
                />

                {fieldError ? (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{fieldError}</Text>
                ) : null}
                {createMutation.isError ? (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>
                    Could not save contact. Try again.
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
                  onPress={onClose}
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
    height: "61%",
    width: "95%",
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
