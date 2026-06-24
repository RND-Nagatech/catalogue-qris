/**
 * Aura Luminaire Design System
 * Palette & tokens dari design/aura_luminaire/DESIGN.md
 */

export const colors = {
  // Primary
  primary: '#695d39',
  onPrimary: '#ffffff',
  primaryContainer: '#83764f',
  onPrimaryContainer: '#070500',
  inversePrimary: '#d6c699',
  primaryFixed: '#f3e1b3',
  primaryFixedDim: '#d6c699',
  onPrimaryFixed: '#231b00',
  onPrimaryFixedVariant: '#514623',

  // Secondary
  secondary: '#605d62',
  onSecondary: '#ffffff',
  secondaryContainer: '#e5e1e7',
  onSecondaryContainer: '#666368',
  secondaryFixed: '#e5e1e7',
  secondaryFixedDim: '#c9c5cb',
  onSecondaryFixed: '#1c1b1f',
  onSecondaryFixedVariant: '#48464a',

  // Tertiary
  tertiary: '#5c5c5c',
  onTertiary: '#ffffff',
  tertiaryContainer: '#747474',
  onTertiaryContainer: '#fefcfc',
  tertiaryFixed: '#e4e2e2',
  tertiaryFixedDim: '#c7c6c6',
  onTertiaryFixed: '#1b1c1c',
  onTertiaryFixedVariant: '#464747',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Surface
  surface: '#fbf9f5',
  surfaceDim: '#dbdad6',
  surfaceBright: '#fbf9f5',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f3ef',
  surfaceContainer: '#efeeea',
  surfaceContainerHigh: '#eae8e4',
  surfaceContainerHighest: '#e4e2de',
  surfaceVariant: '#e4e2de',

  // On Surface
  onSurface: '#1b1c1a',
  onSurfaceVariant: '#4b463c',

  // Inverse
  inverseSurface: '#30312e',
  inverseOnSurface: '#f2f0ec',

  // Outline
  outline: '#7c776a',
  outlineVariant: '#cdc6b8',

  // Background
  background: '#fbf9f5',
  onBackground: '#1b1c1a',

  // Surface Tint
  surfaceTint: '#695e39',
} as const;

export const typography = {
  displayLg: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -0.02 * 40,
  },
  headlineLg: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.01 * 32,
  },
  headlineLgMobile: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  headlineMd: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  bodyLg: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  labelMd: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.05 * 14,
  },
  labelSm: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.08 * 12,
  },
} as const;

export const spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  containerMargin: 20,
  gutter: 16,
} as const;

export const borderRadius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** Card shadow sesuai spec: 10% opacity primary, 8px blur, 4px Y-offset */
export const shadows = {
  card: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

const theme = { colors, typography, spacing, borderRadius, shadows };
export default theme;
