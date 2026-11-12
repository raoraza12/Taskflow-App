import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error';

/**
 * Universal Haptic Engine for iOS, Android, and Web
 * Provides silky tactile feedback on taps, checks, gestures, and audio recordings.
 */
export const triggerHaptic = (type: HapticType = 'light') => {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (type === 'light' || type === 'selection') {
          navigator.vibrate(8);
        } else if (type === 'medium') {
          navigator.vibrate(18);
        } else if (type === 'heavy' || type === 'success') {
          navigator.vibrate([12, 35, 12]);
        } else if (type === 'error') {
          navigator.vibrate([25, 45, 25]);
        }
      } catch {}
    }
    return;
  }

  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {}
};

