import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Props = NativeStackScreenProps<SettingsStackParamList, "NotificationSettings">;

type EmailPref = "campaignCompleted" | "newReplies" | "complianceAlerts" | "weeklyReports";
type PushPref = "desktop" | "soundAlerts" | "mobilePush";

export function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [emailPrefs, setEmailPrefs] = useState<Record<EmailPref, boolean>>({
    campaignCompleted: true,
    newReplies: true,
    complianceAlerts: true,
    weeklyReports: true,
  });
  const [pushPrefs, setPushPrefs] = useState<Record<PushPref, boolean>>({
    desktop: true,
    soundAlerts: true,
    mobilePush: true,
  });

  const setEmail = (key: EmailPref, value: boolean) =>
    setEmailPrefs((p) => ({ ...p, [key]: value }));
  const setPush = (key: PushPref, value: boolean) =>
    setPushPrefs((p) => ({ ...p, [key]: value }));

  const trackColor = { false: colors.border, true: colors.primary ?? "#10B981" };
  const thumbColor = "#FFFFFF";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Email Notifications */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Email Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Campaign completed</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                When a campaign finishes sending.
              </Text>
            </View>
            <Switch
              value={emailPrefs.campaignCompleted}
              onValueChange={(v) => setEmail("campaignCompleted", v)}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>New replies</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                When contacts reply.
              </Text>
            </View>
            <Switch
              value={emailPrefs.newReplies}
              onValueChange={(v) => setEmail("newReplies", v)}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Compliance alerts</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                Important compliance-related notifications.
              </Text>
            </View>
            <Switch
              value={emailPrefs.complianceAlerts}
              onValueChange={(v) => setEmail("complianceAlerts", v)}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Weekly reports</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                Receive weekly performance summaries.
              </Text>
            </View>
            <Switch
              value={emailPrefs.weeklyReports}
              onValueChange={(v) => setEmail("weeklyReports", v)}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>
        </View>

        {/* Push Notifications */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Push Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Desktop notifications</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                Show browser notifications.
              </Text>
            </View>
            <Switch
              value={pushPrefs.desktop}
              onValueChange={(v) => setPush("desktop", v)}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Sound alerts</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                Play sound for new messages.
              </Text>
            </View>
            <Switch
              value={pushPrefs.soundAlerts}
              onValueChange={(v) => setPush("soundAlerts", v)}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Mobile push</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                Send notifications to mobile app.
              </Text>
            </View>
            <Switch
              value={pushPrefs.mobilePush}
              onValueChange={(v) => setPush("mobilePush", v)}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: spacing.sm },
  headerTitle: { ...typography.titleLg, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: "hidden",
  },
  cardTitle: {
    ...typography.titleMd,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowTextWrap: { flex: 1, minWidth: 0 },
  rowLabel: { ...typography.body, fontWeight: "600" },
  rowSubtitle: { ...typography.bodySm, marginTop: 2 },
  divider: { height: 1, marginVertical: spacing.xs },
});
