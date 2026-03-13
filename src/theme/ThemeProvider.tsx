import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type ThemeColors } from "./tokens";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColorKey = "mint" | "blue" | "purple" | "red" | "orange" | "yellow";
export type DensityKey = "compact" | "default" | "comfortable";

export const ACCENT_COLORS: Record<AccentColorKey, string> = {
  mint: "#10B981",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  red: "#EF4444",
  orange: "#F97316",
  yellow: "#EAB308",
};

const STORAGE_KEYS = {
  theme: "statxt.theme.mode",
  accent: "statxt.theme.accent",
  density: "statxt.theme.density",
} as const;

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  accentColor: AccentColorKey;
  setAccentColor: (key: AccentColorKey) => void;
  density: DensityKey;
  setDensity: (key: DensityKey) => void;
  colors: ThemeColors;
  /** Resolved theme for colors (light/dark); when theme is "system", follows OS. */
  resolvedTheme: "light" | "dark";
}

const defaultValue: ThemeContextValue = {
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
  accentColor: "mint",
  setAccentColor: () => {},
  density: "default",
  setDensity: () => {},
  colors: darkColors,
  resolvedTheme: "dark",
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

function applyAccent(base: ThemeColors, accentHex: string): ThemeColors {
  return {
    ...base,
    primary: accentHex,
    primaryGlow: `${accentHex}33`,
    primaryGlowStrong: `${accentHex}66`,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [accentColor, setAccentColorState] = useState<AccentColorKey>("mint");
  const [density, setDensityState] = useState<DensityKey>("default");

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEYS.theme, STORAGE_KEYS.accent, STORAGE_KEYS.density]).then(
      ([[, themeVal], [, accentVal], [, densityVal]]) => {
        if (themeVal === "light" || themeVal === "dark" || themeVal === "system") setThemeState(themeVal);
        if (accentVal && accentVal in ACCENT_COLORS) setAccentColorState(accentVal as AccentColorKey);
        if (densityVal === "compact" || densityVal === "default" || densityVal === "comfortable")
          setDensityState(densityVal);
      }
    ).catch(() => {});
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem(STORAGE_KEYS.theme, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEYS.theme, next).catch(() => {});
      return next;
    });
  }, []);

  const setAccentColor = useCallback((key: AccentColorKey) => {
    setAccentColorState(key);
    AsyncStorage.setItem(STORAGE_KEYS.accent, key).catch(() => {});
  }, []);

  const setDensity = useCallback((key: DensityKey) => {
    setDensityState(key);
    AsyncStorage.setItem(STORAGE_KEYS.density, key).catch(() => {});
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemScheme ?? "light") : theme;

  const baseColors = resolvedTheme === "dark" ? darkColors : lightColors;
  const accentHex = ACCENT_COLORS[accentColor];
  const colors = useMemo(
    () => applyAccent(baseColors, accentHex),
    [resolvedTheme, accentColor]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      accentColor,
      setAccentColor,
      density,
      setDensity,
      colors,
      resolvedTheme,
    }),
    [theme, setTheme, toggleTheme, accentColor, setAccentColor, density, setDensity, colors, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx ?? defaultValue;
}
