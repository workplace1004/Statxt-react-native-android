import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryClient";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import { useAuth } from "../../providers/AuthProvider";
import { insertContactLocal } from "../../lib/offlineContacts";
import { syncPendingContactsToSupabase } from "../../lib/contactsSync";

export function AddContactScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
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
      navigation.goBack();
    },
  });

  const handleSave = () => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first && !last) {
      setFieldError("First or last name is required");
      return;
    }
    setFieldError(null);
    createMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BackArrowIcon color={colors.primary} size={28} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Add contact</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>First name</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            value={firstName}
            onChangeText={(t) => {
              setFirstName(t);
              if (fieldError) setFieldError(null);
            }}
            autoCapitalize="words"
            editable={!createMutation.isPending}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Last name</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Last name"
            placeholderTextColor={colors.textMuted}
            value={lastName}
            onChangeText={(t) => {
              setLastName(t);
              if (fieldError) setFieldError(null);
            }}
            autoCapitalize="words"
            editable={!createMutation.isPending}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="+1 234 567 8900"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!createMutation.isPending}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
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

          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: createMutation.isPending ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save contact</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  title: { ...typography.titleMd, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  form: { gap: 0 },
  label: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.lg },
  input: {
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  errorText: { ...typography.bodySm, marginTop: spacing.xs },
  saveBtn: {
    height: 48,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing["2xl"],
  },
  saveBtnText: { ...typography.titleSm, color: "#FFFFFF" },
});
