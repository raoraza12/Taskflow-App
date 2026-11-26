import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../src/constants/colors';
import { fetchGoogleProfileWithToken } from '../src/lib/googleAuth';

export default function Index() {
  const { user, isAppLocked, hasAppLockPin, isLoading, loginWithGoogle } = useApp();
  const [processingToken, setProcessingToken] = useState(false);
  const [nativeReturnInfo, setNativeReturnInfo] = useState<{
    deepLinkUrl: string;
    intentUrl: string;
    accessToken: string;
  } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const combined = `${hash}${search}`;
    if (!hash || !hash.includes('access_token')) return;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    if (!accessToken) return;

    // If opened inside Android/iOS native app Chrome Custom Tab, NEVER auto-consume onto web SPA
    if (combined.includes('state=native_app')) {
      const deepLinkUrl = `taskflow://auth${hash}`;
      const intentUrl = `intent://auth${hash}#Intent;scheme=taskflow;package=com.taskflow.app;end`;
      setNativeReturnInfo({ deepLinkUrl, intentUrl, accessToken });
      return;
    }

    // If opened as Google OAuth popup by web login page
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_TOKEN', accessToken }, '*');
        window.close();
        return;
      } catch (e) {
        console.error('Failed to postMessage to opener:', e);
      }
    }

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
  }, [loginWithGoogle]);

  if (nativeReturnInfo && Platform.OS === 'web') {
    const isAndroid =
      typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    const targetUrl = isAndroid ? nativeReturnInfo.intentUrl : nativeReturnInfo.deepLinkUrl;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.bgElevated,
            borderRadius: Radius.xl,
            padding: Spacing.xl,
            maxWidth: 400,
            width: '100%',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: Colors.okLight,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: Spacing.md,
            }}
          >
            <Ionicons name="checkmark-circle" size={38} color={Colors.secondary} />
          </View>
          <Text style={{ fontSize: Typography.heading, fontWeight: '800', color: Colors.text, textAlign: 'center' }}>
            Google Sign-In Verified
          </Text>
          <Text
            style={{
              fontSize: Typography.body,
              lineHeight: 21,
              color: Colors.subtext,
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            Tap below to return directly into your TaskFlow mobile app session.
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.location.href = targetUrl;
              }
            }}
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: Radius.lg,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              Return to TaskFlow App
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              const token = nativeReturnInfo.accessToken;
              setNativeReturnInfo(null);
              setProcessingToken(true);
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', window.location.pathname);
              }
              try {
                const profile = await fetchGoogleProfileWithToken(token);
                await loginWithGoogle({
                  email: profile.email,
                  name: profile.name,
                  picture: profile.picture,
                  google_id: profile.googleId,
                });
              } finally {
                setProcessingToken(false);
              }
            }}
            style={{ marginTop: 18, paddingVertical: 8 }}
          >
            <Text style={{ color: Colors.subtext, fontSize: 13, fontWeight: '600' }}>
              Continue in Web Browser instead
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
