import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FAFAFA" },
          headerTitleStyle: { fontWeight: "700", color: "#0F172A" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#FAFAFA" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "QRIS Generator" }} />
        <Stack.Screen name="settings" options={{ title: "Pengaturan" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
