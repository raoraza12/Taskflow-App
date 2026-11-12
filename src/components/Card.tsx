import React from 'react';
import { StyleSheet, View, ViewStyle, Pressable, StyleProp, Platform } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { THEMES } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
}) => {
  let activeTheme = THEMES.snow;
  try {
    const app = useApp();
    if (app?.theme && THEMES[app.theme]) {
      activeTheme = THEMES[app.theme];
    }
  } catch {
    // Fallback if rendered outside AppProvider
  }

  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
        return activeTheme.colors.bgElevated;
      case 'bordered':
        return activeTheme.colors.bg;
      case 'glass':
        return activeTheme.key === 'tactile'
          ? 'rgba(19, 25, 38, 0.85)'
          : activeTheme.colors.bgElevated;
      default:
        return activeTheme.colors.bgElevated;
    }
  };

  const dynamicCardStyle: ViewStyle = {
    borderRadius: activeTheme.cardRadius,
    borderColor:
      variant === 'glass' && activeTheme.key === 'tactile'
        ? activeTheme.colors.borderGlow
        : activeTheme.colors.border,
    ...(activeTheme.key === 'snow'
      ? {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }
      : {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          dynamicCardStyle,
          { backgroundColor: getBackgroundColor() },
          variant === 'bordered' ? styles.bordered : null,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        dynamicCardStyle,
        { backgroundColor: getBackgroundColor() },
        variant === 'bordered' ? styles.bordered : null,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  bordered: {
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
