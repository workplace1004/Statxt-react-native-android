import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItem,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps, NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { useChatMessages } from "../../hooks/useChatMessages";
import { useRealtimeChatMessages } from "../../hooks/useRealtime";
import {
  BackArrowIcon,
  PhoneIcon,
  PersonIcon,
  MinusCircleIcon,
  SendArrowIcon,
  PaperclipIcon,
  EmojiIcon,
  CheckSingleIcon,
  CheckDoubleIcon,
} from "../../components/TabIcons";
import type { Message } from "../../types/messages";
import type { MessagesStackParamList } from "../../navigation/MessagesStack";

const EMOJI_GRID = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "😝",
  "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🤚", "🖐", "✋", "🖖", "🙏", "💪", "❤️", "🧡", "💛", "💚", "💙",
  "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🔥", "⭐", "🌟", "✨", "💫", "✅", "❌",
  "🎉", "🎊", "🎈", "🎁", "🏆", "👍", "👏", "🙌", "👐", "🤲", "🙏", "💯", "😎", "🤔", "😢", "😭", "😤", "🥳", "😴", "🤗",
];

type Props = NativeStackScreenProps<MessagesStackParamList, "Chat">;
type Nav = NativeStackNavigationProp<MessagesStackParamList, "Chat">;

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(title: string): string {
  const parts = (title ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return (title ?? "?").slice(0, 2).toUpperCase() || "?";
}

export function ChatScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { conversationId, conversationTitle, contactId: paramContactId } = route.params;
  const contactId = paramContactId ?? (conversationId.startsWith("conv-") ? conversationId.slice(5) : undefined);
  const [input, setInput] = useState("");
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  /** Ref always holds latest input so Send works even when state hasn't flushed (avoids stale closure). */
  const inputValueRef = useRef("");

  const { messages, isLoading, error, sendMessage, isSending, refetch, isRefetching, sendError, clearSendError } =
    useChatMessages(conversationId);

  useRealtimeChatMessages(conversationId);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    if (!sendError) return;
    const message = sendError instanceof Error ? sendError.message : String(sendError);
    const isDnc = /DNC|do not contact|opted out/i.test(message);
    const title = isDnc ? "Can't send message" : "Send failed";
    const body = isDnc
      ? "This contact is on the Do Not Contact list. You can't send messages to them."
      : message;
    Alert.alert(title, body, [{ text: "OK", onPress: clearSendError }]);
  }, [sendError, clearSendError]);

  const handleSend = useCallback(() => {
    const t = (inputValueRef.current || input).trim();
    if (!t || isSending) return;
    inputValueRef.current = "";
    setInput("");
    inputRef.current?.blur();
    sendMessage(t);
  }, [input, isSending, sendMessage]);

  const onEmojiSelect = useCallback((emoji: string) => {
    const next = (inputValueRef.current || input) + emoji;
    inputValueRef.current = next;
    setInput(next);
  }, [input]);

  const handleContactPress = useCallback(() => {
    if (!contactId) return;
    navigation.navigate("ContactDetail", { contactId });
  }, [contactId, navigation]);

  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => (
      <View
        style={[
          styles.bubbleWrap,
          item.isFromMe ? styles.bubbleWrapMe : styles.bubbleWrapThem,
        ]}
      >
        <View
          style={[
            styles.bubble,
            item.isFromMe
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: item.isFromMe ? colors.white : colors.text },
            ]}
          >
            {item.text}
          </Text>
          <View style={styles.bubbleTimeRow}>
            <Text
              style={[
                styles.bubbleTime,
                { color: item.isFromMe ? "rgba(255,255,255,0.8)" : colors.textMuted },
              ]}
            >
              {formatMessageTime(item.sentAt)}
            </Text>
            {item.isFromMe && (
              <View style={styles.checkWrap}>
                {item.status === "seen" ? (
                  <CheckDoubleIcon color="#ffffff" size={20} />
                ) : (
                  <CheckSingleIcon color="rgba(255,255,255,0.9)" size={20} />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    ),
    [colors]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Could not load messages.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 10, paddingBottom: spacing.sm, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Conversations")}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <BackArrowIcon color={colors.text} size={26} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerContactWrap}
              onPress={handleContactPress}
              disabled={!contactId}
              activeOpacity={contactId ? 0.7 : 1}
            >
              <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.headerAvatarText}>
                  {getInitials(conversationTitle ?? "Chat")}
                </Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {conversationTitle ?? "Chat"}
              </Text>
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionBtn} hitSlop={8}>
                <PhoneIcon color={colors.primary} size={22} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                hitSlop={8}
                onPress={handleContactPress}
                disabled={!contactId}
              >
                <PersonIcon color={contactId ? colors.primary : colors.textMuted} size={22} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                hitSlop={8}
                onPress={() => setShowMoreMenu(true)}
              >
                <MinusCircleIcon color={colors.primary} size={22} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.listWrap}>
            <FlatList
              ref={listRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              ListEmptyComponent={
                isLoading ? null : (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No messages yet</Text>
                  </View>
                )
              }
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: spacing.xl },
                messages.length === 0 && styles.listContentEmpty,
              ]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                messages.length > 0 && listRef.current?.scrollToEnd({ animated: false })
              }
              refreshControl={
                <AppRefreshControl
                  refreshing={isRefetching}
                  onRefresh={() => refetch()}
                />
              }
            />
            {showEmojiModal ? (
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowEmojiModal(false)}
              />
            ) : null}
          </View>

          {showEmojiModal ? (
            <View style={[styles.emojiPanel, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <View style={[styles.emojiModalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.emojiModalTitle, { color: colors.text }]}>Emoji</Text>
                <TouchableOpacity onPress={() => setShowEmojiModal(false)} hitSlop={12} style={styles.emojiModalCloseBtn}>
                  <Text style={[styles.emojiModalCloseText, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.emojiScroll}
                contentContainerStyle={styles.emojiGrid}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {EMOJI_GRID.map((emoji, i) => (
                  <TouchableOpacity
                    key={`${emoji}-${i}`}
                    style={styles.emojiCell}
                    onPress={() => onEmojiSelect(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiCellText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + spacing.sm,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.footerInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={(text) => {
                inputValueRef.current = text;
                setInput(text);
              }}
              onFocus={() => setShowEmojiModal(false)}
              multiline
              maxLength={2000}
              editable={!isSending}
            />
            <View style={styles.footerIcons}>
              <TouchableOpacity style={styles.footerIconBtn} hitSlop={8}>
                <PaperclipIcon color={colors.textMuted} size={24} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.footerIconBtn}
                onPress={() => setShowEmojiModal(true)}
                hitSlop={8}
              >
                <EmojiIcon color={colors.textMuted} size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerIconBtn} onPress={() => { }} hitSlop={8}>
                <Text style={[styles.atmention, { color: colors.textMuted, minHeight: 40 }]}>
                  @
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: input.trim() && !isSending ? 1 : 0.6,
                },
              ]}
              onPress={handleSend}
              disabled={!input.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <SendArrowIcon color="#FFFFFF" size={18} />
                  <Text style={styles.sendBtnText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Modal
            visible={showMoreMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMoreMenu(false)}
          >
            <View style={styles.moreMenuOverlay}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowMoreMenu(false)}
              />
              <View
                style={[
                  styles.moreMenuCard,
                  {
                    backgroundColor: colors.sheet,
                    borderColor: colors.border,
                    top: insets.top + 25,
                    right: spacing.md,
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.moreMenuItem,
                    { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.border },
                  ]}
                  onPress={() => {
                    setShowMoreMenu(false);
                    handleContactPress();
                  }}
                >
                  <Ionicons name="person-outline" size={22} color={colors.text} />
                  <Text style={[styles.moreMenuLabel, { color: colors.text }]}>View Contact</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.moreMenuItem,
                    { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.border },
                  ]}
                  onPress={() => setShowMoreMenu(false)}
                >
                  <Ionicons name="notifications-off-outline" size={22} color={colors.text} />
                  <Text style={[styles.moreMenuLabel, { color: colors.text }]}>Mute Notifications</Text>
                </Pressable>
                <View style={[styles.moreMenuSeparator, { backgroundColor: colors.border }]} />
                <Pressable
                  style={({ pressed }) => [
                    styles.moreMenuItem,
                    pressed && { backgroundColor: `${colors.destructive ?? "#e74c3c"}20` },
                  ]}
                  onPress={() => setShowMoreMenu(false)}
                >
                  <Ionicons name="ban-outline" size={22} color={colors.destructive ?? "#e74c3c"} />
                  <Text style={[styles.moreMenuLabel, { color: colors.destructive ?? "#e74c3c" }]}>Block</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: spacing.sm },
  headerContactWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerAvatarText: { ...typography.titleSm, color: "#FFFFFF" },
  headerTitle: { ...typography.titleMd, flex: 1, marginRight: spacing.sm },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  headerActionBtn: { padding: spacing.xs },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  listContentEmpty: { flex: 1 },
  emptyWrap: { paddingVertical: spacing["2xl"], alignItems: "center" },
  emptyText: { ...typography.body },
  bubbleWrap: { marginBottom: spacing.sm },
  bubbleWrapMe: { alignItems: "flex-end" },
  bubbleWrapThem: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "80%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  bubbleText: { ...typography.body },
  bubbleTimeRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs, gap: 4 },
  bubbleTime: { ...typography.caption },
  checkWrap: { marginLeft: "auto" },
  emojiPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 260,
  },
  emojiModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emojiModalTitle: { ...typography.titleSm, fontWeight: "600" },
  emojiModalCloseBtn: { padding: spacing.xs },
  emojiModalCloseText: { ...typography.label, fontWeight: "600" },
  emojiScroll: { maxHeight: 220 },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.sm,
    gap: spacing.xs,
  },
  emojiCell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiCellText: { fontSize: 28 },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  footerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
  },
  footerIcons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    gap: spacing.xs,
  },
  atmention : {fontSize: 20, fontWeight: "600"},
  footerIconBtn: { padding: spacing.xs },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    minHeight: 40,
  },
  sendBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  moreMenuOverlay: { flex: 1 },
  moreMenuCard: {
    position: "absolute",
    minWidth: 220,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  moreMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  moreMenuLabel: { ...typography.body, flex: 1 },
  moreMenuSeparator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  errorText: { ...typography.body },
});
