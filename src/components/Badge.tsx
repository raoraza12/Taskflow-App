import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle, Platform } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { THEMES } from '../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'cyan';
  style?: ViewStyle;
  textStyle?: TextStyle;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  style,
  textStyle,
  dot,
}) => {
  let activeTheme = THEMES.snow;
  try {
    const app = useApp();
    if (app?.theme && THEMES[app.theme]) {
      activeTheme = THEMES[app.theme];
    }
  } catch {}

  const isSaas = activeTheme.key === 'saas';
  const isVibrant = activeTheme.key === 'vibrant';

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: activeTheme.colors.okLight, text: activeTheme.colors.ok, border: activeTheme.colors.okLight };
      case 'warning':
        return { bg: activeTheme.colors.warnLight, text: activeTheme.colors.warn, border: activeTheme.colors.warnLight };
      case 'danger':
        return { bg: activeTheme.colors.dangerLight, text: activeTheme.colors.danger, border: activeTheme.colors.dangerLight };
      case 'cyan':
        return { bg: activeTheme.colors.secondaryLight, text: activeTheme.colors.secondary, border: activeTheme.colors.secondaryLight };
      case 'muted':
        return { bg: activeTheme.colors.bgSoft, text: activeTheme.colors.subtext, border: activeTheme.colors.border };
      default:
        return { bg: activeTheme.colors.primaryLight, text: activeTheme.colors.primary, border: activeTheme.colors.borderGlow };
    }
  };

  const { bg, text, border } = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: isSaas ? '#475569' : border,
          borderRadius: isSaas ? 4 : isVibrant ? 20 : Radius.full,
          paddingHorizontal: isSaas ? 7 : 10,
          paddingVertical: isSaas ? 2 : 4,
        },
        style,
      ]}
    >
      {dot && !isSaas && <View style={[styles.dot, { backgroundColor: text }]} />}
      <Text
        style={[
          styles.text,
          { color: text },
          isSaas && {
            fontSize: 10,
            fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          },
          textStyle,
        ]}
      >
        {isVibrant && variant === 'danger' ? `🔥 ${label}` : label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: Typography.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
});
