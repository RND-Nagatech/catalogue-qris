import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "@app_theme_mode";

const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  gutter: 16,
} as const;

const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: "700" },
  displayMobile: { fontSize: 24, lineHeight: 32, fontWeight: "700" },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
  titleSmall: { fontSize: 18, lineHeight: 26, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: "700" },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  labelCaps: { fontSize: 12, lineHeight: 16, fontWeight: "800", letterSpacing: 0.96 },
} as const;

const components = {
  headerHeight: 64,
  bottomTabHeight: 80,
  buttonHeight: 48,
  buttonHeightLarge: 56,
  inputHeight: 56,
  iconButtonSize: 44,
  cardRadius: radius.lg,
  controlRadius: radius.md,
  pageGutter: spacing.md,
} as const;

const lightColors = {
  background: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F3F4F5",
  surfaceDim: "#D9DADB",
  surfaceBright: "#F8F9FA",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F3F4F5",
  surfaceContainer: "#EDEEEF",
  surfaceContainerHigh: "#E7E8E9",
  surfaceContainerHighest: "#E1E3E4",
  surfaceVariant: "#E1E3E4",
  cardBackground: "#FFFFFF",
  cardBorder: "#DDE6DF",
  inputBackground: "#FFFFFF",
  inputBorder: "#BCCABC",
  text: "#191C1D",
  muted: "#3D4A3F",
  subtleText: "#68766B",
  inverseSurface: "#2E312F",
  inverseOnSurface: "#F0F1EF",
  outline: "#BCCABC",
  outlineStrong: "#6D7A6E",
  outlineVariant: "#DDE6DF",
  divider: "#E2E8E3",
  shadow: "#000000",
  scrim: "rgba(0, 0, 0, 0.32)",
  primary: "#006A37",
  primaryContainer: "#008648",
  primaryText: "#FFFFFF",
  onPrimary: "#FFFFFF",
  onPrimaryContainer: "#F6FFF4",
  inversePrimary: "#5BDF8C",
  primaryFixed: "#79FCA5",
  primaryFixedDim: "#5BDF8C",
  buttonPrimary: "#008648",
  secondary: "#865300",
  secondaryContainer: "#FEA520",
  secondaryFixed: "#FFDDB9",
  secondaryFixedDim: "#FFB961",
  onSecondary: "#FFFFFF",
  onSecondaryContainer: "#3B2300",
  tertiary: "#4C5E71",
  tertiaryContainer: "#D0E4FA",
  onTertiary: "#FFFFFF",
  onTertiaryContainer: "#071D32",
  danger: "#BA1A1A",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",
  success: "#006A37",
  successContainer: "#D8F8DE",
  warning: "#B56200",
  warningContainer: "#FFE3BB",
  info: "#00658F",
  infoContainer: "#C8E6FF",
  bottomNavBackground: "#FFFFFF",
  bottomNavActive: "#006A37",
  bottomNavInactive: "#7A837C",
  tabInactive: "#7A837C",
  buttonSecondary: "#FFF7ED",
};

const darkColors: typeof lightColors = {
  background: "#050B08",
  surface: "#0B1712",
  surfaceLow: "#101D17",
  surfaceDim: "#050B08",
  surfaceBright: "#27382F",
  surfaceContainerLowest: "#07110D",
  surfaceContainerLow: "#0F1D17",
  surfaceContainer: "#14241D",
  surfaceContainerHigh: "#1A2B23",
  surfaceContainerHighest: "#22372D",
  surfaceVariant: "#334B3B",
  cardBackground: "#0F1D17",
  cardBorder: "#274338",
  inputBackground: "#14241D",
  inputBorder: "#355242",
  text: "#EEF7F0",
  muted: "#B8CDBE",
  subtleText: "#8FA293",
  inverseSurface: "#E1E3E4",
  inverseOnSurface: "#191C1D",
  outline: "#516C5B",
  outlineStrong: "#8BA190",
  outlineVariant: "#274338",
  divider: "#20362B",
  shadow: "#000000",
  scrim: "rgba(0, 0, 0, 0.64)",
  primary: "#5BDF8C",
  primaryContainer: "#00A65A",
  primaryText: "#001F10",
  onPrimary: "#00210D",
  onPrimaryContainer: "#E8FFED",
  inversePrimary: "#006A37",
  primaryFixed: "#79FCA5",
  primaryFixedDim: "#5BDF8C",
  buttonPrimary: "#00A65A",
  secondary: "#FFB961",
  secondaryContainer: "#FEA520",
  secondaryFixed: "#FFDDB9",
  secondaryFixedDim: "#FFB961",
  onSecondary: "#2B1700",
  onSecondaryContainer: "#261500",
  tertiary: "#B5C9DD",
  tertiaryContainer: "#34495C",
  onTertiary: "#1E3143",
  onTertiaryContainer: "#D0E4FA",
  danger: "#FFB4AB",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  success: "#5BDF8C",
  successContainer: "#123C25",
  warning: "#FFB961",
  warningContainer: "#4F2D00",
  info: "#8DCDFF",
  infoContainer: "#00344D",
  bottomNavBackground: "#0B1712",
  bottomNavActive: "#5BDF8C",
  bottomNavInactive: "#8FA293",
  tabInactive: "#8FA293",
  buttonSecondary: "#231A0E",
} as const;

const lightElevation = {
  none: {},
  level1: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  level2: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
};

const darkElevation: typeof lightElevation = {
  none: {},
  level1: {
    shadowColor: darkColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 1,
  },
  level2: {
    shadowColor: darkColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 3,
  },
} as const;

export type AppTheme = {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof lightColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof lightElevation;
  components: typeof components;
};

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((storedMode) => {
      if (storedMode === "light" || storedMode === "dark") setMode(storedMode);
    }).catch(() => undefined);
  }, []);

  const value = useMemo<AppTheme>(() => {
    const isDark = mode === "dark";
    return {
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      elevation: isDark ? darkElevation : lightElevation,
      components,
      toggleTheme: () => {
        setMode((currentMode) => {
          const nextMode = currentMode === "dark" ? "light" : "dark";
          AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
          return nextMode;
        });
      },
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useAppTheme must be used inside ThemeProvider.");
  return theme;
}
