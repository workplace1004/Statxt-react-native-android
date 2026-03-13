import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import { config } from "../../config";

const PLANS = [
  { id: "starter", name: "Starter", price: "$199/mo" },
  { id: "growth", name: "Growth", price: "$399/mo" },
  { id: "enterprise", name: "Enterprise", price: "$2,999/mo" },
];

const CREDIT_PACKAGES = [
  { label: "1,000 Credits", credits: "1,000 credits" },
  { label: "5,000 Credits", credits: "5,000 credits" },
  { label: "20,000 Credits", credits: "20,000 credits" },
];

const MOCK_ORG_ACTIVITY = [
  { date: "3/2/2026, 10:31:15 AM", type: "gift", detail: "Billing allocation", amount: -5, balance: 0 },
  { date: "3/2/2026, 10:31:14 AM", type: "gift", detail: "Billing allocation", amount: -5, balance: 5 },
  { date: "3/2/2026, 10:30:58 AM", type: "gift", detail: "Billing clawback", amount: 10, balance: 10 },
  { date: "3/2/2026, 10:29:35 AM", type: "gift", detail: "Billing allocation", amount: -5, balance: 0 },
];

const MOCK_USER_ACTIVITY = [
  { date: "3/1/2026, 1:38:04 PM", type: "gift", detail: "Billing allocation", amount: 150, balance: 150 },
];

