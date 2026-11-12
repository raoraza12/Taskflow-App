import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEMES } from '../../src/constants/theme';
import { AnimatedTaskCard } from '../../src/components/AnimatedTaskCard';
import { Task } from '../../src/types/database';

export default function SearchTasksScreen() {
  const { tasks, theme, updateTask } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;
  const router = useRouter();
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();
  const searchResults = trimmed
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(trimmed) ||
          (t.description && t.description.toLowerCase().includes(trimmed)) ||
          (t.assignee?.name && t.assignee.name.toLowerCase().includes(trimmed)) ||
          t.priority.toLowerCase().includes(trimmed) ||
          t.status.toLowerCase().includes(trimmed)
      )
    : [];

  const toggleTaskStatus = (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask(task.id, { status: nextStatus });
  };

  return (
    <ScreenWrapper title="Search Tasks" subtitle="Find any sprint ticket or assignee" showBack>
      <Input
        placeholder="Type keyword, assignee, or priority..."
        value={query}
        onChangeText={setQuery}
        autoFocus
        containerStyle={{ marginBottom: Spacing.md }}
      />

      {trimmed.length === 0 ? (
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
            <Ionicons name="search" size={32} color={currentTheme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Quick Search</Text>
          <Text style={[styles.emptyText, { color: currentTheme.colors.subtext }]}>
            Start typing to search tasks by title, description, team assignee, or priority level.
          </Text>
        </Card>
      ) : searchResults.length === 0 ? (
        <Card
          style={[
            styles.emptyCard,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <View style={[styles.emptyIconCircle, { backgroundColor: currentTheme.colors.warnLight }]}>
            <Ionicons name="alert-circle-outline" size={32} color={currentTheme.colors.warn} />
          </View>
          <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Matches</Text>
          <Text style={[styles.emptyText, { color: currentTheme.colors.subtext }]}>
            No tasks found matching "{query}". Try a different keyword or check spelling.
          </Text>
        </Card>
      ) : (
        searchResults.map((t, idx) => (
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

      <View style={{ height: 30 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.subheading,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: Typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
});
