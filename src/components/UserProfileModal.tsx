import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile } from '../types/database';
import { useApp } from '../context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';
import { Button } from './Button';
import { Badge } from './Badge';
import { THEMES } from '../constants/theme';
import { triggerHaptic } from '../lib/haptics';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  targetUser: Profile | null;
  teamRole?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  onClose,
  targetUser,
  teamRole,
}) => {
  const {
    user,
    theme,
    getConnectionStatus,
    sendTeammateRequest,
    acceptTeammateRequest,
    declineTeammateRequest,
    connections,
  } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;

  const [loadingAction, setLoadingAction] = useState(false);

  if (!targetUser) return null;

  const isSelf = user?.id === targetUser.id;
  const connectionStatus = isSelf ? 'none' : getConnectionStatus(targetUser.id);

  // Find incoming connection if pending_received
  const incomingReq = connections.find(
    (c) => c.from_user_id === targetUser.id && c.to_user_id === user?.id && c.status === 'pending'
  );

  const handleConnect = async () => {
    triggerHaptic('medium');
    setLoadingAction(true);
    await sendTeammateRequest(targetUser.id);
    setLoadingAction(false);
  };

  const handleAccept = async () => {
    if (!incomingReq) return;
    triggerHaptic('success');
    setLoadingAction(true);
    await acceptTeammateRequest(incomingReq.id);
    setLoadingAction(false);
  };

  const handleDecline = async () => {
    if (!incomingReq) return;
    triggerHaptic('light');
    setLoadingAction(true);
    await declineTeammateRequest(incomingReq.id);
    setLoadingAction(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: currentTheme.colors.bgElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {targetUser.picture ? (
              <Image source={{ uri: targetUser.picture }} style={styles.avatarImg} />
            ) : (
              <LinearGradient
                colors={['#6366f1', '#4338ca']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarLetter}>
                  {(targetUser.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>

          {/* User Details */}
          <View style={styles.contentBody}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: currentTheme.colors.text }]}>
                {targetUser.name}
              </Text>
              {isSelf && <Badge label="You" variant="primary" />}
            </View>

            <Text style={styles.usernameTag}>@{targetUser.username || 'member'}</Text>

            {/* Role & Team info */}
            <View style={styles.chipsRow}>
              {targetUser.job_title ? (
                <View style={styles.roleChip}>
                  <Ionicons name="briefcase-outline" size={13} color="#4f46e5" />
                  <Text style={styles.roleChipText}>{targetUser.job_title}</Text>
                </View>
              ) : null}
              {teamRole ? (
                <View style={[styles.roleChip, { backgroundColor: '#f1f5f9' }]}>
                  <Ionicons name="shield-checkmark-outline" size={13} color="#475569" />
                  <Text style={[styles.roleChipText, { color: '#475569' }]}>
                    {teamRole.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Bio Section */}
            <View style={[styles.bioBox, { backgroundColor: currentTheme.colors.bg }]}>
              <Text style={[styles.bioLabel, { color: currentTheme.colors.subtext }]}>BIO</Text>
              <Text style={[styles.bioContent, { color: currentTheme.colors.text }]}>
                {targetUser.bio && targetUser.bio.trim().length > 0
                  ? targetUser.bio.trim()
                  : 'No personal bio added yet.'}
              </Text>
            </View>

            {/* Email */}
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={15} color={currentTheme.colors.subtext} />
              <Text style={[styles.emailText, { color: currentTheme.colors.subtext }]}>
                {targetUser.email}
              </Text>
            </View>

            {/* Connection Actions (Member-to-Member) */}
            {!isSelf && (
              <View style={styles.actionContainer}>
                {connectionStatus === 'connected' ? (
                  <View style={styles.connectedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.connectedText}>Connected Teammate</Text>
                  </View>
                ) : connectionStatus === 'pending_sent' ? (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={18} color="#f59e0b" />
                    <Text style={styles.pendingText}>Connection Request Pending</Text>
                  </View>
                ) : connectionStatus === 'pending_received' ? (
                  <View style={styles.pendingActionsRow}>
                    <Button
                      title="Accept Request"
                      size="sm"
                      loading={loadingAction}
                      onPress={handleAccept}
                      style={{ flex: 1, marginRight: Spacing.sm }}
                    />
                    <Button
                      title="Decline"
                      variant="danger"
                      size="sm"
                      loading={loadingAction}
                      onPress={handleDecline}
                    />
                  </View>
                ) : (
                  <Button
                    title="Add Teammate"
                    size="sm"
                    loading={loadingAction}
                    onPress={handleConnect}
                    style={styles.connectBtn}
                  />
                )}
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  bannerGradient: {
    height: 80,
    width: '100%',
    position: 'relative',
    alignItems: 'flex-end',
    padding: Spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    alignSelf: 'center',
    marginTop: -44,
    borderWidth: 4,
    borderColor: '#ffffff',
    borderRadius: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  contentBody: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xs,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
  },
  usernameTag: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '700',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  bioBox: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  bioLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  bioContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  emailText: {
    fontSize: 12,
  },
  actionContainer: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  connectBtn: {
    width: '100%',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  connectedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  pendingActionsRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
