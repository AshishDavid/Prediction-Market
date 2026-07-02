/**
 * Pulse design tokens.
 * The app is dark-only (prediction markets read best on a deep, high-contrast
 * surface), so `Colors.dark` is the single source of truth for the palette.
 * `Colors.light` is kept only so `useThemeColor`/`ThemedText` (Expo boilerplate
 * used by a couple of leftover template components) don't break.
 */

import { Platform } from 'react-native';

// Page background — near-void base with an ambient glow layer drawn on top
// (see BackgroundLayout). Deeper than a flat navy so the glow blobs read as
// light sources rather than a wash.
const bgStart = '#06070D';
const bgEnd = '#12162A';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#5EEAD4';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    // Surfaces
    bgStart,
    bgEnd,
    background: bgStart,
    glowTeal: '#2DD4BF',
    glowViolet: '#7C6AF2',
    surface: 'rgba(255,255,255,0.045)',
    surfaceElevated: 'rgba(255,255,255,0.08)',
    surfacePressed: 'rgba(255,255,255,0.13)',
    surfaceHighlight: 'rgba(255,255,255,0.14)', // hairline top-edge highlight on cards
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.2)',
    modal: '#12172A',

    // Text
    text: '#F7F8FC',
    textSecondary: 'rgba(247,248,252,0.66)',
    textTertiary: 'rgba(247,248,252,0.42)',

    // Brand + semantic
    accent: '#5EEAD4',
    accentSoft: '#99F6E4',
    accentDeep: '#14B8A6',
    onAccent: '#04211C',
    success: '#5EEAD4',
    danger: '#FB7185',
    dangerDeep: '#E11D48',
    warning: '#FBBF24',
    gold: '#FFD700',
    silver: '#CBD5E1',
    bronze: '#F0B27A',

    tint: tintColorDark,
    icon: 'rgba(247,248,252,0.6)',
    tabIconDefault: 'rgba(247,248,252,0.45)',
    tabIconSelected: tintColorDark,
  },
};

// Reusable gradient stop pairs (feed straight into <LinearGradient colors={...}>)
export const Gradients = {
  accentButton: ['#67F2D6', '#14B8A6'],
  dangerButton: ['#FF9AA8', '#E11D48'],
  cardSheen: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'],
};

export const Shadows = {
  accentGlow: {
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
