import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../../theme/ThemeProvider";
import { useCalls } from "../../providers/CallsProvider";
import { useRootNavigationRef } from "../../navigation/RootNavigationRefContext";
import { spacing, typography, radius } from "../../theme/tokens";
import type { MoreStackParamList } from "../../navigation/MoreStack";

type Props = NativeStackScreenProps<MoreStackParamList, "Dialer">;

export function DialerScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { startCall } = useCalls();
  const [destination, setDestination] = useState("");
  const rootRef = useRootNavigationRef();

  const handleCall = () => {
    rootRef?.current?.navigate("Call");
    startCall(destination.trim() || undefined);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 10 },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Dialer</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.borderSubtle,
            color: colors.text,
          },
        ]}
        placeholder="Number or address"
        placeholderTextColor={colors.textMuted}
        value={destination}
        onChangeText={setDestination}
        keyboardType="phone-pad"
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleCall}
      >
        <Text style={styles.buttonText}>Start call</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl },
  title: { ...typography.displayMd, marginBottom: spacing.xl },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.lg,
    ...typography.body,
    marginBottom: spacing.lg,
  },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  buttonText: { color: "#fff", ...typography.titleSm },
});
