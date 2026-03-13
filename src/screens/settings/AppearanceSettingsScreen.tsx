import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import type { AccentColorKey, DensityKey, ThemeMode } from "../../theme/ThemeProvider";
import { ACCENT_COLORS } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "dark", label: "Dark" },
  { mode: "light", label: "Light" },
  { mode: "system", label: "System" },
];

const ACCENT_OPTIONS: { key: AccentColorKey; label: string }[] = [
  { key: "mint", label: "Mint" },
  { key: "blue", label: "Blue" },
  { key: "purple", label: "Purple" },
  { key: "red", label: "Red" },
  { key: "orange", label: "Orange" },
  { key: "yellow", label: "Yellow" },
];

const DENSITY_OPTIONS: { key: DensityKey; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "default", label: "Default" },
  { key: "comfortable", label: "Comfortable" },
];

export function AppearanceSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, theme, setTheme, accentColor, setAccentColor, density, setDensity } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Customize the look and feel of your workspace.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(({ mode, label }) => {
              const selected = theme === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: mode === "dark" ? "#0C1222" : mode === "light" ? "#FFFFFF" : "transparent",
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setTheme(mode)}
                  activeOpacity={0.8}
                >
                  {mode === "system" && (
                    <View style={StyleSheet.absoluteFill}>
                      <View style={styles.systemGradient}>
                        <View style={[styles.systemHalf, { backgroundColor: "#FFFFFF" }]} />
                        <View style={[styles.systemHalf, { backgroundColor: "#292929" }]} />
                      </View>
                    </View>
                  )}
                  {selected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.themeLabel,
                      {
                        color:
                          mode === "dark"
                            ? "#F1F5F9"
                            : mode === "light"
                              ? "#0F172A"
                              : "#0F172A", // System: dark text so it's visible on the light half of the gradient
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Accent Color */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accent Color</Text>
          <View style={styles.accentRow}>
            {ACCENT_OPTIONS.map(({ key, label }) => {
              const selected = accentColor === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.accentItem}
                  onPress={() => setAccentColor(key)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.accentSwatch,
                      {
                        backgroundColor: ACCENT_COLORS[key],
                        borderColor: selected ? colors.text : "transparent",
                        borderWidth: selected ? 2 : 0,
                      },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" style={styles.accentCheck} />
                    )}
                  </View>
                  <Text style={[styles.accentLabel, { color: colors.textMuted }]}>
                    {accentColor === key ? `Current: ${label}` : label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Density */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Density</Text>
          <View style={styles.densityRow}>
            {DENSITY_OPTIONS.map(({ key, label }) => {
              const selected = density === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.densityBtn,
                    {
                      backgroundColor: selected ? colors.primary : colors.border + "40",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setDensity(key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.densityBtnText,
                      { color: selected ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.densityHint, { color: colors.textMuted }]}>
            Adjusts spacing and sizing throughout the interface.
          </Text>
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
  headerTitleWrap: { flex: 1 },
  headerTitle: { ...typography.titleLg, fontWeight: "700" },
  headerSubtitle: { ...typography.bodySm, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing["2xl"] },
  sectionTitle: { ...typography.titleSm, fontWeight: "700", marginBottom: spacing.md },
  themeRow: { flexDirection: "row", gap: spacing.md },
  themeCard: {
    flex: 1,
    borderRadius: radius.lg,
    minHeight: 72,
    overflow: "hidden",
    padding: spacing.sm,
    position: "relative",
  },
  systemGradient: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  systemHalf: { flex: 1 },
  checkBadge: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  themeLabel: { ...typography.bodySm, fontWeight: "600", marginTop: "auto", zIndex: 1 },
  accentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  accentItem: { alignItems: "center", minWidth: 64 },
  accentSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  accentCheck: { textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  accentLabel: { ...typography.caption, textAlign: "center" },
  densityRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  densityBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  densityBtnText: { ...typography.bodySm, fontWeight: "600" },
  densityHint: { ...typography.bodySm },
});
