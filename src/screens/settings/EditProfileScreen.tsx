import React, { useState, useEffect } from "react";
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
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import { useAuth } from "../../providers/AuthProvider";
import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Props = NativeStackScreenProps<SettingsStackParamList, "EditProfile">;

function getInitials(name: string | undefined, email: string | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name?.trim() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  /** When true, show initials (avatar was just removed; don't use user.avatar_url until it refreshes). */
  const [avatarJustRemoved, setAvatarJustRemoved] = useState(false);

  const avatarUri =
    avatarJustRemoved ? null : (localAvatarUri ?? user?.avatar_url ?? null);

  // Sync full name from user only on mount so we don't overwrite the input after save when refreshSession returns
  useEffect(() => {
    setFullName(user?.full_name?.trim() ?? "");
  }, []);

  useEffect(() => {
    if (!user?.avatar_url?.trim()) setAvatarJustRemoved(false);
  }, [user?.avatar_url]);

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to your photos to change your profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setAvatarJustRemoved(false);
      setLocalAvatarUri(result.assets[0].uri);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not open photo picker.");
    }
  };

  const handleRemovePhoto = () => {
    if (!avatarUri) return;
    Alert.alert(
      "Remove photo",
      "Remove your profile photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setLocalAvatarUri(null);
            setAvatarJustRemoved(true);
          },
        },
      ]
    );
  };

  /** Save: no backend — just navigate back. Name and avatar changes are local only for this session. */
  const handleSave = () => {
    setError(null);
    setSaving(true);
    navigation.goBack();
    setSaving(false);
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
          hitSlop={12}
          disabled={saving}
        >
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={pickProfilePhoto}
            activeOpacity={0.8}
            style={styles.avatarTouchable}
          >
            <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
              {avatarUri ? (
                <Image
                  key={avatarUri}
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(fullName.trim() || undefined, user?.email)}
                </Text>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.cameraBadgeText}>✎</Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
            Tap to change photo
          </Text>
          {avatarUri ? (
            <TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoBtn}>
              <Text style={[styles.removePhotoText, { color: colors.destructive }]}>Remove photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Full name</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
            ]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            editable={!saving}
          />
          <Text style={[styles.label, { color: colors.textMuted, marginTop: spacing.lg }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.textMuted, borderColor: colors.border },
            ]}
            value={user?.email ?? ""}
            editable={false}
          />
          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: spacing.md },
  headerTitle: { ...typography.displayMd },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  avatarTouchable: { alignSelf: "center" },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarText: { ...typography.displayLg, color: "#FFFFFF", fontWeight: "700" },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadgeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  avatarHint: { ...typography.caption, marginTop: spacing.sm },
  removePhotoBtn: { marginTop: spacing.xs, paddingVertical: spacing.xs },
  removePhotoText: { ...typography.caption, fontWeight: "600" },
  formCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  label: { ...typography.label, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  errorText: { ...typography.bodySm, marginTop: spacing.sm },
  saveBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  saveBtnText: { ...typography.titleSm, color: "#FFFFFF", fontWeight: "600" },
});
