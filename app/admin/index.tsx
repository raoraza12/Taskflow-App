import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Pressable,
  Modal,
} from 'react-native';
import { showAlert } from '../../src/lib/alerts';
import { useApp, isAppOwner } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEMES } from '../../src/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Profile, Task, Team } from '../../src/types/database';

type AdminTab = 'users' | 'teams' | 'tasks' | 'logs';

export default function AdminScreen() {
  const {
    user,
    users,
    teams,
    tasks,
    history,
    deleteTeam,
    theme,
    adminToggleUserAdmin,
    adminToggleUserStatus,
    adminReassignTask,
    adminTransferTeam,
    adminDeleteUser,
    deleteTask,
    updateTask,
  } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [searchUser, setSearchUser] = useState('');
  const [searchTask, setSearchTask] = useState('');
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');

  // Inspected User Modal State
  const [inspectedUser, setInspectedUser] = useState<Profile | null>(null);

  // Reassign Task Modal State
  const [reassigningTask, setReassigningTask] = useState<Task | null>(null);

  // Transfer Team Modal State
  const [transferringTeam, setTransferringTeam] = useState<Team | null>(null);

  // If user is not the App Owner (Ali Raza), strictly show 403 Restricted Access Screen
  const isOwner = isAppOwner(user);
  if (!isOwner) {
    return (
      <ScreenWrapper title="Access Restricted" subtitle="Owner Authorization Required">
        <Card style={styles.accessDeniedCard}>
          <View style={styles.accessDeniedIconBox}>
            <Ionicons name="shield-outline" size={54} color={Colors.danger} />
          </View>
          <Text style={styles.accessDeniedTitle}>403 · Restricted Area</Text>
          <Text style={styles.accessDeniedSub}>
            Only the App Owner (Ali Raza) has permission to access this central admin panel. Unauthorized access is blocked.
          </Text>
          <Button
            title="Return to Personal Dashboard"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      </ScreenWrapper>
    );
  }

  // Metrics
  const displayUsers = users.length > 0 ? users : user ? [user] : [];
  const totalUsers = displayUsers.length;
  const totalTeams = teams.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    return new Date(t.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
  }).length;

  // Filtered Lists
  const filteredUsers = displayUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTask.toLowerCase()) ||
      (t.assignee?.name && t.assignee.name.toLowerCase().includes(searchTask.toLowerCase()));
    const matchesStatus = taskFilterStatus === 'all' || t.status === taskFilterStatus;
    return matchesSearch && matchesStatus;
  });

  // Inspected User's Tasks
  const inspectedUserTasks = useMemo(() => {
    if (!inspectedUser) return [];
    return tasks.filter((t) => t.assignee_id === inspectedUser.id);
  }, [inspectedUser, tasks]);

  // Handlers
  const handleToggleAdmin = async (targetUser: Profile) => {
    showAlert(
      'Admin Privilege',
      targetUser.isAdmin
        ? `Revoke Admin access for ${targetUser.name}?`
        : `Grant Super Admin privileges to ${targetUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await adminToggleUserAdmin(targetUser.id);
            setInspectedUser((prev) => (prev ? { ...prev, isAdmin: !prev.isAdmin } : null));
            showAlert('Success', 'Admin privileges updated.');
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (targetUser: Profile) => {
    const isSuspended = targetUser.status === 'suspended';
    showAlert(
      isSuspended ? 'Reactivate Account' : 'Suspend Account',
      isSuspended
        ? `Reactivate workspace access for ${targetUser.name}?`
        : `Suspend account for ${targetUser.name}? They will lose access to team workspaces.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSuspended ? 'Reactivate' : 'Suspend',
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            await adminToggleUserStatus(targetUser.id);
            setInspectedUser((prev) =>
              prev ? { ...prev, status: isSuspended ? 'active' : 'suspended' } : null
            );
            showAlert('Success', `Account status updated.`);
          },
        },
      ]
    );
  };

  const handleDeleteUserAccount = (targetUser: Profile) => {
    showAlert(
      'Delete User Account',
      `Are you sure you want to completely erase ${targetUser.name} (${targetUser.email})? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            await adminDeleteUser(targetUser.id);
            setInspectedUser(null);
            showAlert('Deleted', `User ${targetUser.name} removed from the system.`);
          },
        },
      ]
    );
  };

  const handleDeleteTeamAction = (teamId: string, teamName: string) => {
    showAlert('Delete Team', `Are you sure you want to permanently delete "${teamName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Permanently',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteTeam(teamId);
          if (res.ok) {
            showAlert('Success', `Team "${teamName}" was removed.`);
          }
        },
      },
    ]);
  };

  return (
    <ScreenWrapper
      title="Super Admin Portal"
      subtitle="Complete Workspace Governance, Solo Accounts & Team Oversight"
      showBack
      onBack={() => router.replace('/(tabs)/profile')}
      headerRight={
        <Button
          title="Exit Admin"
          variant="outline"
          size="sm"
          icon={<Ionicons name="close" size={16} color={currentTheme.colors.primary} />}
          onPress={() => router.replace('/(tabs)/profile')}
        />
      }
    >
      {/* 1. Admin KPI Bento Metrics */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: currentTheme.colors.primaryLight }]}>
            <Ionicons name="people" size={18} color={currentTheme.colors.primary} />
          </View>
          <Text style={styles.metricVal}>{totalUsers}</Text>
          <Text style={styles.metricLabel}>Solo Users</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
            <Ionicons name="briefcase" size={18} color="#0284c7" />
          </View>
          <Text style={styles.metricVal}>{totalTeams}</Text>
          <Text style={styles.metricLabel}>All Teams</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
            <Ionicons name="trophy" size={18} color={currentTheme.colors.ok} />
          </View>
          <Text style={styles.metricVal}>{completionRate}%</Text>
          <Text style={styles.metricLabel}>Velocity Rate</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(225, 29, 72, 0.1)' }]}>
            <Ionicons name="alert-circle" size={18} color={currentTheme.colors.danger} />
          </View>
          <Text style={[styles.metricVal, { color: currentTheme.colors.danger }]}>{overdueTasks}</Text>
          <Text style={styles.metricLabel}>Overdue Tasks</Text>
        </Card>
      </View>

      {/* 2. Admin Segmented Navigation Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === 'users' ? '#ffffff' : currentTheme.colors.subtext}
            />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Solo Accounts ({filteredUsers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'teams' && styles.tabBtnActive]}
            onPress={() => setActiveTab('teams')}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={activeTab === 'teams' ? '#ffffff' : currentTheme.colors.subtext}
            />
            <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]}>
              Teams ({teams.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tasks' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <Ionicons
              name="checkbox-outline"
              size={16}
              color={activeTab === 'tasks' ? '#ffffff' : currentTheme.colors.subtext}
            />
            <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
              All Tasks ({tasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'logs' && styles.tabBtnActive]}
            onPress={() => setActiveTab('logs')}
          >
            <Ionicons
              name="shield-outline"
              size={16}
              color={activeTab === 'logs' ? '#ffffff' : currentTheme.colors.subtext}
            />
            <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>
              Audit Log
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 3. TAB 1: SOLO USERS & ACCOUNTS GOVERNANCE */}
      {activeTab === 'users' && (
        <Animated.View entering={FadeInDown.duration(200)}>
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={18} color={currentTheme.colors.subtext} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search solo accounts by name or email..."
              placeholderTextColor={currentTheme.colors.subtext}
              value={searchUser}
              onChangeText={setSearchUser}
            />
          </View>

          {filteredUsers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="person-circle-outline" size={40} color={currentTheme.colors.subtext} />
              <Text style={styles.emptyText}>No user accounts found matching "{searchUser}".</Text>
            </Card>
          ) : (
            filteredUsers.map((u) => {
              const userAssignedCount = tasks.filter((t) => t.assignee_id === u.id).length;
              const isSuspended = u.status === 'suspended';

              return (
                <Card key={u.id} style={styles.userRowCard}>
                  <View style={styles.userCardContent}>
                    {u.picture ? (
                      <Image source={{ uri: u.picture }} style={styles.userAvatar} />
                    ) : (
                      <View style={styles.userAvatarFallback}>
                        <Text style={styles.userAvatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.userNameText}>{u.name}</Text>
                        {u.isAdmin ? (
                          <View style={styles.adminBadgePill}>
                            <Ionicons name="shield-checkmark" size={11} color="#4f46e5" />
                            <Text style={styles.adminBadgeText}>Super Admin</Text>
                          </View>
                        ) : (
                          <View style={styles.memberBadgePill}>
                            <Text style={styles.memberBadgeText}>Member</Text>
                          </View>
                        )}
                        {isSuspended && (
                          <View style={styles.suspendedPill}>
                            <Text style={styles.suspendedText}>SUSPENDED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userEmailText}>{u.email}</Text>
                      <Text style={styles.userMetaText}>
                        Tasks: {userAssignedCount} · Joined: {new Date(u.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Inspect Account Action */}
                    <Button
                      title="Inspect Account"
                      size="sm"
                      variant="outline"
                      icon={<Ionicons name="eye-outline" size={14} color={currentTheme.colors.primary} />}
                      onPress={() => setInspectedUser(u)}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </Animated.View>
      )}

      {/* 4. TAB 2: TEAMS & WORKSPACES GOVERNANCE */}
      {activeTab === 'teams' && (
        <Animated.View entering={FadeInDown.duration(200)}>
          {teams.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={40} color={currentTheme.colors.subtext} />
              <Text style={styles.emptyText}>No teams registered in the company workspace.</Text>
            </Card>
          ) : (
            teams.map((t) => {
              const ownerUser = displayUsers.find((u) => u.id === t.owner_id);
              const teamTaskCount = tasks.filter((tsk) => tsk.team_id === t.id).length;

              return (
                <Card key={t.id} style={styles.teamRowCard}>
                  <View style={styles.teamHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.teamTitle}>{t.name}</Text>
                        <Badge label={`${teamTaskCount} Tasks`} variant="primary" />
                      </View>
                      <Text style={styles.teamSub}>
                        Team Leader: {ownerUser ? `${ownerUser.name} (${ownerUser.email})` : 'System Admin'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => setTransferringTeam(t)}
                        style={styles.transferTeamBtn}
                      >
                        <Ionicons name="swap-horizontal" size={16} color={currentTheme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTeamAction(t.id, t.name)}
                        style={styles.deleteTeamBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.teamCredsRow}>
                    <View style={styles.teamCredBox}>
                      <Text style={styles.credLabel}>Invite Code</Text>
                      <Text style={styles.credVal}>{t.invite_code}</Text>
                    </View>
                    <View style={styles.teamCredBox}>
                      <Text style={styles.credLabel}>Join Password</Text>
                      <Text style={styles.credVal}>{t.join_password}</Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </Animated.View>
      )}

      {/* 5. TAB 3: GLOBAL TASKS OVERSIGHT */}
      {activeTab === 'tasks' && (
        <Animated.View entering={FadeInDown.duration(200)}>
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={18} color={currentTheme.colors.subtext} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search all tasks across the company..."
              placeholderTextColor={currentTheme.colors.subtext}
              value={searchTask}
              onChangeText={setSearchTask}
            />
          </View>

          {/* Status Chips */}
          <View style={styles.filterChipsRow}>
            {['all', 'todo', 'in_progress', 'done'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.filterPill,
                  taskFilterStatus === st && styles.filterPillActive,
                ]}
                onPress={() => setTaskFilterStatus(st)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    taskFilterStatus === st && styles.filterPillTextActive,
                  ]}
                >
                  {st.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredTasks.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="checkbox-outline" size={40} color={currentTheme.colors.subtext} />
              <Text style={styles.emptyText}>No matching tickets found.</Text>
            </Card>
          ) : (
            filteredTasks.map((t) => (
              <Card key={t.id} style={styles.taskAdminCard}>
                <View style={styles.taskAdminRow}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={styles.taskTitleText}>{t.title}</Text>
                      <Badge
                        label={t.priority.toUpperCase()}
                        variant={t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'success'}
                      />
                    </View>
                    <Text style={styles.taskMetaText}>
                      📅 {t.due_date} · 👤 Assignee: {t.assignee?.name || 'Unassigned'} · Status: {t.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Button
                      title="Reassign"
                      size="sm"
                      variant="outline"
                      onPress={() => setReassigningTask(t)}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        showAlert('Delete Task', `Delete ticket "${t.title}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteTask(t.id) },
                        ]);
                      }}
                      style={styles.deleteTeamBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </Animated.View>
      )}

      {/* 6. TAB 4: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <Animated.View entering={FadeInDown.duration(200)}>
          <Card style={styles.logCard}>
            <View style={styles.logHeader}>
              <Ionicons name="shield-checkmark" size={20} color={currentTheme.colors.primary} />
              <Text style={styles.logHeaderTitle}>System-wide Governance & Activity Trail</Text>
            </View>
            {history.length === 0 ? (
              <Text style={styles.emptyLogText}>No audit events logged yet.</Text>
            ) : (
              history.map((h) => (
                <View key={h.id} style={styles.logItemRow}>
                  <View style={styles.logBulletDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logDetailText}>{h.detail}</Text>
                    <Text style={styles.logTimeText}>
                      {new Date(h.created_at).toLocaleString()} · Action: {h.action} · Actor: {h.user_id}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        </Animated.View>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: INSPECT SOLO USER ACCOUNT (FULL ADMIN CONTROL)  */}
      {/* ======================================================== */}
      <Modal visible={!!inspectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.inspectorModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {inspectedUser?.picture ? (
                  <Image source={{ uri: inspectedUser.picture }} style={styles.inspectorAvatar} />
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Text style={styles.userAvatarText}>{inspectedUser?.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.inspectorName}>{inspectedUser?.name}</Text>
                  <Text style={styles.inspectorEmail}>{inspectedUser?.email}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setInspectedUser(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {/* Account Status Badges */}
              <View style={styles.inspectorBadgesRow}>
                <Badge
                  label={inspectedUser?.isAdmin ? 'Super Admin' : 'Workspace Member'}
                  variant={inspectedUser?.isAdmin ? 'primary' : 'muted'}
                />
                <Badge
                  label={inspectedUser?.status === 'suspended' ? 'Suspended' : 'Active Account'}
                  variant={inspectedUser?.status === 'suspended' ? 'danger' : 'success'}
                />
                <Badge label="Google OAuth Verified" variant="success" />
              </View>

              {/* Admin Actions Bar */}
              <Text style={styles.inspectorSectionHeading}>Administrative Controls</Text>
              <View style={styles.inspectorActionButtons}>
                <Button
                  title={inspectedUser?.isAdmin ? 'Demote from Admin' : 'Promote to Super Admin'}
                  variant="outline"
                  size="sm"
                  icon={<Ionicons name="shield-half" size={16} color={currentTheme.colors.primary} />}
                  onPress={() => inspectedUser && handleToggleAdmin(inspectedUser)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={inspectedUser?.status === 'suspended' ? 'Reactivate' : 'Suspend Account'}
                  variant={inspectedUser?.status === 'suspended' ? 'primary' : 'danger'}
                  size="sm"
                  onPress={() => inspectedUser && handleToggleStatus(inspectedUser)}
                  style={{ flex: 1 }}
                />
              </View>

              <Button
                title="Permanently Delete Account"
                variant="danger"
                size="sm"
                icon={<Ionicons name="trash" size={16} color="#ffffff" />}
                onPress={() => inspectedUser && handleDeleteUserAccount(inspectedUser)}
                style={{ marginTop: Spacing.xs, marginBottom: Spacing.md }}
              />

              {/* Inspected User's Assigned Tickets */}
              <Text style={styles.inspectorSectionHeading}>
                Assigned Tickets ({inspectedUserTasks.length})
              </Text>
              {inspectedUserTasks.length === 0 ? (
                <Text style={styles.noUserTasksText}>No tasks currently assigned to this user.</Text>
              ) : (
                inspectedUserTasks.map((tsk) => (
                  <View key={tsk.id} style={styles.inspectedTaskItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inspectedTaskTitle}>{tsk.title}</Text>
                      <Text style={styles.inspectedTaskMeta}>
                        Due: {tsk.due_date} · Priority: {tsk.priority.toUpperCase()} · Status: {tsk.status.toUpperCase()}
                      </Text>
                    </View>
                    <Badge
                      label={tsk.status.replace('_', ' ')}
                      variant={tsk.status === 'done' ? 'success' : 'muted'}
                    />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: REASSIGN TASK TO ANY USER ON THE FLY            */}
      {/* ======================================================== */}
      <Modal visible={!!reassigningTask} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setReassigningTask(null)}>
          <Pressable style={styles.modalCardCompact} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalDialogTitle}>Reassign Task</Text>
            <Text style={styles.modalDialogSub}>
              Select which solo user should take ownership of "{reassigningTask?.title}":
            </Text>

            <ScrollView style={{ maxHeight: 250, marginVertical: Spacing.sm }}>
              {displayUsers.map((targetU) => (
                <TouchableOpacity
                  key={targetU.id}
                  style={styles.reassignUserOption}
                  onPress={async () => {
                    if (reassigningTask) {
                      await adminReassignTask(reassigningTask.id, targetU.id);
                      setReassigningTask(null);
                      showAlert('Success', `Task reassigned to ${targetU.name}`);
                    }
                  }}
                >
                  <Text style={styles.reassignUserName}>{targetU.name}</Text>
                  <Text style={styles.reassignUserEmail}>{targetU.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button title="Cancel" variant="ghost" onPress={() => setReassigningTask(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: TRANSFER TEAM OWNERSHIP                         */}
      {/* ======================================================== */}
      <Modal visible={!!transferringTeam} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setTransferringTeam(null)}>
          <Pressable style={styles.modalCardCompact} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalDialogTitle}>Transfer Team Ownership</Text>
            <Text style={styles.modalDialogSub}>
              Select new leader for team "{transferringTeam?.name}":
            </Text>

            <ScrollView style={{ maxHeight: 250, marginVertical: Spacing.sm }}>
              {displayUsers.map((targetU) => (
                <TouchableOpacity
                  key={targetU.id}
                  style={styles.reassignUserOption}
                  onPress={async () => {
                    if (transferringTeam) {
                      await adminTransferTeam(transferringTeam.id, targetU.id);
                      setTransferringTeam(null);
                      showAlert('Success', `Team transferred to ${targetU.name}`);
                    }
                  }}
                >
                  <Text style={styles.reassignUserName}>{targetU.name}</Text>
                  <Text style={styles.reassignUserEmail}>{targetU.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button title="Cancel" variant="ghost" onPress={() => setTransferringTeam(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ height: 40 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  accessDeniedCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  accessDeniedIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  accessDeniedTitle: {
    fontSize: Typography.heading,
    fontWeight: '800',
    color: '#0f172a',
  },
  accessDeniedSub: {
    fontSize: Typography.body,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 360,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarWrapper: {
    marginBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    minHeight: 38,
  },
  tabBtnActive: {
    backgroundColor: '#4f46e5',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
  },
  userRowCard: {
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  userAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#4f46e5',
    fontWeight: '800',
    fontSize: 16,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  adminBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f46e5',
  },
  memberBadgePill: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  suspendedPill: {
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  suspendedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#e11d48',
  },
  userEmailText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  userMetaText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  teamRowCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  teamSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transferTeamBtn: {
    padding: 7,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  deleteTeamBtn: {
    padding: 7,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
  },
  teamCredsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  teamCredBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  credLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  credVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
    marginTop: 2,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  taskAdminCard: {
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
  },
  taskAdminRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  taskMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  logCard: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  logHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  logItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
    marginTop: 4,
  },
  logDetailText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  logTimeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  emptyLogText: {
    fontSize: 13,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  inspectorModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: Spacing.lg,
    maxHeight: '85%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  inspectorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  inspectorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  inspectorEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  inspectorBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  inspectorSectionHeading: {
    fontSize: Typography.body,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 4,
  },
  inspectorActionButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  noUserTasksText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  inspectedTaskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  inspectedTaskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  inspectedTaskMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  modalCardCompact: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: Spacing.lg,
  },
  modalDialogTitle: {
    fontSize: Typography.heading,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalDialogSub: {
    fontSize: Typography.sm,
    color: '#64748b',
    marginTop: 4,
  },
  reassignUserOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  reassignUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  reassignUserEmail: {
    fontSize: 11,
    color: '#64748b',
  },
});
