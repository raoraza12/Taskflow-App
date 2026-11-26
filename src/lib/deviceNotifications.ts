import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'TaskFlow Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4f46e5',
      sound: 'default',
    });
  }
} catch {
  // Suppress in testing / SSR environments
}

/**
 * Request real device notification permission from OS (Android 13+, iOS, and Web)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') return true;
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Register device for remote Expo Push Notifications (Android FCM / iOS APNs).
 * Returns null gracefully if running on web or before native FCM credentials are configured.
 */
export async function registerForExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      'f237c84d-7db7-4332-888f-1eba25b03dac';

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenRes?.data || null;
  } catch {
    return null;
  }
}

/**
 * Triggers a real native device push/banner notification immediately.
 * Visible in Android notification bar, lock screen, iOS banner, and browser notification.
 */
export async function triggerDeviceNotification(input: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(input.title, {
          body: input.body,
          icon: '/favicon.png',
        });
      }
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        data: input.data || {},
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      } as any,
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('[DeviceNotification] Native notification dispatch error:', err);
  }
}
