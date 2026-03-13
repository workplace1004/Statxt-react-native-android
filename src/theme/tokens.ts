/**
 * Design Tokens - Statxt Android
 * Spacing: 4/8/12/16/20/24/32. Radii: 6/10/14/20. Surfaces: background → glass → elevated.
 */

const hexToRgba = (hex: string, alpha: number) => {
  const n = hex.replace("#", "").trim();
  if (n.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
};

const palette = {
  primary: "#10B981",
  primaryLight: "#34D399",
  primaryDark: "#059669",
  success: "#22C55E",
  destructive: "#EF4444",
  warning: "#F59E0B",
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

export const darkColors = {
  ...palette,
  background: "#0C1222",
  sheet: "#111827",
  backdrop: "rgba(0,0,0,0.65)",
  surface: "rgba(30,41,59,0.5)",
  surfaceSubtle: "rgba(30,41,59,0.28)",
  surfaceElevated: "rgba(51,65,85,0.6)",
  border: "rgba(255,255,255,0.1)",
  borderActive: "rgba(255,255,255,0.18)",
  borderSubtle: "rgba(255,255,255,0.06)",
  text: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  primaryGlow: hexToRgba(palette.primary, 0.2),
  primaryGlowStrong: hexToRgba(palette.primary, 0.4),
  successGlow: "rgba(34,197,94,0.2)",
  destructiveGlow: "rgba(239,68,68,0.2)",
};

export const lightColors = {
  ...palette,
  background: "#F8FAFC",
  sheet: "#FFFFFF",
  backdrop: "rgba(0,0,0,0.4)",
  surface: "rgba(255,255,255,1)",
  surfaceSubtle: "rgba(255,255,255,0.45)",
  surfaceElevated: "rgba(255,255,255,0.85)",
  border: "rgba(0,0,0,0.08)",
  borderActive: "rgba(0,0,0,0.16)",
  borderSubtle: "rgba(0,0,0,0.04)",
  text: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#475569",
  textDim: "#64748B",
  primaryGlow: hexToRgba(palette.primary, 0.12),
  primaryGlowStrong: hexToRgba(palette.primary, 0.22),
  successGlow: "rgba(34,197,94,0.1)",
  destructiveGlow: "rgba(239,68,68,0.1)",
};

export type ThemeColors = typeof darkColors;

export const typography = {
  displayLg: { fontSize: 32, lineHeight: 40, letterSpacing: -0.5, fontWeight: "700" as const },
  displayMd: { fontSize: 24, lineHeight: 32, letterSpacing: -0.3, fontWeight: "700" as const },
  titleLg: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  titleMd: { fontSize: 17, lineHeight: 24, fontWeight: "600" as const },
  titleSm: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  caption: { fontSize: 11, lineHeight: 14, letterSpacing: 0.3, fontWeight: "500" as const },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: "500" as const },
};

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
  "5xl": 64,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;
