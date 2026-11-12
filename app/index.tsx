import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';
import { fetchGoogleProfileWithToken } from '../src/lib/googleAuth';

export default function Index() {
  const { user, isAppLocked, hasAppLockPin, isLoading, loginWithGoogle } = useApp();
  const [processingToken, setProcessingToken] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname);
        setProcessingToken(true);
        fetchGoogleProfileWithToken(accessToken)
          .then(async (profile) => {
            await loginWithGoogle({
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              google_id: profile.googleId,
            });
          })
          .catch((err) => {
            console.error('Failed to authenticate Google token', err);
          })
          .finally(() => {
            setProcessingToken(false);
          });
      }
    }
  }, []);

  if (isLoading || processingToken) {
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

