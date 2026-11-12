import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography, Gradients } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Task, TaskStatus } from '../../src/types/database';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';
import { THEMES } from '../../src/constants/theme';
import { AnimatedTaskCard } from '../../src/components/AnimatedTaskCard';

export default function TasksScreen() {
  const { user, tasks, updateTask, theme } = useApp();
  const router = useRouter();
  const currentTheme = THEMES[theme];

  const [filterScope, setFilterScope] = useState<'mine' | 'team' | 'personal'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

  const myTasksCount = tasks.filter((t) => t.assignee_id === user?.id).length;
  const teamTasksCount = tasks.filter((t) => t.team_id && !t.is_personal).length;
  const personalTasksCount = tasks.filter((t) => t.is_personal || !t.team_id).length;

  const scopedTasks = tasks.filter((t) => {
    if (filterScope === 'mine') return t.assignee_id === user?.id;
    if (filterScope === 'personal') return t.is_personal || !t.team_id;
    if (filterScope === 'team') return Boolean(t.team_id && !t.is_personal);
    return true;
  });

  const filteredTasks = scopedTasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const todoCount = scopedTasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = scopedTasks.filter((t) => t.status === 'in_progress').length;
  const submittedCount = scopedTasks.filter((t) => t.status === 'submitted').length;
  const doneCount = scopedTasks.filter((t) => t.status === 'done').length;

  const toggleTaskStatus = (task: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'submitted',
      submitted: 'done',
      done: 'todo',
    };
    updateTask(task.id, { status: nextStatus[task.status] });
  };

  return (
    <ScreenWrapper
      title="Task Workspace"
      subtitle={`${filteredTasks.length} task${filteredTasks.length === 1 ? '' : 's'} displayed`}
      headerRight={
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/teams/chat')}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: 'rgba(79, 70, 229, 0.08)',
                borderColor: 'rgba(79, 70, 229, 0.25)',
              },
            ]}
          >
            <Ionicons name="chatbubbles" size={18} color={currentTheme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/tasks/search')}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: currentTheme.colors.bgElevated,
                borderColor: currentTheme.colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Button
            title="+ New"
            size="sm"
            onPress={() => router.push('/tasks/create')}
            style={{ minWidth: 70 }}
          />
        </View>
      }
    >
      {/* 0. View Modes Quick Bar: Kanban, Calendar & Team Chat */}
      <View style={styles.viewModesBar}>
        <TouchableOpacity
          style={[
            styles.viewModeBtn,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
          ]}
          onPress={() => router.push('/tasks/kanban')}
          activeOpacity={0.7}
        >
          <Ionicons name="albums-outline" size={17} color={currentTheme.colors.primary} />
          <Text style={[styles.viewModeText, { color: currentTheme.colors.text }]}>Kanban</Text>
          <Ionicons name="chevron-forward" size={13} color={currentTheme.colors.subtext} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeBtn,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
          ]}
          onPress={() => router.push('/tasks/calendar')}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={17} color="#0284c7" />
          <Text style={[styles.viewModeText, { color: currentTheme.colors.text }]}>Calendar</Text>
          <Ionicons name="chevron-forward" size={13} color={currentTheme.colors.subtext} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeBtn,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
          ]}
          onPress={() => router.push('/(tabs)/chat')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles-outline" size={17} color="#059669" />
          <Text style={[styles.viewModeText, { color: currentTheme.colors.text }]}>Chat</Text>
          <Ionicons name="chevron-forward" size={13} color={currentTheme.colors.subtext} />
        </TouchableOpacity>
      </View>

      {/* 1. Scope Switcher: Mine vs Team Backlog vs Personal */}
      <View style={[styles.scopeSwitcher, { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.scopeBtn,
            filterScope === 'mine' && [styles.scopeBtnActive, { backgroundColor: currentTheme.colors.primary }],
          ]}
          onPress={() => setFilterScope('mine')}
        >
          <Ionicons
            name="person"
            size={14}
            color={filterScope === 'mine' ? Colors.white : currentTheme.colors.subtext}
          />
          <Text style={[styles.scopeText, filterScope === 'mine' && styles.scopeTextActive]}>
            Assigned to Me ({myTasksCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scopeBtn,
            filterScope === 'team' && [styles.scopeBtnActive, { backgroundColor: currentTheme.colors.primary }],
          ]}
          onPress={() => setFilterScope('team')}
        >
          <Ionicons
            name="people"
            size={14}
            color={filterScope === 'team' ? Colors.white : currentTheme.colors.subtext}
          />
          <Text style={[styles.scopeText, filterScope === 'team' && styles.scopeTextActive]}>
            Team Backlog ({teamTasksCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scopeBtn,
            filterScope === 'personal' && [styles.scopeBtnActive, { backgroundColor: currentTheme.colors.primary }],
          ]}
          onPress={() => setFilterScope('personal')}
        >
          <Ionicons
            name="checkbox"
            size={14}
            color={filterScope === 'personal' ? Colors.white : currentTheme.colors.subtext}
          />
          <Text style={[styles.scopeText, filterScope === 'personal' && styles.scopeTextActive]}>
            Personal ({personalTasksCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Status Horizontal Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusChipsContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
            statusFilter === 'all' && {
              backgroundColor: currentTheme.colors.primaryLight,
              borderColor: currentTheme.colors.primary,
            },
          ]}
          onPress={() => setStatusFilter('all')}
        >
          <Text
            style={[
              styles.chipText,
              { color: currentTheme.colors.subtext },
              statusFilter === 'all' && { color: currentTheme.colors.primary, fontWeight: '800' },
            ]}
          >
            All ({scopedTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
            statusFilter === 'todo' && {
              backgroundColor: currentTheme.colors.primaryLight,
              borderColor: currentTheme.colors.primary,
            },
          ]}
          onPress={() => setStatusFilter('todo')}
        >
          <View style={[styles.chipDot, { backgroundColor: currentTheme.colors.subtext }]} />
          <Text
            style={[
              styles.chipText,
              { color: currentTheme.colors.subtext },
              statusFilter === 'todo' && { color: currentTheme.colors.primary, fontWeight: '800' },
            ]}
          >
            To Do ({todoCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
            statusFilter === 'in_progress' && {
              backgroundColor: Colors.warnLight,
              borderColor: Colors.warn,
            },
          ]}
          onPress={() => setStatusFilter('in_progress')}
        >
          <View style={[styles.chipDot, { backgroundColor: Colors.warn }]} />
          <Text
            style={[
              styles.chipText,
              { color: currentTheme.colors.subtext },
              statusFilter === 'in_progress' && { color: Colors.warn, fontWeight: '800' },
            ]}
          >
            In Progress ({inProgressCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
            statusFilter === 'submitted' && {
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              borderColor: '#0284c7',
            },
          ]}
          onPress={() => setStatusFilter('submitted')}
        >
          <View style={[styles.chipDot, { backgroundColor: '#0284c7' }]} />
          <Text
            style={[
              styles.chipText,
              { color: currentTheme.colors.subtext },
              statusFilter === 'submitted' && { color: '#0284c7', fontWeight: '800' },
            ]}
          >
            In Review ({submittedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: currentTheme.colors.bgElevated, borderColor: currentTheme.colors.border },
            statusFilter === 'done' && {
              backgroundColor: Colors.okLight,
              borderColor: Colors.ok,
            },
          ]}
          onPress={() => setStatusFilter('done')}
        >
          <View style={[styles.chipDot, { backgroundColor: Colors.ok }]} />
          <Text
            style={[
              styles.chipText,
              { color: currentTheme.colors.subtext },
              statusFilter === 'done' && { color: Colors.ok, fontWeight: '800' },
            ]}
          >
            Completed ({doneCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 3. Task List */}
      {filteredTasks.length === 0 ? (
        <Card
          style={[
            styles.emptyCard,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <View style={[styles.emptyIconCircle, { backgroundColor: currentTheme.colors.primaryLight }]}>
            <Ionicons name="checkbox-outline" size={38} color={currentTheme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Tasks Found</Text>
          <Text style={[styles.emptySub, { color: currentTheme.colors.subtext }]}>
            {statusFilter !== 'all'
              ? `There are no tasks with status "${statusFilter}".`
              : filterScope === 'mine'
              ? 'No tasks assigned to you right now.'
              : 'Your team workspace is empty.'}
          </Text>
          <Button
            title="+ Create a Task"
            onPress={() => router.push('/tasks/create')}
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      ) : (
        filteredTasks.map((t, idx) => (
          <AnimatedTaskCard
            key={t.id}
            task={t}
            index={idx}
            currentTheme={currentTheme}
            onToggleStatus={(task) => {
              const nextStatus = task.status === 'done' ? 'todo' : 'done';
              updateTask(task.id, { status: nextStatus });
            }}
            onPress={() => router.push({ pathname: '/tasks/edit', params: { taskId: t.id } })}
          />
        ))
      )}

      <View style={{ height: 30 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModesBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginLeft: 6,
  },

  // 1. Scope Switcher
  scopeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  scopeBtnActive: {
    backgroundColor: Colors.primaryDark,
  },
  scopeText: {
    color: Colors.subtext,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  scopeTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },

  // 2. Status Horizontal Filter Chips
  statusChipsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: Colors.primary,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    color: Colors.subtext,
    fontSize: Typography.xs + 1,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },

  // 3. Task Cards
  taskCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskCardDone: {
    opacity: 0.65,
    backgroundColor: 'rgba(22, 28, 42, 0.45)',
  },
  taskCardTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityHigh: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  priorityMed: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  priorityLow: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  priorityChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtaskProgressRow: {
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 4,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  subtaskLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtaskBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  subtaskBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusToggleBtn: {
    marginTop: 2,
  },
  statusCheckDone: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInProgress: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warnLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  statusTodo: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  taskContentCol: {
    flex: 1,
  },
  taskTitle: {
    color: Colors.text,
    fontSize: Typography.body + 1,
    fontWeight: '700',
    lineHeight: 22,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.subtext,
  },
  taskDesc: {
    color: Colors.subtext,
    fontSize: Typography.sm,
    marginTop: 3,
    lineHeight: 18,
  },
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: Colors.subtext,
    fontSize: Typography.xs + 1,
    fontWeight: '500',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: Typography.heading,
    fontWeight: '700',
  },
  emptySub: {
    color: Colors.subtext,
    fontSize: Typography.body,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 320,
  },
});
