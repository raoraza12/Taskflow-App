import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from '../../src/lib/alerts';
import { useApp, isAppOwner } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Ionicons } from '@expo/vector-icons';
import { THEMES } from '../../src/constants/theme';
import { useRouter } from 'expo-router';
import { AnimatedTaskCard } from '../../src/components/AnimatedTaskCard';
import { Task } from '../../src/types/database';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ProfileScreen() {
  const {
    user,
    teams,
    tasks,
    history,
    hasAppLockPin,
    setAppLockPin,
    updateProfile,
    checkUsernameAvailable,
    logout,
    theme,
    updateTask,
  } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;
  const router = useRouter();

  // Profile Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [editPicture, setEditPicture] = useState(user?.picture || '');
  const [customUrl, setCustomUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // App Lock PIN State
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');

  // Personal Tasks Filter
  const [taskFilter, setTaskFilter] = useState<'all' | 'due_today' | 'in_progress' | 'done'>('all');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Personal Assigned Tasks
  const myAssignedTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter((t) => t.assignee_id === user.id);
  }, [tasks, user]);

  const myDoneTasks = useMemo(() => myAssignedTasks.filter((t) => t.status === 'done'), [myAssignedTasks]);
  const myInProgressTasks = useMemo(() => myAssignedTasks.filter((t) => t.status === 'in_progress'), [myAssignedTasks]);
  const myDueTodayTasks = useMemo(() => myAssignedTasks.filter((t) => t.due_date === today), [myAssignedTasks, today]);

  const myCompletionRate = myAssignedTasks.length > 0
    ? Math.round((myDoneTasks.length / myAssignedTasks.length) * 100)
    : 0;

  // Filtered & Sorted Personal Tasks (High priority first, then due date)
  const sortedMyTasks = useMemo(() => {
    let list = myAssignedTasks;
    if (taskFilter === 'due_today') list = myDueTodayTasks;
    if (taskFilter === 'in_progress') list = myInProgressTasks;
    if (taskFilter === 'done') list = myDoneTasks;

    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return [...list].sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return a.due_date.localeCompare(b.due_date);
    });
  }, [myAssignedTasks, taskFilter, myDueTodayTasks, myInProgressTasks, myDoneTasks]);

  const toggleTaskStatus = (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask(task.id, { status: nextStatus });
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditUsername(user?.username || '');
    setUsernameError('');
    setEditPicture(user?.picture || '');
    setCustomUrl('');
    setShowEditModal(true);
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.replace(/^@/, '').toLowerCase();
    setEditUsername(clean);
    if (!clean) {
      setUsernameError('Username is required');
      return;
    }
    if (clean.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameError('Letters, numbers, and underscores only');
      return;
    }
    const isAvail = checkUsernameAvailable(clean, user?.id);
    if (!isAvail) {
      setUsernameError(`@${clean} is already taken!`);
    } else {
      setUsernameError('');
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('Permission Denied', 'Please grant gallery permissions to pick a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setEditPicture(uri);
      }
    } catch {
      showAlert('Notice', 'Could not open photo picker on this browser/device.');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showAlert('Error', 'Name cannot be empty.');
      return;
    }
    const cleanUsername = editUsername.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      showAlert('Error', 'Username must be at least 3 characters.');
      return;
    }
    if (!checkUsernameAvailable(cleanUsername, user?.id)) {
      showAlert('Error', `@${cleanUsername} is already taken. Please choose another.`);
      return;
    }

    setSavingProfile(true);
    const finalPicture = customUrl.trim() || editPicture;
    const res = await updateProfile({
      name: editName.trim(),
      username: cleanUsername,
      picture: finalPicture,
    });
    setSavingProfile(false);
    if (res.ok) {
      setShowEditModal(false);
      showAlert('Success', 'Profile updated successfully!');
    } else {
      showAlert('Error', res.error || 'Failed to update profile');
    }
  };

  const handleUpdatePin = async () => {
    setPinError('');
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 characters');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('Passwords do not match');
      return;
    }
    await setAppLockPin(newPin);
    setShowPinModal(false);
    setNewPin('');
    setConfirmPin('');
    showAlert('Success', 'App Lock Password updated!');
  };

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to log out of TaskFlow?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenWrapper title="User Dashboard" subtitle="Personal Productivity & Account Portal">
      {/* 1. Super Admin VIP Banner (STRICTLY for App Owner Ali Raza Only) */}
      {isAppOwner(user) && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card
            style={[
              styles.adminBannerCard,
              {
                backgroundColor: '#ffffff',
                borderColor: '#4f46e5',
                borderWidth: 1.5,
              },
            ]}
          >
            <View style={styles.adminBannerRow}>
              <View style={styles.adminIconCircle}>
                <Ionicons name="shield-half" size={24} color="#4f46e5" />
              </View>
              <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.adminBannerTitle}>Super Admin Portal</Text>
                  <View style={styles.vipTag}>
                    <Text style={styles.vipTagText}>VIP CONTROL</Text>
                  </View>
                </View>
                <Text style={styles.adminBannerSub}>
                  Full governance: manage all solo accounts, inspect teams, reassign tasks & security logs.
                </Text>
              </View>
              <Button
                title="Launch 🚀"
                size="sm"
                onPress={() => router.push('/admin' as any)}
              />
            </View>
          </Card>
        </Animated.View>
      )}

      {/* 2. Personal Profile Identity Card */}
      <Card
        style={[
          styles.userCard,
          {
            backgroundColor: currentTheme.colors.bgElevated,
            borderColor: currentTheme.colors.border,
          },
        ]}
      >
        <View style={styles.userRow}>
          <View style={styles.avatarWrap}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: currentTheme.colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: currentTheme.colors.primary }]}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.avatarBadgeBtn, { backgroundColor: currentTheme.colors.primary }]}
              onPress={openEditModal}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameHeaderRow}>
              <Text style={[styles.userName, { color: currentTheme.colors.text }]}>{user?.name}</Text>
              <TouchableOpacity onPress={openEditModal} style={styles.editIconBtn}>
                <Ionicons name="pencil" size={15} color={currentTheme.colors.primary} />
                <Text style={[styles.editBtnText, { color: currentTheme.colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.userHandlePill}>
              <Ionicons name="at" size={12} color="#4f46e5" />
              <Text style={styles.userHandleText}>{user?.username || 'member'}</Text>
            </View>

            <Text style={[styles.userEmail, { color: currentTheme.colors.subtext }]}>{user?.email}</Text>

            <View style={styles.badgeRow}>
              {isAppOwner(user) ? (
                <View style={styles.adminRolePill}>
                  <Ionicons name="shield-checkmark" size={12} color="#4f46e5" />
                  <Text style={styles.adminRoleText}>Super Admin</Text>
                </View>
              ) : (
                <View style={styles.memberRolePill}>
                  <Ionicons name="person" size={12} color="#059669" />
                  <Text style={styles.memberRoleText}>Workspace Member</Text>
                </View>
              )}

              <View style={[styles.verifiedBadge, { backgroundColor: currentTheme.colors.primaryLight }]}>
                <Ionicons name="checkmark-circle" size={13} color={currentTheme.colors.primary} />
                <Text style={[styles.verifiedText, { color: currentTheme.colors.primary }]}>Google Verified</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* 3. Personal Productivity Performance Bento Grid */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIconBox, { backgroundColor: currentTheme.colors.primaryLight }]}>
            <Ionicons name="checkbox" size={18} color={currentTheme.colors.primary} />
          </View>
          <Text style={[styles.metricNumber, { color: currentTheme.colors.text }]}>
            {myAssignedTasks.length}
          </Text>
          <Text style={[styles.metricSub, { color: currentTheme.colors.subtext }]}>Assigned Tasks</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconBox, { backgroundColor: 'rgba(217, 119, 6, 0.1)' }]}>
            <Ionicons name="flash" size={18} color="#d97706" />
          </View>
          <Text style={[styles.metricNumber, { color: '#d97706' }]}>
            {myInProgressTasks.length}
          </Text>
          <Text style={[styles.metricSub, { color: currentTheme.colors.subtext }]}>In Progress</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconBox, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
            <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
          </View>
          <Text style={[styles.metricNumber, { color: '#059669' }]}>
            {myDoneTasks.length}
          </Text>
          <Text style={[styles.metricSub, { color: currentTheme.colors.subtext }]}>Completed</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
            <Ionicons name="trophy" size={18} color="#0284c7" />
          </View>
          <Text style={[styles.metricNumber, { color: '#0284c7' }]}>
            {myCompletionRate}%
          </Text>
          <Text style={[styles.metricSub, { color: currentTheme.colors.subtext }]}>My Velocity</Text>
        </Card>
      </View>

      {/* 4. Sorted Personal Sprint Tasks Section */}
      <View style={styles.sectionTitleRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="bookmark" size={18} color={currentTheme.colors.primary} />
          <Text style={[styles.sectionHeading, { color: currentTheme.colors.text }]}>
            My Focus & Sprint Tickets ({sortedMyTasks.length})
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
          <Text style={[styles.viewAllLink, { color: currentTheme.colors.primary }]}>Workspace Board →</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterPillContainer}>
        {(
          [
            { key: 'all', label: `All (${myAssignedTasks.length})` },
            { key: 'due_today', label: `Due Today (${myDueTodayTasks.length})` },
            { key: 'in_progress', label: `In Progress (${myInProgressTasks.length})` },
            { key: 'done', label: `Done (${myDoneTasks.length})` },
          ] as const
        ).map((tab) => {
          const isSelected = taskFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.taskFilterPill,
                {
                  backgroundColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.bgElevated,
                  borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
                },
              ]}
              onPress={() => setTaskFilter(tab.key)}
            >
              <Text
                style={[
                  styles.taskFilterPillText,
                  { color: isSelected ? '#ffffff' : currentTheme.colors.subtext, fontWeight: isSelected ? '700' : '500' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Personal Tasks List */}
      {sortedMyTasks.length === 0 ? (
        <Card
          style={[
            styles.emptyTasksCard,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <Ionicons name="sparkles-outline" size={36} color={currentTheme.colors.subtext} />
          <Text style={[styles.emptyTasksTitle, { color: currentTheme.colors.text }]}>
            No tasks in this view
          </Text>
          <Text style={[styles.emptyTasksSub, { color: currentTheme.colors.subtext }]}>
            You have no tasks matching this filter. Create a task or pick an active team sprint item.
          </Text>
          <Button
            title="+ Create New Task"
            size="sm"
            onPress={() => router.push('/tasks/create')}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>
      ) : (
        sortedMyTasks.map((t, idx) => (
          <AnimatedTaskCard
            key={t.id}
            task={t}
            index={idx}
            currentTheme={currentTheme}
            onToggleStatus={toggleTaskStatus}
            onPress={() => router.push({ pathname: '/tasks/edit', params: { taskId: t.id } })}
          />
        ))
      )}

      {/* 5. My Workspaces & Teams */}
      <View style={[styles.sectionTitleRow, { marginTop: Spacing.lg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="briefcase" size={18} color={currentTheme.colors.primary} />
          <Text style={[styles.sectionHeading, { color: currentTheme.colors.text }]}>
            My Teams & Workspaces ({teams.length})
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/teams')}>
          <Text style={[styles.viewAllLink, { color: currentTheme.colors.primary }]}>Teams Hub →</Text>
        </TouchableOpacity>
      </View>

      {teams.length === 0 ? (
        <Card style={styles.emptyCardMini}>
          <Text style={{ color: currentTheme.colors.subtext, fontSize: 13 }}>
            You haven't joined any team yet.
          </Text>
        </Card>
      ) : (
        <View style={styles.teamsGrid}>
          {teams.map((team) => {
            const isOwner = team.owner_id === user?.id;
            return (
              <Card key={team.id} style={styles.teamMiniCard}>
                <View style={styles.teamCardHeader}>
                  <View style={styles.teamIconBox}>
                    <Ionicons name="layers" size={16} color={currentTheme.colors.primary} />
                  </View>
                  <Badge
                    label={isOwner ? 'Leader' : 'Member'}
                    variant={isOwner ? 'primary' : 'muted'}
                  />
                </View>
                <Text style={styles.teamMiniName}>{team.name}</Text>
                <Text style={styles.teamMiniCode}>Code: {team.invite_code}</Text>
              </Card>
            );
          })}
        </View>
      )}

      {/* 6. Security: App Lock PIN Management */}
      <Card
        style={[
          styles.sectionCard,
          {
            backgroundColor: currentTheme.colors.bgElevated,
            borderColor: currentTheme.colors.border,
            marginTop: Spacing.lg,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={20} color={currentTheme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>App Lock Security</Text>
        </View>
        <Text style={[styles.securityDesc, { color: currentTheme.colors.subtext }]}>
          {hasAppLockPin
            ? '✅ App Lock is active. Private PIN required when opening TaskFlow.'
            : '⚠️ App Lock is inactive. Set a password to protect your workspace.'}
        </Text>
        <Button
          title={hasAppLockPin ? 'Change App Password' : 'Set App Password'}
          variant="outline"
          icon={<Ionicons name="key-outline" size={16} color={currentTheme.colors.primary} />}
          onPress={() => setShowPinModal(true)}
          style={{ marginTop: Spacing.sm }}
        />

        {showPinModal && (
          <View style={[styles.pinForm, { borderTopColor: currentTheme.colors.border }]}>
            {/* New PIN with Eye Toggle */}
            <Text style={styles.pinInputLabel}>New App Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordField}
                placeholder="Enter 4+ digit PIN..."
                placeholderTextColor={currentTheme.colors.subtext}
                value={newPin}
                onChangeText={setNewPin}
                secureTextEntry={!showNewPin}
              />
              <TouchableOpacity onPress={() => setShowNewPin(!showNewPin)}>
                <Ionicons
                  name={showNewPin ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={currentTheme.colors.subtext}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm PIN with Eye Toggle */}
            <Text style={[styles.pinInputLabel, { marginTop: 8 }]}>Confirm App Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordField}
                placeholder="Confirm password..."
                placeholderTextColor={currentTheme.colors.subtext}
                value={confirmPin}
                onChangeText={setConfirmPin}
                secureTextEntry={!showConfirmPin}
              />
              <TouchableOpacity onPress={() => setShowConfirmPin(!showConfirmPin)}>
                <Ionicons
                  name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={currentTheme.colors.subtext}
                />
              </TouchableOpacity>
            </View>

            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

            <View style={styles.pinBtns}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setShowPinModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Password"
                onPress={handleUpdatePin}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </Card>

      {/* 7. Activity Audit Trail (Personal History) */}
      <Card
        style={[
          styles.sectionCard,
          {
            backgroundColor: currentTheme.colors.bgElevated,
            borderColor: currentTheme.colors.border,
            marginTop: Spacing.md,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={20} color={currentTheme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>My Recent Activity</Text>
        </View>
        {history.length === 0 ? (
          <Text style={[styles.emptyText, { color: currentTheme.colors.subtext }]}>No activity recorded yet.</Text>
        ) : (
          history.slice(0, 5).map((h) => (
            <View key={h.id} style={[styles.historyRow, { borderBottomColor: currentTheme.colors.border }]}>
              <Text style={[styles.historyDetail, { color: currentTheme.colors.text }]}>{h.detail}</Text>
              <Text style={[styles.historyTime, { color: currentTheme.colors.subtext }]}>
                {new Date(h.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* 8. Sign Out Button */}
      <Button
        title="Sign Out of TaskFlow"
        variant="danger"
        icon={<Ionicons name="log-out-outline" size={18} color="#ffffff" />}
        onPress={handleLogout}
        style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
      />

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.previewContainer}>
                {editPicture ? (
                  <Image source={{ uri: editPicture }} style={styles.modalAvatarImg} />
                ) : (
                  <View style={[styles.modalAvatarImg, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>
                      {editName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.avatarActionRow}>
                  <Button
                    title="Upload / Pick Photo"
                    variant="outline"
                    icon={<Ionicons name="image-outline" size={18} color={Colors.primary} />}
                    onPress={handlePickImage}
                    style={{ flex: 1, marginRight: Spacing.xs }}
                  />
                  {editPicture ? (
                    <Button
                      title="Remove"
                      variant="ghost"
                      onPress={() => setEditPicture('')}
                      style={{ paddingHorizontal: 10 }}
                    />
                  ) : null}
                </View>
              </View>

              <Input
                label="Full Name"
                placeholder="Your full name"
                value={editName}
                onChangeText={setEditName}
              />

              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={styles.usernameInputLabel}>Unique Username (@handle)</Text>
                <View style={[styles.usernameInputWrap, usernameError ? styles.usernameInputError : null]}>
                  <Text style={styles.atSymbol}>@</Text>
                  <TextInput
                    style={styles.usernameTextInput}
                    placeholder="unique_username"
                    placeholderTextColor="#94a3b8"
                    value={editUsername}
                    onChangeText={handleUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {editUsername && !usernameError ? (
                    <View style={styles.statusAvailRow}>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text style={styles.statusAvailText}>Available</Text>
                    </View>
                  ) : null}
                </View>
                {usernameError ? (
                  <Text style={styles.usernameErrorText}>{usernameError}</Text>
                ) : (
                  <Text style={styles.usernameHelperText}>
                    * No two users can have the same username.
                  </Text>
                )}
              </View>

              <Input
                label="Custom Image URL (Optional)"
                placeholder="https://images.unsplash.com/..."
                value={customUrl}
                onChangeText={setCustomUrl}
              />

              <View style={styles.modalBtns}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setShowEditModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Profile"
                  onPress={handleSaveProfile}
                  loading={savingProfile}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  adminBannerCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  adminBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerTitle: {
    fontSize: Typography.body,
    fontWeight: '800',
    color: '#0f172a',
  },
  vipTag: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  vipTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  adminBannerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  userCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  avatarBadgeBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: Typography.heading,
    fontWeight: '800',
  },
  editIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: Typography.sm,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  adminRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  adminRoleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4f46e5',
  },
  memberRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  memberRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    fontSize: Typography.body + 1,
    fontWeight: '800',
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  taskFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  taskFilterPillText: {
    fontSize: 11,
  },
  emptyTasksCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  emptyTasksTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyTasksSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyCardMini: {
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  teamsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  teamMiniCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamMiniName: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: '#0f172a',
  },
  teamMiniCode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sectionCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.body + 1,
    fontWeight: '800',
  },
  securityDesc: {
    fontSize: Typography.sm,
    lineHeight: 18,
    marginTop: 2,
  },
  pinForm: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  pinInputLabel: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: Radius.md,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    height: 42,
    marginBottom: Spacing.xs,
  },
  passwordField: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
  },
  pinBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sm,
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
  },
  historyDetail: {
    fontSize: Typography.body,
    flex: 1,
    marginRight: Spacing.sm,
  },
  historyTime: {
    fontSize: Typography.sm,
  },
  emptyText: {
    fontSize: Typography.sm,
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
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.heading,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.sm,
  },
  avatarActionRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: Spacing.xs,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  userHandlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
    marginBottom: 4,
  },
  userHandleText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
  },
  usernameInputLabel: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  usernameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: Radius.md,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    height: 44,
  },
  usernameInputError: {
    borderColor: '#e11d48',
  },
  atSymbol: {
    color: '#4f46e5',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 4,
  },
  usernameTextInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  statusAvailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusAvailText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  usernameErrorText: {
    color: '#e11d48',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  usernameHelperText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
});
