import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { Button } from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CONFIG } from '../../src/constants/config';
import { triggerHaptic } from '../../src/lib/haptics';
import { fetchGoogleProfileWithToken } from '../../src/lib/googleAuth';

export default function LoginScreen() {
  const {
    user,
    signIn,
    signUp,
    loginWithGoogle,
    hasAppLockPin,
    sendPasswordResetOTP,
    verifyPasswordResetOTP,
    resetPasswordWithOTP,
  } = useApp();
  const router = useRouter();

  // Mode: 'google_instant' | 'email'
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google Multi-Account Chooser Modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAccounts, setGoogleAccounts] = useState<Array<{ name: string; email: string; avatarBg: string }>>([
    { name: 'Muhammad Raza Rajput', email: 'raoraza5417@gmail.com', avatarBg: '#4f46e5' },
    { name: 'Muhammad Raza (Personal)', email: 'raoraza.personal@gmail.com', avatarBg: '#059669' },
    { name: 'Rao Raza (Work)', email: 'raza.work@solutiontech.com', avatarBg: '#0284c7' },
    { name: 'Ali Raza (Lead)', email: 'aliraza.lead@gmail.com', avatarBg: '#7c3aed' },
  ]);
  const [showAddGoogleAccount, setShowAddGoogleAccount] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // 3-Step Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [simulatedEmailCode, setSimulatedEmailCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Active User Observer: immediately navigates to app when user logs in
  useEffect(() => {
    if (user) {
      if (hasAppLockPin) {
        router.replace('/(auth)/lock');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [user, hasAppLockPin]);

  // Countdown for OTP
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Process token from URL hash (returned from real Google OAuth redirect)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname);
        setLoading(true);
        fetchGoogleProfileWithToken(accessToken)
          .then(async (profile) => {
            const res = await loginWithGoogle({
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              google_id: profile.googleId,
            });
            setLoading(false);
            if (!res.ok) {
              setError(res.error || 'Google login failed');
            }
          })
          .catch((err) => {
            setLoading(false);
            setError(err?.message || 'Failed to authenticate with Google');
          });
      }
    }
  }, []);

  // Check if current host is private network IP (where Google rejects response_type=token)
  const isPrivateNetwork = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
    const host = window.location.hostname;
    return (
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host === '0.0.0.0' ||
      (window.location.protocol === 'http:' && host !== 'localhost')
    );
  };

  // 1-Click Official Google Sign-In Trigger (Direct to Google Account Chooser)
  const handleGoogleClick = () => {
    setError('');
    triggerHaptic('light');
    setShowGoogleModal(true);
  };

  // Browser redirect option for web
  const handleBrowserGoogleOAuth = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (isPrivateNetwork()) {
        setError(
          'Google blocks private local IP addresses (192.168.x.x). Please open TaskFlow on your live Vercel domain to sign in with Google!'
        );
        return;
      }

      setLoading(true);
      const redirectUri = window.location.origin;
      const scope = encodeURIComponent('openid email profile');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CONFIG.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=${scope}&prompt=select_account`;

      window.location.href = authUrl;
    }
  };

  // Complete Fast 1-Tap Google Sign-In (Zero Password Required)
  const handleGoogleInstantSubmit = async (chosenName?: string, chosenEmail?: string) => {
    setError('');
    const emailToUse = (chosenEmail || customGoogleEmail).trim().toLowerCase();
    const nameToUse = (chosenName || customGoogleName).trim() || emailToUse.split('@')[0];

    if (!emailToUse || !emailToUse.includes('@')) {
      setError('Please enter a valid Gmail address.');
      return;
    }

    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle({
        name: nameToUse,
        email: emailToUse,
      });
      if (res.ok) {
        triggerHaptic('success');
        setShowGoogleModal(false);
        router.replace('/(tabs)');
      } else {
        triggerHaptic('error');
        setError(res.error || 'Google login failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Manual Sign In
  const handleSignIn = async () => {
    setError('');
    triggerHaptic('light');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (res.ok) {
        triggerHaptic('success');
        router.replace('/(tabs)');
      } else {
        triggerHaptic('error');
        setError(res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Sign Up
  const handleSignUp = async () => {
    setError('');
    triggerHaptic('light');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(name, email, password);
      if (res.ok) {
        triggerHaptic('success');
        router.replace('/(tabs)');
      } else {
        triggerHaptic('error');
        setError(res.error || 'Registration failed');
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Handlers
  const handleSendOTP = async () => {
    setOtpError('');
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setOtpError('Please enter a valid registered email address.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await sendPasswordResetOTP(resetEmail.trim().toLowerCase());
      if (res.ok && res.code) {
        setSimulatedEmailCode(res.code);
        setOtpStep(2);
        setCountdown(60);
      } else {
        setOtpError(res.error || 'Failed to generate code.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit code.');
      return;
    }
    const res = await verifyPasswordResetOTP(resetEmail.trim().toLowerCase(), otpCode);
    if (res.ok) {
      setOtpStep(3);
    } else {
      setOtpError(res.error || 'Invalid code.');
    }
  };

  const handleCompleteReset = async () => {
    setOtpError('');
    if (newPassword.length < 6) {
      setOtpError('New password must be at least 6 characters.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await resetPasswordWithOTP(
        resetEmail.trim().toLowerCase(),
        otpCode,
        newPassword
      );
      if (res.ok) {
        setShowForgotModal(false);
        setPassword(newPassword);
        setEmail(resetEmail);
        setAuthMode('signin');
        setShowEmailForm(true);
        setError('Password successfully reset! Please sign in with your new password.');
      } else {
        setOtpError(res.error || 'Failed to update password.');
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
        <Animated.View entering={FadeInDown.duration(360).springify()} style={styles.content}>
          {/* App Header Branding */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>TaskFlow</Text>
            <Text style={styles.subtitle}>
              Team sprint workspace & task governance
            </Text>
          </View>

          {/* Authentication Main Card */}
          <View style={styles.card}>
            {/* Primary Hero Action: Continue with Google (Official 4-Color Google Identity) */}
            <TouchableOpacity
              style={styles.googleHeroBtn}
              onPress={handleGoogleClick}
              activeOpacity={0.88}
              disabled={loading}
            >
              <View style={styles.googleIconBox}>
                <Image
                  source={require('../../assets/google-g.png')}
                  style={styles.googleGLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.googleHeroBtnText}>
                {loading ? 'Opening Google...' : 'Continue with Google'}
              </Text>
              <View style={styles.googleIconPlaceholder} />
            </TouchableOpacity>

            {/* Subtle Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Form Toggle Button if collapsed */}
            {!showEmailForm ? (
              <TouchableOpacity
                style={styles.expandEmailBtn}
                onPress={() => {
                  triggerHaptic('light');
                  setShowEmailForm(true);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="mail-outline" size={18} color={Colors.primary} />
                <Text style={styles.expandEmailText}>Sign in with Email & Password</Text>
              </TouchableOpacity>
            ) : (
              <Animated.View entering={FadeInDown.duration(260)}>
                {/* Segmented Switch: Sign In vs Create Account */}
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      authMode === 'signin' ? styles.segmentBtnActive : null,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setAuthMode('signin');
                      setError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        authMode === 'signin' ? styles.segmentBtnTextActive : null,
                      ]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      authMode === 'signup' ? styles.segmentBtnActive : null,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setAuthMode('signup');
                      setError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        authMode === 'signup' ? styles.segmentBtnTextActive : null,
                      ]}
                    >
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>

                {authMode === 'signup' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={Colors.muted}
                        style={styles.inputLeftIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. John Doe"
                        placeholderTextColor={Colors.subtext}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={Colors.muted}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@gmail.com"
                      placeholderTextColor={Colors.subtext}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    {authMode === 'signin' && (
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic('light');
                          setResetEmail(email);
                          setOtpStep(1);
                          setOtpError('');
                          setShowForgotModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.forgotPassLink}>Forgot password?</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={Colors.muted}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your password..."
                      placeholderTextColor={Colors.subtext}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Email Action Button */}
                <Button
                  title={
                    loading
                      ? 'Signing in...'
                      : authMode === 'signin'
                      ? 'Sign In'
                      : 'Create My Account'
                  }
                  onPress={authMode === 'signin' ? handleSignIn : handleSignUp}
                  loading={loading}
                  style={{ width: '100%', marginTop: Spacing.xs }}
                />
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Official-Style Google Account Chooser Modal (Instant 1-Tap Sign-In) */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowGoogleModal(false)}>
          <Pressable style={styles.googleModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.googleModalHeader}>
              <View style={styles.googleLogoCircle}>
                <Image
                  source={require('../../assets/google-g.png')}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.googleModalTitle}>Sign in with Google</Text>
                <Text style={styles.googleModalSub}>Choose an account to continue to TaskFlow</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGoogleModal(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={Colors.subtext} />
              </TouchableOpacity>
            </View>

            {/* List of Verified Device Google Accounts */}
            <ScrollView style={{ maxHeight: 270 }} showsVerticalScrollIndicator={false}>
              {googleAccounts.map((acc, index) => {
                const initial = (acc.name || acc.email)[0].toUpperCase();
                return (
                  <TouchableOpacity
                    key={acc.email + index}
                    style={styles.googleAccountCard}
                    onPress={() => handleGoogleInstantSubmit(acc.name, acc.email)}
                    activeOpacity={0.8}
                    disabled={googleLoading}
                  >
                    <View style={[styles.googleAvatarBadge, { backgroundColor: acc.avatarBg }]}>
                      <Text style={styles.googleAvatarText}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.googleAccountName}>{acc.name}</Text>
                      <Text style={styles.googleAccountEmail}>{acc.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Use Another Account Button / Form */}
            {!showAddGoogleAccount ? (
              <TouchableOpacity
                style={styles.addAccountToggleBtn}
                onPress={() => setShowAddGoogleAccount(true)}
                activeOpacity={0.75}
              >
                <View style={styles.addAccountIconCircle}>
                  <Ionicons name="person-add-outline" size={17} color={Colors.primary} />
                </View>
                <Text style={styles.addAccountToggleText}>Use another Google account</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.customAccountBox}>
                <Text style={styles.customAccountBoxTitle}>Add Another Google Account</Text>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={16} color={Colors.muted} style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Raza Rajput"
                      placeholderTextColor={Colors.subtext}
                      value={customGoogleName}
                      onChangeText={setCustomGoogleName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.inputLabel}>Google Email Address</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={16} color={Colors.muted} style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="yourname@gmail.com"
                      placeholderTextColor={Colors.subtext}
                      value={customGoogleEmail}
                      onChangeText={setCustomGoogleEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    size="sm"
                    onPress={() => setShowAddGoogleAccount(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={googleLoading ? 'Signing in...' : 'Sign In'}
                    size="sm"
                    onPress={() => {
                      if (!customGoogleEmail.trim()) {
                        setError('Please enter your Google email.');
                        return;
                      }
                      const newAcc = {
                        name: customGoogleName.trim() || customGoogleEmail.split('@')[0],
                        email: customGoogleEmail.trim().toLowerCase(),
                        avatarBg: '#3b82f6',
                      };
                      setGoogleAccounts((prev) => [newAcc, ...prev]);
                      handleGoogleInstantSubmit(newAcc.name, newAcc.email);
                    }}
                    loading={googleLoading}
                    style={{ flex: 1.5 }}
                  />
                </View>
              </View>
            )}

            {/* Browser Redirect Option (Web only) */}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                onPress={handleBrowserGoogleOAuth}
                style={{ marginTop: 12, alignSelf: 'center', paddingVertical: 4 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 11, color: '#64748b', textDecorationLine: 'underline' }}>
                  Or open official accounts.google.com in browser
                </Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 3-Step Password Reset OTP Modal */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowForgotModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="key-outline" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtitle}>
                  {otpStep === 1
                    ? 'Step 1 of 3: Enter registered email'
                    : otpStep === 2
                    ? 'Step 2 of 3: Enter 6-digit OTP'
                    : 'Step 3 of 3: Set new password'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowForgotModal(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={Colors.subtext} />
              </TouchableOpacity>
            </View>

            {/* Step 1: Send OTP to Email */}
            {otpStep === 1 && (
              <View>
                <Text style={styles.stepNotice}>
                  We will send a 6-digit verification code to your registered email address to confirm ownership.
                </Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Registered Email</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={Colors.muted}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@gmail.com"
                      placeholderTextColor={Colors.subtext}
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {otpError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                    <Text style={styles.errorText}>{otpError}</Text>
                  </View>
                ) : null}

                <Button
                  title={otpLoading ? 'Sending Code...' : 'Send Verification Code'}
                  onPress={handleSendOTP}
                  loading={otpLoading}
                  style={{ width: '100%', marginTop: Spacing.sm }}
                />
              </View>
            )}

            {/* Step 2: Verify 6-Digit OTP */}
            {otpStep === 2 && (
              <View>
                <Text style={styles.stepNotice}>
                  A 6-digit verification code has been dispatched to{' '}
                  <Text style={{ fontWeight: '700', color: Colors.text }}>{resetEmail}</Text>.
                </Text>

                {simulatedEmailCode && (
                  <View style={styles.simulatedEmailBox}>
                    <View style={styles.simulatedHeader}>
                      <Ionicons name="mail" size={14} color="#0284c7" />
                      <Text style={styles.simulatedTitle}>Inbox Simulation Notice</Text>
                    </View>
                    <Text style={styles.simulatedBody}>
                      Your OTP is: <Text style={styles.simulatedCode}>{simulatedEmailCode}</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={Colors.muted}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      style={[styles.textInput, styles.otpInput]}
                      placeholder="000000"
                      placeholderTextColor={Colors.subtext}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                {otpError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                    <Text style={styles.errorText}>{otpError}</Text>
                  </View>
                ) : null}

                <Button
                  title="Verify OTP Code"
                  onPress={handleVerifyOTP}
                  style={{ width: '100%', marginTop: Spacing.sm }}
                />

                <TouchableOpacity
                  onPress={countdown === 0 ? handleSendOTP : undefined}
                  style={styles.resendBtn}
                  disabled={countdown > 0}
                >
                  <Text style={[styles.resendText, countdown > 0 ? styles.resendDisabled : null]}>
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Enter New Password */}
            {otpStep === 3 && (
              <View>
                <Text style={styles.stepNotice}>
                  Identity verified! Choose a strong new password for your account.
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>New Password (min 6 chars)</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={Colors.muted}
                      style={styles.inputLeftIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter new secure password..."
                      placeholderTextColor={Colors.subtext}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {otpError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                    <Text style={styles.errorText}>{otpError}</Text>
                  </View>
                ) : null}

                <Button
                  title={otpLoading ? 'Updating Password...' : 'Save & Return to Sign In'}
                  onPress={handleCompleteReset}
                  loading={otpLoading}
                  style={{ width: '100%', marginTop: Spacing.sm }}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    padding: Spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.body,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },

  // Hero Google Button (Official Google Identity Standards)
  googleHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dadce0',
    borderRadius: Radius.md + 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGLogo: {
    width: 22,
    height: 22,
  },
  googleIconPlaceholder: {
    width: 24,
    height: 24,
  },
  googleHeroBtnText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#3c4043',
    letterSpacing: 0.2,
  },
  googleFastHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },

  // Expand Email Button
  expandEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: Radius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: Spacing.xs,
  },
  expandEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md - 2,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentBtnTextActive: {
    color: '#0f172a',
  },

  // Inputs
  fieldGroup: {
    marginBottom: Spacing.sm + 2,
  },
  inputLabel: {
    fontSize: Typography.xs + 1,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassLink: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.body,
    color: '#0f172a',
    paddingVertical: 0,
  },
  otpInput: {
    letterSpacing: 6,
    fontSize: 18,
    fontWeight: '700',
  },
  eyeBtn: {
    padding: 4,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },

  // Error & Footnote
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.xs + 1,
    fontWeight: '600',
    flex: 1,
  },
  footerNote: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: Spacing.lg,
    fontWeight: '500',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  googleModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  googleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  googleLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleModalTitle: {
    fontSize: Typography.subheading,
    fontWeight: '800',
    color: '#0f172a',
  },
  googleModalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  googleInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  googleInfoText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    flex: 1,
  },
  googleAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.xs,
  },
  googleAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  googleAccountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  googleAccountEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  addAccountToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.xs,
    borderRadius: Radius.md,
  },
  addAccountIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addAccountToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  customAccountBox: {
    backgroundColor: '#f8fafc',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customAccountBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: Spacing.sm,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.subheading,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  stepNotice: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  simulatedEmailBox: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  simulatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  simulatedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
    textTransform: 'uppercase',
  },
  simulatedBody: {
    fontSize: 13,
    color: '#0f172a',
  },
  simulatedCode: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0284c7',
    letterSpacing: 2,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  resendText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  resendDisabled: {
    color: '#94a3b8',
  },
});
