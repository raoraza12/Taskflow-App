import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEMES } from '../../src/constants/theme';
import { AnimatedTaskCard } from '../../src/components/AnimatedTaskCard';
import { Task } from '../../src/types/database';

export default function CalendarScreen() {
  const { tasks, today, theme, updateTask } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(today);

  // Mark dates on calendar that have tasks
  const markedDates: Record<string, any> = {};
  tasks.forEach((t) => {
    markedDates[t.due_date] = {
      marked: true,
      dotColor: t.status === 'done' ? currentTheme.colors.ok : currentTheme.colors.primary,
      selected: t.due_date === selectedDay,
      selectedColor: currentTheme.colors.primary,
    };
  });

  if (!markedDates[selectedDay]) {
    markedDates[selectedDay] = {
      selected: true,
      selectedColor: currentTheme.colors.primary,
    };
  }

  const dayTasks = tasks.filter((t) => t.due_date === selectedDay);

  const toggleTaskStatus = (task: Task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask(task.id, { status: nextStatus });
  };

  return (
    <ScreenWrapper
      title="Calendar View"
      subtitle={`Schedule for ${selectedDay}`}
      showBack
      headerRight={
        <Button
          title="+ Task"
          size="sm"
          onPress={() => router.push('/tasks/create')}
        />
      }
    >
      {/* Interactive Month Calendar */}
      <Card
        style={[
          styles.calendarCard,
          {
            backgroundColor: currentTheme.colors.bgElevated,
            borderColor: currentTheme.colors.border,
          },
        ]}
      >
        <Calendar
          current={selectedDay}
          onDayPress={(day: any) => setSelectedDay(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: currentTheme.colors.bgElevated,
            calendarBackground: currentTheme.colors.bgElevated,
            textSectionTitleColor: currentTheme.colors.subtext,
            selectedDayBackgroundColor: currentTheme.colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: currentTheme.colors.primary,
            dayTextColor: currentTheme.colors.text,
            textDisabledColor: currentTheme.key === 'snow' ? 'rgba(15, 23, 42, 0.2)' : 'rgba(154, 163, 178, 0.3)',
            dotColor: currentTheme.colors.primary,
            selectedDotColor: '#ffffff',
            arrowColor: currentTheme.colors.primary,
            monthTextColor: currentTheme.colors.text,
            textDayFontWeight: '600',
            textMonthFontWeight: '800',
            textDayHeaderFontWeight: '700',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
          }}
        />
      </Card>

      {/* Selected Day's Task List */}
      <View style={styles.dayTasksHeader}>
        <Ionicons name="calendar" size={18} color={currentTheme.colors.primary} />
        <Text style={[styles.dayTitle, { color: currentTheme.colors.text }]}>
          Tasks on {selectedDay} ({dayTasks.length})
        </Text>
      </View>

      {dayTasks.length === 0 ? (
        <Card
          style={[
            styles.emptyCard,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <Ionicons name="calendar-clear-outline" size={40} color={currentTheme.colors.subtext} />
          <Text style={[styles.emptyText, { color: currentTheme.colors.subtext }]}>
            No tasks scheduled for this day.
          </Text>
          <Button
            title="Add Task for This Day"
            variant="outline"
            size="sm"
            onPress={() => router.push('/tasks/create')}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>
      ) : (
        dayTasks.map((t, idx) => (
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

      <View style={{ height: 30 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    padding: 4,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  dayTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  dayTitle: {
    fontSize: Typography.heading,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: Typography.body,
    marginTop: Spacing.sm,
  },
});
