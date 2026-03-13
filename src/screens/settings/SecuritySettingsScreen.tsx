import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import { useAuth } from "../../providers/AuthProvider";
import { get2faToggle } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { config } from "../../config";
import type { SettingsStackParamList } from "../../navigation/SettingsStack";

export function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { session } = useAuth();

  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetch2fa = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await get2faToggle(session.access_token);
      setTwoFaEnabled(!!res?.enabled);
    } catch {
      setTwoFaEnabled(false);
    }
  }, [session?.access_token]);

  useFocusEffect(
    useCallback(() => {
      fetch2fa();
    }, [fetch2fa])
  );

  const openSecurityUrl = () => {
    const url = `${config.apiUrl.replace(/\/$/, "")}/settings/security`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open security settings."));
  };

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    if (!newPassword.trim()) {
      setPasswordError("Enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Your password has been updated.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update password.";
      setPasswordError(msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Security Settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Manage your account security and authentication.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Two-Factor Authentication */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Two-Factor Authentication</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: twoFaEnabled ? colors.primary + "22" : colors.border + "99" }]}>
              <Text style={[styles.badgeText, { color: twoFaEnabled ? colors.primary : colors.textMuted }]}>
                {twoFaEnabled === null ? "…" : twoFaEnabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Add an extra layer of security by requiring a verification code when you sign in.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={openSecurityUrl}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>
              {twoFaEnabled ? "Manage 2FA" : "Enable 2FA"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Linked Sign-In Methods */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="link" size={22} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Linked Sign-In Methods</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            No external providers linked. You can link Apple or Google sign-in from any supported device.
          </Text>
        </View>

        {/* Change Password */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Current Password</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword((v) => !v)}
              hitSlop={12}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>New Password</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword((v) => !v)}
              hitSlop={12}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Confirm New Password</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((v) => !v)}
              hitSlop={12}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {passwordError ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{passwordError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleUpdatePassword}
            disabled={updatingPassword}
            activeOpacity={0.8}
          >
            {updatingPassword ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Update Password</Text>
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: spacing.sm },
  headerTitleWrap: { flex: 1 },
  headerTitle: { ...typography.titleLg, fontWeight: "700" },
  headerSubtitle: { ...typography.bodySm, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: { marginRight: spacing.sm },
  sectionTitle: { ...typography.titleSm, fontWeight: "700", flex: 1 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: { ...typography.caption, fontWeight: "600" },
  sectionDescription: {
    ...typography.bodySm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  primaryBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
  },
  primaryBtnText: { ...typography.titleSm, color: "#FFFFFF", fontWeight: "600" },
  inputLabel: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.sm },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  eyeBtn: { padding: spacing.xs },
  errorText: { ...typography.bodySm, marginTop: spacing.sm },
});
