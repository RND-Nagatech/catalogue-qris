import { Tabs } from "expo-router";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useAppTheme } from "../lib/theme";
import { NagagoldConfigProvider } from "../lib/nagagoldConfig";
import { createBottomTabScreenOptions } from "../components/ui";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NagagoldConfigProvider>
          <RootTabs />
        </NagagoldConfigProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootTabs() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={createBottomTabScreenOptions(theme, insets.bottom)}
      >
        <Tabs.Screen
          name="catalogue"
          options={{
            title: "Catalogue",
            tabBarIcon: ({ color, size }) => <Ionicons name="diamond-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="image-search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, size }) => <Ionicons name="camera-outline" color={color} size={size} />,
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
          name="settings"
          options={{
            title: "Setting",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null,
            title: "Beranda",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            href: null,
            title: "Riwayat",
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
          }}
        />
      </Tabs>
    </>
  );
}
