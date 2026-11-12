import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { Button } from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function LockScreen() {
  const {
    user,
    users,
    hasAppLockPin,
    unlockApp,
    setAppLockPin,
    resetAppLockPin,
    sendPasswordResetOTP,
    verifyPasswordResetOTP,
    resetPasswordWithOTP,
    logout,
  } = useApp();
  const router = useRouter();

  // Primary Lock Screen States
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [error, setError] = useState('');

  // 3-Step Email OTP Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1);
  const [resetEmail, setResetEmail] = useState(user?.email || (users[0]?.email || ''));
  const [otpCode, setOtpCode] = useState('');
  const [simulatedEmailCode, setSimulatedEmailCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Countdown timer for OTP Resend
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Update default email when user changes
  useEffect(() => {
    if (user?.email) {
      setResetEmail(user.email);
    }
  }, [user?.email]);

  // Reanimated Horizontal Shake for Incorrect Password
  const shakeOffset = useSharedValue(0);
  const shakeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const triggerShake = () => {
    shakeOffset.value = withSequence(
      withTiming(-14, { duration: 50 }),
      withTiming(14, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleUnlock = () => {
    setError('');
    if (!pin.trim()) {
      setError('Please enter your password');
      triggerShake();
      return;
    }
    const success = unlockApp(pin);
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError('Incorrect App Password. Please try again.');
      triggerShake();
    }
  };

  const handleSetPin = async () => {
    setError('');
    if (pin.length < 4) {
      setError('Password must be at least 4 characters');
      triggerShake();
      return;
    }
    if (pin !== confirmPin) {
      setError('Passwords do not match');
      triggerShake();
      return;
    }
    await setAppLockPin(pin);
    router.replace('/(tabs)');
  };

  // Open Forgot Password Modal
  const openForgotModal = () => {
    setOtpStep(1);
    setOtpError('');
    setOtpCode('');
    setSimulatedEmailCode(null);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetEmail(user?.email || (users[0]?.email || ''));
    setShowForgotModal(true);
  };

  // Step 1: Send OTP to Email
  const handleSendOTP = async () => {
    setOtpError('');
    if (!resetEmail.trim()) {
      setOtpError('Please enter your registered email address.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await sendPasswordResetOTP(resetEmail.trim());
      if (res.ok && res.code) {
        setSimulatedEmailCode(res.code);
        setOtpStep(2);
        setCountdown(45); // 45 seconds countdown
      } else {
        setOtpError(res.error || 'Failed to send verification code.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOTP = () => {
    setOtpError('');
    if (!otpCode.trim()) {
      setOtpError('Please enter the 6-digit code received on your email.');
      return;
    }

    const verification = verifyPasswordResetOTP(resetEmail, otpCode.trim());
    if (verification.ok) {
      setOtpStep(3);
    } else {
      setOtpError(verification.error || 'Invalid code.');
    }
  };

  // Step 3: Set New Password & Unlock App
  const handleFinalizeReset = async () => {
    setOtpError('');
    if (newPassword.length < 4) {
      setOtpError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setOtpError('New passwords do not match.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await resetPasswordWithOTP(resetEmail, otpCode, newPassword);
      if (res.ok) {
        setResetSuccess(true);
        setTimeout(() => {
          setShowForgotModal(false);
          setResetSuccess(false);
          router.replace('/(tabs)');
        }, 800);
      } else {
        setOtpError(res.error || 'Failed to reset password.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={[styles.content, shakeAnimStyle]}
        >
          {/* Animated Icon Badge */}
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={38} color={Colors.primary} />
          </View>

          <Text style={styles.title}>
            {hasAppLockPin ? 'App Locked' : 'Set App Lock Password'}
          </Text>
          <Text style={styles.subtitle}>
            {hasAppLockPin
              ? 'Enter your private App Password to unlock TaskFlow'
              : 'Protect your team workspace with a 4+ digit secure app password'}
          </Text>

          <View style={styles.card}>
            {/* User Preview Chip */}
            {user && (
              <View style={styles.userChip}>
                {user.picture ? (
                  <Image source={{ uri: user.picture }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Text style={styles.userAvatarText}>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>
                <View style={styles.verifiedDot}>
                  <Ionicons name="checkmark-circle" size={15} color={Colors.ok} />
                </View>
              </View>
            )}

            {/* Primary Password Input with Eye Toggle */}
            <Text style={styles.inputLabel}>{hasAppLockPin ? 'Password' : 'New Password'}</Text>
            <View style={[styles.passwordFieldWrap, error ? styles.passwordFieldError : null]}>
              <Ionicons name="key-outline" size={18} color={Colors.muted} style={styles.inputLeftIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password..."
                placeholderTextColor={Colors.subtext}
                value={pin}
                onChangeText={(text) => {
                  setPin(text);
                  if (error) setError('');
                }}
                secureTextEntry={!showPin}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={hasAppLockPin ? handleUnlock : undefined}
              />
              <TouchableOpacity
                onPress={() => setShowPin(!showPin)}
                style={styles.eyeToggleBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPin ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={showPin ? Colors.primary : Colors.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password (when initially setting PIN) */}
            {!hasAppLockPin && (
              <>
                <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>Confirm Password</Text>
                <View style={styles.passwordFieldWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={Colors.muted} style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter password..."
                    placeholderTextColor={Colors.subtext}
                    value={confirmPin}
                    onChangeText={(text) => {
                      setConfirmPin(text);
                      if (error) setError('');
                    }}
                    secureTextEntry={!showConfirmPin}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                    style={styles.eyeToggleBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={showConfirmPin ? Colors.primary : Colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <Button
              title={hasAppLockPin ? 'Unlock App' : 'Save & Unlock'}
              icon={<Ionicons name="lock-open-outline" size={18} color="#ffffff" />}
              onPress={hasAppLockPin ? handleUnlock : handleSetPin}
              style={styles.btn}
            />

            {/* Forgot Password Link Button */}
            {hasAppLockPin && (
              <TouchableOpacity
                onPress={openForgotModal}
                style={styles.forgotBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="mail-outline" size={16} color={Colors.primary} />
                <Text style={styles.forgotText}>Forgot App Password? (Verify with Email)</Text>
              </TouchableOpacity>
            )}

            {/* Sign Out / Switch Account */}
            <Button
              title="Sign Out / Switch Account"
              variant="ghost"
              icon={<Ionicons name="log-out-outline" size={16} color={Colors.subtext} />}
              onPress={() => {
                logout();
                router.replace('/(auth)/login');
              }}
              style={styles.logoutBtn}
              textStyle={{ color: Colors.subtext, fontSize: 13 }}
            />
          </View>
        </Animated.View>

        {/* 3-Step Email OTP Forgot Password Modal */}
        <Modal visible={showForgotModal} transparent animationType="fade" onRequestClose={() => setShowForgotModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowForgotModal(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrap}>
                  <Ionicons
                    name={otpStep === 1 ? 'mail' : otpStep === 2 ? 'keypad' : 'shield-checkmark'}
                    size={22}
                    color={Colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.modalTitle}>
                    {otpStep === 1
                      ? 'Email Verification'
                      : otpStep === 2
                      ? 'Enter 6-Digit Code'
                      : 'Create New Password'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {otpStep === 1
                      ? 'Step 1 of 3 · Email Authorization'
                      : otpStep === 2
                      ? 'Step 2 of 3 · OTP Code Check'
                      : 'Step 3 of 3 · Set New Password'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowForgotModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={Colors.subtext} />
                </TouchableOpacity>
              </View>

              {/* Progress Indicator Pills */}
              <View style={styles.stepProgressRow}>
                <View style={[styles.stepDot, otpStep >= 1 ? styles.stepDotActive : null]} />
                <View style={[styles.stepLine, otpStep >= 2 ? styles.stepLineActive : null]} />
                <View style={[styles.stepDot, otpStep >= 2 ? styles.stepDotActive : null]} />
                <View style={[styles.stepLine, otpStep >= 3 ? styles.stepLineActive : null]} />
                <View style={[styles.stepDot, otpStep >= 3 ? styles.stepDotActive : null]} />
              </View>

              {/* Simulated Email Incoming Alert Banner (if code was generated) */}
              {simulatedEmailCode && (
                <View style={styles.simulatedInboxBanner}>
                  <View style={styles.inboxBannerHeader}>
                    <Ionicons name="mail-unread" size={16} color="#059669" />
                    <Text style={styles.inboxBannerTitle}>Simulated Mail Inbox (Delivery Check)</Text>
                  </View>
                  <Text style={styles.inboxBannerText}>
                    To: <Text style={{ fontWeight: '700' }}>{resetEmail}</Text>
                    {'\n'}Your TaskFlow Password Reset Code is: <Text style={styles.inboxCodeText}>{simulatedEmailCode}</Text>
                  </Text>
                </View>
              )}

              {/* Error Message in Modal */}
              {otpError ? (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{otpError}</Text>
                </View>
              ) : null}

              {/* STEP 1: Enter Registered Email */}
              {otpStep === 1 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepDescription}>
                    Jis email address par aapka account bana hua hai, woh email yahan likhein. Hum aapko 6-digit verification code send karenge:
                  </Text>

                  <Text style={styles.inputLabel}>Registered Email Address</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="at-outline" size={18} color={Colors.muted} style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. aliraza.lead@gmail.com"
                      placeholderTextColor={Colors.subtext}
                      value={resetEmail}
                      onChangeText={(t) => {
                        setResetEmail(t);
                        if (otpError) setOtpError('');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>

                  <Button
                    title={otpLoading ? 'Sending Verification Code...' : 'Send Verification Code 📩'}
                    onPress={handleSendOTP}
                    loading={otpLoading}
                    style={{ width: '100%', marginTop: Spacing.sm }}
                  />
                </View>
              )}

              {/* STEP 2: Enter 6-Digit Code */}
              {otpStep === 2 && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepDescription}>
                    6-digit verification code aapke email <Text style={{ fontWeight: '700', color: Colors.text }}>{resetEmail}</Text> par send kar diya gaya hai. Code yahan enter karein:
                  </Text>

                  <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                  <View style={styles.otpInputWrap}>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="• • • • • •"
                      placeholderTextColor="#94a3b8"
                      value={otpCode}
                      onChangeText={(t) => {
                        setOtpCode(t);
                        if (otpError) setOtpError('');
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>

                  <View style={styles.resendRow}>
                    {countdown > 0 ? (
                      <Text style={styles.countdownText}>
                        Resend code available in <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOTP} activeOpacity={0.7}>
                        <Text style={styles.resendBtnText}>Resend Code 🔄</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setOtpStep(1)} activeOpacity={0.7}>
                      <Text style={styles.changeEmailText}>Change Email</Text>
                    </TouchableOpacity>
                  </View>

                  <Button
                    title="Verify Code →"
                    onPress={handleVerifyOTP}
                    style={{ width: '100%', marginTop: Spacing.sm }}
                  />
                </View>
              )}

              {/* STEP 3: Set New Password */}
              {otpStep === 3 && (
                <View style={styles.stepContainer}>
                  {resetSuccess ? (
                    <View style={styles.successBox}>
                      <Ionicons name="checkmark-circle" size={26} color={Colors.ok} />
                      <View>
                        <Text style={styles.successTitle}>Password Reset Successful!</Text>
                        <Text style={styles.successSub}>Unlocking TaskFlow workspace...</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.stepDescription}>
                        Identity verified successfully! Apna naya app password set karein (min 4 characters):
                      </Text>

                      <Text style={styles.inputLabel}>New Password</Text>
                      <View style={styles.passwordFieldWrap}>
                        <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} style={styles.inputLeftIcon} />
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Enter new password..."
                          placeholderTextColor={Colors.subtext}
                          value={newPassword}
                          onChangeText={(t) => {
                            setNewPassword(t);
                            if (otpError) setOtpError('');
                          }}
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowNewPassword(!showNewPassword)}
                          style={styles.eyeToggleBtn}
                        >
                          <Ionicons
                            name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={showNewPassword ? Colors.primary : Colors.muted}
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.inputLabel, { marginTop: Spacing.xs }]}>Confirm New Password</Text>
                      <View style={styles.passwordFieldWrap}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={Colors.muted} style={styles.inputLeftIcon} />
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Re-enter new password..."
                          placeholderTextColor={Colors.subtext}
                          value={confirmNewPassword}
                          onChangeText={(t) => {
                            setConfirmNewPassword(t);
                            if (otpError) setOtpError('');
                          }}
                          secureTextEntry={!showConfirmNewPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          style={styles.eyeToggleBtn}
                        >
                          <Ionicons
                            name={showConfirmNewPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={showConfirmNewPassword ? Colors.primary : Colors.muted}
                          />
                        </TouchableOpacity>
                      </View>

                      <Button
                        title={otpLoading ? 'Saving Password...' : 'Save New Password & Unlock App 🚀'}
                        onPress={handleFinalizeReset}
                        loading={otpLoading}
                        style={{ width: '100%', marginTop: Spacing.sm }}
                      />
                    </>
                  )}
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(79, 70, 229, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.body,
    color: '#64748b',
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    maxWidth: 380,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: Spacing.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  userAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    color: '#4f46e5',
    fontWeight: '800',
    fontSize: 14,
  },
  userName: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  userEmail: {
    color: '#64748b',
    fontSize: 11,
  },
  verifiedDot: {
    marginLeft: 6,
  },
  inputLabel: {
    color: '#0f172a',
    fontSize: Typography.sm,
    fontWeight: '700',
    marginBottom: 6,
  },
  passwordFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: Spacing.sm,
  },
  passwordFieldError: {
    borderColor: '#e11d48',
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
  },
  eyeToggleBtn: {
    padding: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: '#e11d48',
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  btn: {
    marginTop: Spacing.xs,
  },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  forgotText: {
    color: '#4f46e5',
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: Spacing.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: Typography.heading,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
  },
  stepDotActive: {
    backgroundColor: '#4f46e5',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
  },
  stepLineActive: {
    backgroundColor: '#4f46e5',
  },
  simulatedInboxBanner: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 12,
  },
  inboxBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inboxBannerTitle: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  inboxBannerText: {
    color: '#334155',
    fontSize: 11,
    lineHeight: 16,
  },
  inboxCodeText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.2)',
    padding: 8,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  modalErrorText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  stepContainer: {
    marginTop: 4,
  },
  stepDescription: {
    color: '#475569',
    fontSize: Typography.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: Spacing.sm,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  otpInputWrap: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#4f46e5',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 12,
    textAlign: 'center',
    width: '100%',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: Spacing.sm,
  },
  countdownText: {
    color: '#64748b',
    fontSize: 11,
  },
  resendBtnText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
  },
  changeEmailText: {
    color: '#64748b',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderRadius: Radius.md,
    marginVertical: Spacing.md,
  },
  successTitle: {
    color: '#059669',
    fontSize: Typography.body,
    fontWeight: '800',
  },
  successSub: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
