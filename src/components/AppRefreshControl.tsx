/**
 * Shared pull-to-refresh control with a consistent, professional spinner style.
 * - iOS: primary tint, clean native spinner
 * - Android: large spinner, transparent track (no gray circle), primary + primaryLight for a subtle gradient arc
 */

import React from "react";
import { Platform, RefreshControl, type RefreshControlProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type AppRefreshControlProps = Omit<RefreshControlProps, "colors" | "tintColor" | "progressBackgroundColor" | "size"> & {
  /** Override theme primary for spinner color */
  accentColor?: string;
};

export function AppRefreshControl({
  accentColor,
  ...rest
}: AppRefreshControlProps) {
  const { colors } = useTheme();
  const primary = accentColor ?? colors.primary;
  const primaryLight = "primaryLight" in colors && typeof (colors as { primaryLight?: string }).primaryLight === "string"
    ? (colors as { primaryLight: string }).primaryLight
    : primary;
  const spinnerColors = [primary, primaryLight];

  return (
    <RefreshControl
      {...rest}
      tintColor={primary}
      colors={Platform.OS === "android" ? spinnerColors : [primary]}
      progressBackgroundColor={Platform.OS === "android" ? "transparent" : undefined}
      size={Platform.OS === "android" ? "large" : undefined}
    />
  );
}
