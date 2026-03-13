import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

export function InternalChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <Text style={[styles.title, { color: colors.text }]}>Internal Chat</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { ...typography.displayMd, padding: spacing.lg },
});
