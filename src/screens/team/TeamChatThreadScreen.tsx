import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItem,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import {
  BackArrowIcon,
  VideoIcon,
  PhoneIcon,
  SearchIcon,
  MoreVerticalIcon,
  PaperclipIcon,
  EmojiIcon,
  SendArrowIcon,
} from "../../components/TabIcons";
import { useAuth } from "../../providers/AuthProvider";
import { teamChatLog } from "../../lib/logger";
import { usePresenceHeartbeat } from "../../hooks/usePresenceHeartbeat";
import { useTeamChatMessages } from "../../hooks/useTeamChatMessages";
import { useRealtimeTeamChatMessages } from "../../hooks/useRealtime";
import { fetchTeamChatRoom, fetchTeamChatRoomMembers } from "../../lib/teamChatRoomsApi";
import { uploadTeamChatFile, sendTeamChatTyping, deleteTeamChatMessage } from "../../lib/teamChatMessagesApi";
import { supabase } from "../../lib/supabase";
import { setLastReadAt } from "../../lib/teamThreadsApi";
import { queryKeys } from "../../lib/queryClient";
import { AppRefreshControl } from "../../components/AppRefreshControl";
import type { TeamChatMessage, TeamChatRoomMember, TeamChatUser } from "../../types/teamChat";
import type { TeamStackParamList } from "../../navigation/TeamStack";

type Props = NativeStackScreenProps<TeamStackParamList, "TeamChatThread">;

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return timeStr;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return `Yesterday ${timeStr}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${dateStr}, ${timeStr}`;
}

function formatMessageTimeAgo(iso: string, logLabel?: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / (60 * 1000));
  const diffH = Math.floor(diffMs / (60 * 60 * 1000));
  const diffD = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  let result: string;
  if (diffM < 1) result = "just now";
  else if (diffM < 60) result = `${diffM}m ago`;
  else if (diffH < 24) result = `${diffH}h ago`;
  else if (diffD < 7) result = `${diffD}d ago`;
  else result = d.toLocaleDateString([], { month: "short", day: "numeric" });
  if (result === "just now" && logLabel !== undefined) {
    teamChatLog("messageTimeAgo just now", logLabel, { iso, diffM, diffMs });
  }
  return result;
}

const FIVE_MIN_MS = 5 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

/** Outgoing message bubble color (forest green) to match chat bubble style. */
const OUTGOING_BUBBLE_COLOR = "#2E7D32";

function deriveStatusFromLastActivity(lastActivityAt: string | null | undefined): "online" | "away" | "offline" {
  if (!lastActivityAt) return "offline";
  const elapsed = Date.now() - new Date(lastActivityAt).getTime();
  if (elapsed <= FIVE_MIN_MS) return "online";
  if (elapsed <= THIRTY_MIN_MS) return "away";
  return "offline";
}

