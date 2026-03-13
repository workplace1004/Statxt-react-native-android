import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { BackArrowIcon, ChatBubbleOutlineIcon } from "../../components/TabIcons";
import { useContacts } from "../../hooks/useContacts";
import type { Contact } from "../../types/contacts";
import type { ContactsStackParamList } from "../../navigation/ContactsStack";

type Props = NativeStackScreenProps<ContactsStackParamList, "ContactDetail">;
type Nav = NativeStackNavigationProp<ContactsStackParamList, "ContactDetail">;

function getInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return (name ?? "?").slice(0, 2).toUpperCase() || "?";
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ContactDetailScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { contactId, contact: contactFromParams } = route.params;

  const { data, isLoading, refetch, isRefetching } = useContacts({ limit: 200 });
  const contactFromList = useMemo(
    () => data?.contacts?.find((c: Contact) => c.id === contactId),
    [data?.contacts, contactId]
  );
  const contact = contactFromParams ?? contactFromList;

  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  const onMessage = useCallback(() => {
    if (!contact) return;
    const tabNav = navigation.getParent() as { navigate: (name: string, params?: object) => void } | undefined;
    tabNav?.navigate("MessagesTab", {
      screen: "Chat",
      params: {
        conversationId: `conv-${contact.id}`,
        conversationTitle: contact.name,
        contactId: contact.id,
      },
    });
  }, [contact, navigation]);

  const statusLabel = (contact?.status ?? "active").toLowerCase();
  const displayStatus = statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1);

  if (!contact && isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <BackArrowIcon color={colors.text} size={26} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Contact</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Not found</Text>
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Contact not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <BackArrowIcon color={colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Contact</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {contact.name}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing["3xl"] }]}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <AppRefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
      >
        {/* Primary contact card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.primaryRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
            </View>
            <View style={styles.primaryInfo}>
              <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
                {contact.name}
              </Text>
              {contact.phone ? (
                <Text style={[styles.contactMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {contact.phone}
                </Text>
              ) : null}
              {contact.email ? (
                <Text style={[styles.contactMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {contact.email}
                </Text>
              ) : null}
              <View style={[styles.statusPill, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.statusPillText, { color: colors.primary }]}>
                  {displayStatus.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Message button */}
        <TouchableOpacity
          style={[styles.messageButton, { backgroundColor: colors.primary }]}
          onPress={onMessage}
          activeOpacity={0.85}
        >
          <View style={styles.messageButtonContent}>
            <ChatBubbleOutlineIcon color="#FFFFFF" size={22} />
            <Text style={styles.messageButtonText}>Message</Text>
          </View>
        </TouchableOpacity>

        {/* Contact Info card — all Supabase contacts table fields */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CONTACT INFO</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>First name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {contact.first_name?.trim() || "—"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Last name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {contact.last_name?.trim() || "—"}
            </Text>
          </View>
          {contact.phone ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{contact.phone}</Text>
            </View>
          ) : null}
          {contact.email ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>{contact.email}</Text>
            </View>
          ) : null}
          {contact.company ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Company</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{contact.company}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Status</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{displayStatus}</Text>
          </View>
          {(contact.created_at || contact.updated_at) ? (
            <>
              {contact.created_at ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Created</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(contact.created_at)}
                  </Text>
                </View>
              ) : null}
              {contact.updated_at ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Updated</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(contact.updated_at)}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
          {contact.tags && contact.tags.length > 0 ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Tags</Text>
              <View style={styles.tagsWrap}>
                {contact.tags.map((tag, i) => (
                  <View
                    key={i}
                    style={[styles.tagPill, { backgroundColor: colors.primary + "22" }]}
                  >
                    <Text style={[styles.tagPillText, { color: colors.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Compliance card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>COMPLIANCE</Text>
          <View style={styles.complianceRow}>
            <Text style={[styles.complianceTitle, { color: colors.text }]}>Add to DNC List</Text>
            <Text style={[styles.complianceSubtitle, { color: colors.textMuted }]}>
              Block all outbound communications
            </Text>
          </View>
        </View>
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  card: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  primaryRow: { flexDirection: "row", alignItems: "flex-start" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  avatarText: { ...typography.titleLg, color: "#FFFFFF" },
  primaryInfo: { flex: 1, minWidth: 0 },
  contactName: { ...typography.titleLg },
  contactMeta: { ...typography.body, marginTop: 4 },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusPillText: { ...typography.caption },
  messageButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  messageButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  messageButtonText: { ...typography.titleSm, color: "#FFFFFF" },
  sectionTitle: { ...typography.caption, marginBottom: spacing.md },
  infoRow: { marginBottom: spacing.md },
  infoLabel: { ...typography.caption, marginBottom: 2 },
  infoValue: { ...typography.body },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  tagPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  tagPillText: { ...typography.caption },
  complianceRow: {},
  complianceTitle: { ...typography.titleSm },
  complianceSubtitle: { ...typography.bodySm, marginTop: 4 },
});
