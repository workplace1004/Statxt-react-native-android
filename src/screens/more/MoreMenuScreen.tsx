import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import type { MoreStackParamList } from "../../navigation/MoreStack";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreMenu">;

export function MoreMenuScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 10 },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>More</Text>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
        onPress={() => navigation.navigate("Dialer")}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>Dialer</Text>
        <Text style={[styles.chevron, { color: colors.textDim }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl },
  title: { ...typography.displayMd, marginBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  rowText: { ...typography.titleSm, flex: 1 },
  chevron: { fontSize: 24 },
});
