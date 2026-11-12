import React from 'react';
import { StyleSheet, View, Text, ScrollView, ViewStyle, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radius } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { THEMES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { triggerHaptic } from '../lib/haptics';

interface ScreenWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  title,
  subtitle,
  headerRight,
  showBack = false,
  onBack,
  scrollable = true,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
}) => {
  const router = useRouter();
  let activeTheme = THEMES.snow;
  try {
    const app = useApp();
    if (app?.theme && THEMES[app.theme]) {
      activeTheme = THEMES[app.theme];
    }
  } catch {}

  const handleBack = () => {
    triggerHaptic('light');
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const content = (
    <>
      {(title || subtitle || headerRight || showBack) && (
        <Animated.View entering={FadeInDown.duration(280).springify()} style={styles.header}>
          <View style={styles.headerLeftCol}>
            {showBack && (
              <TouchableOpacity
                onPress={handleBack}
                style={[
                  styles.backBtn,
                  {
                    backgroundColor: activeTheme.colors.bgElevated,
                    borderColor: activeTheme.colors.border,
                  },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color={activeTheme.colors.text} />
              </TouchableOpacity>
            )}
            <View style={styles.titleContainer}>
              {title && <Text style={[styles.title, { color: activeTheme.colors.text }]} numberOfLines={1}>{title}</Text>}
              {subtitle && <Text style={[styles.subtitle, { color: activeTheme.colors.subtext }]} numberOfLines={1}>{subtitle}</Text>}
            </View>
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </Animated.View>
      )}
      {children}
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.bg }, style]}>
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          overScrollMode="never"
          scrollEventThrottle={16}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={activeTheme.colors.primary}
                colors={[activeTheme.colors.primary]}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.nonScroll, contentContainerStyle]}>
          {content}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  nonScroll: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.title,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.body,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexShrink: 0,
  },
});

