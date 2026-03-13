import React from "react";
import Svg, { Path, Circle, Line } from "react-native-svg";

const SIZE = 26;
const STROKE = 1.8;

type IconProps = { color: string; focused: boolean };

/** Team Chat: speech bubble with three lines (bottom nav). */
export function TeamIcon({ color, focused }: IconProps) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 64 64" fill="none">
      <Path
        d="M53.85,43.71H28.6l-10.75,8,.1-8H10.09a2,2,0,0,1-2-2V12.78a2,2,0,0,1,2-2H53.91a2,2,0,0,1,2,2V41.65A2.06,2.06,0,0,1,53.85,43.71Z"
        stroke={color}
        strokeWidth={3}
        fill="none"
        opacity={focused ? 1 : 0.8}
      />
      <Line x1={14.31} y1={18.91} x2={45.08} y2={18.91} stroke={color} strokeWidth={3} opacity={focused ? 1 : 0.8} />
      <Line x1={14.31} y1={26.33} x2={32.17} y2={26.33} stroke={color} strokeWidth={3} opacity={focused ? 1 : 0.8} />
      <Line x1={14.31} y1={33.75} x2={38.58} y2={33.75} stroke={color} strokeWidth={3} opacity={focused ? 1 : 0.8} />
    </Svg>
  );
}

/** Contacts: two overlapping person silhouettes (group icon). */
export function ContactIcon({ color, focused, size }: IconProps & { size?: number }) {
  const s = size ?? SIZE;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="9"
        cy="7"
        r="4"
        stroke={color}
        strokeWidth={STROKE}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.2 : 0}
      />
      <Path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={focused ? 1 : 0.85}
      />
    </Svg>
  );
}

/** Messages: comments / speech bubbles (bottom nav). */
export function MessagesIcon({ color, focused }: IconProps) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="-0.02 0 60.031 60.031">
      <Path
        d="M543.4,238.4a1.957,1.957,0,0,0-.706,1.292,13.6,13.6,0,0,0,.354,4.205c0.874,3.389,1.618,3.686,1.623,4.583A1.358,1.358,0,0,1,543,249.808c-3.37.027-8.255-6.354-8.863-6.957a3.36,3.36,0,0,0-.566-0.362c-0.655-.246-2.8.109-3.571,0.11-11.046,0-20-7.294-20-16.292s8.954-16.292,20-16.292,20,7.294,20,16.292C550,231.107,547.45,235.421,543.4,238.4ZM530,248.751c0.375,0,.752-0.025,1.138-0.059a40.1,40.1,0,0,0,3.232,3.259c-4.224,5.606-11.735,9.371-20.37,9.371-0.928,0-3.5-.428-4.286-0.132a4.055,4.055,0,0,0-.678.436c-0.73.728-6.592,8.425-10.636,8.393a1.63,1.63,0,0,1-2-1.6c0-1.082.9-1.44,1.947-5.528a16.512,16.512,0,0,0,.425-5.072,2.369,2.369,0,0,0-.847-1.559c-4.866-3.6-7.925-8.8-7.925-14.589,0-7.989,5.835-14.841,14.194-17.913A19.45,19.45,0,0,0,504,226.38C504,238.715,515.664,248.751,530,248.751Z"
        transform="translate(-490 -210)"
        fill={color}
        fillRule="evenodd"
        opacity={focused ? 1 : 0.8}
      />
    </Svg>
  );
}

/** Campaigns: megaphone / broadcast (bottom nav). */
export function CampaignsIcon({ color, focused, size }: IconProps & { size?: number }) {
  const s = size ?? SIZE;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M22,4.28V15.72a2,2,0,0,1-.77,1.58,2.05,2.05,0,0,1-1.23.42,2,2,0,0,1-.48-.06L10,15.28,8.88,15H7a5,5,0,0,1-3.5-1.43A5,5,0,0,1,7,5H8.88L19.52,2.34a2,2,0,0,1,1.71.36A2,2,0,0,1,22,4.28Z"
        fill={color}
        opacity={focused ? 1 : 0.8}
      />
      <Path
        d="M10,16.31V20a2,2,0,0,1-2,2H6.82a2,2,0,0,1-2-1.61L3.8,15.08a5.68,5.68,0,0,0,1.74.74A5.9,5.9,0,0,0,7,16H8.76Z"
        fill={color}
        opacity={focused ? 1 : 0.8}
      />
    </Svg>
  );
}

