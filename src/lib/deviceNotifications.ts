import * as Notifications from 'expo-notifications';
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
} catch (e) {
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
 * Triggers a real native device push/banner notification immediately
 * Visible in Android notification bar, lock screen, iOS banner, and browser notification
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
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('[DeviceNotification] Native notification dispatch error:', err);
  }
}
