import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ListRenderItem,
  Switch,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import type { CampaignsStackParamList } from "../../navigation/CampaignsStack";
import { spacing, typography, radius } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { CampaignsIcon, SearchIcon, ClockIcon, ContactIcon, ComposeIcon, LightningIcon } from "../../components/TabIcons";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useContactGroups } from "../../hooks/useContactGroups";
import { useAutoBlasts } from "../../hooks/useAutoBlasts";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "../../hooks/useTemplates";
import { CreateAutoTextModal } from "./CreateAutoTextModal";
import {
  getActivePhoneNumber,
  createCampaign,
  startCampaignSend,
} from "../../lib/campaignsApi";
import type { Campaign, ContactGroup, AutoBlast } from "../../types/campaigns";

type TabId = "text-blaster" | "all" | "auto-texts" | "templates";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function campaignStatusLabel(status: Campaign["status"]): string {
  if (status === "sent" || status === "completed") return "Completed";
  if (status === "scheduled") return "Scheduled";
  if (status === "running") return "Running";
  return "Draft";
}

const MERGE_FIELDS: { label: string; value: string }[] = [
  { label: "First name: {first_name}", value: "{first_name}" },
  { label: "Last name: {last_name}", value: "{last_name}" },
  { label: "Full name: {name}", value: "{name}" },
  { label: "Company: {company}", value: "{company}" },
  { label: "Phone: {phone}", value: "{phone}" },
  { label: "Email: {email}", value: "{email}" },
];

function getMergeFieldsFromBody(body: string): string[] {
  const matches = body.match(/\{[\w_]+\}/g) ?? [];
  return [...new Set(matches)].sort();
}

type Nav = NativeStackNavigationProp<CampaignsStackParamList, "CampaignsList">;