/** Settings: gear / cog (bottom nav). */
export function SettingsIcon({ color, focused }: IconProps) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 1024 1024">
      <Path
        d="M600.704 64a32 32 0 0 1 30.464 22.208l35.2 109.376c14.784 7.232 28.928 15.36 42.432 24.512l112.384-24.192a32 32 0 0 1 34.432 15.36L944.32 364.8a32 32 0 0 1-4.032 37.504l-77.12 85.12a357.12 357.12 0 0 1 0 49.024l77.12 85.248a32 32 0 0 1 4.032 37.504l-88.704 153.6a32 32 0 0 1-34.432 15.296L708.8 803.904c-13.44 9.088-27.648 17.28-42.368 24.512l-35.264 109.376A32 32 0 0 1 600.704 960H423.296a32 32 0 0 1-30.464-22.208L357.696 828.48a351.616 351.616 0 0 1-42.56-24.64l-112.32 24.256a32 32 0 0 1-34.432-15.36L79.68 659.2a32 32 0 0 1 4.032-37.504l77.12-85.248a357.12 357.12 0 0 1 0-48.896l-77.12-85.248A32 32 0 0 1 79.68 364.8l88.704-153.6a32 32 0 0 1 34.432-15.296l112.32 24.256c13.568-9.152 27.776-17.408 42.56-24.64l35.2-109.312A32 32 0 0 1 423.232 64H600.64zm-23.424 64H446.72l-36.352 113.088-24.512 11.968a294.113 294.113 0 0 0-34.816 20.096l-22.656 15.36-116.224-25.088-65.28 113.152 79.68 88.192-1.92 27.136a293.12 293.12 0 0 0 0 40.192l1.92 27.136-79.808 88.192 65.344 113.152 116.224-25.024 22.656 15.296a294.113 294.113 0 0 0 34.816 20.096l24.512 11.968L446.72 896h130.688l36.48-113.152 24.448-11.904a288.282 288.282 0 0 0 34.752-20.096l22.592-15.296 116.288 25.024 65.28-113.152-79.744-88.192 1.92-27.136a293.12 293.12 0 0 0 0-40.256l-1.92-27.136 79.808-88.128-65.344-113.152-116.288 24.96-22.592-15.232a287.616 287.616 0 0 0-34.752-20.096l-24.448-11.904L577.344 128zM512 320a192 192 0 1 1 0 384 192 192 0 0 1 0-384zm0 64a128 128 0 1 0 0 256 128 128 0 0 0 0-256z"
        fill={color}
        opacity={focused ? 1 : 0.8}
      />
    </Svg>
  );
}

export function MoreIcon({ color, focused }: IconProps) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx="8" cy="12" r="2" fill={color} opacity={focused ? 1 : 0.7} />
      <Circle cx="12" cy="12" r="2" fill={color} opacity={focused ? 1 : 0.7} />
      <Circle cx="16" cy="12" r="2" fill={color} opacity={focused ? 1 : 0.7} />
    </Svg>
  );
}

/** Icon-only for new chat FAB (no label). */
export function NewChatIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Large back/chevron-left for headers (icon only, no label). */
export function BackArrowIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Icon-only for add contact FAB (no label). */
export function AddContactIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M3 21v-2a4 4 0 0 1 4-4h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 11h6M19 8v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Funnel icon for filters (Contacts, etc.). */
export function FilterIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16l-6 8v8l-4 2v-10L4 4z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Checkmark for selected state (e.g. filter modal). */
export function CheckIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Single check – message delivered (gray). */
export function CheckSingleIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Double check – message seen (blue). */
/** Double check – message seen (use provided SVG). */
export function CheckDoubleIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.62 3.596L7.815 12.81l-.728-.033L4 8.382l.754-.53 2.744 3.907L14.917 3l.703.596z"
        fill={color}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.234 8.774l4.386-5.178L10.917 3l-4.23 4.994.547.78zm-1.55.403l.548.78-.547-.78zm-1.617 1.91l.547.78-.799.943-.728-.033L0 8.382l.754-.53 2.744 3.907.57-.672z"
        fill={color}
      />
    </Svg>
  );
}

