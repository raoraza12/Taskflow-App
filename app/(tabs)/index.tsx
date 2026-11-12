import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp, isAppOwner } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Task } from '../../src/types/database';
import { THEMES } from '../../src/constants/theme';
import { AnimatedTaskCard } from '../../src/components/AnimatedTaskCard';
import { AnimatedMetricCard } from '../../src/components/AnimatedDashboardWidgets';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { triggerHaptic } from '../../src/lib/haptics';

export default function DashboardScreen() {
  const { user, tasks, teams, today, updateTask, theme } = useApp();
  const router = useRouter();
  const currentTheme = THEMES[theme] || THEMES.snow;

  // Personalized Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const myTasks = tasks.filter((t) => t.assignee_id === user?.id);
  const todayTasks = myTasks.filter((t) => t.due_date === today);
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const doneToday = todayTasks.filter((t) => t.status === 'done').length;
  const overdueTasks = myTasks.filter((t) => t.due_date < today && t.status !== 'done');

  // Friendly date: e.g. "Thursday, Nov 12"
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const completionPercent =
    todayTasks.length > 0 ? Math.round((doneToday / todayTasks.length) * 100) : 0;

  const toggleTaskStatus = (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask(task.id, { status: nextStatus });
  };

  return (
    <ScreenWrapper
      title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'Friend'} 👋`}
      subtitle={`Sprint Workspace · ${formattedDate}`}
      headerRight={
        <View style={styles.headerRightRow}>
          {isAppOwner(user) && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                router.push('/admin' as any);
              }}
              style={[
                styles.adminPill,
                {
                  backgroundColor: currentTheme.colors.primaryLight,
                  borderColor: currentTheme.colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark" size={13} color={currentTheme.colors.primary} />
              <Text style={[styles.adminPillText, { color: currentTheme.colors.primary }]}>
                Admin
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              router.push('/tasks/search');
            }}
            style={[
              styles.iconBtn,
              {
                backgroundColor: currentTheme.colors.bgElevated,
                borderColor: currentTheme.colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>
      }
    >
      {/* 1. Clean, Spacious Progress Card (De-cluttered) */}
      <Animated.View entering={FadeInDown.duration(320).springify()}>
        <LinearGradient
          colors={currentTheme.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroCard,
            {
              borderRadius: currentTheme.cardRadius,
              borderColor: currentTheme.colors.borderGlow,
            },
          ]}
        >
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSubtitle}>TODAY'S SPRINT PROGRESS</Text>
              <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>
                {doneToday} of {todayTasks.length} tasks completed
              </Text>
            </View>

            <View
              style={[
                styles.percentCircle,
                {
                  backgroundColor: currentTheme.colors.primaryLight,
                  borderColor: currentTheme.colors.primary,
                },
              ]}
            >
              <Text style={[styles.percentNumber, { color: currentTheme.colors.primary }]}>
                {completionPercent}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressBarBg,
              {
                backgroundColor:
                  currentTheme.key === 'snow'
                    ? 'rgba(0, 0, 0, 0.08)'
                    : 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          >
            <LinearGradient
              colors={currentTheme.progressGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${Math.max(completionPercent, todayTasks.length === 0 ? 0 : 6)}%` },
              ]}
            />
          </View>

          <View style={styles.heroFooterRow}>
            <Ionicons
              name={
                completionPercent === 100 && todayTasks.length > 0
                  ? 'checkmark-circle'
                  : 'sparkles-outline'
              }
              size={15}
              color={currentTheme.colors.primary}
            />
            <Text style={[styles.heroFooterText, { color: currentTheme.colors.subtext }]}>
              {todayTasks.length === 0
                ? 'No tasks due today. Plan your next goals below.'
                : completionPercent === 100
                ? 'Great job! All of today’s tasks are complete.'
                : `${todayTasks.length - doneToday} task${
                    todayTasks.length - doneToday > 1 ? 's' : ''
                  } remaining today.`}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* 2. Simplified Action Dock: Clean, Big Touch Targets (No Unnecessary Clutter) */}
      <Animated.View
        entering={FadeInDown.delay(70).duration(300).springify()}
        style={styles.actionRow}
      >
        <TouchableOpacity
          style={[styles.newTaskBtn, { borderRadius: currentTheme.btnRadius }]}
          onPress={() => {
            triggerHaptic('light');
            router.push('/tasks/create');
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[currentTheme.colors.primary, currentTheme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newTaskGradient}
          >
            <Ionicons name="add-circle" size={19} color={Colors.white} />
            <Text style={styles.newTaskText}>New Task</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionSecondaryBtn,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
              borderRadius: currentTheme.btnRadius,
            },
          ]}
          onPress={() => {
            triggerHaptic('light');
            router.push('/(tabs)/tasks');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="checkbox-outline" size={17} color={currentTheme.colors.primary} />
          <Text style={[styles.actionSecondaryText, { color: currentTheme.colors.text }]}>
            All Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionSecondaryBtn,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
              borderRadius: currentTheme.btnRadius,
            },
          ]}
          onPress={() => {
            triggerHaptic('light');
            router.push('/tasks/kanban');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="albums-outline" size={17} color={currentTheme.colors.primary} />
          <Text style={[styles.actionSecondaryText, { color: currentTheme.colors.text }]}>
            Kanban
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 3. 2x2 Metric Cards (Spacious, Clean) */}
      <View style={styles.metricGrid}>
        <AnimatedMetricCard
          icon="calendar-outline"
          iconBg={currentTheme.colors.primaryLight}
          iconColor={currentTheme.colors.primary}
          value={todayTasks.length}
          label="Due Today"
          valueColor={currentTheme.colors.text}
          cardBg={currentTheme.colors.bgElevated}
          borderColor={currentTheme.colors.border}
          subtextColor={currentTheme.colors.subtext}
          cardRadius={currentTheme.cardRadius}
          delay={50}
          onPress={() => router.push('/(tabs)/tasks')}
        />

        <AnimatedMetricCard
          icon="time-outline"
          iconBg={currentTheme.colors.warnLight}
          iconColor={currentTheme.colors.warn}
          value={inProgressTasks.length}
          label="In Progress"
          valueColor={currentTheme.colors.warn}
          cardBg={currentTheme.colors.bgElevated}
          borderColor={currentTheme.colors.border}
          subtextColor={currentTheme.colors.subtext}
          cardRadius={currentTheme.cardRadius}
          delay={100}
          onPress={() => router.push('/(tabs)/tasks')}
        />

        <AnimatedMetricCard
          icon="checkmark-circle-outline"
          iconBg={currentTheme.colors.okLight}
          iconColor={currentTheme.colors.ok}
          value={doneToday}
          label="Completed"
          valueColor={currentTheme.colors.ok}
          cardBg={currentTheme.colors.bgElevated}
          borderColor={currentTheme.colors.border}
          subtextColor={currentTheme.colors.subtext}
          cardRadius={currentTheme.cardRadius}
          delay={150}
          onPress={() => router.push('/(tabs)/tasks')}
        />

        <AnimatedMetricCard
          icon="people-outline"
          iconBg={currentTheme.colors.secondaryLight}
          iconColor={currentTheme.colors.secondary}
          value={teams.length}
          label="Active Teams"
          valueColor={currentTheme.colors.secondary}
          cardBg={currentTheme.colors.bgElevated}
          borderColor={currentTheme.colors.border}
          subtextColor={currentTheme.colors.subtext}
          cardRadius={currentTheme.cardRadius}
          delay={200}
          onPress={() => router.push('/(tabs)/teams')}
        />
      </View>

      {/* 4. Overdue Tasks Alert (Only when relevant) */}
      {overdueTasks.length > 0 && (
        <View style={styles.overdueAlertBox}>
          <View style={styles.overdueAlertHeader}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.overdueAlertTitle}>
              {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.overdueAlertSub}>
            Please review or reschedule your pending tasks from previous days.
          </Text>
        </View>
      )}

      {/* 5. Section Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="checkbox-outline" size={18} color={currentTheme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
            Focus for Today
          </Text>
          <View
            style={[styles.countBadge, { backgroundColor: currentTheme.colors.primaryLight }]}
          >
            <Text style={[styles.countBadgeText, { color: currentTheme.colors.primary }]}>
              {todayTasks.length}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            router.push('/(tabs)/tasks');
          }}
          style={styles.seeAllBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllLink, { color: currentTheme.colors.primary }]}>
            View All
          </Text>
          <Ionicons name="chevron-forward" size={14} color={currentTheme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 6. Today's Tasks List */}
      {todayTasks.length === 0 ? (
        <Card
          style={[
            styles.emptyCard,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <View
            style={[styles.emptyIconCircle, { backgroundColor: currentTheme.colors.primaryLight }]}
          >
            <Ionicons name="sparkles" size={32} color={currentTheme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>
            No tasks due today
          </Text>
          <Text style={[styles.emptySub, { color: currentTheme.colors.subtext }]}>
            Enjoy your free time or create a new task to get ahead!
          </Text>
          <Button
            title="+ Create New Task"
            onPress={() => router.push('/tasks/create')}
            style={{ marginTop: Spacing.sm }}
            size="sm"
          />
        </Card>
      ) : (
        todayTasks.map((t, idx) => (
          <AnimatedTaskCard
            key={t.id}
            task={t}
            index={idx}
            currentTheme={currentTheme}
            onToggleStatus={toggleTaskStatus}
            onPress={() =>
              router.push({ pathname: '/tasks/edit', params: { taskId: t.id } })
            }
          />
        ))
      )}

      <View style={{ height: 28 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  adminPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 1. Hero Card
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: Typography.heading,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  percentCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 7,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs + 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroFooterText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    flex: 1,
  },

  // 2. Action Row (3 Big buttons)
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.md,
  },
  newTaskBtn: {
    flex: 1.5,
    overflow: 'hidden',
  },
  newTaskGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  newTaskText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  actionSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 11,
  },
  actionSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 3. Metric Grid
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  // 4. Overdue Alert
  overdueAlertBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: Spacing.md,
  },
  overdueAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  overdueAlertTitle: {
    color: Colors.danger,
    fontSize: Typography.body,
    fontWeight: '700',
  },
  overdueAlertSub: {
    color: '#64748b',
    fontSize: Typography.sm,
  },

  // 5. Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: Typography.subheading,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllLink: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 6. Empty Card
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs + 2,
  },
  emptyTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: Typography.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
