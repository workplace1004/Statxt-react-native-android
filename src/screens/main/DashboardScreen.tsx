import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography } from "../../theme/tokens";
import { AppRefreshControl } from "../../components/AppRefreshControl";

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Welcome to Statxt
        </Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Overview</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Your campaigns and analytics will appear here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  title: { ...typography.displayMd, marginBottom: spacing.xs },
  subtitle: { ...typography.body },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  card: {
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardTitle: { ...typography.titleMd, marginBottom: spacing.sm },
  cardBody: { ...typography.body },
});