/** Large outline speech bubble for empty state (no fill, no dots). */
export function ChatBubbleOutlineIcon({ color, size = 80 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Replies / chat bubble with dots (for engagement Replies card). */
export function RepliesIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        fill={color}
        d="M9.99967212,0 C15.3421546,0 20,4.41078717 20,9.50041089 C20,14.5038113 15.4470617,18.4420609 9.99967212,18.4420609 C8.82383776,18.4420609 7.66472215,18.2555444 6.56950019,17.896217 C6.1061195,18.3458348 5.94680953,18.4994554 4.96243281,19.448677 C4.25236672,19.9846542 3.58411803,20.1670231 2.98696396,19.8294032 C2.38520468,19.4891796 2.20359422,18.826708 2.3273511,17.9547253 L2.72619634,15.6363992 C0.991478903,14.0023298 -5.5067062e-14,11.841558 -5.5067062e-14,9.50041089 C-5.5067062e-14,4.41068995 4.65729467,0 9.99967212,0 Z M9.99967212,1.3990586 C5.41358584,1.3990586 1.39921922,5.20086368 1.39921922,9.50041089 C1.39921922,11.5450586 2.31196565,13.4284446 3.92034256,14.8307294 C3.92973001,14.8389057 3.92973001,14.8389057 3.93914815,14.8470758 L4.2373081,15.1054691 L4.17041728,15.4942784 C4.10971448,15.8471192 4.06924596,16.0823464 4.03194209,16.2991112 L3.99506091,16.513394 C3.93324306,16.872516 3.86441075,17.2721599 3.70953807,18.1713588 C3.68686557,18.331512 3.68074435,18.4393886 3.67939691,18.5082916 L3.67945227,18.6031678 C3.67924936,18.6076492 3.67879274,18.6103183 3.67789839,18.611383 C3.68539878,18.6013701 3.82129581,18.5575122 4.0536067,18.3884487 L6.22335079,16.2823797 L6.63824234,16.4378322 C7.69910735,16.8353194 8.83963099,17.0430023 9.99967212,17.0430023 C14.7157106,17.0430023 18.6007808,13.6824525 18.6007808,9.50041089 C18.6007808,5.20099275 14.5858917,1.3990586 9.99967212,1.3990586 Z M5.22745564,7.81372377 C6.05542075,7.81372377 6.72661909,8.48484506 6.72661909,9.31271513 C6.72661909,10.1405852 6.05542075,10.8117065 5.22745564,10.8117065 C4.39949054,10.8117065 3.7282922,10.1405852 3.7282922,9.31271513 C3.7282922,8.48484506 4.39949054,7.81372377 5.22745564,7.81372377 Z M10.2246671,7.81372377 C11.0526322,7.81372377 11.7238306,8.48484506 11.7238306,9.31271513 C11.7238306,10.1405852 11.0526322,10.8117065 10.2246671,10.8117065 C9.39670202,10.8117065 8.72550368,10.1405852 8.72550368,9.31271513 C8.72550368,8.48484506 9.39670202,7.81372377 10.2246671,7.81372377 Z M15.2218786,7.81372377 C16.0498437,7.81372377 16.7210421,8.48484506 16.7210421,9.31271513 C16.7210421,10.1405852 16.0498437,10.8117065 15.2218786,10.8117065 C14.3939135,10.8117065 13.7227152,10.1405852 13.7227152,9.31271513 C13.7227152,8.48484506 14.3939135,7.81372377 15.2218786,7.81372377 Z"
      />
    </Svg>
  );
}

