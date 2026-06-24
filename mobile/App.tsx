import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import ExpoInAppUpdates from 'expo-in-app-updates';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import AppNavigator from './src/navigation';
import { FavoritesProvider } from './src/hooks/FavoritesContext';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  // In-app update check — jalan setelah font loaded
  useEffect(() => {
    if (!fontsLoaded) return;
    const check = async () => {
      try {
        if (Platform.OS === 'android') {
          // Android: langsung check & start, native tentukan flexible/immediate
          await ExpoInAppUpdates.checkAndStartUpdate();
        } else {
          // iOS: cukup check, user diarahkan ke App Store manual
          await ExpoInAppUpdates.checkForUpdate();
        }
      } catch {
        // Silent fail — jangan ganggu UX
      }
    };
    // Delay sedikit agar UI sudah render
    const t = setTimeout(check, 2000);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StatusBar style="dark" translucent={false} backgroundColor={colors.background} />
      <FavoritesProvider>
        <AppNavigator />
      </FavoritesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
