import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { THEMES } from '../../src/constants/theme';
import { AIAssistantModal } from '../../src/components/AIAssistantModal';
import { FloatingChatButton } from '../../src/components/FloatingChatButton';
import { triggerHaptic } from '../../src/lib/haptics';

export default function TabLayout() {
  const { user, isAppLocked, hasAppLockPin, isLoading, unreadCount, theme } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: currentTheme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  // Not logged in -> redirect to login
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // App is locked -> redirect to lock screen
  if (hasAppLockPin && isAppLocked) {
    return <Redirect href="/(auth)/lock" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenListeners={{
          tabPress: () => {
            triggerHaptic('selection');
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: currentTheme.colors.bgElevated,
            borderTopColor: currentTheme.colors.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 86 : 66,
            paddingBottom: Platform.OS === 'ios' ? 24 : 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: currentTheme.colors.primary,
          tabBarInactiveTintColor: currentTheme.colors.subtext,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
          headerStyle: {
            backgroundColor: currentTheme.colors.bgElevated,
            borderBottomColor: currentTheme.colors.border,
            borderBottomWidth: 1,
          },
          headerTintColor: currentTheme.colors.text,
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="teams"
          options={{
            title: 'Teams',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Alerts',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: Colors.danger, fontSize: 10, fontWeight: '800' },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      {/* Floating Team Group Chat across all screens (Left Side) */}
      <FloatingChatButton />

      {/* Floating Smart AI Agent across all screens (Right Side) */}
      <AIAssistantModal />
    </View>
  );
}
