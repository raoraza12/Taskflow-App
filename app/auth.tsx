import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '../src/context/AppContext';
import { Colors, Typography, Spacing } from '../src/constants/colors';
import { fetchGoogleProfileWithToken } from '../src/lib/googleAuth';

/**
 * Dedicated OAuth Deep Link Callback Route (handles taskflow://auth#access_token=...)
 * Prevents Expo Router "Unmatched Route" flashes when Android/iOS Chrome returns to the app.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string }>();
  const url = Linking.useURL();
  const { user, isAppLocked, hasAppLockPin, loginWithGoogle } = useApp();
  const [statusText, setStatusText] = useState('Completing Google sign-in...');

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      let token = typeof params.access_token === 'string' ? params.access_token : '';

      if (!token) {
        const candidateUrl = url || (await Linking.getInitialURL()) || '';
        if (candidateUrl.includes('access_token=')) {
          const hashPart = candidateUrl.includes('#') ? candidateUrl.split('#')[1] : '';
          const queryPart = candidateUrl.includes('?') ? candidateUrl.split('?')[1].split('#')[0] : '';
          const searchParams = new URLSearchParams(hashPart || queryPart);
          token = searchParams.get('access_token') || '';
        }
      }

      if (!token) {
        if (user) {
          router.replace(hasAppLockPin && isAppLocked ? '/(auth)/lock' : '/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
        return;
      }

      try {
        const profile = await fetchGoogleProfileWithToken(token);
        const res = await loginWithGoogle({
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          google_id: profile.googleId,
        });

        if (!active) return;

        if (Platform.OS !== 'web') {
          try {
            await WebBrowser.dismissAuthSession();
          } catch {}
        }

        if (res.ok) {
          router.replace(hasAppLockPin && isAppLocked ? '/(auth)/lock' : '/(tabs)');
        } else {
          setStatusText(res.error || 'Google sign-in failed');
          setTimeout(() => router.replace('/(auth)/login'), 1200);
        }
      } catch {
        if (active) {
          router.replace('/(auth)/login');
        }
      }
    }

    completeAuth();
    return () => {
      active = false;
    };
  }, [url, params.access_token, user, hasAppLockPin, isAppLocked, loginWithGoogle, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
        gap: Spacing.md,
      }}
    >
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ fontSize: Typography.body, fontWeight: '600', color: Colors.subtext }}>
        {statusText}
      </Text>
    </View>
  );
}
