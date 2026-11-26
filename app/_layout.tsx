import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import * as Updates from 'expo-updates';

export default function RootLayout() {
  // Silent background Over-The-Air (OTA) updates check on app launch
  useEffect(() => {
    async function checkForOTAUpdates() {
      if (__DEV__ || Platform.OS === 'web') return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (_) {
        // Silently continue if network is unavailable
      }
    }
    checkForOTAUpdates();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar style="dark" />
      <AppProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: Colors.bgElevated },
            headerTintColor: Colors.text,
            contentStyle: { backgroundColor: Colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="admin/index"
            options={{ title: 'Super Admin Portal', headerShown: false }}
          />
          <Stack.Screen
            name="teams/chat"
            options={{ title: 'Team Group Discussion', headerShown: false }}
          />
          <Stack.Screen
            name="tasks/create"
            options={{ title: 'New Task', headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="tasks/edit"
            options={{ title: 'Edit Task', headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="tasks/search"
            options={{ title: 'Search Tasks', headerShown: false }}
          />
          <Stack.Screen
            name="tasks/kanban"
            options={{ title: 'Kanban Board', headerShown: false }}
          />
          <Stack.Screen
            name="tasks/calendar"
            options={{ title: 'Calendar View', headerShown: false }}
          />
          <Stack.Screen
            name="demo/ui-styles"
            options={{ title: 'UI Design Showcase', headerShown: false, presentation: 'modal' }}
          />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
