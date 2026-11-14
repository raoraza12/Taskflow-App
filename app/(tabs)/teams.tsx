import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { showAlert } from '../../src/lib/alerts';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Ionicons } from '@expo/vector-icons';
import { Role } from '../../src/types/database';
import { THEMES } from '../../src/constants/theme';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function TeamsScreen() {
  const router = useRouter();
  const {
    user,
    teams,
    getTeamMembers,
    getMemberRole,
    canManageTeam,
    createTeam,
    requestJoinTeam,
    renameTeam,
    deleteTeam,
    removeMember,
    promoteMember,
    leaveTeam,
    pendingJoinRequests,
    approveJoinRequest,
    declineJoinRequest,
    theme,
  } = useApp();

  const currentTheme = THEMES[theme] || THEMES.snow;

  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Forms
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPass, setNewTeamPass] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState('');

  const activeTeamId = selectedTeamId || teams[0]?.id || '';
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const isLeader = activeTeam?.owner_id === user?.id;
  const members = activeTeamId ? getTeamMembers(activeTeamId) : [];
  const currentRole = activeTeamId ? getMemberRole(activeTeamId) : null;

  const handleCreateTeam = async () => {
    setError('');
    const res = await createTeam({ name: newTeamName, joinPassword: newTeamPass });
    if (res.ok && res.team) {
      setSelectedTeamId(res.team.id);
      setNewTeamName('');
      setNewTeamPass('');
      setShowCreateModal(false);
      showAlert('Success', `Team "${res.team.name}" created!`);
    } else {
      setError(res.error || 'Failed to create team');
    }
  };

  const handleJoinTeam = async () => {
    setError('');
    const res = await requestJoinTeam({
      teamName: joinName,
      inviteCode: joinCode,
      joinPassword: joinPass,
    });
    if (res.ok) {
      if (res.team) {
        setSelectedTeamId(res.team.id);
      }
      const targetName = res.team?.name || joinName;
      setJoinName('');
      setJoinCode('');
      setJoinPass('');
      setShowJoinModal(false);
      showAlert('Welcome to the Team! 🎉', `You have successfully joined "${targetName}".`);
    } else {
      setError(res.error || 'Failed to join team');
    }
  };

  const handleRenameTeam = async () => {
    if (!renameValue.trim()) return;
    const res = await renameTeam(activeTeamId, renameValue);
    if (res.ok) {
      setShowRenameModal(false);
      setRenameValue('');
      showAlert('Success', 'Team renamed successfully.');
    } else {
      showAlert('Error', res.error || 'Could not rename team');
    }
  };

  const handleDeleteTeam = () => {
    showAlert(
      'Delete Team',
      `Are you sure you want to delete "${activeTeam?.name}"? All tasks and member associations will be erased.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteTeam(activeTeamId);
            if (res.ok) {
              setSelectedTeamId('');
              showAlert('Deleted', 'Team was deleted.');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberUserId: string, name: string) => {
    showAlert('Remove Member', `Remove ${name} from ${activeTeam?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeMember(activeTeamId, memberUserId);
        },
      },
    ]);
  };

  const handleRoleChange = (memberUserId: string, current: Role) => {
    const nextRole: Role = current === 'admin' ? 'member' : 'admin';
    showAlert('Change Role', `Change role to ${nextRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => promoteMember(activeTeamId, memberUserId, nextRole),
      },
    ]);
  };

  const handleLeaveTeam = () => {
    showAlert('Leave Team', `Are you sure you want to leave ${activeTeam?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveTeam(activeTeamId);
          setSelectedTeamId('');
        },
      },
    ]);
  };

  return (
    <ScreenWrapper
      title="Teams Portal"
      subtitle={activeTeam ? `${activeTeam.name} (${members.length} members)` : 'Create or join a team'}
      headerRight={
        <View style={styles.headerRight}>
          {activeTeam && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/teams/chat', params: { teamId: activeTeam.id } })}
              style={[
                styles.headerChatBtn,
                {
                  backgroundColor: 'rgba(79, 70, 229, 0.08)',
                  borderColor: 'rgba(79, 70, 229, 0.25)',
                },
              ]}
            >
              <Ionicons name="chatbubbles" size={17} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <Button
            title="+ Join"
            variant="outline"
            size="sm"
            onPress={() => setShowJoinModal(true)}
          />
          <Button
            title="+ Create"
            size="sm"
            onPress={() => setShowCreateModal(true)}
          />
        </View>
      }
    >
      {/* Team Selection Switcher */}
      {teams.length > 0 && (
        <View
          style={[
            styles.teamSelector,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          {teams.map((t) => (
            <Pressable
              key={t.id}
              style={[
                styles.teamTab,
                t.id === activeTeamId ? [styles.teamTabActive, { backgroundColor: currentTheme.colors.primary }] : null,
              ]}
              onPress={() => setSelectedTeamId(t.id)}
            >
              <Text
                style={[
                  styles.teamTabText,
                  { color: currentTheme.colors.subtext },
                  t.id === activeTeamId ? [styles.teamTabTextActive, { color: Colors.white }] : null,
                ]}
              >
                {t.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Pending Join Requests (Leader View) */}
      {isLeader && pendingJoinRequests.length > 0 && (
        <Card variant="bordered" style={styles.pendingCard}>
          <View style={styles.pendingHeader}>
            <Ionicons name="mail-unread-outline" size={20} color={Colors.warn} />
            <Text style={styles.pendingTitle}>
              Pending Join Requests ({pendingJoinRequests.length})
            </Text>
          </View>
          {pendingJoinRequests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqUser}>{req.profile?.name || 'New User'}</Text>
                <Text style={styles.reqEmail}>{req.profile?.email}</Text>
              </View>
              <View style={styles.reqActions}>
                <Button
                  title="Approve"
                  size="sm"
                  onPress={() => approveJoinRequest(req.id)}
                  style={{ marginRight: 6 }}
                />
                <Button
                  title="Decline"
                  variant="danger"
                  size="sm"
                  onPress={() => declineJoinRequest(req.id)}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      {activeTeam ? (
        <>
          {/* Team Group Chat & Voice Discussion Banner */}
          <TouchableOpacity
            style={styles.chatBannerBtn}
            onPress={() => router.push({ pathname: '/teams/chat', params: { teamId: activeTeam.id } })}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#4f46e5', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chatBannerGradient}
            >
              <View style={styles.chatBannerLeft}>
                <View style={styles.chatBannerIcon}>
                  <Ionicons name="chatbubbles" size={24} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.chatBannerTitle}>Team Group Chat & Voice Notes</Text>
                    <View style={styles.chatLiveTag}>
                      <Text style={styles.chatLiveTagText}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.chatBannerSub}>
                    Discussion channel with audio voice notes & @mentions
                  </Text>
                </View>
              </View>
              <View style={styles.chatBannerArrow}>
                <Ionicons name="chevron-forward" size={20} color="#ffffff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Team Access Info (Pass & Code) */}
          <Card style={styles.credsCard}>
            <View style={styles.credsHeader}>
              <View>
                <Text style={[styles.credsTeam, { color: currentTheme.colors.text }]}>{activeTeam.name}</Text>
                <Text style={[styles.credsRole, { color: currentTheme.colors.primary }]}>Your Role: {currentRole?.toUpperCase()}</Text>
              </View>
              {isLeader && (
                <View style={styles.leaderPills}>
                  <Pressable
                    style={[styles.actionPill, { backgroundColor: currentTheme.colors.bgSoft, borderColor: currentTheme.colors.border }]}
                    onPress={() => {
                      setRenameValue(activeTeam.name);
                      setShowRenameModal(true);
                    }}
                  >
                    <Ionicons name="pencil" size={16} color={currentTheme.colors.text} />
                  </Pressable>
                  <Pressable
                    style={[styles.actionPill, styles.actionPillDanger]}
                    onPress={handleDeleteTeam}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.codeRow}>
              <View style={[styles.codeBox, { backgroundColor: currentTheme.colors.bgSoft, borderColor: currentTheme.colors.border }]}>
                <Text style={[styles.codeLabel, { color: currentTheme.colors.subtext }]}>Invite Code</Text>
                <Text style={[styles.codeVal, { color: currentTheme.colors.text }]}>{activeTeam.invite_code}</Text>
              </View>
              {isLeader && (
                <View style={[styles.codeBox, { backgroundColor: currentTheme.colors.bgSoft, borderColor: currentTheme.colors.border }]}>
                  <Text style={[styles.codeLabel, { color: currentTheme.colors.subtext }]}>Join Password</Text>
                  <Text style={[styles.codeVal, { color: currentTheme.colors.text }]}>{activeTeam.join_password}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.credsHint, { color: currentTheme.colors.subtext }]}>
              * Members need team name + invite code + password to request join.
            </Text>
          </Card>

          {/* Members List */}
          <View style={styles.membersSectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Team Members ({members.length})</Text>
            {!isLeader && (
              <Button
                title="Leave Team"
                variant="ghost"
                size="sm"
                onPress={handleLeaveTeam}
                textStyle={{ color: Colors.danger }}
              />
            )}
          </View>

          {members.map((m) => {
            const isSelf = m.user_id === user?.id;
            const isOwner = m.role === 'owner';

            return (
              <Card key={m.id} style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: currentTheme.colors.primaryLight }]}>
                    <Text style={[styles.avatarText, { color: currentTheme.colors.primary }]}>
                      {m.profile?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.memberName, { color: currentTheme.colors.text }]}>
                        {m.profile?.name} {isSelf ? '(You)' : ''}
                      </Text>
                      <View style={styles.userTag}>
                        <Text style={styles.userTagText}>@{m.profile?.username || 'member'}</Text>
                      </View>
                    </View>
                    <Text style={[styles.memberEmail, { color: currentTheme.colors.subtext }]}>{m.profile?.email}</Text>
                  </View>
                  <Badge
                    label={m.role}
                    variant={isOwner ? 'primary' : m.role === 'admin' ? 'warning' : 'muted'}
                  />
                </View>

                {/* Leader Actions on other members */}
                {isLeader && !isSelf && (
                  <View style={styles.memberActionsRow}>
                    <Button
                      title={m.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                      variant="outline"
                      size="sm"
                      onPress={() => handleRoleChange(m.user_id, m.role)}
                      style={{ flex: 1, marginRight: Spacing.sm }}
                    />
                    <Button
                      title="Remove"
                      variant="danger"
                      size="sm"
                      onPress={() => handleRemoveMember(m.user_id, m.profile?.name || 'user')}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Teams Connected</Text>
          <Text style={styles.emptyText}>
            Collaborate in shared sprint workspaces with team task pipelines, group voice chat, and leader controls.
          </Text>
          <View style={styles.emptyActionRow}>
            <Button
              title="+ Create New Team"
              onPress={() => {
                setError('');
                setShowCreateModal(true);
              }}
              style={{ flex: 1 }}
            />
            <Button
              title="Join Existing Team"
              variant="outline"
              onPress={() => {
                setError('');
                setShowJoinModal(true);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {/* Real Modal: Create Team Popup */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateModal(false)}>
          <Pressable style={styles.modalCardPopup} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="people" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.modalPopupTitle}>Create New Team</Text>
                <Text style={styles.modalPopupSub}>Establish a shared collaborative workspace</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.subtext} />
              </TouchableOpacity>
            </View>

            <Input
              label="Team Name"
              placeholder="e.g. Mobile Engineering Core"
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            <Input
              label="Join Password (min 4 characters)"
              placeholder="Enter secure secret passphrase..."
              value={newTeamPass}
              onChangeText={setNewTeamPass}
              secureTextEntry
            />

            {error ? (
              <View style={styles.modalErrorRow}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.modalErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.modalActionButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setShowCreateModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Create Workspace 🚀"
                onPress={handleCreateTeam}
                style={{ flex: 1.4 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Real Modal: Join Team Popup */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowJoinModal(false)}>
          <Pressable style={styles.modalCardPopup} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
                <Ionicons name="enter-outline" size={22} color={Colors.ok} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.modalPopupTitle}>Join Team Workspace</Text>
                <Text style={styles.modalPopupSub}>Enter credentials provided by your Team Leader</Text>
              </View>
              <TouchableOpacity onPress={() => setShowJoinModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.subtext} />
              </TouchableOpacity>
            </View>

            <Input
              label="Exact Team Name"
              placeholder="e.g. Design Core"
              value={joinName}
              onChangeText={setJoinName}
            />
            <Input
              label="6-Digit Invite Code"
              placeholder="e.g. A9B2X1"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
            />
            <Input
              label="Team Access Password"
              placeholder="Enter team secret passphrase..."
              value={joinPass}
              onChangeText={setJoinPass}
              secureTextEntry
            />

            {error ? (
              <View style={styles.modalErrorRow}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.modalErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.modalActionButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setShowJoinModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Send Join Request"
                onPress={handleJoinTeam}
                style={{ flex: 1.4 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Real Modal: Rename Team Popup */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowRenameModal(false)}>
          <Pressable style={styles.modalCardPopup} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="pencil" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.modalPopupTitle}>Rename Team</Text>
                <Text style={styles.modalPopupSub}>Update team display name for all members</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRenameModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.subtext} />
              </TouchableOpacity>
            </View>

            <Input
              label="New Team Name"
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Enter updated team name..."
            />

            <View style={styles.modalActionButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setShowRenameModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                onPress={handleRenameTeam}
                style={{ flex: 1.3 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerChatBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 4,
  },
  teamSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  teamTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  teamTabText: {
    color: Colors.muted,
    fontWeight: '600',
    fontSize: Typography.body,
  },
  teamTabTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  pendingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: Colors.warn,
    marginBottom: Spacing.md,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pendingTitle: {
    color: Colors.warn,
    fontSize: Typography.body,
    fontWeight: '700',
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  reqUser: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: '600',
  },
  reqEmail: {
    color: Colors.muted,
    fontSize: Typography.sm,
  },
  reqActions: {
    flexDirection: 'row',
  },
  credsCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  credsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  credsTeam: {
    fontSize: Typography.heading,
    fontWeight: '800',
    color: Colors.text,
  },
  credsRole: {
    color: Colors.primary,
    fontSize: Typography.xs + 1,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  leaderPills: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  actionPill: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillDanger: {
    backgroundColor: Colors.dangerLight,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  codeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  codeBox: {
    flex: 1,
    backgroundColor: Colors.bgSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  codeLabel: {
    color: Colors.subtext,
    fontSize: Typography.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeVal: {
    color: Colors.text,
    fontSize: Typography.subheading,
    fontWeight: '800',
    marginTop: 4,
  },
  credsHint: {
    color: Colors.muted,
    fontSize: 11,
    marginTop: Spacing.sm,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    color: Colors.text,
  },
  memberCard: {
    marginBottom: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.text,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: '600',
  },
  memberEmail: {
    color: Colors.muted,
    fontSize: Typography.sm,
  },
  memberActionsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.muted,
    fontSize: Typography.body,
    marginTop: Spacing.sm,
  },
  emptyButtons: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    width: '100%',
  },
  modalCard: {
    marginTop: Spacing.md,
    borderColor: Colors.primary,
  },
  modalTitle: {
    fontSize: Typography.heading,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sm,
    marginBottom: Spacing.sm,
  },
  chatBannerBtn: {
    marginBottom: Spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  chatBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: 16,
  },
  chatBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chatBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBannerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  chatLiveTag: {
    backgroundColor: 'rgba(5, 150, 105, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  chatLiveTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chatBannerSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  chatBannerArrow: {
    marginLeft: 8,
  },
  userTag: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  userTagText: {
    color: '#4f46e5',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: '100%',
    maxWidth: 420,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCardPopup: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: Spacing.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeaderRow: {
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
  modalPopupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalPopupSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  modalErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  modalErrorText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});

