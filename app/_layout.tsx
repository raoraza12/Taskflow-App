import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const router = useRouter();

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
      } catch {
        // Silently continue if network is unavailable
      }
    }
    checkForOTAUpdates();
  }, []);

  // Direct tap-to-open navigation from OS notification banners
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const routeFromData = (data: Record<string, any> | undefined) => {
      if (!data) return;
      if (data.taskId) {
        router.push({ pathname: '/tasks/edit', params: { taskId: String(data.taskId) } });
      } else if (data.kind === 'chat_mention' || data.kind === 'chat_message') {
        router.push({
          pathname: '/teams/chat',
          params: data.teamId ? { teamId: String(data.teamId) } : undefined,
        });
      } else if (
        data.kind === 'join_request' ||
        data.kind === 'join_result' ||
        data.kind === 'team_joined' ||
        data.kind === 'team_left' ||
        data.kind === 'team_deleted' ||
        data.kind === 'member_removed' ||
        data.kind === 'teammate_request' ||
        data.kind === 'teammate_accepted'
      ) {
        router.push('/(tabs)/teams');
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response?.notification?.request?.content?.data) {
          routeFromData(response.notification.request.content.data as Record<string, any>);
        }
      })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromData(response?.notification?.request?.content?.data as Record<string, any>);
    });

    return () => sub.remove();
  }, [router]);
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
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
