import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ThemeMode = "light" | "dark";

type AppTheme = {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    background: string;
    surface: string;
    surfaceLow: string;
    text: string;
    muted: string;
    outline: string;
    outlineStrong: string;
    primary: string;
    primaryContainer: string;
    primaryText: string;
    secondary: string;
    secondaryContainer: string;
    danger: string;
    tabInactive: string;
  };
};

const THEME_STORAGE_KEY = "@app_theme_mode";

const lightColors = {
  background: "#F7F9FB",
  surface: "#FFFFFF",
  surfaceLow: "#F2F4F6",
  text: "#191C1E",
  muted: "#3F4944",
  outline: "#BEC9C2",
  outlineStrong: "#6F7973",
  primary: "#004532",
  primaryContainer: "#065F46",
  primaryText: "#FFFFFF",
  secondary: "#904D00",
  secondaryContainer: "#FE932C",
  danger: "#BA1A1A",
  tabInactive: "#9CA3AF",
};

const darkColors = {
  background: "#0B1326",
  surface: "#162036",
  surfaceLow: "#1A2438",
  text: "#F1F5F9",
  muted: "#94A3B8",
  outline: "#334155",
  outlineStrong: "#475569",
  primary: "#10B981",
  primaryContainer: "#10B981",
  primaryText: "#FFFFFF",
  secondary: "#F59E0B",
  secondaryContainer: "#78350F",
  danger: "#EF4444",
  tabInactive: "#94A3B8",
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
