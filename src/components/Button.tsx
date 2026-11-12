import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { THEMES } from '../constants/theme';
import { triggerHaptic } from '../lib/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost' | 'outline' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  let activeTheme = THEMES.snow;
  try {
    const app = useApp();
    if (app?.theme && THEMES[app.theme]) {
      activeTheme = THEMES[app.theme];
    }
  } catch {}

  const getBackgroundColor = () => {
    if (disabled) return activeTheme.colors.bgSoft;
    switch (variant) {
      case 'primary':
        return activeTheme.colors.primary;
      case 'success':
        return activeTheme.colors.ok;
      case 'danger':
        return activeTheme.colors.danger;
      case 'secondary':
        return activeTheme.colors.bgSoft;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return activeTheme.colors.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return activeTheme.colors.border;
    switch (variant) {
      case 'outline':
        return activeTheme.colors.border;
      case 'secondary':
        return activeTheme.colors.border;
      case 'primary':
        return activeTheme.colors.borderGlow;
      default:
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return activeTheme.colors.subtext;
    switch (variant) {
      case 'outline':
      case 'ghost':
      case 'secondary':
        return activeTheme.colors.text;
      default:
        return Colors.white;
    }
  };

  const paddingVertical = size === 'sm' ? 7 : size === 'lg' ? 14 : 11;
  const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 22 : 16;
  const fontSize = size === 'sm' ? Typography.sm : size === 'lg' ? Typography.body + 1 : Typography.body;

  return (
    <Pressable
      onPress={() => {
        triggerHaptic(variant === 'danger' ? 'warning' : 'light');
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: activeTheme.btnRadius,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          paddingVertical,
          paddingHorizontal,
        },
        pressed && !disabled && !loading && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, { color: getTextColor(), fontSize }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.9,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
});