function getInitialsFromMessage(msg: TeamChatMessage, fallbackUser?: TeamChatUser | null): string {
  const u = msg.sender ?? fallbackUser;
  const name = (u?.full_name ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const email = (u?.email ?? "").trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function getMemberInitials(m: TeamChatRoomMember): string {
  const u = m.user;
  const name = (u?.full_name ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const email = (u?.email ?? "").trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

const EMOJI_GRID = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "😝",
  "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🤚", "🖐", "✋", "🖖", "🙏", "💪", "❤️", "🧡", "💛", "💚", "💙",
  "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🔥", "⭐", "🌟", "✨", "💫", "✅", "❌",
  "🎉", "🎊", "🎈", "🎁", "🏆", "👍", "👏", "🙌", "👐", "🤲", "🙏", "💯", "😎", "🤔", "😢", "😭", "😤", "🥳", "😴", "🤗",
];

const TYPING_TIMEOUT_MS = 5000;
const TYPING_DEBOUNCE_MS = 3000;
const TYPING_THROTTLE_MS = 2000;

type TypingUser = { user_id: string; user_name: string };

export function TeamChatThreadScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { threadId, threadTitle } = route.params;
  const listRef = useRef<FlatList<TeamChatMessage>>(null);
  const [inputText, setInputText] = useState("");
  const inputValueRef = useRef("");
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<TeamChatMessage[]>([]);
  const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TeamChatMessage | null>(null);

  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  usePresenceHeartbeat(!!threadId);

  // Subscribe to typing broadcast (same channel as web: team-chat:roomId:typing)
  useEffect(() => {
    if (!threadId || !user?.id) return;
    const channel = supabase
      .channel(`team-chat:${threadId}:typing`)
      .on("broadcast", { event: "typing" }, ({ payload }: { payload: TypingUser & { is_typing: boolean } }) => {
        if (payload.user_id === user.id) return;
        if (typingTimeoutsRef.current.get(payload.user_id)) clearTimeout(typingTimeoutsRef.current.get(payload.user_id)!);
        if (payload.is_typing) {
          setTypingUsers((prev) => {
            const filtered = prev.filter((u) => u.user_id !== payload.user_id);
            return [...filtered, { user_id: payload.user_id, user_name: payload.user_name || "Someone" }];
          });
          const t = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.user_id));
            typingTimeoutsRef.current.delete(payload.user_id);
          }, TYPING_TIMEOUT_MS);
          typingTimeoutsRef.current.set(payload.user_id, t);
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.user_id));
          typingTimeoutsRef.current.delete(payload.user_id);
        }
      })
      .subscribe();
    return () => {
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      supabase.removeChannel(channel);
    };
  }, [threadId, user?.id]);

  const {
    messages: rawMessages,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sendMessage,
    isSending,
  } = useTeamChatMessages(threadId, { limit: 100 });

  useRealtimeTeamChatMessages(threadId);

  const currentUserId = user?.id ?? "";

  const queryClient = useQueryClient();
  const { data: room } = useQuery({
    queryKey: ["teamChatRoom", threadId],
    queryFn: () => fetchTeamChatRoom(threadId),
    enabled: Boolean(threadId),
  });

  const { data: roomMembersFromApi, refetch: refetchRoomMembers } = useQuery({
    queryKey: ["teamChatRoomMembers", threadId],
    queryFn: () => fetchTeamChatRoomMembers(threadId),
    enabled: Boolean(threadId),
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
  });

  const roomMembers = useMemo(() => {
    const fromRoom = room?.members ?? [];
    const fromApi = roomMembersFromApi ?? [];
    if (fromApi.length > 0) return fromApi;
    return fromRoom;
  }, [room?.members, roomMembersFromApi]);

  const senderMap = useMemo(() => {
    const map = new Map<string, TeamChatUser>();
    for (const m of roomMembers) {
      const uid = m.user_id ?? m.user?.id;
      if (uid && m.user) map.set(uid, m.user);
    }
    return map;
  }, [roomMembers]);

  const statusByUserId = useMemo(() => {
    teamChatLog("last_activity_at for status", roomMembers.map((m) => ({ user_id: m.user_id, last_activity_at: m.last_activity_at ?? null })));
    const map: Record<string, "online" | "away" | "offline"> = {};
    for (const m of roomMembers) {
      const uid = m.user_id;
      if (currentUserId && String(uid) === currentUserId) {
        map[uid] = "online";
      } else if (m.status === "online" || m.status === "away" || m.status === "offline") {
        map[uid] = m.status;
      } else {
        map[uid] = deriveStatusFromLastActivity(m.last_activity_at ?? null);
      }
    }
    return map;
  }, [roomMembers, currentUserId]);

  const lastActivityByUserId = useMemo(
    () =>
      Object.fromEntries(
        roomMembers
          .filter((m) => m.last_activity_at != null)
          .map((m) => [m.user_id, m.last_activity_at as string])
      ),
    [roomMembers]
  );

  useEffect(() => {
    if (showMembersModal && threadId) refetchRoomMembers();
  }, [showMembersModal, threadId, refetchRoomMembers]);

  useFocusEffect(
    useCallback(() => {
      if (threadId) refetchRoomMembers();
    }, [threadId, refetchRoomMembers])
  );

  const onlineCount = useMemo(
    () => Object.values(statusByUserId).filter((s) => s === "online").length,
    [statusByUserId]
  );

  const headerMemberAvatars = roomMembers.slice(0, 3);

  const messages = useMemo(() => {
    return [...rawMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [rawMessages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => (m.content ?? "").toLowerCase().includes(q));
  }, [messages, searchQuery]);

  useEffect(() => {
    if (!threadId || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const created = latest?.created_at;
    if (created) setLastReadAt(threadId, created);
  }, [threadId, messages]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.teamThreads.list() });
      };
    }, [queryClient])
  );

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  const onSend = useCallback(() => {
    const t = (inputValueRef.current || inputText).trim();
    if (!t || isSending) return;
    inputValueRef.current = "";
    setInputText("");
    if (threadId && typingStopRef.current) {
      clearTimeout(typingStopRef.current);
      typingStopRef.current = null;
      sendTeamChatTyping(threadId, false);
    }
    const replyToId = replyingTo?.id ?? undefined;
    sendMessage(replyToId ? { text: t, replyToId } : t);
    setReplyingTo(null);
  }, [inputText, isSending, sendMessage, threadId, replyingTo]);

  const onEmojiSelect = useCallback((emoji: string) => {
    const next = (inputValueRef.current || inputText) + emoji;
    inputValueRef.current = next;
    setInputText(next);
  }, [inputText]);

  const handleAttachmentPress = useCallback(async () => {
    if (!threadId || isUploading || isSending) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to your photos to send an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = asset.fileName ?? `image-${Date.now()}.jpg`;
      const mimeType = "image/jpeg";

      setIsUploading(true);
      try {
        const url = await uploadTeamChatFile(threadId, uri, mimeType, fileName);
        sendMessage({ text: "", attachmentUrl: url });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload or send image.";
        Alert.alert("Upload failed", message);
      } finally {
        setIsUploading(false);
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not open photo library.");
    }
  }, [threadId, isUploading, isSending, sendMessage]);

  const getReplyPreview = useCallback(
    (item: TeamChatMessage): { senderLabel: string; content: string } | null => {
      const replyId = item.reply_to_id ?? item.reply_to?.id;
      if (!replyId) return null;
      const repliedMsg = filteredMessages.find((m) => m.id === replyId);
      const content =
        (typeof item.reply_to?.content === "string" ? item.reply_to.content : null) ??
        repliedMsg?.content ??
        "[Message]";
      const sender = repliedMsg?.sender ?? (repliedMsg ? senderMap.get(repliedMsg.sender_id) : null);
      const replyFullName =
        item.reply_to && typeof (item.reply_to as { full_name?: unknown }).full_name === "string"
          ? (item.reply_to as { full_name: string }).full_name.trim()
          : null;
      const replyEmail =
        item.reply_to && typeof (item.reply_to as { email?: unknown }).email === "string"
          ? (item.reply_to as { email: string }).email.trim()
          : null;
      const senderFullName =
        sender && typeof sender.full_name === "string" && sender.full_name.trim()
          ? sender.full_name.trim()
          : null;
      const senderEmail =
        sender && typeof sender.email === "string" && sender.email.trim() ? sender.email.trim() : null;
      const senderLabel = replyFullName || replyEmail || senderFullName || senderEmail || "Unknown";
      return {
        senderLabel,
        content: String(content).trim().slice(0, 80),
      };
    },
    [filteredMessages, senderMap]
  );

  const renderItem: ListRenderItem<TeamChatMessage> = useCallback(
    ({ item, index }) => {
      const prev = index > 0 ? filteredMessages[index - 1] : null;
      const sameSenderAsPrev = prev != null && String(prev.sender_id) === String(item.sender_id);
      const showAvatarAndName = !sameSenderAsPrev;

      const isFromMe = currentUserId && String(item.sender_id) === currentUserId;
      const resolvedSender = item.sender ?? senderMap.get(item.sender_id) ?? null;
      const senderName = isFromMe
        ? (user?.full_name?.trim() || user?.email?.trim() || "You")
        : (typeof resolvedSender?.full_name === "string" && resolvedSender.full_name.trim()
            ? resolvedSender.full_name.trim()
            : typeof resolvedSender?.email === "string" && resolvedSender.email.trim()
              ? resolvedSender.email.trim()
              : "Unknown");
      const initials = getInitialsFromMessage(item, resolvedSender);
      const senderStatus = isFromMe ? "online" : (statusByUserId[item.sender_id] ?? "offline");
      const statusDotColor =
        senderStatus === "online" ? "#22c55e" : senderStatus === "away" ? "#eab308" : "#ef4444";
      const isSelected = selectedMessages.some((m) => m.id === item.id);
      const hasSelection = selectedMessages.length >= 1;
      const timeAgoDisplay = formatMessageTimeAgo(item.created_at, `msg=${item.id} created_at=${item.created_at}`);
      const timeWithDateDisplay = formatMessageTime(item.created_at);
      const replyPreview = getReplyPreview(item);
      return (
        <Swipeable
          ref={(r) => {
            swipeableRefs.current[item.id] = r ?? null;
          }}
          renderLeftActions={() => (
            <View style={[styles.swipeReplyAction]}>
              <Ionicons name="arrow-undo-outline" size={28} color="#FFFFFF" />
            </View>
          )}
          onSwipeableOpen={(direction) => {
            if (direction === "left") {
              setReplyingTo(item);
              swipeableRefs.current[item.id]?.close();
            }
          }}
          friction={2}
        >
          <View
            style={[
              styles.messageRow,
              sameSenderAsPrev && styles.messageRowCompact,
              isSelected && styles.messageRowSelected,
              isSelected && { backgroundColor: colors.primary + "22" },
            ]}
          >
          <Pressable
            style={styles.messageRowPressable}
            onPress={() => {
              if (!hasSelection) return;
              if (selectedMessages.some((m) => m.id === item.id)) {
                setSelectedMessages((prev) => prev.filter((m) => m.id !== item.id));
              } else {
                setSelectedMessages((prev) => [...prev, item]);
              }
            }}
            onLongPress={() => {
              setSelectedMessages((prev) => {
                if (prev.some((m) => m.id === item.id)) return prev;
                return prev.length === 0 ? [item] : [...prev, item];
              });
            }}
            delayLongPress={400}
          >
            <View
              style={[
                styles.avatarWrap,
                showAvatarAndName
                  ? {
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "transparent",
                      borderColor: colors.borderActive,
                      overflow: "visible",
                    }
                  : styles.avatarWrapSpacer,
              ]}
            >
              {showAvatarAndName ? (
                <View style={styles.messageAvatarWithBadge}>
                  <View style={[styles.messageAvatarInner, { backgroundColor: colors.surface }]}>
                    {resolvedSender?.avatar_url?.trim() ? (
                      <Image
                        source={{ uri: resolvedSender.avatar_url }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.avatarText, { color: colors.primary }]} numberOfLines={1}>
                        {initials}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.messageAvatarStatusDot, { backgroundColor: statusDotColor, borderColor: colors.surface }]} />
                </View>
              ) : null}
            </View>
            <View style={[styles.messageBody, isFromMe && styles.messageBodyFromMe]}>
              {showAvatarAndName ? (
                <View style={styles.messageMeta}>
                  <Text style={[styles.senderName, { color: colors.primary }]} numberOfLines={1}>
                    {senderName}
                  </Text>
                  <Text style={[styles.messageTime, { color: colors.textMuted }]}>
                    {timeAgoDisplay}
                  </Text>
                </View>
              ) : null}
              <View style={isFromMe ? styles.bubbleWrapFromMe : undefined}>
                <View
                  style={[
                    styles.bubble,
                    isFromMe
                      ? { backgroundColor: OUTGOING_BUBBLE_COLOR }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && {
                      opacity: 0.9,
                      backgroundColor: isFromMe ? OUTGOING_BUBBLE_COLOR : colors.border + "50",
                    },
                  ]}
                >
                  {replyPreview ? (
                    <View style={styles.replyPreviewInBubble}>
                      <View style={[styles.replyPreviewBar, { backgroundColor: "#8B5CF6" }]} />
                      <View style={styles.replyPreviewContent}>
                        <Text style={[styles.replyPreviewSender, { color: isFromMe ? "rgba(255,255,255,0.9)" : colors.primary }]} numberOfLines={1}>
                          {replyPreview.senderLabel}
                        </Text>
                        <Text style={[styles.replyPreviewText, { color: isFromMe ? "rgba(255,255,255,0.85)" : colors.textMuted }]} numberOfLines={1}>
                          {replyPreview.content}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {(() => {
                    const imageUrl = item.attachments?.[0]?.url ?? (item.message_type === "image" && item.content?.startsWith("http") ? item.content : null);
                    if (imageUrl) {
                      return (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.bubbleImage}
                          resizeMode="cover"
                        />
                      );
                    }
                    return (
                      <View style={styles.bubbleContentRow}>
                        <Text
                          style={[
                            styles.bubbleText,
                            { color: isFromMe ? "#FFFFFF" : colors.text },
                          ]}
                          numberOfLines={10}
                        >
                          {item.content || "—"}
                        </Text>
                        <View style={styles.bubbleTimeCheckRow}>
                          <Text
                            style={[
                              styles.bubbleTimeInline,
                              { color: isFromMe ? "rgba(255,255,255,0.75)" : colors.textMuted },
                            ]}
                          >
                            {timeWithDateDisplay}
                          </Text>
                          {isFromMe ? (
                            <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.75)" style={styles.bubbleCheck} />
                          ) : null}
                        </View>
                      </View>
                    );
                  })()}
                </View>
                {isFromMe ? <View style={[styles.bubbleTail, { borderLeftColor: OUTGOING_BUBBLE_COLOR }]} /> : null}
              </View>
            </View>
          </Pressable>
          {isSelected ? (
            <TouchableOpacity
              style={styles.messageRowCheckboxWrap}
              onPress={() => setSelectedMessages((prev) => prev.filter((m) => m.id !== item.id))}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Deselect this message"
            >
              <Ionicons name="checkbox" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
        </Swipeable>
      );
    },
    [colors, currentUserId, filteredMessages, getReplyPreview, lastActivityByUserId, selectedMessages, senderMap, statusByUserId, user]
  );

  const keyExtractor = useCallback((item: TeamChatMessage) => item.id, []);

  const ListHeader = useCallback(() => {
    if (!hasNextPage) return null;
    return (
      <TouchableOpacity
        style={[styles.loadOlderWrap, { borderBottomColor: colors.border }]}
        onPress={() => fetchNextPage()}
        disabled={isFetchingNextPage}
      >
        {isFetchingNextPage ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.loadOlderText, { color: colors.primary }]}>
            Load older messages
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, colors]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {searchQuery.trim() ? `No messages match "${searchQuery.trim()}"` : "No messages yet"}
        </Text>
      </View>
    );
  }, [isLoading, colors, searchQuery]);

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <BackArrowIcon color={colors.text} size={26} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {threadTitle ?? "Chat"}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} hitSlop={8}>
              <VideoIcon color={colors.text} size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} hitSlop={8}>
              <PhoneIcon color={colors.text} size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} hitSlop={8}>
              <SearchIcon color={colors.text} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} hitSlop={8}>
              <MoreVerticalIcon color={colors.text} size={22} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Could not load messages.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        {selectedMessages.length <= 1 ? (
          <TouchableOpacity
            onPress={() => (selectedMessages.length > 0 ? setSelectedMessages([]) : onBack())}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <BackArrowIcon color={colors.text} size={26} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        {selectedMessages.length > 0 ? (
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedMessages.length === 1 ? "Message options" : `${selectedMessages.length} messages selected`}
            </Text>
          </View>
        ) : (
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {threadTitle ?? "Chat"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {roomMembers.length} members
              {onlineCount > 0 ? (
                <Text style={{ color: "#22c55e" }}> · {onlineCount} online</Text>
              ) : null}
            </Text>
          </View>
        )}
        <View style={styles.headerActions}>
          {selectedMessages.length > 0 ? (
            <>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => setSelectedMessages([])} hitSlop={8} accessibilityLabel="Reply">
                <Ionicons name="arrow-undo-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => setSelectedMessages([])} hitSlop={8} accessibilityLabel="Favorite">
                <Ionicons name="star-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowDeleteMessageModal(true)} hitSlop={8} accessibilityLabel="Delete">
                <Ionicons name="trash-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => {
                  const first = selectedMessages[0];
                  if (first?.content) {
                    try {
                      const { Clipboard } = require("react-native");
                      if (Clipboard?.setString) {
                        Clipboard.setString(selectedMessages.map((m) => m.content).filter(Boolean).join("\n"));
                      }
                    } catch (_) {}
                    setSelectedMessages([]);
                  }
                }}
                hitSlop={8}
                accessibilityLabel="Copy"
              >
                <Ionicons name="copy-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => setSelectedMessages([])} hitSlop={8} accessibilityLabel="Forward">
                <Ionicons name="arrow-redo-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => setSelectedMessages([])} hitSlop={8} accessibilityLabel="Pin">
                <Ionicons name="pin-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => { }} hitSlop={8}>
                <VideoIcon color={colors.text} size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={() => { }} hitSlop={8}>
                <PhoneIcon color={colors.text} size={22} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => setShowSearchBar((prev) => !prev)}
                hitSlop={8}
                accessibilityLabel={showSearchBar ? "Close search" : "Search in conversation"}
              >
                <SearchIcon color={colors.text} size={20} />
              </TouchableOpacity>
              {headerMemberAvatars.length > 0 && (
                <TouchableOpacity
                  style={styles.headerAvatars}
                  onPress={() => setShowMembersModal(true)}
                  activeOpacity={0.7}
                  accessibilityLabel="View all members"
                >
                  {headerMemberAvatars.map((m, i) => (
                    <View
                      key={m.user_id}
                      style={[
                        styles.headerAvatar,
                        { backgroundColor: colors.background, borderColor: colors.borderActive },
                        i > 0 && styles.headerAvatarOverlap,
                      ]}
                    >
                      {m.user?.avatar_url?.trim() ? (
                        <Image
                          source={{ uri: m.user.avatar_url }}
                          style={styles.headerAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={[styles.headerAvatarText, { color: colors.text }]} numberOfLines={1}>
                          {getMemberInitials(m)}
                        </Text>
                      )}
                    </View>
                  ))}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => setShowMoreMenu(true)}
                hitSlop={8}
              >
                <MoreVerticalIcon color={colors.text} size={22} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search bar — below header, above messages (above footer) */}
      {showSearchBar ? (
        <View
          style={[
            styles.searchBarWrap,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.searchBarIcon}>
            <SearchIcon color={colors.textMuted} size={20} />
          </View>
          <TextInput
            style={[styles.searchBarInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Search messages..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity
            hitSlop={8}
            onPress={() => {
              setShowSearchBar(false);
              setSearchQuery("");
            }}
            style={styles.searchBarClose}
            accessibilityLabel="Close search"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.listWrap}>
        <FlatList
          ref={listRef}
          data={filteredMessages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={[styles.listContent, (filteredMessages.length === 0) && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (filteredMessages.length > 0) listRef.current?.scrollToEnd({ animated: false });
          }}
          refreshControl={
            <AppRefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
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
            <TouchableOpacity
              onPress={() => setShowEmojiModal(false)}
              hitSlop={12}
              style={styles.emojiModalCloseBtn}
            >
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

      {/* Typing indicator above footer — visible to everyone except the typist */}
      {typingUsers.length > 0 ? (
        <View
          style={[
            styles.typingIndicator,
          ]}
        >
          <Text style={[styles.typingIndicatorText, { color: colors.textMuted }]} numberOfLines={1}>
            {typingUsers.length === 1
              ? `${(typingUsers[0].user_name || "Someone").trim() || "Someone"} is typing...`
              : typingUsers.length === 2
                ? `${(typingUsers[0].user_name || "Someone").trim()} and ${(typingUsers[1].user_name || "Someone").trim()} are typing...`
                : `${(typingUsers[0].user_name || "Someone").trim()} and ${typingUsers.length - 1} others are typing...`}
          </Text>
        </View>
      ) : null}

      {replyingTo ? (
        <View style={[styles.replyQuotedRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={[styles.replyQuotedBar, { backgroundColor: "#8B5CF6" }]} />
          <View style={styles.replyQuotedContent}>
            <Text style={[styles.replyQuotedSender, { color: colors.primary }]} numberOfLines={1}>
              {(() => {
                const s = replyingTo.sender ?? senderMap.get(replyingTo.sender_id) ?? null;
                const name = typeof s?.full_name === "string" && s.full_name.trim() ? s.full_name.trim() : null;
                const email = typeof s?.email === "string" && s.email.trim() ? s.email.trim() : null;
                return name || email || "Unknown";
              })()}
            </Text>
            <Text style={[styles.replyQuotedText, { color: colors.textMuted }]} numberOfLines={1}>
              {replyingTo.content?.trim() || "[Message]"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyingTo(null)}
            style={styles.replyQuotedClose}
            hitSlop={12}
            accessibilityLabel="Cancel reply"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
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
          value={inputText}
          onChangeText={(text) => {
            inputValueRef.current = text;
            setInputText(text);
            if (!threadId) return;
            if (typingStopRef.current) {
              clearTimeout(typingStopRef.current);
              typingStopRef.current = null;
            }
            if (typingThrottleRef.current) return;
            sendTeamChatTyping(threadId, true);
            typingThrottleRef.current = setTimeout(() => {
              typingThrottleRef.current = null;
            }, TYPING_THROTTLE_MS);
            typingStopRef.current = setTimeout(() => {
              sendTeamChatTyping(threadId, false);
              typingStopRef.current = null;
            }, TYPING_DEBOUNCE_MS);
          }}
          onFocus={() => setShowEmojiModal(false)}
          multiline
          maxLength={2000}
          editable={!isSending}
        />
        <View style={styles.footerIcons}>
          <TouchableOpacity
            style={styles.footerIconBtn}
            onPress={handleAttachmentPress}
            disabled={isUploading || isSending}
            hitSlop={8}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <PaperclipIcon color={colors.textMuted} size={22} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerIconBtn}
            onPress={() => setShowEmojiModal(true)}
            hitSlop={8}
          >
            <EmojiIcon color={colors.textMuted} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerIconBtn} onPress={() => { }} hitSlop={8}>
            <Text style={[styles.atmention, { color: colors.textMuted }]}>
              @
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor: colors.primary,
              opacity: inputText.trim() && !isSending ? 1 : 0.6,
            },
          ]}
          onPress={onSend}
          disabled={!inputText.trim() || isSending}
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
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.moreMenuItem,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.border },
              ]}
              onPress={() => setShowMoreMenu(false)}
            >
              <Ionicons name="share-outline" size={22} color={colors.text} />
              <Text style={[styles.moreMenuLabel, { color: colors.text }]}>Share Contact</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.moreMenuItem,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.border },
              ]}
              onPress={() => setShowMoreMenu(false)}
            >
              <Ionicons name="document-text-outline" size={22} color={colors.text} />
              <Text style={[styles.moreMenuLabel, { color: colors.text }]}>Share Report</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.moreMenuItem,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.border },
              ]}
              onPress={() => setShowMoreMenu(false)}
            >
              <Ionicons name="person-add-outline" size={22} color={colors.text} />
              <Text style={[styles.moreMenuLabel, { color: colors.text }]}>Add Members</Text>
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
            <Pressable
              style={({ pressed }) => [
                styles.moreMenuItem,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.border },
              ]}
              onPress={() => setShowMoreMenu(false)}
            >
              <Ionicons name="settings-outline" size={22} color={colors.text} />
              <Text style={[styles.moreMenuLabel, { color: colors.text }]}>Room Settings</Text>
            </Pressable>
            <View style={[styles.moreMenuSeparator, { backgroundColor: colors.border }]} />
            <Pressable
              style={({ pressed }) => [
                styles.moreMenuItem,
                pressed && { backgroundColor: `${colors.destructive}20` },
              ]}
              onPress={() => setShowMoreMenu(false)}
            >
              <Ionicons name="archive-outline" size={22} color={colors.destructive} />
              <Text style={[styles.moreMenuLabel, { color: colors.destructive }]}>Archive Room</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.moreMenuItem,
                pressed && { backgroundColor: `${colors.destructive}20` },
              ]}
              onPress={() => setShowMoreMenu(false)}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
              <Text style={[styles.moreMenuLabel, { color: colors.destructive }]}>Leave Room</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Members modal — same as web: list with avatar, status dot, name, email */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.membersModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowMembersModal(false)}
          />
          <View
            style={[
              styles.membersModalCard,
              {
                backgroundColor: colors.sheet,
                borderColor: colors.border,
                paddingTop: insets.top + spacing.md,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <View style={[styles.membersModalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.membersModalTitleRow}>
                <Ionicons name="people-outline" size={22} color={colors.text} />
                <Text style={[styles.membersModalTitle, { color: colors.text }]}>
                  Members — {threadTitle ?? "Channel"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMembersModal(false)}
                hitSlop={12}
                style={styles.membersModalCloseBtn}
              >
                <Text style={[styles.membersModalCloseText, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.membersModalScroll}
              contentContainerStyle={styles.membersModalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {roomMembers.map((member) => {
                const isCurrentUser = currentUserId && String(member.user_id) === currentUserId;
                const status = isCurrentUser
                  ? "online"
                  : (member.status === "online" || member.status === "away" || member.status === "offline"
                    ? member.status
                    : deriveStatusFromLastActivity(member.last_activity_at ?? null));
                const statusStyle =
                  status === "online"
                    ? { backgroundColor: "#22c55e" }
                    : status === "away"
                      ? { backgroundColor: "#eab308" }
                      : { backgroundColor: "#ef4444" };
                const statusLabel = status === "online" ? "Online" : status === "away" ? "Idle" : "Offline";
                return (
                  <View
                    key={member.user_id}
                    style={[
                      styles.membersModalRow,
                      { backgroundColor: colors.background + "80", borderColor: colors.border + "80" },
                    ]}
                  >
                    <View style={styles.membersModalAvatarWrap}>
                      <View style={styles.membersModalAvatarInner}>
                        {member.user?.avatar_url?.trim() ? (
                          <Image
                            source={{ uri: member.user.avatar_url }}
                            style={styles.membersModalAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.membersModalAvatarFallback, { backgroundColor: colors.primary }]}>
                            <Text style={styles.membersModalAvatarText}>
                              {getMemberInitials(member)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.membersModalStatusDot, statusStyle, { borderColor: colors.sheet }]} />
                    </View>
                    <View style={styles.membersModalMemberInfo}>
                      <Text style={[styles.membersModalMemberName, { color: colors.text }]} numberOfLines={1}>
                        {(typeof member.user?.full_name === "string" && member.user.full_name.trim()
                          ? member.user.full_name.trim()
                          : typeof member.user?.email === "string" && member.user.email.trim()
                            ? member.user.email.trim()
                            : "Unknown")}
                      </Text>
                      {member.user?.email ? (
                        <Text style={[styles.membersModalMemberEmail, { color: colors.textMuted }]} numberOfLines={1}>
                          {member.user.email}
                        </Text>
                      ) : null}
                      <Text style={[styles.membersModalStatusLabel, { color: colors.textMuted }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteMessageModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeletingMessage && setShowDeleteMessageModal(false)}
      >
        <Pressable
          style={[styles.deleteModalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={() => !isDeletingMessage && setShowDeleteMessageModal(false)}
        >
          <Pressable style={[styles.deleteModalCard, { backgroundColor: colors.sheet }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>
              {selectedMessages.length === 1 ? "Delete message?" : `Delete ${selectedMessages.length} messages?`}
            </Text>
            <Text style={[styles.deleteModalMessage, { color: colors.textMuted }]}>
              {selectedMessages.length === 1
                ? "This message will be removed from the conversation."
                : "These messages will be removed from the conversation."}
            </Text>
            <View style={[styles.deleteModalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={styles.deleteModalBtn}
                onPress={() => !isDeletingMessage && setShowDeleteMessageModal(false)}
                disabled={isDeletingMessage}
              >
                <Text style={[styles.deleteModalCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalBtn}
                onPress={async () => {
                  if (selectedMessages.length === 0 || !threadId || isDeletingMessage) return;
                  setIsDeletingMessage(true);
                  try {
                    for (const msg of selectedMessages) {
                      await deleteTeamChatMessage(threadId, msg.id);
                    }
                    queryClient.invalidateQueries({ queryKey: queryKeys.teamChatMessages.list(threadId) });
                    setSelectedMessages([]);
                    setShowDeleteMessageModal(false);
                  } catch (e) {
                    Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete message(s)");
                  } finally {
                    setIsDeletingMessage(false);
                  }
                }}
                disabled={isDeletingMessage}
              >
                {isDeletingMessage ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.deleteModalOkText, { color: colors.primary }]}>OK</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerTitleWrap: { flex: 1, minWidth: 0, marginRight: spacing.sm, justifyContent: "center" },
  headerTitle: { ...typography.titleMd },
  headerSubtitle: { ...typography.caption, marginTop: 2 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerActionBtn: { padding: spacing.xs },
  headerAvatars: { flexDirection: "row", alignItems: "center", marginLeft: spacing.xs },
  atmention : {fontSize: 18, marginBottom: 7, fontWeight: "600"},
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  headerAvatarOverlap: { marginLeft: -8 },
  headerAvatarText: { ...typography.caption, fontWeight: "600" },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  searchBarIcon: {},
  searchBarInput: {
    flex: 1,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  searchBarClose: { padding: spacing.xs },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  listContentEmpty: { flex: 1 },
  loadOlderWrap: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  loadOlderText: { ...typography.bodySm },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  messageRowPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  messageRowSelected: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  messageRowCompact: {
    marginBottom: spacing.xs,
  },
  messageRowCheckboxWrap: {
    paddingLeft: spacing.sm,
    paddingTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeReplyAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 56,
    paddingLeft: spacing.sm,
  },
  replyPreviewInBubble: {
    flexDirection: "row",
    marginBottom: spacing.xs,
    minHeight: 36,
    backgroundColor: "rgba(151, 154, 156, 0.3)",
    borderRadius: 4,
  },
  replyPreviewBar: {
    width: 3,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    marginRight: spacing.sm,
  },
  replyPreviewContent: { flex: 1, minWidth: 0 },
  replyPreviewSender: { ...typography.caption, fontWeight: "600", marginBottom: 1 },
  replyPreviewText: { ...typography.caption, opacity: 0.9 },
  replyQuotedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyQuotedBar: {
    width: 5,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    marginRight: spacing.sm,
    alignSelf: "stretch",
  },
  replyQuotedContent: { flex: 1, minWidth: 0 },
  replyQuotedSender: { ...typography.label, fontWeight: "600", marginBottom: 2 },
  replyQuotedText: { ...typography.caption },
  replyQuotedClose: { padding: spacing.xs },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarWrapSpacer: {
    width: 48,
    height: 40,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  messageAvatarWithBadge: {
    position: "relative",
    width: 40,
    height: 40,
  },
  messageAvatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  messageAvatarStatusDot: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  avatarText: { ...typography.titleSm, fontWeight: "600" },
  messageBody: { flex: 1, minWidth: 0 },
  messageBodyFromMe: { alignItems: "flex-start" },
  bubbleWrapFromMe: {
    alignSelf: "flex-start",
    position: "relative",
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleContentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  bubbleTimeCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bubbleTail: {
    position: "absolute",
    bottom: 10,
    right: -8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  bubbleCheck: { marginLeft: 2 },
  bubbleText: { ...typography.body, flexShrink: 1 },
  bubbleImage: { width: 200, height: 200, borderRadius: radius.sm, maxWidth: "100%" },
  bubbleTimeInline: { ...typography.caption },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  senderName: { ...typography.label, flex: 1 },
  messageTime: { ...typography.caption },
  emptyWrap: { paddingVertical: spacing["2xl"], alignItems: "center" },
  emptyText: { ...typography.body },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  errorText: { ...typography.body },
  typingIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  typingIndicatorText: { ...typography.caption },
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
    minHeight: 44,
    maxHeight: 100,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  footerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  footerIconBtn: { padding: spacing.xs },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    minHeight: 44,
  },
  sendBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
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
  moreMenuOverlay: {
    flex: 1,
  },
  moreMenuCard: {
    position: "absolute",
    right: spacing.md,
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
  moreMenuItemHighlight: {
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  moreMenuSeparator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
  },
  moreMenuLabel: { ...typography.body, flex: 1 },
  membersModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: spacing.lg,
  },
  membersModalCard: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  membersModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  membersModalTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  membersModalTitle: { ...typography.titleSm, fontWeight: "600", flex: 1 },
  membersModalCloseBtn: { padding: spacing.xs },
  membersModalCloseText: { ...typography.label, fontWeight: "600" },
  membersModalScroll: { maxHeight: 400 },
  membersModalScrollContent: { padding: spacing.md, gap: spacing.sm },
  membersModalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  membersModalAvatarWrap: {
    position: "relative",
    width: 40,
    height: 40,
  },
  membersModalAvatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  membersModalAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  membersModalAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  membersModalAvatarText: { ...typography.titleSm, color: "#FFFFFF", fontWeight: "600" },
  membersModalStatusDot: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "transparent",
  },
  membersModalMemberInfo: { flex: 1, minWidth: 0 },
  membersModalMemberName: { ...typography.bodySm, fontWeight: "600" },
  membersModalMemberEmail: { ...typography.caption },
  membersModalStatusLabel: { ...typography.caption, marginTop: 2 },
  deleteModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  deleteModalTitle: { ...typography.titleSm, fontWeight: "600", marginBottom: spacing.xs },
  deleteModalMessage: { ...typography.bodySm, marginBottom: spacing.lg },
  deleteModalActions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  deleteModalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteModalCancelText: { ...typography.label },
  deleteModalOkText: { ...typography.label, fontWeight: "600" },
});
