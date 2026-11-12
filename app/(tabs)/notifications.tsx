import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { THEMES } from '../../src/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function NotificationsScreen() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    approveJoinRequest,
    declineJoinRequest,
    unreadCount,
    theme,
  } = useApp();

  const currentTheme = THEMES[theme] || THEMES.snow;

  return (
    <ScreenWrapper
      title="Notifications"
      subtitle={`${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`}
      headerRight={
        unreadCount > 0 ? (
          <Button
            title="Mark All Read"
            variant="ghost"
            size="sm"
            onPress={markAllNotificationsRead}
          />
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={[styles.emptyIconCircle, { backgroundColor: currentTheme.colors.primaryLight }]}>
            <Ionicons name="notifications-off-outline" size={36} color={currentTheme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No New Notifications</Text>
          <Text style={[styles.emptyText, { color: currentTheme.colors.subtext }]}>
            You're all caught up! New mentions, task assignments, and team requests will appear here.
          </Text>
        </Card>
      ) : (
        notifications.map((n, idx) => (
          <Animated.View
            key={n.id}
            entering={FadeInDown.delay(Math.min(idx * 50, 300)).duration(260).springify()}
          >
            <Card
              style={[
                styles.notifCard,
                {
                  backgroundColor: currentTheme.colors.bgElevated,
                  borderColor: !n.read ? currentTheme.colors.primary : currentTheme.colors.border,
                },
                !n.read ? { backgroundColor: currentTheme.colors.primaryLight } : null,
              ]}
            >
              <View style={styles.notifRow}>
                <View style={styles.notifIcon}>
                  <Ionicons
                    name={
                      n.kind === 'join_request'
                        ? 'person-add'
                        : n.kind === 'join_result'
                        ? 'checkmark-circle'
                        : n.kind === 'task_assigned'
                        ? 'clipboard'
                        : n.kind === 'task_submitted'
                        ? 'paper-plane'
                        : n.kind === 'task_due_soon'
                        ? 'alarm'
                        : n.kind === 'chat_mention'
                        ? 'chatbubbles'
                        : n.kind === 'member_removed'
                        ? 'person-remove'
                        : 'notifications'
                    }
                    size={22}
                    color={
                      n.kind === 'task_due_soon'
                        ? Colors.warn
                        : n.kind === 'task_submitted'
                        ? '#0284c7'
                        : n.kind === 'member_removed'
                        ? Colors.danger
                        : !n.read
                        ? currentTheme.colors.primary
                        : currentTheme.colors.subtext
                    }
                  />
                </View>

                <View style={styles.notifBody}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.notifTitle, { color: currentTheme.colors.text }]}>{n.title}</Text>
                    {!n.read && <View style={[styles.unreadDot, { backgroundColor: currentTheme.colors.primary }]} />}
                  </View>
                  <Text style={[styles.notifText, { color: currentTheme.colors.subtext }]}>{n.body}</Text>
                  <Text style={[styles.notifTime, { color: currentTheme.colors.subtext }]}>
                    {new Date(n.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>

                  {/* Direct Action for Join Requests */}
                  {n.kind === 'join_request' && n.related_join_request_id && (
                    <View style={styles.actionRow}>
                      <Button
                        title="Approve"
                        size="sm"
                        onPress={() => {
                          approveJoinRequest(n.related_join_request_id!);
                          markNotificationRead(n.id);
                        }}
                        style={{ marginRight: Spacing.sm }}
                      />
                      <Button
                        title="Decline"
                        variant="danger"
                        size="sm"
                        onPress={() => {
                          declineJoinRequest(n.related_join_request_id!);
                          markNotificationRead(n.id);
                        }}
                      />
                    </View>
                  )}
                </View>

                {!n.read && (
                  <Pressable
                    onPress={() => markNotificationRead(n.id)}
                    style={styles.markReadBtn}
                  >
                    <Ionicons name="checkmark" size={18} color={Colors.muted} />
                  </Pressable>
                )}
              </View>
            </Card>
          </Animated.View>
        ))
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  notifCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  unreadCard: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notifIcon: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  notifBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  notifTitle: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  notifText: {
    color: Colors.text,
    fontSize: Typography.body,
    marginTop: 2,
  },
  notifTime: {
    color: Colors.muted,
    fontSize: Typography.sm,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  markReadBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl + 10,
    paddingHorizontal: Spacing.lg,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.heading,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: Colors.muted,
    fontSize: Typography.body,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});

