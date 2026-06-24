import { Tabs } from "expo-router";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { ThemeProvider, useAppTheme } from "../lib/theme";
import { NagagoldConfigProvider } from "../lib/nagagoldConfig";
import { createBottomTabScreenOptions } from "../components/ui";

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ color, focused, icon, activeIcon }: { color: string; focused: boolean; icon: IconName; activeIcon?: IconName }) {
  const theme = useAppTheme();

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: focused ? theme.colors.primaryContainer : "transparent",
        borderRadius: 999,
        height: 30,
        justifyContent: "center",
        minWidth: 44,
        paddingHorizontal: 12,
      }}
    >
      <Ionicons name={focused ? activeIcon ?? icon : icon} color={color} size={21} />
    </View>
  );
}

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
        initialRouteName="catalogue"
        screenOptions={createBottomTabScreenOptions(theme, insets.bottom)}
      >
        <Tabs.Screen
          name="catalogue"
          options={{
            title: "Produk",
            tabBarIcon: ({ color, focused }) => <TabIcon icon="diamond-outline" activeIcon="diamond" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="image-search"
          options={{
            title: "Pindai",
            tabBarIcon: ({ color, focused }) => <TabIcon icon="camera-outline" activeIcon="camera" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            title: "Jual",
            tabBarIcon: ({ color, focused }) => <TabIcon icon="cash-outline" activeIcon="cash" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="purchases"
          options={{
            title: "Beli",
            tabBarIcon: ({ color, focused }) => <TabIcon icon="bag-check-outline" activeIcon="bag-check" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Kelola",
            tabBarIcon: ({ color, focused }) => <TabIcon icon="settings-outline" activeIcon="settings" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
      </Tabs>
    </>
  );
}