export function BillingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [customAmount, setCustomAmount] = useState("");
  const [assignUserSelected, setAssignUserSelected] = useState(false);
  const [assignCreditsInput, setAssignCreditsInput] = useState("");

  const openBillingPortal = () => {
    const url = `${config.apiUrl.replace(/\/$/, "")}/api/billing/portal`;
    Linking.openURL(url).catch(() => { });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Billing & Plans</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Manage your subscription and payment methods.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan */}
        <View style={[styles.currentPlanCard, { backgroundColor: colors.primary + "18", borderColor: colors.border }]}>
          <View style={styles.currentPlanHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Plan</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.success + "33" }]}>
              <Text style={[styles.statusBadgeText, { color: colors.success }]}>TRIALING</Text>
            </View>
          </View>
          <Text style={[styles.planName, { color: colors.text }]}>Starter</Text>
          <View style={styles.planStatsRow}>
            <View>
              <Text style={[styles.planStatLabel, { color: colors.textMuted }]}>
                Messages/mo (based on 160 characters, or 70 with emoji)
              </Text>
              <Text style={[styles.planStatValue, { color: colors.text }]}>5,000</Text>
            </View>
            <View style={styles.planStatRight}>
              <Text style={[styles.planStatLabel, { color: colors.textMuted }]}>Used</Text>
              <Text style={[styles.planStatValue, { color: colors.text }]}>2</Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: "0%" }]} />
          </View>
          <Text style={[styles.usageLabel, { color: colors.textMuted }]}>Usage: 0% of segments</Text>
          <View style={styles.creditsMiniRow}>
            <View style={[styles.creditsMiniCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.creditsMiniLabel, { color: colors.textMuted }]}>Your credits</Text>
              <Text style={[styles.creditsMiniValue, { color: colors.text }]}>150</Text>
              <Text style={[styles.creditsMiniSub, { color: colors.textMuted }]}>Charged to your card</Text>
            </View>
            <View style={[styles.creditsMiniCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.creditsMiniLabel, { color: colors.textMuted }]}>Organization credits</Text>
              <Text style={[styles.creditsMiniValue, { color: colors.text }]}>0</Text>
              <Text style={[styles.creditsMiniSub, { color: colors.textMuted }]}>Shared bank (if enabled)</Text>
            </View>
          </View>
        </View>

        {/* Assign credits to team */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.assignHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Assign credits to team</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Admins can allocate or claw back org credits for individual users.
              </Text>
            </View>
            <View style={styles.assignActions}>
              <TouchableOpacity style={[styles.assignPillBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
                <Text style={[styles.assignPillBtnText, { color: colors.text }]}>Deselect all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.assignPillBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
                <Text style={[styles.assignPillBtnText, { color: colors.text }]}>Split amount</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.assignPillBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
                <Text style={[styles.assignPillBtnText, { color: colors.text }]}>Split evenly</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.assignUserRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.assignCheckbox, { borderColor: colors.primary }]}
                onPress={() => setAssignUserSelected(!assignUserSelected)}
                activeOpacity={0.8}
              >
                {assignUserSelected && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
              <View style={styles.assignUserInfo}>
                <Text style={[styles.assignUserName, { color: colors.text }]}>andri</Text>
                <Text style={[styles.assignUserRole, { color: colors.textMuted }]}>manager</Text>
              </View>
            </View>
            <View style={{ flexDirection: "column", alignItems: "center", gap: spacing.sm }}>
              <Text style={[styles.assignBalance, { color: colors.text }]}>Balance: 150</Text>
              <TextInput
                style={[styles.assignCreditsInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border,  }]}
                value={assignCreditsInput}
                onChangeText={setAssignCreditsInput}
                placeholder="Enter credits"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.assignCreditsRow}>
              <View style={{ flexDirection: "column", gap: spacing.sm }}>
                <TouchableOpacity style={[styles.assignBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                  <Text style={styles.assignBtnText}>Assign</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.clawbackBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
                  <Text style={[styles.clawbackBtnText, { color: colors.text }]}>Claw back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <Text style={[styles.assignDisclaimer, { color: colors.textMuted }]}>
            Only owners and admins can assign or claw back credits.
          </Text>
        </View>

        {/* Daily throughput */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily throughput (messages/day)</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Organization includes all team members. Usage is outbound messages sent today.
          </Text>
          <View style={styles.twoColRow}>
            <View style={[styles.throughputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.throughputLabel, { color: colors.textMuted }]}>Organization</Text>
              <Text style={[styles.throughputValue, { color: colors.text }]}>0 / 0</Text>
            </View>
            <View style={[styles.throughputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.throughputLabel, { color: colors.textMuted }]}>You</Text>
              <Text style={[styles.throughputValue, { color: colors.text }]}>0</Text>
            </View>
          </View>
        </View>

        {/* Manage Billing */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Manage Billing</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Update payment method, view invoices, and change plan in the billing portal.
          </Text>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Plan</Text>
          <View style={styles.planCardsRow}>
            {PLANS.map((plan) => {
              const selected = selectedPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: selected ? colors.primary : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.8}
                >
                  {selected && (
                    <View style={[styles.planCardCheck, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={[styles.planCardName, { color: colors.text }]}>{plan.name}</Text>
                  <Text style={[styles.planCardPrice, { color: colors.textMuted }]}>{plan.price}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.manageBtnRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={openBillingPortal}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Open Billing Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Start subscription</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messaging rates */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Messaging rates</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Outbound messages are billed per segment. Inbound messages are not billed right now.
          </Text>
          <View style={styles.twoColRow}>
            <View style={[styles.rateBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.rateLabel, { color: colors.text }]}>Outbound</Text>
              <Text style={[styles.rateSub, { color: colors.textMuted }]}>Per segment</Text>
              <Text style={[styles.rateValue, { color: colors.text }]}>$0.039</Text>
            </View>
            <View style={[styles.rateBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.rateLabel, { color: colors.text }]}>Inbound</Text>
              <Text style={[styles.rateSub, { color: colors.textMuted }]}>Per segment</Text>
              <Text style={[styles.rateValue, { color: colors.text }]}>$0.00</Text>
            </View>
          </View>
          <Text style={[styles.estimatedCost, { color: colors.textMuted }]}>
            Estimated outbound cost this month: $0.08
          </Text>
        </View>

        {/* Buy Credits */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Buy Credits</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Purchase prepaid credits for additional sending.
          </Text>
          <View style={[styles.subscribePrompt, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.subscribePromptText, { color: colors.textMuted }]}>
              Subscribe to a plan to buy credits.
            </Text>
          </View>
          <View style={styles.packagesRow}>
            {CREDIT_PACKAGES.map((pkg) => (
              <View
                key={pkg.label}
                style={[styles.packageCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Text style={[styles.packageTitle, { color: colors.text }]}>{pkg.label}</Text>
                <Text style={[styles.packageSub, { color: colors.textMuted }]}>{pkg.credits}</Text>
                <TouchableOpacity style={[styles.buyPkgBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                  <Text style={styles.buyPkgBtnText}>Buy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.buyOrgBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
                  <Text style={[styles.buyOrgBtnText, { color: colors.textMuted }]}>Buy for org</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Custom amount</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Enter a dollar amount to buy credits.
          </Text>
          <View style={styles.customAmountRow}>
            <TextInput
              style={[styles.customAmountInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="$50+"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={[styles.buyPkgBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
              <Text style={styles.buyPkgBtnText}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.buyOrgBtn, { borderColor: colors.primary }]} activeOpacity={0.8}>
              <Text style={[styles.buyOrgBtnText, { color: colors.textMuted }]}>Buy for org</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Organization credit activity */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Organization credit activity</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Recent changes to your shared org balance.
          </Text>
          {MOCK_ORG_ACTIVITY.map((row, i) => (
            <View key={i} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text }]} numberOfLines={1}>{row.date}</Text>
              <Text style={[styles.tableCell, { color: colors.text }]} numberOfLines={1}>{row.type} / {row.detail}</Text>
              <Text style={[styles.tableCell, { color: row.amount >= 0 ? colors.success : colors.destructive }]}>
                {row.amount >= 0 ? "+" : ""}{row.amount}
              </Text>
              <Text style={[styles.tableCell, { color: colors.text }]}>{row.balance}</Text>
            </View>
          ))}
        </View>

        {/* Your credit activity */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your credit activity</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Recent changes to your personal balance.
          </Text>
          {MOCK_USER_ACTIVITY.map((row, i) => (
            <View key={i} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text }]} numberOfLines={1}>{row.date}</Text>
              <Text style={[styles.tableCell, { color: colors.text }]} numberOfLines={1}>{row.type} / {row.detail}</Text>
              <Text style={[styles.tableCell, { color: row.amount >= 0 ? colors.success : colors.destructive }]}>
                {row.amount >= 0 ? "+" : ""}{row.amount}
              </Text>
              <Text style={[styles.tableCell, { color: colors.text }]}>{row.balance}</Text>
            </View>
          ))}
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
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  sectionTitle: { ...typography.titleSm, fontWeight: "700", marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.bodySm, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs },

  currentPlanCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  currentPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusBadgeText: { ...typography.caption, fontWeight: "700" },
  planName: { ...typography.titleLg, fontWeight: "700", marginBottom: spacing.md },
  planStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  planStatRight: { alignItems: "flex-end" },
  planStatLabel: { ...typography.caption },
  planStatValue: { ...typography.titleMd, fontWeight: "700" },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  usageLabel: { ...typography.caption, marginBottom: spacing.md },
  creditsMiniRow: { flexDirection: "row", gap: spacing.md },
  creditsMiniCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  creditsMiniLabel: { ...typography.caption },
  creditsMiniValue: { ...typography.titleLg, fontWeight: "700" },
  creditsMiniSub: { ...typography.caption, marginTop: 2 },

  assignHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  assignActions: { flexDirection: "row", gap: spacing.xs, justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", width: "100%" },
  assignPillBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  assignPillBtnText: { ...typography.caption, fontWeight: "600" },
  assignUserRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    width: "100%",
    justifyContent: "space-around",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  assignCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  assignUserInfo: { minWidth: 0, flex: 0 },
  assignUserName: { ...typography.body, fontWeight: "700" },
  assignUserRole: { ...typography.caption },
  assignBalance: { ...typography.bodySm },
  assignCreditsRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, minWidth: 0 },
  assignCreditsInput: {
    width: 100,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.bodySm,
    fontSize: 12,
  },
  assignBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  assignBtnText: { ...typography.caption, color: "#FFFFFF", fontWeight: "600" },
  clawbackBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  clawbackBtnText: { ...typography.caption, fontWeight: "600" },
  assignDisclaimer: { ...typography.caption, textAlign: "center" },

  twoColRow: { flexDirection: "row", gap: spacing.md },
  throughputBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  throughputLabel: { ...typography.caption },
  throughputValue: { ...typography.titleMd, fontWeight: "700" },

  planCardsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  planCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 72,
    position: "relative",
  },
  planCardCheck: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  planCardName: { ...typography.titleSm, fontWeight: "700" },
  planCardPrice: { ...typography.bodySm, marginTop: 2 },
  manageBtnRow: { flexDirection: "row", gap: spacing.sm },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  primaryBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  secondaryBtnText: { ...typography.label, fontWeight: "600" },

  rateBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  rateLabel: { ...typography.bodySm, fontWeight: "600" },
  rateSub: { ...typography.caption },
  rateValue: { ...typography.titleLg, fontWeight: "700" },
  estimatedCost: { ...typography.bodySm, marginTop: spacing.sm },

  subscribePrompt: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  subscribePromptText: { ...typography.bodySm },
  packagesRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  packageCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  packageTitle: { ...typography.bodySm, fontWeight: "600" },
  packageSub: { ...typography.caption, marginBottom: spacing.sm },
  buyPkgBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.xs,
    minWidth: 100,
  },
  buyPkgBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  buyOrgBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    minWidth: 100,
  },
  buyOrgBtnText: { ...typography.caption },
  customAmountRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  customAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: { ...typography.bodySm},
});
