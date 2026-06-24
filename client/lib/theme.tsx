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
  background: "#FBF9F5",
  surface: "#FBF9F5",
  surfaceLow: "#F5F3EF",
  surfaceDim: "#DBDAD6",
  surfaceBright: "#FBF9F5",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F5F3EF",
  surfaceContainer: "#EFEEEA",
  surfaceContainerHigh: "#EAE8E4",
  surfaceContainerHighest: "#E4E2DE",
  surfaceVariant: "#E4E2DE",
  cardBackground: "#FFFFFF",
  cardBorder: "#CDC6B8",
  inputBackground: "#FFFFFF",
  inputBorder: "#83764F",
  text: "#1B1C1A",
  muted: "#4B463C",
  subtleText: "#7C776A",
  inverseSurface: "#30312E",
  inverseOnSurface: "#F2F0EC",
  outline: "#7C776A",
  outlineStrong: "#4B463C",
  outlineVariant: "#CDC6B8",
  divider: "#E4E2DE",
  shadow: "#000000",
  scrim: "rgba(0, 0, 0, 0.32)",
  primary: "#695D39",
  primaryContainer: "#83764F",
  primaryText: "#FFFFFF",
  onPrimary: "#FFFFFF",
  onPrimaryContainer: "#070500",
  inversePrimary: "#D6C699",
  primaryFixed: "#F3E1B3",
  primaryFixedDim: "#D6C699",
  buttonPrimary: "#83764F",
  secondary: "#605D62",
  secondaryContainer: "#E5E1E7",
  secondaryFixed: "#E5E1E7",
  secondaryFixedDim: "#C9C5CB",
  onSecondary: "#FFFFFF",
  onSecondaryContainer: "#666368",
  tertiary: "#5C5C5C",
  tertiaryContainer: "#747474",
  tertiaryFixedDim: "#C7C6C6",
  onTertiary: "#FFFFFF",
  onTertiaryContainer: "#FEFCFC",
  danger: "#BA1A1A",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",
  success: "#695D39",
  successContainer: "#F3E1B3",
  warning: "#83764F",
  warningContainer: "#F3E1B3",
  info: "#695D39",
  infoContainer: "#EFEEEA",
  bottomNavBackground: "#FFFFFF",
  bottomNavActive: "#695D39",
  bottomNavInactive: "#4B463C",
  tabInactive: "#4B463C",
  buttonSecondary: "#EFEEEA",
  navActiveSurface: "#F3E1B3",
  glassSurface: "rgba(255, 255, 255, 0.72)",
  salesCard: "#695D39",
  salesCardAlt: "#514623",
  purchaseCard: "#83764F",
  purchaseCardAlt: "#514623",
};

const darkColors: typeof lightColors = {
  background: "#213145",
  surface: "#213145",
  surfaceLow: "#1B2B3F",
  surfaceDim: "#0B1C30",
  surfaceBright: "#26364B",
  surfaceContainerLowest: "#1B2B3F",
  surfaceContainerLow: "#213145",
  surfaceContainer: "#26364B",
  surfaceContainerHigh: "#D3E4FE",
  surfaceContainerHighest: "#3A4A60",
  surfaceVariant: "#3A4A60",
  cardBackground: "rgba(33, 49, 69, 0.6)",
  cardBorder: "rgba(211, 228, 254, 0.1)",
  inputBackground: "#1B2B3F",
  inputBorder: "#3A4A60",
  text: "#EAF1FF",
  muted: "#BEC9C6",
  subtleText: "#9DADBA",
  inverseSurface: "#D3E3FF",
  inverseOnSurface: "#0B1C30",
  outline: "#9DADBA",
  outlineStrong: "#D3E4FE",
  outlineVariant: "rgba(211, 228, 254, 0.16)",
  divider: "rgba(211, 228, 254, 0.1)",
  shadow: "#000000",
  scrim: "rgba(0, 0, 0, 0.64)",
  primary: "#85D5C9",
  primaryContainer: "#008378",
  primaryText: "#004E47",
  onPrimary: "#FFFFFF",
  onPrimaryContainer: "#93E4D8",
  inversePrimary: "#00685F",
  primaryFixed: "#A1F1E5",
  primaryFixedDim: "#D3E4FE",
  buttonPrimary: "#00685F",
  secondary: "#FCBA66",
  secondaryContainer: "#A36700",
  secondaryFixed: "#FFDBB2",
  secondaryFixedDim: "#FFB95F",
  onSecondary: "#452B00",
  onSecondaryContainer: "#FFFBFF",
  tertiary: "#FCBA66",
  tertiaryContainer: "#A36700",
  tertiaryFixedDim: "#FFFFF0",
  onTertiary: "#0B1C30",
  onTertiaryContainer: "#FFCB8F",
  danger: "#FFB4AB",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  success: "#85D5C9",
  successContainer: "rgba(0, 104, 95, 0.24)",
  warning: "#FCBA66",
  warningContainer: "rgba(163, 103, 0, 0.24)",
  info: "#85D5C9",
  infoContainer: "#26364B",
  bottomNavBackground: "#213145",
  bottomNavActive: "#85D5C9",
  bottomNavInactive: "#BEC9C6",
  tabInactive: "#BEC9C6",
  buttonSecondary: "#1B2B3F",
  navActiveSurface: "#00685F",
  glassSurface: "rgba(33, 49, 69, 0.6)",
  salesCard: "#008378",
  salesCardAlt: "#004D47",
  purchaseCard: "#A36700",
  purchaseCardAlt: "#5D3A00",
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
