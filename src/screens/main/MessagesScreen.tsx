import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";

export function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your conversations will appear here
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  title: { ...typography.displayMd, marginBottom: spacing.xs },
  subtitle: { ...typography.body },
});