/** Trash / delete (for swipe action). */
export function TrashIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18v2l-2 14H5L3 8V6zM8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 11v6M14 11v6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Chevron right for list row (navigate to detail). */
export function ChevronRightIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Phone / call (chat header). */
export function PhoneIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Single person / profile (chat header – view contact). */
export function PersonIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 21a8 8 0 10-16 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Minus in circle (chat header – mute / more). */
export function MinusCircleIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Close / X (e.g. failed count). */
export function CloseIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Failed: circle with X (for delivery Failed card). */
export function FailedIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.02975 3.3437C10.9834 2.88543 13.0166 2.88543 14.9703 3.3437C17.7916 4.00549 19.9945 6.20842 20.6563 9.02975C21.1146 10.9834 21.1146 13.0166 20.6563 14.9703C19.9945 17.7916 17.7916 19.9945 14.9703 20.6563C13.0166 21.1146 10.9834 21.1146 9.02975 20.6563C6.20842 19.9945 4.0055 17.7916 3.3437 14.9703C2.88543 13.0166 2.88543 10.9834 3.3437 9.02974C4.0055 6.20841 6.20842 4.00549 9.02975 3.3437ZM10.7139 9.90158C10.4896 9.67727 10.1259 9.67727 9.90158 9.90158C9.67727 10.1259 9.67727 10.4896 9.90158 10.7139L11.1877 12L9.90158 13.2861C9.67727 13.5104 9.67727 13.8741 9.90158 14.0984C10.1259 14.3227 10.4896 14.3227 10.7139 14.0984L12 12.8123L13.2861 14.0984C13.5104 14.3227 13.8741 14.3227 14.0984 14.0984C14.3227 13.8741 14.3227 13.5104 14.0984 13.2861L12.8123 12L14.0984 10.7139C14.3227 10.4896 14.3227 10.1259 14.0984 9.90158C13.8741 9.67727 13.5104 9.67727 13.2861 9.90158L12 11.1877L10.7139 9.90158Z"
      />
    </Svg>
  );
}

/** Green circle with white check (Analytics delivery card). */
export function DeliveryCheckIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="10" fill="#27ae60" />
      <Circle cx="12" cy="12" r="10" fill="#2ecc71" />
      <Path
        d="M16 9l-6 6-2.5-2.5-2.125 2.1 2.5 2.5 2 2 0.125 0.1 8.125-8.1-2.125-2.1z"
        fill="#27ae60"
      />
      <Path
        d="M16 8l-6 6-2.5-2.5-2.125 2.1 2.5 2.5 2 2 0.125 0.1 8.125-8.1-2.125-2.1z"
        fill="#ecf0f1"
      />
    </Svg>
  );
}

/** Delivered: circle with checkmark (for delivery card). */
export function DeliveredIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10C22,6.5,17.5,2,12,2z M16.2,10.3l-4.8,4.8c-0.4,0.4-1,0.4-1.4,0l0,0l-2.2-2.2c-0.4-0.4-0.4-1,0-1.4c0.4-0.4,1-0.4,1.4,0c0,0,0,0,0,0l1.5,1.5l4.1-4.1c0.4-0.4,1-0.4,1.4,0C16.6,9.3,16.6,9.9,16.2,10.3z"
      />
    </Svg>
  );
}

/** Simple line chart (e.g. delivery rate). */
export function ChartLineIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-6 4 4 8-10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Delivery rate: cart/truck (for delivery rate card). */
export function DeliveryRateIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Circle cx="144" cy="432" r="48" fill={color} />
      <Circle cx="384" cy="432" r="48" fill={color} />
      <Path
        fill={color}
        d="M507.438,255.539l-48-80C453.656,165.898,443.242,160,432,160H320v-32c0-17.672-14.328-32-32-32h-0.304C258.472,57.225,212.186,32,160,32S61.528,57.225,32.304,96H32c-17.672,0-32,14.328-32,32v288c0,17.672,14.328,32,32,32h33.612C64.563,442.828,64,437.48,64,432c0-44.184,35.817-80,80-80s80,35.816,80,80c0,5.48-0.563,10.828-1.612,16H288h16v-16c0-44.184,35.817-80,80-80s80,35.816,80,80v16h16c17.672,0,32-14.328,32-32V272C512,266.203,510.422,260.508,507.438,255.539z M160,96c52.938,0,96,43.063,96,96s-43.063,96-96,96s-96-43.063-96-96S107.063,96,160,96z M448,288h-96v-16v-64h64l32,64V288z"
      />
    </Svg>
  );
}

