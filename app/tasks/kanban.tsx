import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Task, TaskStatus } from '../../src/types/database';
import { THEMES } from '../../src/constants/theme';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';

export default function KanbanScreen() {
  const { tasks, teams, user, updateTask, theme } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;
  const router = useRouter();

  // Filter by Team or Personal
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filteredTasks = tasks.filter((t) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'personal') return t.is_personal || !t.team_id;
    return t.team_id === selectedFilter;
  });

  const columns: {
    key: TaskStatus;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
  }[] = [
    {
      key: 'todo',
      label: 'TO DO',
      icon: 'list-outline',
      color: currentTheme.colors.primary,
      bg: currentTheme.colors.primaryLight,
    },
    {
      key: 'in_progress',
      label: 'IN PROGRESS',
      icon: 'time-outline',
      color: currentTheme.colors.warn,
      bg: currentTheme.colors.warnLight,
    },
    {
      key: 'submitted',
      label: 'IN REVIEW',
      icon: 'shield-checkmark-outline',
      color: '#0284c7',
      bg: 'rgba(2, 132, 199, 0.1)',
    },
    {
      key: 'done',
      label: 'COMPLETED',
      icon: 'checkmark-circle-outline',
      color: currentTheme.colors.ok,
      bg: currentTheme.colors.okLight,
    },
  ];

  const moveTask = (task: Task, direction: 'prev' | 'next') => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'submitted', 'done'];
    const currentIndex = order.indexOf(task.status);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < order.length) {
      updateTask(task.id, { status: order[nextIndex] });
    }
  };

  return (
    <ScreenWrapper
      title="Kanban Board"
      subtitle={`${filteredTasks.length} active sprint tickets across 4 lanes`}
      showBack
      headerRight={
        <Button
          title="+ New Task"
          size="sm"
          onPress={() => router.push('/tasks/create')}
        />
      }
      scrollable={false}
    >
      {/* Workspace Quick Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedFilter === 'all' && styles.filterPillActive,
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Ionicons
              name="grid-outline"
              size={13}
              color={selectedFilter === 'all' ? '#ffffff' : '#64748b'}
            />
            <Text style={[styles.filterPillText, selectedFilter === 'all' && styles.filterPillTextActive]}>
              All Tasks ({tasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedFilter === 'personal' && styles.filterPillActive,
            ]}
            onPress={() => setSelectedFilter('personal')}
          >
            <Ionicons
              name="person-outline"
              size={13}
              color={selectedFilter === 'personal' ? '#ffffff' : '#64748b'}
            />
            <Text style={[styles.filterPillText, selectedFilter === 'personal' && styles.filterPillTextActive]}>
              Personal Solo ({tasks.filter((t) => t.is_personal || !t.team_id).length})
            </Text>
          </TouchableOpacity>

          {teams.map((tm) => (
            <TouchableOpacity
              key={tm.id}
              style={[
                styles.filterPill,
                selectedFilter === tm.id && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(tm.id)}
            >
              <Ionicons
                name="people-outline"
                size={13}
                color={selectedFilter === tm.id ? '#ffffff' : '#64748b'}
              />
              <Text style={[styles.filterPillText, selectedFilter === tm.id && styles.filterPillTextActive]}>
                {tm.name} ({tasks.filter((t) => t.team_id === tm.id).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Kanban Board Horizontal Lanes */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kanbanScroll}
      >
        {columns.map((col, colIdx) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key);

          return (
            <Animated.View
              key={col.key}
              entering={FadeInRight.delay(colIdx * 80).duration(280).springify()}
              style={[
                styles.columnContainer,
                {
                  backgroundColor: currentTheme.colors.bgElevated,
                  borderColor: currentTheme.colors.border,
                },
              ]}
            >
              {/* Column Header */}
              <View style={[styles.columnHeader, { borderTopColor: col.color }]}>
                <View style={styles.colTitleRow}>
                  <Ionicons name={col.icon} size={16} color={col.color} />
                  <Text style={[styles.columnTitle, { color: currentTheme.colors.text }]}>
                    {col.label}
                  </Text>
                </View>
                <View style={[styles.colBadge, { backgroundColor: col.bg }]}>
                  <Text style={[styles.colBadgeText, { color: col.color }]}>{colTasks.length}</Text>
                </View>
              </View>

              {/* Task Tickets Inside Column */}
              <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
                {colTasks.length === 0 ? (
                  <View style={styles.emptyCol}>
                    <Ionicons name="file-tray-outline" size={32} color={currentTheme.colors.subtext} />
                    <Text style={[styles.emptyColText, { color: currentTheme.colors.subtext }]}>
                      No tickets in {col.label.toLowerCase()}
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyColBtn}
                      onPress={() => router.push('/tasks/create')}
                    >
                      <Text style={styles.emptyColBtnText}>+ Add Ticket</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  colTasks.map((t) => {
                    const priorityColor =
                      t.priority === 'high'
                        ? currentTheme.colors.danger
                        : t.priority === 'medium'
                        ? currentTheme.colors.warn
                        : currentTheme.colors.ok;
                    const priorityBg =
                      t.priority === 'high'
                        ? currentTheme.colors.dangerLight
                        : t.priority === 'medium'
                        ? currentTheme.colors.warnLight
                        : currentTheme.colors.okLight;
                    const priorityIcon =
                      t.priority === 'high' ? 'flame' : t.priority === 'medium' ? 'flash' : 'leaf-outline';

                    return (
                      <Card
                        key={t.id}
                        style={[
                          styles.taskCard,
                          {
                            backgroundColor: '#ffffff',
                            borderColor: currentTheme.colors.border,
                            borderLeftColor: priorityColor,
                            borderLeftWidth: 3.5,
                          },
                        ]}
                        onPress={() =>
                          router.push({ pathname: '/tasks/edit', params: { taskId: t.id } })
                        }
                      >
                        <View style={styles.cardTopRow}>
                          <View style={[styles.priorityChip, { backgroundColor: priorityBg }]}>
                            <Ionicons name={priorityIcon} size={11} color={priorityColor} />
                            <Text style={[styles.priorityText, { color: priorityColor }]}>
                              {t.priority.toUpperCase()}
                            </Text>
                          </View>
                          {t.is_personal ? (
                            <View style={styles.personalBadge}>
                              <Ionicons name="person" size={10} color="#64748b" />
                              <Text style={styles.personalBadgeText}>Solo</Text>
                            </View>
                          ) : t.assignee?.name ? (
                            <View style={[styles.avatarMini, { backgroundColor: currentTheme.colors.primaryLight }]}>
                              <Text style={[styles.avatarText, { color: currentTheme.colors.primary }]}>
                                {t.assignee.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={[styles.taskTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
                          {t.title}
                        </Text>
                        {t.description ? (
                          <Text
                            style={[styles.taskDesc, { color: currentTheme.colors.subtext }]}
                            numberOfLines={2}
                          >
                            {t.description}
                          </Text>
                        ) : null}

                        <View style={styles.taskFooter}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="calendar-outline" size={12} color={currentTheme.colors.subtext} />
                            <Text style={[styles.taskDue, { color: currentTheme.colors.subtext }]}>
                              {t.due_date}
                            </Text>
                          </View>
                          {t.subtasks && t.subtasks.length > 0 ? (
                            <Text style={[styles.subtaskCount, { color: currentTheme.colors.primary }]}>
                              ✓ {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
                            </Text>
                          ) : null}
                        </View>

                        {/* Move Column Controls */}
                        <View style={[styles.moveBar, { borderTopColor: currentTheme.colors.border }]}>
                          {col.key !== 'todo' && (
                            <TouchableOpacity
                              style={[styles.moveBtn, { backgroundColor: currentTheme.colors.bgSoft }]}
                              onPress={() => moveTask(t, 'prev')}
                            >
                              <Ionicons name="arrow-back" size={12} color={currentTheme.colors.text} />
                              <Text style={[styles.moveText, { color: currentTheme.colors.text }]}>
                                Back
                              </Text>
                            </TouchableOpacity>
                          )}
                          {col.key !== 'done' && (
                            <TouchableOpacity
                              style={[styles.moveBtn, { backgroundColor: currentTheme.colors.bgSoft, marginLeft: 'auto' }]}
                              onPress={() => moveTask(t, 'next')}
                            >
                              <Text style={[styles.moveText, { color: currentTheme.colors.text }]}>
                                {col.key === 'submitted' ? 'Approve' : 'Advance'}
                              </Text>
                              <Ionicons name="arrow-forward" size={12} color={currentTheme.colors.text} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </Card>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    marginBottom: Spacing.sm,
  },
  filterScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
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
  kanbanScroll: {
    paddingBottom: Spacing.xl,
    paddingRight: Spacing.md,
  },
  columnContainer: {
    width: 295,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginRight: Spacing.md,
    maxHeight: '100%',
    padding: Spacing.sm,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderTopWidth: 3,
    marginBottom: Spacing.sm,
  },
  colTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  colBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  colBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  taskList: {
    flex: 1,
  },
  taskCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  personalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  personalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '800',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  taskDue: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtaskCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  moveBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moveText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  emptyColText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyColBtn: {
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyColBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
});
