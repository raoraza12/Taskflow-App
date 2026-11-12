import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';

export default function AuthLayout() {
  const { user, isAppLocked, hasAppLockPin, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // If user is already logged in and app is not locked, send to main app
  if (user && (!hasAppLockPin || !isAppLocked)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    />
  );
}
