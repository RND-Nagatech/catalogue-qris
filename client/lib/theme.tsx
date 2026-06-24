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
  background: "#17140F",
  surface: "#17140F",
  surfaceLow: "#1E1A13",
  surfaceDim: "#0E0C08",
  surfaceBright: "#2A251A",
  surfaceContainerLowest: "#1E1A13",
  surfaceContainerLow: "#262116",
  surfaceContainer: "#312A1B",
  surfaceContainerHigh: "#3B3321",
  surfaceContainerHighest: "#473D28",
  surfaceVariant: "#473D28",
  cardBackground: "#211C14",
  cardBorder: "#5B5036",
  inputBackground: "#211C14",
  inputBorder: "#8F8056",
  text: "#F6F0E4",
  muted: "#D0C6AE",
  subtleText: "#AFA58F",
  inverseSurface: "#F6F0E4",
  inverseOnSurface: "#17140F",
  outline: "#AFA58F",
  outlineStrong: "#E1D6BB",
  outlineVariant: "#5B5036",
  divider: "#3B3321",
  shadow: "#000000",
  scrim: "rgba(0, 0, 0, 0.68)",
  primary: "#D6C699",
  primaryContainer: "#5C5032",
  primaryText: "#17140F",
  onPrimary: "#17140F",
  onPrimaryContainer: "#F6E5B6",
  inversePrimary: "#695D39",
  primaryFixed: "#F3E1B3",
  primaryFixedDim: "#D6C699",
  buttonPrimary: "#D6C699",
  secondary: "#E8B86B",
  secondaryContainer: "#5A3D15",
  secondaryFixed: "#FFE0AE",
  secondaryFixedDim: "#E8B86B",
  onSecondary: "#211300",
  onSecondaryContainer: "#FFE0AE",
  tertiary: "#C9C1AE",
  tertiaryContainer: "#514623",
  tertiaryFixedDim: "#D7D0C0",
  onTertiary: "#17140F",
  onTertiaryContainer: "#F4E8C4",
  danger: "#FFB4AB",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#5E1515",
  onErrorContainer: "#FFDAD6",
  success: "#D6C699",
  successContainer: "#3D3523",
  warning: "#E8B86B",
  warningContainer: "#4B3518",
  info: "#D6C699",
  infoContainer: "#312A1B",
  bottomNavBackground: "#1E1A13",
  bottomNavActive: "#D6C699",
  bottomNavInactive: "#C8BFA9",
  tabInactive: "#C8BFA9",
  buttonSecondary: "#312A1B",
  navActiveSurface: "#3D3523",
  glassSurface: "rgba(30, 26, 19, 0.72)",
  salesCard: "#5C5032",
  salesCardAlt: "#3D3523",
  purchaseCard: "#5A3D15",
  purchaseCardAlt: "#3A2811",
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
