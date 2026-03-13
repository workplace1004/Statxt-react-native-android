import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon } from "../../components/TabIcons";
import { useCampaign, useCampaignStats } from "../../hooks/useCampaigns";
import { useBillingUsage } from "../../hooks/useBilling";
import { estimateSmsSegments } from "../../lib/smsSegments";
import type { CampaignsStackParamList } from "../../navigation/CampaignsStack";

type Props = NativeStackScreenProps<CampaignsStackParamList, "CampaignDetail">;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CampaignDetailScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { campaignId } = route.params;
  const { campaign, isLoading: campaignLoading, refetch, isRefetching } = useCampaign(campaignId);
  const { stats, refetch: refetchStats } = useCampaignStats(campaignId);
  const { outboundCentsPerSegment } = useBillingUsage();

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (!campaign) return;
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 0,
      }),
    ]).start();
  }, [campaign, cardOpacity, cardScale]);

  const onBack = () => navigation.goBack();

  if (campaignLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <BackArrowIcon color={colors.text} size={26} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Campaign</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Not found</Text>
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Campaign not found.</Text>
        </View>
      </View>
    );
  }

  // Stats = primary for counts (per spec). Campaign = fallback for recipients, message bodies, and counts when stats missing.
  const counts = stats?.counts ?? {};
  const analytics = stats?.analytics ?? {};
  const sentiment = analytics?.sentiment ?? {};
  const hasStats = stats != null;
  const metricSource = campaign as {
    total_recipients?: number;
    recipients?: number;
    sent_count?: number;
    sent?: number;
    delivered_count?: number;
    delivered?: number;
    failed_count?: number;
    failed?: number;
    message_body?: string;
    message_body_b?: string;
    ab_mode?: boolean;
  };
  const statsAny = stats as Record<string, unknown> | null;
  const countsAny = (stats?.counts ?? statsAny?.counts) as Record<string, unknown> | undefined;

  // Recipients: prefer stats.counts.total (same as web), then campaign total_recipients/recipientCount, then sum of counts
  const fromCounts =
    Number(counts.total ?? 0) ||
    (Number(counts.sent ?? 0) +
      Number(counts.delivered ?? 0) +
      Number(counts.failed ?? 0) +
      Number(counts.pending ?? 0) +
      Number(counts.skipped ?? 0));
  const recipients: number =
    (hasStats && Number.isFinite(fromCounts) && fromCounts > 0
      ? fromCounts
      : Number(metricSource?.total_recipients ?? metricSource?.recipients ?? campaign.recipientCount)) ||
    fromCounts ||
    0;

  // Per spec: stats.counts is primary for sent, delivered, failed. Campaign / derived = fallback when stats missing or no value.
  const rawSent = countsAny?.sent ?? counts.sent ?? statsAny?.sent;
  const rawDelivered = countsAny?.delivered ?? counts.delivered ?? statsAny?.delivered;
  const rawFailed = countsAny?.failed ?? counts.failed ?? statsAny?.failed;
  const sentFromStats = hasStats && (rawSent !== undefined && rawSent !== null) ? Number(rawSent) : NaN;
  const deliveredFromStats = hasStats && (rawDelivered !== undefined && rawDelivered !== null) ? Number(rawDelivered) : NaN;
  const failedFromStats = hasStats && (rawFailed !== undefined && rawFailed !== null) ? Number(rawFailed) : NaN;

  const recipientsList = campaign.campaign_recipients ?? [];
  const derivedSent = recipientsList.filter(
    (r) => r.status === "sent" || r.status === "delivered" || r.status === "completed"
  ).length;
  const derivedDelivered = recipientsList.filter((r) => r.status === "delivered" || r.status === "completed").length;
  const derivedFailed = recipientsList.filter((r) => r.status === "failed").length;
  const fromRecipients = derivedSent > 0 || derivedDelivered > 0 || derivedFailed > 0;

  const campaignSent = metricSource?.sent_count ?? metricSource?.sent ?? campaign.sentCount;
  const campaignDelivered = metricSource?.delivered_count ?? metricSource?.delivered ?? campaign.deliveredCount;
  const campaignFailed = metricSource?.failed_count ?? metricSource?.failed ?? campaign.failedCount;

  const sent: number = Number.isFinite(sentFromStats)
    ? sentFromStats
    : Number(campaignSent ?? (fromRecipients ? derivedSent : 0));
  const delivered: number = Number.isFinite(deliveredFromStats)
    ? deliveredFromStats
    : Number(campaignDelivered ?? (fromRecipients ? derivedDelivered || derivedSent : 0));
  const failed: number = Number.isFinite(failedFromStats)
    ? failedFromStats
    : Number(campaignFailed ?? (fromRecipients ? derivedFailed : 0));

  const skipped = Number(counts.skipped ?? 0);
  const processed = delivered + sent + failed + skipped;
  const deliveryRateNum =
    delivered === 0
      ? 0
      : processed > 0
        ? Math.round((delivered / processed) * 100)
        : Number.isFinite(stats?.delivery_rate)
          ? Math.round(stats.delivery_rate)
          : recipients > 0
            ? Math.round((delivered / recipients) * 100)
            : 0;
  const deliveryRate = Number.isFinite(deliveryRateNum) ? deliveryRateNum : 0;

  const optOuts = (hasStats ? (analytics.opt_outs ?? 0) : (campaign.optOutCount ?? 0)) as number;
  const optOutRate =
    recipients > 0 ? Math.round((optOuts / recipients) * 100) : (typeof analytics.opt_out_rate === "number" ? analytics.opt_out_rate : 0);

  // Sent seg. / Failed card (per spec):
  // - Sent seg. (left): total SMS segments = sent message count × segments per message.
  //   Source: stats.counts.sent (or campaign fallback) for message count; segmentsPerMessage from estimateSmsSegments(campaign.message_body) and optional message_body_b (A/B average).
  // - Failed (right): number of recipients whose send failed. Source: stats.counts.failed (or campaign fallback). No formula.
  const bodyA = String(metricSource?.message_body ?? campaign.messageText ?? "");
  const bodyB = String(metricSource?.message_body_b ?? "").trim();
  const segmentsA = Math.max(1, estimateSmsSegments(bodyA).segments);
  const segmentsB = bodyB.length > 0 ? Math.max(1, estimateSmsSegments(bodyB).segments) : segmentsA;
  const isAbMode = Boolean(metricSource?.ab_mode) && bodyB.length > 0;
  const segmentsPerMessage = isAbMode ? (segmentsA + segmentsB) / 2 : segmentsA;
  const sentSegments = Math.round(sent * (segmentsPerMessage || 1));

  console.log("[CampaignDetail] Sent seg. / Failed", {
    sent,
    failed,
    segmentsA,
    segmentsB: bodyB.length > 0 ? segmentsB : null,
    isAbMode,
    segmentsPerMessage,
    sentSegments,
    display: `${sentSegments.toLocaleString()} / ${failed.toLocaleString()}`,
  });

  // Cost (same as web): (sentSegments × outboundCentsPerSegment) / 100; fallback to stats.analytics.cost_total
  const rawCostAnalytics =
    (analytics as { cost_total?: number; costTotal?: number }).cost_total ??
    (analytics as { costTotal?: number }).costTotal;
  const costFromAnalytics = typeof rawCostAnalytics === "number" ? rawCostAnalytics : Number(rawCostAnalytics) || 0;
  const costFromCampaign = (campaign as { cost_total?: number; costTotal?: number }).cost_total ?? (campaign as { costTotal?: number }).costTotal;
  const costFromCampaignNum = typeof costFromCampaign === "number" ? costFromCampaign : Number(costFromCampaign) || 0;
  const costTotal =
    outboundCentsPerSegment != null
      ? (sentSegments * outboundCentsPerSegment) / 100
      : costFromAnalytics > 0
        ? costFromAnalytics
        : costFromCampaignNum;

  console.log("[CampaignDetail] Cost", {
    sentSegments,
    outboundCentsPerSegment: outboundCentsPerSegment ?? null,
    costFromAnalytics,
    costFromCampaignNum,
    costTotal,
  });

  const positiveCount = sentiment.positive ?? 0;
  const neutralCount = sentiment.neutral ?? 0;
  const negativeCount = sentiment.negative ?? 0;

  const recent = stats?.recent ?? campaign.campaign_recipients?.slice(0, 10) ?? [];
  const recentList = Array.isArray(recent) ? recent : [];

  const doRefetch = async () => {
    await Promise.all([refetch(), refetchStats()]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {campaign.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Created {campaign.createdAt ? formatDateTime(campaign.createdAt) : "—"}
          </Text>
          <Text style={[styles.campaignId, { color: colors.textMuted }]}>ID: {campaign.id}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing["3xl"] }]}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <AppRefreshControl refreshing={isRefetching} onRefresh={doRefetch} />
        }
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.text,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Row 1: Recipients | Delivered (N (X%)) | Sent seg. / Failed — same as web */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Recipients</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{recipients.toLocaleString()}</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Delivered</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {delivered.toLocaleString()} ({deliveryRate}%)
              </Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Sent seg. / Failed</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {sentSegments.toLocaleString()} / {failed.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Row 2: Opt-outs (N (X%)) | Cost — same as web */}
          <View style={[styles.metricsRow, styles.metricsRowSecond]}>
            <View style={[styles.metricBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Opt-outs</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Number(optOuts).toLocaleString()} ({optOutRate}%)
              </Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Cost</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Number(costTotal).toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </Text>
            </View>
          </View>

          {/* Sentiment — same as web */}
          <View style={styles.sentimentSection}>
            <Text style={[styles.sentimentTitle, { color: colors.textMuted }]}>Sentiment analysis</Text>
            <View style={styles.sentimentRow}>
              <View style={[styles.sentimentBox, { borderColor: "#16A34A", backgroundColor: "rgba(22,163,74,0.1)" }]}>
                <Text style={[styles.sentimentLabel, { color: "#16A34A" }]}>Positive</Text>
                <Text style={[styles.sentimentValue, { color: "#16A34A" }]}>{positiveCount.toLocaleString()}</Text>
              </View>
              <View style={[styles.sentimentBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.sentimentLabel, { color: colors.textMuted }]}>Neutral</Text>
                <Text style={[styles.sentimentValue, { color: colors.text }]}>{neutralCount.toLocaleString()}</Text>
              </View>
              <View style={[styles.sentimentBox, { borderColor: colors.destructive, backgroundColor: colors.destructive + "18" }]}>
                <Text style={[styles.sentimentLabel, { color: colors.destructive }]}>Negative</Text>
                <Text style={[styles.sentimentValue, { color: colors.destructive }]}>{negativeCount.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity — same as web */}
          {recentList.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={[styles.recentTitle, { color: colors.textMuted }]}>Recent Activity</Text>
              <View style={[styles.recentCard, { borderColor: colors.border }]}>
                {recentList.map((r: { id?: string; phone?: string; status?: string; processed_at?: string | null; error_message?: string | null }, i: number) => (
                  <View
                    key={r.id ?? r.phone ?? String(i)}
                    style={[styles.recentRow, { borderBottomWidth: i < recentList.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.recentPhone, { color: colors.text }]} numberOfLines={1}>
                      {r.phone ?? "—"} · {r.status ?? "—"}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.textMuted }]}>
                      {r.processed_at ? formatDateTime(r.processed_at) : "—"}
                    </Text>
                    {r.error_message ? (
                      <Text style={[styles.recentError, { color: colors.destructive }]} numberOfLines={2}>
                        {r.error_message}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Message — same as web */}
          {campaign.messageText ? (
            <View style={styles.messageSection}>
              <Text style={[styles.messageLabel, { color: colors.textMuted }]}>Message</Text>
              <View style={[styles.messageBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.messageText, { color: colors.text }]}>{campaign.messageText}</Text>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  emptyText: { ...typography.body },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: spacing.md },
  headerCenter: { flex: 1 },
  headerTitle: { ...typography.displayMd },
  headerSubtitle: { ...typography.bodySm, marginTop: 2 },
  campaignId: { ...typography.caption, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  card: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricsRowSecond: { marginBottom: spacing.lg },
  metricBox: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  metricLabel: { ...typography.caption, marginBottom: 4 },
  metricValue: { ...typography.titleSm },
  sentimentSection: { marginBottom: spacing.lg },
  sentimentTitle: { ...typography.caption, marginBottom: spacing.sm },
  sentimentRow: { flexDirection: "row", gap: spacing.sm },
  sentimentBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  sentimentLabel: { ...typography.caption },
  sentimentValue: { ...typography.titleSm, marginTop: 4 },
  recentSection: { marginBottom: spacing.lg },
  recentTitle: { ...typography.caption, marginBottom: spacing.sm },
  recentCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  recentRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  recentPhone: { ...typography.bodySm },
  recentMeta: { ...typography.caption, marginTop: 2 },
  recentError: { ...typography.caption, marginTop: 2 },
  messageSection: { marginTop: spacing.sm },
  messageLabel: { ...typography.caption, marginBottom: spacing.xs },
  messageBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  messageText: { ...typography.body },
});
