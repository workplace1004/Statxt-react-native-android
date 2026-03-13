import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Line, G, Defs, ClipPath, Rect } from "react-native-svg";
import Constants from "expo-constants";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, typography, radius } from "../../theme/tokens";
import { config } from "../../config";
import type { SettingsStackParamList } from "../../navigation/SettingsStack";

type Props = NativeStackScreenProps<SettingsStackParamList, "SettingsMain">;

function getInitials(name: string | undefined, email: string | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) return email.slice(0, 2).toUpperCase();
  return "?";
}

const rowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: radius.md,
  borderWidth: 1,
  marginBottom: spacing.sm,
  gap: spacing.md,
};

/** Edit / pencil icon (profile card). */
function EditProfileIcon({ size = 22, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.4745 5.40801L18.5917 7.52524M17.8358 3.54289L12.1086 9.27005C11.8131 9.56562 11.6116 9.94206 11.5296 10.3519L11 13L13.6481 12.4704C14.0579 12.3884 14.4344 12.1869 14.7299 11.8914L20.4571 6.16423C21.181 5.44037 21.181 4.26676 20.4571 3.5429C19.7332 2.81904 18.5596 2.81903 17.8358 3.54289Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 15V18C19 19.1046 18.1046 20 17 20H6C4.89543 20 4 19.1046 4 18V7C4 5.89543 4.89543 5 6 5H9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Sun icon for light mode (APPEARANCE). Path uses offset coords; viewBox applies equivalent of translate(-924,-192). */
function SunIcon({ size = 26, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="924 192 24 24" fill="none">
      <Path
        fillRule="evenodd"
        fill={color}
        d="M947,205h-2a1,1,0,0,1,0-2h2A1,1,0,0,1,947,205Zm-4.506-7.248a0.881,0.881,0,0,1-1.246-1.246l1.246-1.245a0.88,0.88,0,1,1,1.245,1.245ZM936,209a5,5,0,1,1,5-5A5,5,0,0,1,936,209Zm0-8a3,3,0,1,0,3,3A3,3,0,0,0,936,201Zm0-5a1,1,0,0,1-1-1v-2a1,1,0,0,1,2,0v2A1,1,0,0,1,936,196Zm-7.494,16.739a0.88,0.88,0,1,1-1.245-1.245l1.245-1.246a0.881,0.881,0,0,1,1.246,1.246Zm0-14.987-1.245-1.246a0.88,0.88,0,1,1,1.245-1.245l1.246,1.245A0.881,0.881,0,0,1,928.506,197.752ZM928,204a1,1,0,0,1-1,1h-2a1,1,0,0,1,0-2h2A1,1,0,0,1,928,204Zm8,8a1,1,0,0,1,1,1v2a1,1,0,0,1-2,0v-2A1,1,0,0,1,936,212Zm7.494-1.752,1.245,1.246a0.88,0.88,0,1,1-1.245,1.245l-1.246-1.245A0.881,0.881,0,0,1,943.494,210.248Z"
      />
    </Svg>
  );
}

/** Privacy shield icon (PRIVACY & SECURITY) */
function PrivacyIcon({ size = 26, color = "#F38E7A" }: { size?: number; color?: string }) {
  const highlight = color + "4D"; // ~30% opacity for inner/white parts
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        fill={color}
        d="M48.7,13.36l-15.73-5.2c-0.63-0.21-1.31-0.21-1.93,0l-15.73,5.2c-1.26,0.42-2.11,1.6-2.11,2.92v19.6c0,4.1,1.89,7.98,5.12,10.51l11.16,8.73c1.49,1.16,3.57,1.16,5.06,0l11.16-8.73c3.23-2.53,5.12-6.41,5.12-10.51v-19.6C50.81,14.96,49.96,13.78,48.7,13.36z"
      />
      <Path fill={color} d="M32,12.05L17.19,16.95L17.19,31.02L32,31.02Z" />
      <Path fill={highlight} d="M46.81,31.02L46.81,16.95L32,12.05L32,31.02Z" />
      <Path
        fill={highlight}
        d="M17.19,31.02v4.86c0,2.89,1.31,5.58,3.59,7.36l11.16,8.73C31.94,51.98,31.96,52,32,52V31.02H17.19z"
      />
      <Path
        fill={color}
        d="M32,31.02V52l0.06-0.02l11.16-8.73c2.28-1.78,3.59-4.47,3.59-7.36v-4.86H32z"
      />
    </Svg>
  );
}

/** Moon with stars icon for dark mode (APPEARANCE) */
function MoonIcon({ size = 22, color = "#363853" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.3986 7.64605C13.495 7.37724 13.88 7.37724 13.9764 7.64605L14.2401 8.38111C14.271 8.46715 14.3395 8.53484 14.4266 8.56533L15.1709 8.82579C15.443 8.92103 15.443 9.30119 15.1709 9.39644L14.4266 9.65689C14.3395 9.68738 14.271 9.75507 14.2401 9.84112L13.9764 10.5762C13.88 10.845 13.495 10.845 13.3986 10.5762L13.1349 9.84112C13.104 9.75507 13.0355 9.68738 12.9484 9.65689L12.2041 9.39644C11.932 9.30119 11.932 8.92103 12.2041 8.82579L12.9484 8.56533C13.0355 8.53484 13.104 8.46715 13.1349 8.38111L13.3986 7.64605Z"
        fill={color}
      />
      <Path
        d="M16.3074 10.9122C16.3717 10.733 16.6283 10.733 16.6926 10.9122L16.8684 11.4022C16.889 11.4596 16.9347 11.5047 16.9928 11.525L17.4889 11.6987C17.6704 11.7622 17.6704 12.0156 17.4889 12.0791L16.9928 12.2527C16.9347 12.2731 16.889 12.3182 16.8684 12.3756L16.6926 12.8656C16.6283 13.0448 16.3717 13.0448 16.3074 12.8656L16.1316 12.3756C16.111 12.3182 16.0653 12.2731 16.0072 12.2527L15.5111 12.0791C15.3296 12.0156 15.3296 11.7622 15.5111 11.6987L16.0072 11.525C16.0653 11.5047 16.111 11.4596 16.1316 11.4022L16.3074 10.9122Z"
        fill={color}
      />
      <Path
        d="M17.7693 3.29184C17.9089 2.90272 18.4661 2.90272 18.6057 3.29184L19.0842 4.62551C19.1288 4.75006 19.2281 4.84805 19.3542 4.89219L20.7045 5.36475C21.0985 5.50263 21.0985 6.05293 20.7045 6.19081L19.3542 6.66337C19.2281 6.7075 19.1288 6.80549 19.0842 6.93005L18.6057 8.26372C18.4661 8.65284 17.9089 8.65284 17.7693 8.26372L17.2908 6.93005C17.2462 6.80549 17.1469 6.7075 17.0208 6.66337L15.6705 6.19081C15.2765 6.05293 15.2765 5.50263 15.6705 5.36475L17.0208 4.89219C17.1469 4.84805 17.2462 4.75006 17.2908 4.62551L17.7693 3.29184Z"
        fill={color}
      />
      <Path
        d="M3 13.4597C3 17.6241 6.4742 21 10.7598 21C14.0591 21 16.8774 18.9993 18 16.1783C17.1109 16.5841 16.1181 16.8109 15.0709 16.8109C11.2614 16.8109 8.17323 13.8101 8.17323 10.1084C8.17323 8.56025 8.71338 7.13471 9.62054 6C5.87502 6.5355 3 9.67132 3 13.4597Z"
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Security shield with checkmark icon (used for Privacy row) */
function SecurityIcon({ size = 26, color }: { size?: number; color?: string }) {
  const c = color ?? "#000";
  return (
    <Svg width={size} height={size} viewBox="0 0 214.27 214.27" fill="none">
      <Path
        fill={c}
        d="M196.926,55.171c-0.11-5.785-0.215-11.25-0.215-16.537c0-4.142-3.357-7.5-7.5-7.5c-32.075,0-56.496-9.218-76.852-29.01c-2.912-2.832-7.546-2.831-10.457,0c-20.354,19.792-44.771,29.01-76.844,29.01c-4.142,0-7.5,3.358-7.5,7.5c0,5.288-0.104,10.755-0.215,16.541c-1.028,53.836-2.436,127.567,87.331,158.682c0.796,0.276,1.626,0.414,2.456,0.414c0.83,0,1.661-0.138,2.456-0.414C199.36,182.741,197.954,109.008,196.926,55.171z M107.131,198.812c-76.987-27.967-75.823-89.232-74.79-143.351c0.062-3.248,0.122-6.396,0.164-9.482c30.04-1.268,54.062-10.371,74.626-28.285c20.566,17.914,44.592,27.018,74.634,28.285c0.042,3.085,0.102,6.231,0.164,9.477C182.961,109.577,184.124,170.844,107.131,198.812z"
      />
      <Path
        fill={c}
        d="M132.958,81.082l-36.199,36.197l-15.447-15.447c-2.929-2.928-7.678-2.928-10.606,0c-2.929,2.93-2.929,7.678,0,10.607l20.75,20.75c1.464,1.464,3.384,2.196,5.303,2.196c1.919,0,3.839-0.732,5.303-2.196l41.501-41.5c2.93-2.929,2.93-7.678,0.001-10.606C140.636,78.154,135.887,78.153,132.958,81.082z"
      />
    </Svg>
  );
}

/** Help Center icon (SUPPORT) - circled question mark */
function HelpCenterIcon({ size = 22, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 17 17" fill="none">
      <Path
        fill={color}
        d="M8.5 0c-4.687 0-8.5 3.813-8.5 8.5s3.813 8.5 8.5 8.5 8.5-3.813 8.5-8.5-3.813-8.5-8.5-8.5zM8.5 16c-4.136 0-7.5-3.364-7.5-7.5s3.364-7.5 7.5-7.5 7.5 3.364 7.5 7.5-3.364 7.5-7.5 7.5zM9.658 12.219c0 0.568-0.462 1.031-1.031 1.031-0.571 0-1.033-0.463-1.033-1.031 0-0.57 0.462-1.032 1.033-1.032 0.569 0 1.031 0.461 1.031 1.032zM10.662 4.215c0.448 0.565 0.674 1.328 0.55 1.855-0.243 1.027-0.842 1.567-1.371 2.043-0.543 0.489-0.934 0.84-0.934 1.647h-1c0-1.251 0.671-1.856 1.264-2.39 0.461-0.415 0.896-0.807 1.066-1.529 0.034-0.143-0.039-0.6-0.36-1.005-0.307-0.389-0.728-0.586-1.248-0.586-1.779 0-1.869 1.444-1.873 1.609l-1-0.027c0.024-0.893 0.655-2.582 2.873-2.582 0.818 0 1.539 0.343 2.033 0.965z"
      />
    </Svg>
  );
}

/** Contact Support icon (SUPPORT) - envelope/mail */
function ContactSupportIcon({ size = 22, color = "#0c2c67" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 -12 66.417 66.417" fill="none">
      <Path
        fill={color}
        d="M330.538,933.924h0v-.017c0-.029-.007-.057-.009-.086a1.353,1.353,0,0,0-.02-.2,1.279,1.279,0,0,0-.04-.138,1.467,1.467,0,0,0-.044-.143,1.555,1.555,0,0,0-.09-.172c-.015-.027-.026-.057-.044-.084l0-.006a1.815,1.815,0,0,0-.386-.394l-.023-.02a1.569,1.569,0,0,0-.166-.089c-.031-.016-.06-.036-.092-.05a1.721,1.721,0,0,0-.189-.059,1.422,1.422,0,0,0-.16-.034,1.529,1.529,0,0,0-.223-.023H265.612a1.529,1.529,0,0,0-.224.023,1.408,1.408,0,0,0-.159.034,1.811,1.811,0,0,0-.19.059c-.032.014-.06.034-.091.05a1.473,1.473,0,0,0-.166.089l-.023.02a1.43,1.43,0,0,0-.255.232,1.461,1.461,0,0,0-.132.162l-.005.006c-.018.027-.028.057-.044.084a1.394,1.394,0,0,0-.089.172,1.474,1.474,0,0,0-.045.143c-.013.046-.03.09-.039.138a1.5,1.5,0,0,0-.021.2c0,.029-.008.057-.008.086v.017h0v39.414a1.559,1.559,0,0,0,.02.192c0,.034.005.07.012.1.011.05.03.1.046.148a1.232,1.232,0,0,0,.044.134,1.026,1.026,0,0,0,.053.1,1.518,1.518,0,0,0,.092.163l.008.014c.012.016.027.027.039.043a1.422,1.422,0,0,0,.178.194c.028.026.058.049.088.073a1.49,1.49,0,0,0,.183.122c.033.019.065.038.1.054a1.546,1.546,0,0,0,.225.082c.028.008.055.019.083.026a1.542,1.542,0,0,0,.329.038h63.417a1.533,1.533,0,0,0,.328-.038c.029-.007.056-.018.084-.026a1.546,1.546,0,0,0,.225-.082c.034-.016.066-.036.1-.054a1.593,1.593,0,0,0,.182-.121c.031-.024.061-.048.09-.075a1.4,1.4,0,0,0,.176-.193c.012-.016.028-.026.039-.043l.008-.014a1.374,1.374,0,0,0,.093-.163c.017-.032.038-.064.053-.1s.029-.089.044-.134.035-.1.046-.148c.007-.033.007-.069.012-.1a1.388,1.388,0,0,0,.019-.192l0-.017Zm-63.417,2.763,24.66,16.214-24.66,17.515Zm30.209,16.272-26.7-17.553h53.4Zm-2.859,1.71,2.034,1.338a1.5,1.5,0,0,0,1.649,0l2.034-1.337,24.148,17.151H270.323Zm8.407-1.768,24.66-16.214v33.729Z"
        transform="translate(-264.121 -932.406)"
      />
    </Svg>
  );
}

/** Terms of Service icon (SUPPORT) - document/writing */
function TermsOfServiceIcon({ size = 22, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path fill={color} d="M11.8418,20.4248l29.042-0.0034c0.5522,0,1-0.4478,1-1s-0.4478-1-1-1l-29.042,0.0034c-0.5522,0-1,0.4478-1,1 S11.2896,20.4248,11.8418,20.4248z" />
      <Path fill={color} d="M33.7593,25.8887H11.8418c-0.5522,0-1,0.4478-1,1s0.4478,1,1,1h21.9175c0.5522,0,1-0.4478,1-1 S34.3115,25.8887,33.7593,25.8887z" />
      <Path fill={color} d="M33.7593,33.1934H11.8418c-0.5522,0-1,0.4478-1,1s0.4478,1,1,1h21.9175c0.5522,0,1-0.4478,1-1 S34.3115,33.1934,33.7593,33.1934z" />
      <Path fill={color} d="M33.7763,40.5015H11.8418c-0.5522,0-1,0.4478-1,1s0.4478,1,1,1h21.9345c0.5522,0,1-0.4478,1-1 S34.3286,40.5015,33.7763,40.5015z" />
      <Path fill={color} d="M33.396,48.6914h-0.0005l-8.3828,0.0034c-0.5522,0-0.9995,0.4482-0.9995,1.0005s0.4478,0.9995,1,0.9995h0.0005 l8.3828-0.0034c0.5522,0,0.9995-0.4482,0.9995-1.0005S33.9482,48.6914,33.396,48.6914z" />
      <Path fill={color} d="M61.3525,12.0815l-2.2285-1.209c-0.7393-0.4023-1.5928-0.4932-2.4019-0.2515c-0.8101,0.2393-1.4771,0.7778-1.8809,1.519 l-4.3599,8.0269V5.8838c0-2.2632-1.8413-4.1045-4.1045-4.1045H9.5327c-0.2462,0-0.5461,0.1156-0.7222,0.291L1.2985,9.5375 C1.1246,9.7224,1,9.9928,1,10.25v47.8662c0,2.2632,1.8413,4.1045,4.1045,4.1045H46.377c2.2632,0,4.1045-1.8413,4.1045-4.1045 v-19.41l12.1372-22.3444C63.4482,14.834,62.8809,12.9141,61.3525,12.0815z M8.5156,5.1962v1.9493 c0,1.1606-0.9438,2.1045-2.1045,2.1045H4.4283L8.5156,5.1962z M48.4814,58.1162c0,1.1606-0.9438,2.1045-2.1045,2.1045H5.1045 C3.9438,60.2207,3,59.2769,3,58.1162V11.25h3.4111c2.2632,0,4.1045-1.8413,4.1045-4.1045V3.7793H46.377 c1.1606,0,2.1045,0.9438,2.1045,2.1045v17.9654L38.6118,42.02c-0.0438,0.0808-0.1229,0.3453-0.1211,0.4893l0.0864,7.3013 c0.0044,0.3682,0.2109,0.7046,0.5371,0.875c0.1455,0.0757,0.3047,0.1133,0.4629,0.1133c0.1968,0,0.3931-0.0581,0.562-0.1729 l5.9287-4.0278c0.0111-0.0076,0.0159-0.0214,0.0267-0.0294c0.1144-0.0842,0.2173-0.1868,0.2897-0.3197 c0,0,0.0001-0.0005,0.0002-0.0007c0.0001-0.0001,0.0002-0.0002,0.0002-0.0002l2.0967-3.86V58.1162z M40.5108,44.1913 l3.0764,1.6741l-3.032,2.0599L40.5108,44.1913z M60.8613,15.4067L45.1049,44.4142l-4.2584-2.3174L55.9409,14.313l0.6582-1.2197 c0.3062-0.5615,1.0093-0.769,1.5693-0.4639l2.2285,1.209C60.957,14.1436,61.165,14.8477,60.8613,15.4067z" />
    </Svg>
  );
}

/** Version icon (ABOUT) - circled info "i" */
function VersionIcon({ size = 22, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M12 7H12.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 11H12V16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 16H14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Build icon (ABOUT) - wrench/tool */
function BuildIcon({ size = 22, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        fill={color}
        d="M469.54,120.52h0a16,16,0,0,0-25.54-4L382.56,178a16.12,16.12,0,0,1-22.63,0L333.37,151.4a16,16,0,0,1,0-22.63l61.18-61.19a16,16,0,0,0-4.78-25.92h0C343.56,21,285.88,31.78,249.51,67.88c-30.9,30.68-40.11,78.62-25.25,131.53a15.89,15.89,0,0,1-4.49,16L53.29,367.46a64.17,64.17,0,1,0,90.6,90.64L297.57,291.25a15.9,15.9,0,0,1,15.77-4.57,179.3,179.3,0,0,0,46.22,6.37c33.4,0,62.71-10.81,83.85-31.64C482.56,222.84,488.53,157.42,469.54,120.52ZM99.48,447.15a32,32,0,1,1,28.34-28.35A32,32,0,0,1,99.48,447.15Z"
      />
    </Svg>
  );
}

/** Log out button icon - door/arrow (Iconly Curved Logout) */
function LogoutIcon({ size = 22, color = "#130F26" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21.791 12.1208H9.75" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.8643 9.20483L21.7923 12.1208L18.8643 15.0368" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16.3597 7.63C16.0297 4.05 14.6897 2.75 9.35974 2.75C2.25874 2.75 2.25874 5.06 2.25874 12C2.25874 18.94 2.25874 21.25 9.35974 21.25C14.6897 21.25 16.0297 19.95 16.3597 16.37" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Animated toggle switch - modern track + thumb with spring and color transition */
const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 26;
const TRACK_PADDING = 3;

function AnimatedToggle({
  value,
  onValueChange,
  trackColorOff = "#E2E8F0",
  trackColorOn = "#10B981",
  thumbColor = "#FFFFFF",
  disabled = false,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  trackColorOff?: string;
  trackColorOn?: string;
  thumbColor?: string;
  disabled?: boolean;
}) {
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start();
  }, [value, animValue]);

  const thumbTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [TRACK_PADDING, TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING],
  });
  const trackOverlayOpacity = animValue;
  const thumbScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scaleValue, {
      toValue: 0.96,
      duration: 80,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.6 : 1 }]}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <View
          style={{
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            backgroundColor: trackColorOff,
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: TRACK_HEIGHT / 2,
              backgroundColor: trackColorOn,
              opacity: trackOverlayOpacity,
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: thumbColor,
              transform: [{ translateX: thumbTranslateX }, { scale: thumbScale }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 3,
            }}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Trash/delete icon (Billing portal button) - rose color */
const ROSE_COLOR = "#E57373";
function TrashIcon({ size = 18, color = ROSE_COLOR }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M5.755,20.283,4,8H20L18.245,20.283A2,2,0,0,1,16.265,22H7.735A2,2,0,0,1,5.755,20.283ZM21,4H16V3a1,1,0,0,0-1-1H9A1,1,0,0,0,8,3V4H3A1,1,0,0,0,3,6H21a1,1,0,0,0,0-2Z"
      />
    </Svg>
  );
}

/** Credits balance / credit card icon (BILLING) */
function CreditsBalanceIcon({ size = 26, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <Path
        fill={color}
        d="M13.5 2C14.3284 2 15 2.67157 15 3.5V5H0V3.5C0 2.67157 0.671573 2 1.5 2H13.5Z"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={color}
        d="M0 6V11.5C0 12.3284 0.671573 13 1.5 13L13.5 13C14.3284 13 15 12.3284 15 11.5V6H0ZM2 10H8V9H2V10ZM13 10H10V9H13V10Z"
      />
    </Svg>
  );
}

/** Security padlock icon (Security row) */
function SecurityLockIcon({ size = 26, color }: { size?: number; color?: string }) {
  const c = color ?? "#000";
  const strokeProps = {
    stroke: c,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        {...strokeProps}
        d="M16,29L16,29c-4.4,0-8-3.6-8-8v-5c0-1.1,0.9-2,2-2h12c1.1,0,2,0.9,2,2v5C24,25.4,20.4,29,16,29z"
      />
      <Path
        {...strokeProps}
        d="M10,14V8.9C10,5.6,12.7,3,16,3h0c3.3,0,6,2.6,6,5.9V14"
      />
      <Circle cx={16} cy={20} r={2} {...strokeProps} fill="none" />
      <Line x1={16} y1={25} x2={16} y2={22} {...strokeProps} />
    </Svg>
  );
}

/** Team Members icon (people/group) */
function TeamMembersIcon({ size = 26, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <ClipPath id="clip0_team_members">
          <Rect width="24" height="24" fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip0_team_members)">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          fill={color}
          d="M9 0C5.96243 0 3.5 2.46243 3.5 5.5C3.5 8.53757 5.96243 11 9 11C12.0376 11 14.5 8.53757 14.5 5.5C14.5 2.46243 12.0376 0 9 0ZM5.5 5.5C5.5 3.567 7.067 2 9 2C10.933 2 12.5 3.567 12.5 5.5C12.5 7.433 10.933 9 9 9C7.067 9 5.5 7.433 5.5 5.5Z"
        />
        <Path
          fill={color}
          d="M15.5 0C14.9477 0 14.5 0.447715 14.5 1C14.5 1.55228 14.9477 2 15.5 2C17.433 2 19 3.567 19 5.5C19 7.433 17.433 9 15.5 9C14.9477 9 14.5 9.44771 14.5 10C14.5 10.5523 14.9477 11 15.5 11C18.5376 11 21 8.53757 21 5.5C21 2.46243 18.5376 0 15.5 0Z"
        />
        <Path
          fill={color}
          d="M19.0837 14.0157C19.3048 13.5096 19.8943 13.2786 20.4004 13.4997C22.5174 14.4246 24 16.538 24 19V21C24 21.5523 23.5523 22 23 22C22.4477 22 22 21.5523 22 21V19C22 17.3613 21.0145 15.9505 19.5996 15.3324C19.0935 15.1113 18.8625 14.5217 19.0837 14.0157Z"
        />
        <Path
          fill={color}
          d="M6 13C2.68629 13 0 15.6863 0 19V21C0 21.5523 0.447715 22 1 22C1.55228 22 2 21.5523 2 21V19C2 16.7909 3.79086 15 6 15H12C14.2091 15 16 16.7909 16 19V21C16 21.5523 16.4477 22 17 22C17.5523 22 18 21.5523 18 21V19C18 15.6863 15.3137 13 12 13H6Z"
        />
      </G>
    </Svg>
  );
}

/** Chevron icon for end of row (PRIVACY & SECURITY and others) */
function RowChevronIcon({ size = 18, color = "#0D0D0D" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M12.293 5.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414-1.414L17.586 12l-5.293-5.293a1 1 0 0 1 0-1.414zm-6 0a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414-1.414L11.586 12 6.293 6.707a1 1 0 0 1 0-1.414z"
      />
    </Svg>
  );
}

const CREDITS_PACKAGES = [
  { label: "1,000 Credits", sublabel: "1000 credits", price: "$26.00" },
  { label: "5,000 Credits", sublabel: "5000 credits", price: "$130.00" },
  { label: "20,000 Credits", sublabel: "20000 credits", price: "$520.00" },
];

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { signOut, user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarImageLoading, setAvatarImageLoading] = useState(true);

  useEffect(() => {
    if (user?.avatar_url) setAvatarImageLoading(true);
  }, [user?.avatar_url]);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === "granted");
    });
  }, []);

  const openPrivacy = () => {
    Linking.openURL(`${config.apiUrl}/settings/privacy`).catch(() => { });
  };

  const openHelpCenter = () => navigation.navigate("HelpCenter");
  const openSupport = () => navigation.navigate("Support");
  const openTerms = () => Linking.openURL(`${config.apiUrl}/terms`).catch(() => { });

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? "1";

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10 + spacing.md,
            paddingBottom: spacing.md,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: insets.bottom + spacing["3xl"] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.profileCardLeft]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {user?.avatar_url ? (
                <>
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={styles.avatarImage}
                    onLoadStart={() => setAvatarImageLoading(true)}
                    onLoad={() => setAvatarImageLoading(false)}
                    onError={() => setAvatarImageLoading(false)}
                  />
                  {avatarImageLoading && (
                    <View style={[styles.avatarLoadingOverlay, { backgroundColor: colors.primary }]}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(user?.full_name, user?.email)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.profileCardRight}>
            <View style={styles.profileNameRow}>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                {user?.full_name?.trim() || "User"}
              </Text>
              <TouchableOpacity
                style={[styles.profileEdit, { backgroundColor: colors.primary + "18" }]}
                hitSlop={12}
                onPress={() => navigation.navigate("EditProfile")}
                activeOpacity={0.7}
              >
                <EditProfileIcon size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]} numberOfLines={1}>
              {user?.email || ""}
            </Text>
            {(() => {
              const r = user?.role?.trim();
              const label = r ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : "";
              return label ? (
                <View style={[styles.ownerTag, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.ownerTagText, { color: colors.primary }]}>{label}</Text>
                </View>
              ) : null;
            })()}
          </View>
        </View>

        {/* NOTIFICATIONS */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("NotificationSettings")}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19.3399 14.49L18.3399 12.83C18.1299 12.46 17.9399 11.76 17.9399 11.35V8.82C17.9399 6.47 16.5599 4.44 14.5699 3.49C14.0499 2.57 13.0899 2 11.9899 2C10.8999 2 9.91994 2.59 9.39994 3.52C7.44994 4.49 6.09994 6.5 6.09994 8.82V11.35C6.09994 11.76 5.90994 12.46 5.69994 12.82L4.68994 14.49C4.28994 15.16 4.19994 15.9 4.44994 16.58C4.68994 17.25 5.25994 17.77 5.99994 18.02C7.93994 18.68 9.97994 19 12.0199 19C14.0599 19 16.0999 18.68 18.0399 18.03C18.7399 17.8 19.2799 17.27 19.5399 16.58C19.7999 15.89 19.7299 15.13 19.3399 14.49Z"
                  fill={colors.primary}
                />
                <Path
                  d="M14.8297 20.01C14.4097 21.17 13.2997 22 11.9997 22C11.2097 22 10.4297 21.68 9.87969 21.11C9.55969 20.81 9.31969 20.41 9.17969 20C9.30969 20.02 9.43969 20.03 9.57969 20.05C9.80969 20.08 10.0497 20.11 10.2897 20.13C10.8597 20.18 11.4397 20.21 12.0197 20.21C12.5897 20.21 13.1597 20.18 13.7197 20.13C13.9297 20.11 14.1397 20.1 14.3397 20.07C14.4997 20.05 14.6597 20.03 14.8297 20.01Z"
                  fill={colors.primary}
                />
              </Svg>
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowText, { color: colors.text }]}>
                {notificationsEnabled ? "Notifications" : "Notifications Disabled"}
              </Text>
            </View>
            <RowChevronIcon size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={openPrivacy}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <SecurityIcon size={24} color={colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowText, { color: colors.text }]}>Privacy</Text>
            </View>
            <RowChevronIcon size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("SecuritySettings")}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <SecurityLockIcon size={26} color={colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowText, { color: colors.text }]}>Security</Text>
            </View>
            <RowChevronIcon size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("AppearanceSettings")}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="color-palette-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowText, { color: colors.text }]}>Appearance</Text>
            </View>
            <RowChevronIcon size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("Billing")}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="card-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowText, { color: colors.text }]}>Billing</Text>
            </View>
            <RowChevronIcon size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("TeamMembers")}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <TeamMembersIcon size={26} color={colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowText, { color: colors.text }]}>Team Members</Text>
            </View>
            <RowChevronIcon size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={openSupport}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <HelpCenterIcon size={22} color={colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowText, { color: colors.text }]}>Support</Text>
            </View>
            <RowChevronIcon size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ABOUT</Text>
          <View style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.iconWrap}>
              <VersionIcon size={22} color={colors.primary} />
            </View>
            <Text style={[styles.rowText, { color: colors.text }]}>Version</Text>
            <Text style={[styles.rowSubtext, { color: colors.textMuted }]}>{appVersion}</Text>
          </View>
          <View style={[rowStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.iconWrap}>
              <BuildIcon size={22} color={colors.primary} />
            </View>
            <Text style={[styles.rowText, { color: colors.text }]}>Build</Text>
            <Text style={[styles.rowSubtext, { color: colors.textMuted }]}>{buildNumber}</Text>
          </View>
          <Text style={[styles.appName, { color: colors.textMuted }]}>STATXT v{appVersion}</Text>
        </View>

        {/* Log out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              { backgroundColor: colors.destructive + "18", borderColor: colors.destructive },
              isLoggingOut && styles.logoutBtnDisabled,
            ]}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <View style={styles.iconWrap}>
                <LogoutIcon size={22} color={colors.destructive} />
              </View>
            )}
            <Text style={[styles.logoutBtnText, { color: colors.destructive }]}>
              {isLoggingOut ? "Logging out…" : "Log out"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg },
  scrollView: { flex: 1 },
  title: { ...typography.displayMd },
  profileCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  profileCardLeft: {},
  profileCardRight: {
    flex: 1,
    marginLeft: spacing.lg,
    minWidth: 0,
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    gap: spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...typography.displayMd, color: "#FFFFFF", fontWeight: "700" },
  profileName: { ...typography.titleMd, fontWeight: "600", flex: 1, minWidth: 0 },
  profileEmail: { ...typography.bodySm, marginBottom: spacing.xs },
  ownerTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignSelf: "flex-start",
  },
  ownerTagText: { ...typography.caption, fontWeight: "600" },
  profileEdit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.caption,
    fontWeight: "700",
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  iconWrap: { width: 28, alignItems: "center", justifyContent: "center" },
  rowTextWrap: { flex: 1, minWidth: 0 },
  rowText: { ...typography.titleSm },
  rowSubtext: { ...typography.bodySm, marginTop: 2 },
  creditsLabel: { ...typography.caption, fontWeight: "600" },
  creditsValue: { ...typography.titleLg, fontWeight: "700" },
  billingCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  billingBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  billingBalanceLeft: {},
  billingPortalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  billingPortalText: { ...typography.bodySm },
  buyCreditsTitle: { ...typography.body, fontWeight: "600", marginBottom: spacing.sm },
  customAmountTitle: { ...typography.body, fontWeight: "600", marginTop: spacing.sm, marginBottom: spacing.sm },
  priceText: { ...typography.bodySm, fontWeight: "600" },
  customAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    overflow: "hidden",
  },
  customAmountPrefix: { ...typography.body, paddingLeft: spacing.md },
  customAmountInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    minWidth: 80,
  },
  buyBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: "center",
  },
  buyBtnText: { ...typography.label, color: "#FFFFFF", fontWeight: "600" },
  stripeNote: { ...typography.caption, marginTop: spacing.xs },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  logoutBtnText: { ...typography.titleSm, fontWeight: "600" },
  logoutBtnDisabled: { opacity: 0.7 },
  appName: { ...typography.bodySm, textAlign: "center", marginTop: spacing.lg },
});
