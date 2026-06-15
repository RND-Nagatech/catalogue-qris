import { Tabs } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useAppTheme } from "../lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootTabs />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootTabs() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: theme.colors.background },
          tabBarActiveTintColor: theme.colors.primaryContainer,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
            height: 72,
            paddingBottom: 10,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Beranda",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            title: "Penjualan",
            tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="purchases"
          options={{
            title: "Pembelian",
            tabBarIcon: ({ color, size }) => <Ionicons name="bag-check-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Riwayat",
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Pengaturan",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
          }}
        />
      </Tabs>
    </>
  );
}
