import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useCalls } from "../../providers/CallsProvider";
import { useRootNavigationRef } from "../../navigation/RootNavigationRefContext";
import { spacing, typography, radius } from "../../theme/tokens";

export function CallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { callState, endCall } = useCalls();
  const rootRef = useRootNavigationRef();

  const handleEndCall = () => {
    endCall();
    rootRef?.current?.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 10 },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {callState === "connecting"
          ? "Connecting…"
          : callState === "active"
            ? "Call in progress"
            : "Call"}
      </Text>
      <TouchableOpacity
        style={[styles.endButton, { backgroundColor: colors.destructive }]}
        onPress={handleEndCall}
      >
        <Text style={styles.endButtonText}>End call</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { ...typography.displayMd, marginBottom: spacing["2xl"] },
  endButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing["2xl"],
    borderRadius: radius.lg,
  },
  endButtonText: { color: "#fff", ...typography.titleSm },
});
