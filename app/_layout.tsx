import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
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
