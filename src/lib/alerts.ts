import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      // Find confirm action
      const confirmAction = buttons.find(
        (b) => b.style === 'destructive' || b.text === 'Delete' || b.text === 'Leave' || b.text === 'Confirm' || b.text === 'Log Out'
      ) || buttons[buttons.length - 1];

      const fullMessage = message ? `${title}\n\n${message}` : title;
      if (typeof window !== 'undefined' && window.confirm(fullMessage)) {
        if (confirmAction?.onPress) confirmAction.onPress();
      }
    } else {
      const fullMessage = message ? `${title}\n\n${message}` : title;
      if (typeof window !== 'undefined') {
        window.alert(fullMessage);
      }
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

