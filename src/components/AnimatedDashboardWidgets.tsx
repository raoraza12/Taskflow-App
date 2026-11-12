import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../constants/colors';
import { triggerHaptic } from '../lib/haptics';

interface AnimatedMetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  tagLabel?: string;
  tagBg?: string;
  tagColor?: string;
  value: number | string;
  label: string;
  valueColor: string;
  cardBg: string;
  borderColor: string;
  subtextColor: string;
  cardRadius: number;
  delay?: number;
  onPress?: () => void;
}

export const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  valueColor,
  cardBg,
  borderColor,
  subtextColor,
  cardRadius,
  delay = 0,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(260).springify()}
      style={[{ flex: 1, minWidth: '47%' }, animStyle]}
    >
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          if (onPress) onPress();
        }}
        onPressIn={() => (scale.value = withSpring(0.96, { damping: 14 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
        style={[
          styles.metricCard,
          {
            borderRadius: cardRadius || 18,
            backgroundColor: cardBg,
            borderColor: borderColor,
          },
        ]}
      >
        <View style={styles.metricCardHeader}>
          <View style={[styles.metricIconBox, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          <View style={styles.metricChevronWrap}>
            <Ionicons name="arrow-forward" size={14} color={subtextColor} />
          </View>
        </View>
        <Text style={[styles.metricNum, { color: valueColor }]}>{value}</Text>
        <Text style={[styles.metricLabel, { color: subtextColor }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

interface AnimatedDockButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  iconColor: string;
  iconBg: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  btnRadius: number;
  onPress: () => void;
  badge?: number;
}

export const AnimatedDockButton: React.FC<AnimatedDockButtonProps> = ({
  icon,
  label,
  iconColor,
  iconBg,
  cardBg,
  borderColor,
  textColor,
  btnRadius,
  onPress,
  badge,
}) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      onPressIn={() => (scale.value = withSpring(0.93, { damping: 12 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14 }))}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.dockBtn,
          {
            borderRadius: btnRadius || 14,
            backgroundColor: cardBg,
            borderColor: borderColor,
          },
          animStyle,
        ]}
      >
        <View style={[styles.dockIconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
          {Boolean(badge && badge > 0) && (
            <View style={styles.dockBadgeDot} />
          )}
        </View>
        <Text style={[styles.dockBtnText, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  metricCard: {
    borderWidth: 1,
    padding: Spacing.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricChevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.03)',
  },
  metricNum: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  dockBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  dockIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  dockBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  dockBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
