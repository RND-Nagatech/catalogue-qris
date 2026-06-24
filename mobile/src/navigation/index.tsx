import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import FavoriteScreen from '../screens/FavoriteScreen';
import ImageSearchScreen from '../screens/ImageSearchScreen';
import { colors, typography, borderRadius } from '../theme';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainer,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : (56 + Math.max(insets.bottom, 16)),
        },
        tabBarLabelStyle: {
          ...typography.labelSm,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: borderRadius.md,
          marginHorizontal: 8,
          marginVertical: 4,
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Produk',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'diamond' : 'diamond-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="FavoriteTab"
        component={FavoriteScreen}
        options={{
          tabBarLabel: 'Favorite',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ImageSearchTab"
        component={ImageSearchScreen}
        options={{
          tabBarLabel: 'Cari Gambar',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'camera' : 'camera-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={TabNavigator} />
        <RootStack.Screen
          name="ProductDetail"
          component={ProductDetailScreen as any}
          options={{ animation: 'slide_from_right' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