export function CampaignsListScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<TabId>("text-blaster");
  const [groupSearch, setGroupSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<
    "all" | "draft" | "running" | "scheduled" | "completed"
  >("all");
  const campaignListParams = useMemo(
    () => ({
      status: campaignStatusFilter === "all" ? undefined : campaignStatusFilter,
      search: campaignSearch.trim() || undefined,
    }),
    [campaignStatusFilter, campaignSearch]
  );
  const {
    campaigns: campaignsData,
    pagination,
    isLoading: campaignsLoading,
    refetch: refetchCampaigns,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCampaigns(campaignListParams);
  const { autoBlasts = [], isLoading: autoBlastsLoading, refetch: refetchAutoBlasts } = useAutoBlasts();
  const { contactGroups: allGroups = [], isLoading: groupsLoading, refetch: refetchGroups } = useContactGroups();
  const { templates: existingTemplates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useTemplates();
  const { createTemplate: createTemplateApi, isCreating: isCreatingTemplate } = useCreateTemplate();
  const { updateTemplate: updateTemplateApi, isUpdating: isUpdatingTemplate } = useUpdateTemplate(editingTemplateId);
  const { deleteTemplate: deleteTemplateApi } = useDeleteTemplate();
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefreshCampaigns = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCampaigns(), refetchAutoBlasts(), refetchGroups(), refetchTemplates()]);
    setRefreshing(false);
  }, [refetchCampaigns, refetchAutoBlasts, refetchGroups, refetchTemplates]);
  const [autoBlastsActive, setAutoBlastsActive] = useState<Record<string, boolean>>({});
  const [createAutoTextModalVisible, setCreateAutoTextModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  // Text Blaster wizard: step 1 = audience, 2 = name, 3 = message, 4 = schedule
  const [blasterStep, setBlasterStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBlasterGroup, setSelectedBlasterGroup] = useState<ContactGroup | null>(null);
  const [blasterCampaignName, setBlasterCampaignName] = useState("");
  const [blasterMessage, setBlasterMessage] = useState("");
  const [blasterAbTest, setBlasterAbTest] = useState(false);
  const [blasterMessageB, setBlasterMessageB] = useState("");
  const [blasterSendNow, setBlasterSendNow] = useState(true);
  const [blasterLock160, setBlasterLock160] = useState(false);
  const [blasterSending, setBlasterSending] = useState(false);
  const [processingModalVisible, setProcessingModalVisible] = useState(false);
  const [showBlasterTemplatesList, setShowBlasterTemplatesList] = useState(false);
  const [blasterTemplateButtonLayout, setBlasterTemplateButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const useTemplateButtonRef = useRef<View>(null);

  const filteredCampaigns = campaignsData;
  React.useEffect(() => {
    const map: Record<string, boolean> = {};
    autoBlasts.forEach((a) => (map[a.id] = a.status === "active"));
    setAutoBlastsActive((prev) => (Object.keys(map).length ? map : prev));
  }, [autoBlasts]);
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return allGroups;
    const q = groupSearch.trim().toLowerCase();
    return allGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [allGroups, groupSearch]);


  const tabs: { id: TabId; label: string }[] = [
    { id: "text-blaster", label: "Text Blaster" },
    { id: "all", label: "All Campaigns" },
    { id: "auto-texts", label: "Auto-Texts" },
    { id: "templates", label: "Templates" },
  ];

  /** Open campaign detail as a full page (stack screen), not a panel. */
  const onCampaignPress = useCallback(
    (campaignId: string) => {
      navigation.navigate("CampaignDetail", { campaignId });
    },
    [navigation]
  );

  const insertMergeField = useCallback((value: string) => {
    setTemplateBody((prev) => prev + value);
  }, []);

  const handleCreateTemplate = useCallback(async () => {
    const name = templateName.trim();
    const body = templateBody.trim() || "";
    if (!name) return;
    try {
      if (editingTemplateId) {
        await updateTemplateApi({ name, body, category: templateCategory.trim() || undefined });
      } else {
        await createTemplateApi({ name, body, category: templateCategory.trim() || undefined });
      }
      setEditingTemplateId(null);
      setTemplateName("");
      setTemplateCategory("");
      setTemplateBody("");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save template");
    }
  }, [templateName, templateCategory, templateBody, editingTemplateId, createTemplateApi, updateTemplateApi]);

  const handleEditTemplate = useCallback((t: { id: string; name: string; category?: string | null; body: string }) => {
    setTemplateName(t.name);
    setTemplateCategory(t.category ?? "");
    setTemplateBody(t.body ?? "");
    setEditingTemplateId(t.id);
  }, []);

  const handleDeleteTemplate = useCallback((id: string, name: string) => {
    Alert.alert("Delete template", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTemplateApi(id);
            if (editingTemplateId === id) {
              setEditingTemplateId(null);
              setTemplateName("");
              setTemplateCategory("");
              setTemplateBody("");
            }
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete template");
          }
        },
      },
    ]);
  }, [editingTemplateId, deleteTemplateApi]);

  const detectedMergeFields = useMemo(() => getMergeFieldsFromBody(templateBody), [templateBody]);

  const handleScroll = useCallback(
    (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (activeTab !== "all" || !hasNextPage || isFetchingNextPage) return;
      const { contentOffset, contentSize, layoutMeasurement } = ev.nativeEvent;
      const padding = 80;
      if (contentOffset.y + layoutMeasurement.height >= contentSize.height - padding) {
        fetchNextPage();
      }
    },
    [activeTab, hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const renderCampaignItem: ListRenderItem<Campaign> = useCallback(
    ({ item }) => {
      const total = item.recipientCount || 1;
      const sent = item.sentCount ?? 0;
      const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
      const delivered = item.deliveredPercent ?? 0;
      const response = item.responsePercent ?? 0;
      const statusLabel = campaignStatusLabel(item.status);
      const isCompleted = item.status === "completed" || item.status === "sent";
      const statusColor = isCompleted ? "#3B82F6" : item.status === "scheduled" ? colors.warning : colors.primary;
      return (
        <TouchableOpacity
          style={[styles.campaignCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => onCampaignPress(item.id)}
        >
          <View style={styles.campaignCardTop}>
            <View style={[styles.campaignCardIconWrap, { backgroundColor: colors.primary + "22" }]}>
              <CampaignsIcon color={colors.primary} focused={false} />
            </View>
            <View style={styles.campaignCardHead}>
              <Text style={[styles.campaignCardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.statusTag, { backgroundColor: statusColor + "18" }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.sentProgress, { color: colors.textMuted }]}>
            {sent} / {total} sent
            <Text style={[styles.sentPct, { color: colors.text }]}> {pct}%</Text>
          </Text>
          <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.metric, { color: colors.textMuted }]}>
              {delivered.toFixed(1)}% Delivered
            </Text>
            <Text style={[styles.metric, { color: colors.textMuted }]}>
              {response.toFixed(1)}% Response
            </Text>
            <Text style={[styles.metric, { color: colors.textMuted }]}>
              {total} Recipients
            </Text>
          </View>
          {(item.completedAt || item.sentAt) && (
            <View style={styles.dateRow}>
              <ClockIcon color={colors.textMuted} size={14} />
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {isCompleted ? "Completed" : "Sent"} {formatDateShort(item.completedAt ?? item.sentAt!)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, onCampaignPress]
  );

  const onSelectBlasterGroup = useCallback((group: ContactGroup) => {
    setSelectedBlasterGroup((prev) => (prev?.id === group.id ? null : group));
  }, []);

  const insertBlasterMergeField = useCallback((value: string) => {
    setBlasterMessage((prev) => prev + value);
  }, []);

  const blasterCharCount = blasterMessage.length;
  const blasterSegments = Math.max(1, Math.ceil(blasterCharCount / 160));
  const blasterStepLabels: Record<1 | 2 | 3 | 4, string> = {
    1: "Select your audience",
    2: "Name your blast",
    3: "Compose message",
    4: "Schedule & send",
  };

  const resetBlasterForm = useCallback(() => {
    setBlasterStep(1);
    setSelectedBlasterGroup(null);
    setBlasterCampaignName("");
    setBlasterMessage("");
    setBlasterMessageB("");
    setBlasterAbTest(false);
    setBlasterSendNow(true);
  }, []);

  const handleBlastMessage = useCallback(async () => {
    const message = blasterMessage.trim();
    if (!message) {
      Alert.alert("Validation", "Message is required.");
      return;
    }
    if (!selectedBlasterGroup) {
      Alert.alert("Validation", "Select at least one contact group.");
      return;
    }
    if (blasterAbTest && !blasterMessageB.trim()) {
      Alert.alert("Validation", "A/B test is on. Message B variant is required.");
      return;
    }

    setBlasterSending(true);
    try {
      const phone = await getActivePhoneNumber();
      if (!phone) {
        Alert.alert(
          "No sending number",
          "No active sending number found. Add a phone number first."
        );
        setBlasterSending(false);
        return;
      }

      const name =
        blasterCampaignName.trim() ||
        `Text Blast ${new Date().toLocaleString(undefined, { month: "numeric", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
      const scheduled_at = blasterSendNow
        ? null
        : new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { campaign } = await createCampaign({
        name,
        message_body: message,
        message_body_b: blasterAbTest ? blasterMessageB.trim() : undefined,
        ab_mode: blasterAbTest,
        media_urls: [],
        group_ids: [selectedBlasterGroup.id],
        phone_number_id: phone.id,
        scheduled_at: scheduled_at ?? undefined,
        category: "marketing",
      });

      if (blasterSendNow) {
        setProcessingModalVisible(true);
        try {
          await startCampaignSend(campaign.id);
          await refetchCampaigns();
        } finally {
          setProcessingModalVisible(false);
        }
      } else {
        Alert.alert("Scheduled", "Campaign scheduled.", [{ text: "OK", onPress: () => {} }]);
      }

      setActiveTab("all");
      if (!blasterSendNow) await refetchCampaigns();
      resetBlasterForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Error", message);
    } finally {
      setBlasterSending(false);
    }
  }, [
    blasterMessage,
    blasterMessageB,
    blasterAbTest,
    blasterCampaignName,
    blasterSendNow,
    selectedBlasterGroup,
    refetchCampaigns,
    resetBlasterForm,
  ]);

  const renderGroupItem: ListRenderItem<ContactGroup> = useCallback(
    ({ item }) => {
      const isSelected = selectedBlasterGroup?.id === item.id;
      return (
        <TouchableOpacity
          style={[
            styles.groupRow,
            { backgroundColor: colors.background },
            isSelected && { borderWidth: 2, borderColor: colors.primary },
          ]}
          activeOpacity={0.7}
          onPress={() => onSelectBlasterGroup(item)}
        >
          <Text style={[styles.groupRowName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.groupRowCount, { color: colors.textMuted }]}>
            {item.contactCount} {item.contactCount === 1 ? "contact" : "contacts"}
          </Text>
        </TouchableOpacity>
      );
    },
    [colors, onSelectBlasterGroup, selectedBlasterGroup?.id]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Campaigns</Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tabsContent, { paddingHorizontal: spacing.lg }]}
        style={styles.tabsScroll}
      >
        {tabs.map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            style={[
              styles.tab,
              activeTab === id && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab(id)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === id ? "#FFFFFF" : colors.textMuted },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing["3xl"] }]}
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefreshCampaigns}
          />
        }
      >
        {activeTab === "text-blaster" && (
          <>
            {/* Hero: icon + title + subtitle + step dots */}
            <View style={styles.hero}>
              <View style={[styles.heroIconWrap, { backgroundColor: colors.primary + "22" }]}>
                <CampaignsIcon color={colors.primary} focused={true} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Text Blaster</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                Send a message to multiple contacts at once
              </Text>
              <View style={styles.stepDots}>
                {([1, 2, 3, 4] as const).map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.stepDot,
                      i === blasterStep ? { backgroundColor: colors.primary } : { backgroundColor: colors.textMuted + "66" },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.stepLabel, { color: colors.textMuted }]}>{blasterStepLabels[blasterStep]}</Text>
            </View>

            {/* Step 1: Select Audience */}
            {blasterStep === 1 && (
              <View style={[styles.audienceCard, { backgroundColor: colors.surface }]}>
                <View style={styles.audienceCardHeader}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumText}>1</Text>
                  </View>
                  <View style={styles.audienceCardTitleWrap}>
                    <Text style={[styles.audienceCardTitle, { color: colors.text }]}>Select Audience</Text>
                    <Text style={[styles.audienceCardSubtitle, { color: colors.textMuted }]}>
                      Choose contact groups to message
                    </Text>
                  </View>
                </View>
                {groupsLoading ? (
                  <View style={[styles.audienceLoadingWrap, { minHeight: 200 }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.audienceLoadingText, { color: colors.textMuted }]}>
                      Loading groups...
                    </Text>
                    <Text style={[styles.audienceLoadingSubtext, { color: colors.textMuted }]}>
                      Importing contact groups...
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <SearchIcon color={colors.textMuted} size={20} />
                      <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search groups..."
                        placeholderTextColor={colors.textMuted}
                        value={groupSearch}
                        onChangeText={setGroupSearch}
                      />
                    </View>
                    {filteredGroups.length === 0 ? (
                      <View style={styles.emptyGroupsWrap}>
                        <View style={[styles.emptyCampaignsIconWrap, { backgroundColor: colors.primary + "18" }]}>
                          <ContactIcon color={colors.primary} focused={false} size={48} />
                        </View>
                        <Text style={[styles.emptyCampaignsTitle, { color: colors.text }]}>No groups</Text>
                        <Text style={[styles.emptyCampaignsSubtitle, { color: colors.textMuted }]}>
                          {groupSearch.trim() ? "No groups match your search." : "Create contact groups in Contacts to select an audience here."}
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        style={styles.audienceListScroll}
                        contentContainerStyle={styles.audienceListContent}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled
                      >
                        {filteredGroups.map((item, index) => (
                          <View key={item.id} style={{ marginBottom: spacing.sm }}>
                            {renderGroupItem({ item, index, separators: {} as never })}
                          </View>
                        ))}
                        {filteredGroups.length > 5 && (
                          <Text style={[styles.audienceScrollHint, { color: colors.textMuted }]}>
                            Scroll down for more ({filteredGroups.length - 5} more)
                          </Text>
                        )}
                      </ScrollView>
                    )}
                  </>
                )}
                {selectedBlasterGroup && (
                  <TouchableOpacity
                    style={[styles.blasterNextBtn, { backgroundColor: colors.primary, marginTop: spacing.md }]}
                    onPress={() => setBlasterStep(2)}
                  >
                    <Text style={styles.blasterNextBtnText}>Next</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Step 2: Campaign Name (optional) */}
            {blasterStep === 2 && (
              <View style={[styles.blasterCard, { backgroundColor: colors.surface }]}>
                <View style={styles.blasterCardHeader}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumText}>2</Text>
                  </View>
                  <View style={styles.blasterCardTitleWrap}>
                    <View style={styles.blasterCardTitleRow}>
                      <ComposeIcon color={colors.primary} size={20} />
                      <Text style={[styles.blasterCardTitle, { color: colors.text }]}>
                        Campaign Name <Text style={[styles.blasterOptional, { color: colors.textMuted }]}>{"(optional)"}</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.blasterInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="Enter a name for this blast..."
                      placeholderTextColor={colors.textMuted}
                      value={blasterCampaignName}
                      onChangeText={setBlasterCampaignName}
                    />
                    <Text style={[styles.blasterHint, { color: colors.textMuted }]}>
                      If left empty, an auto-generated name will be used.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.blasterNextBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setBlasterStep(3)}
                >
                  <Text style={styles.blasterNextBtnText}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.blasterBackBtn} onPress={() => { setBlasterStep(1); setSelectedBlasterGroup(null); }}>
                  <Text style={[styles.blasterBackBtnText, { color: colors.textMuted }]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Message */}
            {blasterStep === 3 && (
              <View style={[styles.blasterCard, { backgroundColor: colors.surface }]}>
                <View style={styles.blasterCardHeader}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumText}>3</Text>
                  </View>
                  <View style={styles.blasterCardTitleWrap}>
                    <View style={styles.blasterMessageHeaderRow}>
                      <ComposeIcon color={colors.primary} size={20} />
                      <Text style={[styles.blasterCardTitle, { color: colors.text }]}>Message</Text>
                      <View style={styles.blasterMessageOpts}>
                        <TouchableOpacity
                          style={styles.blasterCheckRow}
                          onPress={() => setBlasterAbTest(!blasterAbTest)}
                        >
                          <View style={[styles.blasterCheckbox, { borderColor: colors.border, backgroundColor: blasterAbTest ? colors.primary : "transparent" }]} />
                          <Text style={[styles.blasterCheckLabel, { color: colors.text }]}>A/B test</Text>
                        </TouchableOpacity>
                        <View ref={useTemplateButtonRef} collapsable={false}>
                          <TouchableOpacity
                            style={styles.blasterUseTemplate}
                            onPress={() => {
                              useTemplateButtonRef.current?.measureInWindow((x, y, width, height) => {
                                setBlasterTemplateButtonLayout({ x, y, width, height });
                                setShowBlasterTemplatesList(true);
                              });
                            }}
                          >
                            <Text style={[styles.blasterUseTemplateText, { color: colors.primary }]}>Use Template</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.blasterSectionLabel, { color: colors.textMuted }]}>MESSAGE</Text>
                    <TextInput
                      style={[styles.blasterMessageInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder={'Type your message here... Use {first_name} for personalization'}
                      placeholderTextColor={colors.textMuted}
                      value={blasterMessage}
                      onChangeText={setBlasterMessage}
                      multiline
                      textAlignVertical="top"
                    />
                    {blasterAbTest && (
                      <>
                        <Text style={[styles.blasterSectionLabel, { color: colors.textMuted }]}>MESSAGE B (A/B variant)</Text>
                        <TextInput
                          style={[styles.blasterMessageInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                          placeholder="Type variant B..."
                          placeholderTextColor={colors.textMuted}
                          value={blasterMessageB}
                          onChangeText={setBlasterMessageB}
                          multiline
                          textAlignVertical="top"
                        />
                      </>
                    )}
                    <View style={styles.blasterMergeRow}>
                      <Text style={[styles.blasterSectionLabel, { color: colors.textMuted }]}>MERGE FIELDS</Text>
                      <Text style={[styles.blasterClickHint, { color: colors.textMuted }]}>Click to insert</Text>
                    </View>
                    <View style={styles.blasterMergeChipsRow}>
                      {MERGE_FIELDS.map(({ label, value }) => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.blasterMergeChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                          onPress={() => insertBlasterMergeField(value)}
                        >
                          <Text style={[styles.blasterMergeChipText, { color: colors.text }]} numberOfLines={1}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={[styles.blasterMessageFooter, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.blasterFooterBtn, { borderColor: colors.border }]}
                        onPress={() => setBlasterLock160(!blasterLock160)}
                      >
                        <Text style={[styles.blasterFooterBtnText, { color: colors.text }]}>Lock to 160</Text>
                      </TouchableOpacity>
                      <Text style={[styles.blasterFooterBtnText, styles.blasterPreviewDisabled, { color: colors.textMuted }]}>Preview all</Text>
                      <Text style={[styles.blasterCharCount, { color: colors.textMuted }]}>
                        {blasterCharCount}/160 characters {blasterSegments} segment{blasterSegments !== 1 ? "s" : ""}
                      </Text>
                      <Text style={[styles.blasterOptOutHint, { color: colors.textMuted }]}>
                        Opt-out footer "Reply STOP to opt out." (24 chars) will be appended automatically. Segment count reflects final message.
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.blasterNextBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setBlasterStep(4)}
                >
                  <Text style={styles.blasterNextBtnText}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.blasterBackBtn} onPress={() => setBlasterStep(2)}>
                  <Text style={[styles.blasterBackBtnText, { color: colors.textMuted }]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4: Schedule & Blast */}
            {blasterStep === 4 && (
              <View style={[styles.blasterCard, { backgroundColor: colors.surface }]}>
                <View style={styles.blasterCardHeader}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumText}>4</Text>
                  </View>
                  <View style={styles.blasterCardTitleWrap}>
                    <View style={styles.blasterCardTitleRow}>
                      <ClockIcon color={colors.primary} size={20} />
                      <Text style={[styles.blasterCardTitle, { color: colors.text }]}>Schedule</Text>
                    </View>
                    <View style={styles.blasterScheduleRow}>
                      <TouchableOpacity
                        style={[styles.blasterScheduleBtn, blasterSendNow && { backgroundColor: colors.primary }]}
                        onPress={() => setBlasterSendNow(true)}
                      >
                        <Text style={[styles.blasterScheduleBtnText, { color: blasterSendNow ? "#FFFFFF" : colors.text }]}>Send Now</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.blasterScheduleBtn, styles.blasterScheduleBtnAlt, !blasterSendNow && { backgroundColor: colors.primary }]}
                        onPress={() => setBlasterSendNow(false)}
                      >
                        <Text style={[styles.blasterScheduleBtnText, { color: !blasterSendNow ? "#FFFFFF" : colors.text }]}>Schedule Later</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.blasterBlastBtn, { backgroundColor: colors.primary }]}
                  onPress={handleBlastMessage}
                  disabled={blasterSending}
                >
                  {blasterSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <LightningIcon color="#FFFFFF" size={22} />
                  )}
                  <Text style={styles.blasterBlastBtnText}>
                    {blasterSending ? "Sending…" : "Blast Message"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.blasterBackBtn} onPress={() => setBlasterStep(3)}>
                  <Text style={[styles.blasterBackBtnText, { color: colors.textMuted }]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === "all" && (
          <View style={styles.campaignsSection}>
            <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SearchIcon color={colors.textMuted} size={20} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search campaigns..."
                placeholderTextColor={colors.textMuted}
                value={campaignSearch}
                onChangeText={setCampaignSearch}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusPillsContent}
              style={styles.statusPillsScroll}
            >
              {(["all", "draft", "running", "scheduled", "completed"] as const).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.statusPill,
                    campaignStatusFilter === key && styles.statusPillActive,
                    campaignStatusFilter === key && { borderBottomColor: colors.primary },
                  ]}
                  onPress={() => setCampaignStatusFilter(key)}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: campaignStatusFilter === key ? colors.primary : colors.textMuted },
                    ]}
                  >
                    {key === "all" ? "All" : key === "draft" ? "Draft" : key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {campaignsLoading ? (
              <View style={[styles.campaignsLoadingWrap, { minHeight: 220 }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : filteredCampaigns.length === 0 ? (
              <View style={styles.emptyCampaignsWrap}>
                <View style={[styles.emptyCampaignsIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <CampaignsIcon color={colors.primary} focused={false} size={48} />
                </View>
                <Text style={[styles.emptyCampaignsTitle, { color: colors.text }]}>No campaigns</Text>
                <Text style={[styles.emptyCampaignsSubtitle, { color: colors.textMuted }]}>
                  {campaignSearch.trim() || campaignStatusFilter !== "all"
                    ? "No campaigns match your filters."
                    : "Create your first campaign to get started."}
                </Text>
              </View>
            ) : (
              <>
                {filteredCampaigns.map((item, index) => (
                  <View key={item.id} style={{ marginBottom: spacing.lg }}>
                    {renderCampaignItem({ item, index, separators: {} as never })}
                  </View>
                ))}
                {isFetchingNextPage && (
                  <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: spacing.lg }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {activeTab === "auto-texts" && (
          <View style={styles.autoTextsSection}>
            <View style={styles.autoTextsHeader}>
              <Text style={[styles.autoTextsHeading, { color: colors.text }]}>Auto-Texts</Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={() => setCreateAutoTextModalVisible(true)}
              >
                <Text style={styles.createButtonText}>+ Create</Text>
              </TouchableOpacity>
            </View>
            {autoBlasts.length === 0 ? (
              <View style={styles.emptyCampaignsWrap}>
                <View style={[styles.emptyCampaignsIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <ClockIcon color={colors.primary} size={48} />
                </View>
                <Text style={[styles.emptyCampaignsTitle, { color: colors.text }]}>No auto-texts</Text>
                <Text style={[styles.emptyCampaignsSubtitle, { color: colors.textMuted }]}>
                  Create your first auto-text to send scheduled messages to your contacts.
                </Text>
              </View>
            ) : (
              autoBlasts.map((item: AutoBlast) => {
                const isActive = autoBlastsActive[item.id] ?? (item.status === "active");
                const title = item.title ?? item.name ?? "Auto blast";
                const description = item.description ?? "";
                const stats = item.stats;
                return (
                  <View
                    key={item.id}
                    style={[styles.autoTextCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.autoTextCardTop}>
                      <View style={styles.autoTextCardContent}>
                        <Text style={[styles.autoTextCardTitle, { color: colors.text }]} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text style={[styles.autoTextCardDescription, { color: colors.textMuted }]} numberOfLines={1}>
                          {description}
                        </Text>
                        {stats && (stats.total_runs != null || stats.total_sent != null) && (
                          <Text style={[styles.autoTextCardStats, { color: colors.textMuted }]} numberOfLines={1}>
                            {[stats.total_runs != null && `${stats.total_runs} runs`, stats.total_sent != null && `${stats.total_sent} sent`]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        )}
                        <View style={[styles.autoTextActivePill, { backgroundColor: isActive ? `${colors.primary}22` : "transparent" }]}>
                          <Text style={[styles.autoTextActivePillText, { color: isActive ? colors.primary : colors.textMuted }]}>
                            {isActive ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={isActive}
                        onValueChange={(value) => setAutoBlastsActive((prev) => ({ ...prev, [item.id]: value }))}
                        trackColor={{ false: colors.border, true: `${colors.primary}99` }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === "templates" && (
          <>
            {/* Create Template card */}
            <View style={[styles.templateCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.templateCardTitle, { color: colors.text }]}>Create Template</Text>
              <Text style={[styles.templateCardHint, { color: colors.textMuted }]}>
                Use merge fields like {"{first_name}"} and {"{last_name}"}
              </Text>
              <Text style={[styles.templateLabel, { color: colors.text }]}>Name</Text>
              <TextInput
                style={[styles.templateInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Welcome Message"
                placeholderTextColor={colors.textMuted}
                value={templateName}
                onChangeText={setTemplateName}
              />
              <Text style={[styles.templateLabel, { color: colors.text }]}>Category (optional)</Text>
              <View style={styles.templateCategoryRow}>
                <TextInput
                  style={[styles.templateInput, styles.templateInputFlex, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., onboarding"
                  placeholderTextColor={colors.textMuted}
                  value={templateCategory}
                  onChangeText={setTemplateCategory}
                />
              </View>
              <Text style={[styles.templateLabel, { color: colors.text }]}>Body</Text>
              <Text style={[styles.templateMergeHint, { color: colors.textMuted }]}>Click a field to insert</Text>
              <View style={styles.mergeFieldsRow}>
                {MERGE_FIELDS.map(({ label, value }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.mergeFieldChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => insertMergeField(value)}
                  >
                    <Text style={[styles.mergeFieldChipText, { color: colors.text }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.templateBodyInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Type your message..."
                placeholderTextColor={colors.textMuted}
                value={templateBody}
                onChangeText={setTemplateBody}
                multiline
                textAlignVertical="top"
              />
              <View style={[styles.mergeDetectedRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.mergeDetectedText, { color: colors.textMuted }]}>
                  Merge fields detected: {detectedMergeFields.length > 0 ? detectedMergeFields.join(", ") : "—"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.templateCreateBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreateTemplate}
                disabled={!templateName.trim() || isCreatingTemplate || isUpdatingTemplate}
              >
                <Text style={styles.templateCreateBtnText}>
                  {isCreatingTemplate || isUpdatingTemplate
                    ? "Saving..."
                    : editingTemplateId
                      ? "Update"
                      : "+ Create"}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Existing Templates card */}
            <View style={[styles.templateCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.templateCardTitle, { color: colors.text }]}>Existing Templates</Text>
              {templatesLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : existingTemplates.length === 0 ? (
                <Text style={[styles.templateEmptyText, { color: colors.textMuted }]}>No templates yet</Text>
              ) : (
                existingTemplates.map((t) => (
                  <View key={t.id} style={[styles.existingTemplateRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.existingTemplateRowContent}>
                      <Text style={[styles.existingTemplateName, { color: colors.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      {t.category ? (
                        <Text style={[styles.existingTemplateCategory, { color: colors.textMuted }]} numberOfLines={1}>
                          {t.category}
                        </Text>
                      ) : null}
                      <Text style={[styles.existingTemplateBody, { color: colors.textMuted }]} numberOfLines={2}>
                        {t.body || "—"}
                      </Text>
                    </View>
                    <View style={styles.existingTemplateRowActions}>
                      <TouchableOpacity
                        style={styles.existingTemplateActionBtn}
                        onPress={() => handleEditTemplate(t)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.existingTemplateActionBtn}
                        onPress={() => handleDeleteTemplate(t.id, t.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.destructive ?? "#e74c3c"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={processingModalVisible} transparent animationType="fade">
        <View style={[styles.processingModalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.processingModalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} style={styles.processingModalSpinner} />
            <Text style={[styles.processingModalTitle, { color: colors.text }]}>Sending campaign</Text>
            <Text style={[styles.processingModalSubtext, { color: colors.textMuted }]}>
              Please wait…
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showBlasterTemplatesList}
        transparent
        onRequestClose={() => {
          setShowBlasterTemplatesList(false);
          setBlasterTemplateButtonLayout(null);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setShowBlasterTemplatesList(false);
            setBlasterTemplateButtonLayout(null);
          }}
        >
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        {blasterTemplateButtonLayout && (
          <View
            style={[
              styles.blasterTemplatesModalContent,
              {
                top: blasterTemplateButtonLayout.y + blasterTemplateButtonLayout.height + 4,
                right: "0%",
                minWidth: Math.max(blasterTemplateButtonLayout.width, 200),
                backgroundColor: colors.sheet,
                borderColor: colors.border,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.blasterTemplatesListInner}>
              {existingTemplates.length === 0 ? (
                <Text style={[styles.blasterTemplatesEmpty, { color: colors.textMuted }]}>
                  No templates yet. Create one in the Templates tab.
                </Text>
              ) : existingTemplates.length <= 5 ? (
                <View style={styles.blasterTemplatesListStatic}>
                  {existingTemplates.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.blasterTemplateItem, { borderColor: colors.border }]}
                      onPress={() => {
                        setBlasterMessage(t.body);
                        setShowBlasterTemplatesList(false);
                        setBlasterTemplateButtonLayout(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.blasterTemplateItemName, { color: colors.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      {t.category ? (
                        <Text style={[styles.blasterTemplateItemCategory, { color: colors.textMuted }]} numberOfLines={1}>
                          {t.category}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <ScrollView style={styles.blasterTemplatesScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {existingTemplates.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.blasterTemplateItem, { borderColor: colors.border }]}
                      onPress={() => {
                        setBlasterMessage(t.body);
                        setShowBlasterTemplatesList(false);
                        setBlasterTemplateButtonLayout(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.blasterTemplateItemName, { color: colors.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      {t.category ? (
                        <Text style={[styles.blasterTemplateItemCategory, { color: colors.textMuted }]} numberOfLines={1}>
                          {t.category}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </Modal>

      <CreateAutoTextModal
        visible={createAutoTextModalVisible}
        onClose={() => setCreateAutoTextModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typography.displayMd },
  tabsScroll: { maxHeight: 44, marginBottom: spacing.lg },
  tabsContent: { flexDirection: "row", alignItems: "center"},
  tab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabText: { ...typography.bodySm, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  heroTitle: { ...typography.displayMd, marginBottom: spacing.sm },
  heroSubtitle: { ...typography.body, textAlign: "center", marginBottom: spacing.lg },
  stepDots: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLabel: { ...typography.caption },
  audienceCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  audienceCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.lg },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  stepNumText: { ...typography.bodySm, fontWeight: "700", color: "#FFFFFF" },
  audienceCardTitleWrap: { flex: 1 },
  audienceCardTitle: { ...typography.titleMd },
  audienceCardSubtitle: { ...typography.bodySm, marginTop: 2 },
  blasterCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  blasterCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  blasterCardTitleWrap: { flex: 1 },
  blasterCardTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  blasterCardTitle: { ...typography.titleMd, flex: 1 },
  blasterOptional: { fontWeight: "400" },
  blasterInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    ...typography.body,
  },
  blasterHint: { ...typography.bodySm, marginBottom: spacing.md },
  blasterNextBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  blasterNextBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  blasterBackBtn: { alignSelf: "flex-start", paddingVertical: spacing.sm },
  blasterBackBtnText: { ...typography.bodySm },
  blasterMessageHeaderRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  blasterMessageOpts: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  blasterCheckRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  blasterCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2 },
  blasterCheckLabel: { ...typography.bodySm },
  blasterUseTemplate: { paddingVertical: spacing.xs },
  blasterUseTemplateText: { ...typography.bodySm },
  processingModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  processingModalCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    minWidth: 260,
    alignItems: "center",
  },
  processingModalSpinner: { marginBottom: spacing.md },
  processingModalTitle: { ...typography.titleMd, fontWeight: "600", marginBottom: spacing.xs },
  processingModalSubtext: { ...typography.bodySm },
  blasterTemplatesModalContent: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: "hidden",
    maxHeight: 280,
    alignSelf: "flex-start",
  },
  blasterTemplatesListInner: { padding: spacing.sm },
  blasterTemplatesListStatic: {},
  blasterTemplatesListWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    maxHeight: 220,
  },
  blasterTemplatesScroll: { maxHeight: 240 },
  blasterTemplatesEmpty: { ...typography.bodySm, paddingVertical: spacing.sm },
  blasterTemplateItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  blasterTemplateItemName: { ...typography.bodySm, fontWeight: "600" },
  blasterTemplateItemCategory: { ...typography.caption, marginTop: 2 },
  blasterSectionLabel: { ...typography.caption, marginBottom: spacing.xs },
  blasterMessageInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 100,
    marginBottom: spacing.sm,
    ...typography.body,
  },
  blasterMergeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  blasterClickHint: { ...typography.caption },
  blasterMergeChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  blasterMergeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: "48%",
  },
  blasterMergeChipText: { ...typography.caption },
  blasterMessageFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
  blasterFooterBtn: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignSelf: "flex-start", marginBottom: spacing.xs },
  blasterFooterBtnText: { ...typography.caption },
  blasterPreviewDisabled: { marginLeft: spacing.md },
  blasterCharCount: { ...typography.caption, marginBottom: spacing.xs },
  blasterOptOutHint: { ...typography.caption, marginTop: spacing.xs },
  blasterScheduleRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  blasterScheduleBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  blasterScheduleBtnAlt: { borderWidth: StyleSheet.hairlineWidth },
  blasterScheduleBtnText: { ...typography.label, fontWeight: "600" },
  blasterBlastBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal:35,
  },
  blasterBlastBtnText: { ...typography.titleSm, color: "#FFFFFF", fontWeight: "600" },
  audienceLoadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
  },
  audienceLoadingText: { ...typography.bodySm, marginTop: spacing.md },
  audienceLoadingSubtext: { ...typography.caption, marginTop: spacing.xs },
  audienceListScroll: { maxHeight: 280 },
  audienceListContent: { paddingBottom: spacing.sm },
  audienceScrollHint: { ...typography.caption, marginTop: spacing.sm, textAlign: "center" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  groupRowName: { ...typography.body, flex: 1 },
  groupRowCount: { ...typography.bodySm },
  emptyGroups: { ...typography.body, textAlign: "center", paddingVertical: spacing.xl },
  emptyGroupsWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
    minHeight: 160,
  },
  emptyCampaignsWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    minHeight: 220,
  },
  emptyCampaignsIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyCampaignsTitle: { ...typography.titleLg, fontWeight: "600", marginBottom: spacing.sm },
  emptyCampaignsSubtitle: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.xl },
  campaignsSection: { paddingBottom: spacing.lg },
  campaignsLoadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
  },
  statusPillsScroll: { maxHeight: 40, marginBottom: spacing.lg },
  statusPillsContent: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  statusPill: { paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: "transparent" },
  statusPillActive: {},
  statusPillText: { ...typography.bodySm, fontWeight: "600" },
  campaignCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  campaignCardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  campaignCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  campaignCardHead: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  campaignCardTitle: { ...typography.titleMd, flex: 1 },
  statusTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.xs, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTagText: { ...typography.caption },
  sentProgress: { ...typography.bodySm, marginBottom: spacing.sm },
  sentPct: { fontWeight: "600" },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginBottom: spacing.sm,
  },
  metric: { ...typography.caption },
  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dateText: { ...typography.caption },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.xs },
  badgeText: { ...typography.caption },
  metaText: { ...typography.bodySm },
  placeholder: { paddingVertical: spacing["3xl"], alignItems: "center" },
  placeholderText: { ...typography.body },
  templateCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
  },
  templateCardTitle: { ...typography.titleLg, fontWeight: "700", marginBottom: spacing.xs },
  templateCardHint: { ...typography.bodySm, marginBottom: spacing.lg },
  templateLabel: { ...typography.label, marginBottom: spacing.xs },
  templateInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...typography.body,
  },
  templateInputFlex: { flex: 1 },
  templateCategoryRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.sm },
  storedHint: { ...typography.caption, flexShrink: 0 },
  templateMergeHint: { ...typography.caption, marginBottom: spacing.xs },
  mergeFieldsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  mergeFieldChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: "48%",
  },
  mergeFieldChipText: { ...typography.caption },
  templateBodyInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 100,
    marginBottom: spacing.sm,
    ...typography.body,
  },
  mergeDetectedRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginBottom: spacing.lg },
  mergeDetectedText: { ...typography.caption },
  templateCreateBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  templateCreateBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  templateEmptyText: { ...typography.body, marginTop: spacing.sm },
  existingTemplateRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  existingTemplateRowContent: { flex: 1, minWidth: 0 },
  existingTemplateRowActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  existingTemplateActionBtn: { padding: spacing.xs },
  existingTemplateName: { ...typography.titleSm, fontWeight: "600", marginBottom: spacing.xs },
  existingTemplateCategory: { ...typography.caption, marginBottom: spacing.xs },
  existingTemplateBody: { ...typography.bodySm },
  autoTextsSection: { paddingBottom: spacing["3xl"] },
  autoTextsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  autoTextsHeading: { ...typography.titleLg, fontWeight: "700" },
  createButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  createButtonText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  autoTextCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  autoTextCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  autoTextCardContent: { flex: 1, minWidth: 0, marginRight: spacing.md },
  autoTextCardTitle: { ...typography.titleSm, fontWeight: "700", marginBottom: spacing.xs },
  autoTextCardDescription: { ...typography.bodySm, marginBottom: spacing.sm },
  autoTextCardStats: { ...typography.caption, marginBottom: spacing.xs },
  autoTextActivePill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  autoTextActivePillText: { ...typography.caption, fontWeight: "600" },
});
