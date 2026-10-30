import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';
import { View, ActivityIndicator } from 'react-native';

function RootNavigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = (segments[0] as string) === 'onboarding';

    if (!isAuthenticated) {
      if (!inAuthGroup && !onOnboarding) {
        AsyncStorage.getItem('has_onboarded').then((hasOnboarded) => {
          if (!hasOnboarded) {
            router.replace('/onboarding');
          } else {
            router.replace('/(auth)/login');
          }
        });
      }
    } else if (isAuthenticated && (inAuthGroup || onOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.dark.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="tasks" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
