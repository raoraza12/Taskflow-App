import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../lib/haptics';

export const FloatingChatButton: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { chatMessages, teams } = useApp();

  // Floating button subtle pulse
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1300 }),
        withTiming(1, { duration: 1300 })
      ),
      -1,
      true
    );
  }, []);

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Do not show on the chat screen itself
  if (pathname && (pathname.includes('/chat') || pathname.includes('teams/chat'))) {
    return null;
  }

  const messageCount = chatMessages.length;

  return (
    <View style={styles.fabContainer}>
      <Animated.View style={animatedFabStyle}>
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => {
            triggerHaptic('light');
            router.push('/(tabs)/chat');
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#059669', '#10b981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="chatbubbles" size={22} color="#ffffff" />
            <View style={styles.fabOnlineDot} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 80,
    left: 18,
    zIndex: 9999,
  },
  fabBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fabOnlineDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#3b82f6',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});

