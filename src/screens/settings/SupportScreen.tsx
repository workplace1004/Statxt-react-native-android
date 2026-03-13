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
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";

const SUPPORT_CHAT_ICON_COLOR = "#10B981";
const TEAM_CHAT_ICON_COLOR = "#8B5CF6";

export function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [supportChatEnabled, setSupportChatEnabled] = useState(false);
  const [teamChatBubbleEnabled, setTeamChatBubbleEnabled] = useState(false);

  const trackColor = { false: colors.border, true: colors.primary ?? "#10B981" };
  const thumbColor = "#FFFFFF";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Support</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Chat */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support Chat</Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Enable the in-app support chat to communicate with our team in real time.
          </Text>
          <View style={styles.optionRow}>
            <View style={[styles.iconWrap, { borderColor: SUPPORT_CHAT_ICON_COLOR }]}>
              <Ionicons name="chatbubble-outline" size={22} color={SUPPORT_CHAT_ICON_COLOR} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>Enable Support Chat</Text>
              <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                When enabled, a floating chat bubble will appear on all pages. You can minimize it at any time.
              </Text>
            </View>
            <Switch
              value={supportChatEnabled}
              onValueChange={setSupportChatEnabled}
              trackColor={trackColor}
              thumbColor={thumbColor}
            />
          </View>
        </View>

        {/* Team Chat Widget */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Chat Widget</Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            A floating mini bubble giving you quick access to team chat from any page.
          </Text>
          <View style={styles.optionRow}>
            <View style={[styles.iconWrapSquare, { borderColor: TEAM_CHAT_ICON_COLOR }]}>
              <Ionicons name="chatbubbles-outline" size={22} color={TEAM_CHAT_ICON_COLOR} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>Enable Team Chat Bubble</Text>
              <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                When enabled, a floating team chat button appears on all pages in the bottom-left corner. Open it to browse rooms and reply without leaving your current page.
              </Text>
            </View>
            <Switch
              value={teamChatBubbleEnabled}
              onValueChange={setTeamChatBubbleEnabled}
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
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: "hidden",
  },
  sectionTitle: {
    ...typography.titleMd,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.bodySm,
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSquare: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: { flex: 1, minWidth: 0 },
  optionLabel: { ...typography.body, fontWeight: "600" },
  optionSubtitle: { ...typography.bodySm, marginTop: 2 },
});
