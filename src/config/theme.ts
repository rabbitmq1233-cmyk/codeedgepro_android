// ============================================================
// CodeEdgePro - Theme Configuration
// Centralized colors, typography, spacing, and shadows
// ============================================================

export const COLORS = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0055CC',

  // Background
  background: '#FFFFFF',
  surface: '#F9F9F9',
  surfaceAlt: '#F0F0F0',

  // Text
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Border
  border: '#DDDDDD',
  borderLight: '#EEEEEE',
  divider: '#F0F0F0',

  // Status
  success: '#34C759',
  warning: '#FF9500',
  error: '#E74C3C',
  info: '#5AC8FA',

  // Tab Bar
  tabActive: '#007AFF',
  tabInactive: '#8E8E93',

  // Chat
  chatUserBubble: '#007AFF',
  chatAssistantBubble: '#F0F0F0',
  chatUserText: '#FFFFFF',
  chatAssistantText: '#000000',

  // Misc
  placeholder: '#CCCCCC',
  disabled: '#C7C7CC',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const FONTS = {
  regular: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  medium: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  semibold: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bold: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 28,
  full: 9999,
} as const;

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export const HEADER_STYLE = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: '600' as const },
} as const;