/** Activity / response rate chart (bar/activity style). */
export function ResponseRateIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M21,11H17.06a.78.78,0,0,0-.21,0l-.17,0a1.3,1.3,0,0,0-.15.1,1.67,1.67,0,0,0-.16.12,1,1,0,0,0-.09.13,1.32,1.32,0,0,0-.12.2v0l-1.6,4.41L10.39,4.66a1,1,0,0,0-1.88,0L6.2,11H3a1,1,0,0,0,0,2H6.92L7.15,13l.15,0a.86.86,0,0,0,.16-.1,1.67,1.67,0,0,0,.16-.12l.09-.13a1,1,0,0,0,.12-.2v0L9.45,7.92l4.16,11.42a1,1,0,0,0,.94.66h0a1,1,0,0,0,.94-.66L17.79,13H21a1,1,0,0,0,0-2Z"
      />
    </Svg>
  );
}

/** Opt-out rate: line chart (for engagement Opt-out Rate card). */
export function OptOutRateIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Path
        d="m0 6.5h2l2.5-6 2 12 3-9 2.095 6 1.405-3h2"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(3 4)"
      />
    </Svg>
  );
}

/** Clock / time (e.g. campaign completed date). */
export function ClockIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Pending: clock circle with hands (for delivery Pending card). */
export function PendingIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path
        fill={color}
        d="M15,4C8.9,4,4,8.9,4,15s4.9,11,11,11s11-4.9,11-11S21.1,4,15,4z M21.7,16.8c-0.1,0.4-0.5,0.6-0.9,0.5l-5.6-1.1c-0.2,0-0.4-0.2-0.6-0.3C14.2,15.7,14,15.4,14,15c0,0,0,0,0,0l0.2-8c0-0.5,0.4-0.8,0.8-0.8c0.4,0,0.8,0.4,0.8,0.8l0.1,6.9l5.2,1.8C21.6,15.8,21.8,16.3,21.7,16.8z"
      />
    </Svg>
  );
}

/** Send message: upward arrow (use inside circular button). */
export function SendArrowIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Lightning bolt (e.g. Blast Message button). */
export function LightningIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Path
        fill={color}
        d="M30.8,2.29A.49.49,0,0,0,30.35,2H16.42a.5.5,0,0,0-.42.23l-10.71,17A.49.49,0,0,0,5.7,20h7.67L6.6,33.25a.52.52,0,0,0,.46.75h3a.5.5,0,0,0,.37-.16L28,14.85a.5.5,0,0,0-.37-.85H20.89L30.72,2.82A.49.49,0,0,0,30.8,2.29Z"
      />
    </Svg>
  );
}

/** Compose / new message: square with pencil (for Messages header). */
export function ComposeIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Video call (team chat header). */
export function VideoIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 7l-7 5 7 5V7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 5H2a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Three vertical dots (more options in team chat header). */
export function MoreVerticalIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="6" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="18" r="1.5" fill={color} />
    </Svg>
  );
}

/** Paperclip / attachment (team chat footer). */
export function PaperclipIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Emoji / smiley (team chat footer). */
export function EmojiIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="9" r="1.25" fill={color} />
      <Circle cx="15" cy="9" r="1.25" fill={color} />
    </Svg>
  );
}

/** @ mention (team chat footer). */
export function AtMentionIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 16a4 4 0 100-8 4 4 0 000 8zM16 12v1.5a2.5 2.5 0 01-5 0V12a5 5 0 1110 0v1.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
