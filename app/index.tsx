import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

export default function Index() {
  const { user, isAppLocked, hasAppLockPin, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (hasAppLockPin && isAppLocked) {
    return <Redirect href="/(auth)/lock" />;
  }

  return <Redirect href="/(tabs)" />;
}

