import React from 'react';
import { StyleSheet, View, Text, Pressable, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../types/database';
import { ThemeConfig } from '../constants/theme';
import { Radius, Spacing, Typography } from '../constants/colors';
import { triggerHaptic } from '../lib/haptics';

interface AnimatedTaskCardProps {
  task: Task;
  index: number;
  currentTheme: ThemeConfig;
  onToggleStatus: (task: Task) => void;
  onPress: () => void;
  onEditPress?: () => void;
}

function AnimatedTaskCheckbox({
  isDone,
  isInProgress,
  onToggle,
  primaryColor,
  borderColor,
  isWhiteTheme,
}: {
  isDone: boolean;
  isInProgress?: boolean;
  onToggle: () => void;
  primaryColor: string;
  borderColor: string;
  isWhiteTheme: boolean;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    triggerHaptic(isDone ? 'selection' : 'success');
    scale.value = withSequence(
      withTiming(0.8, { duration: 60 }),
      withSpring(1.25, { damping: 10, stiffness: 220 }),
      withSpring(1, { damping: 14 })
    );
    onToggle();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={handlePress} style={styles.checkboxTouch}>
      <Animated.View style={animStyle}>
        {isDone ? (
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkedBox}
          >
            <Ionicons name="checkmark" size={14} color="#ffffff" />
          </LinearGradient>
        ) : isInProgress ? (
          <View style={[styles.inProgressBox, { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="time" size={13} color="#f59e0b" />
          </View>
        ) : (
          <View
            style={[
              styles.uncheckedBox,
              {
                borderColor: borderColor,
                backgroundColor: isWhiteTheme ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
              },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

export const AnimatedTaskCard: React.FC<AnimatedTaskCardProps> = ({
  task,
  index,
  currentTheme,
  onToggleStatus,
  onPress,
  onEditPress,
}) => {
  const isDone = task.status === 'done';
  const isInProgress = task.status === 'in_progress';
  const totalSubtasks = task.subtasks?.length || 0;
  const doneSubtasks = task.subtasks?.filter((s) => s.done).length || 0;
  const isWhite = currentTheme.key === 'snow';

  const cardScale = useSharedValue(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const priorityColor =
    task.priority === 'high'
      ? currentTheme.colors.danger
      : task.priority === 'medium'
      ? currentTheme.colors.warn
      : currentTheme.colors.ok;

  const priorityBg =
    task.priority === 'high'
      ? currentTheme.colors.dangerLight
      : task.priority === 'medium'
      ? currentTheme.colors.warnLight
      : currentTheme.colors.okLight;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 45, 300)).duration(280).springify()}
      layout={LinearTransition.springify().damping(16).stiffness(180)}
      style={cardAnimStyle}
    >
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onPress();
        }}
        onPressIn={() => (cardScale.value = withSpring(0.985, { damping: 15 }))}
        onPressOut={() => (cardScale.value = withSpring(1, { damping: 12 }))}
        style={[
          styles.cardContainer,
          {
            backgroundColor: currentTheme.colors.bgElevated,
            borderColor: currentTheme.colors.border,
            borderRadius: currentTheme.cardRadius,
            borderLeftColor: priorityColor,
            borderLeftWidth: 4,
          },
          isDone && styles.cardDone,
          isWhite && styles.cardWhiteShadow,
        ]}
      >
        {/* Top Meta: Category + Priority Chip */}
        <View style={styles.topRow}>
          <View style={styles.categoryPill}>
            <Ionicons
              name={task.is_personal || !task.team_id ? 'person-outline' : 'people-outline'}
              size={12}
              color={currentTheme.colors.subtext}
            />
            <Text style={[styles.categoryText, { color: currentTheme.colors.subtext }]}>
              {task.is_personal || !task.team_id ? 'Personal Solo' : 'Team Sprint'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {task.status === 'submitted' && (
              <View style={styles.submittedPill}>
                <Ionicons name="arrow-up-circle" size={11} color="#0284c7" />
                <Text style={styles.submittedPillText}>IN REVIEW</Text>
              </View>
            )}
            <View style={[styles.priorityChip, { backgroundColor: priorityBg, borderColor: priorityColor }]}>
              <Ionicons
                name={task.priority === 'high' ? 'flame' : task.priority === 'medium' ? 'flash' : 'leaf-outline'}
                size={11}
                color={priorityColor}
              />
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {task.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Checkbox + Title + Description */}
        <View style={styles.mainRow}>
          <AnimatedTaskCheckbox
            isDone={isDone}
            isInProgress={isInProgress}
            onToggle={() => onToggleStatus(task)}
            primaryColor={currentTheme.colors.primary}
            borderColor={currentTheme.colors.border}
            isWhiteTheme={isWhite}
          />
          <View style={styles.titleCol}>
            <Text
              style={[
                styles.taskTitle,
                { color: currentTheme.colors.text },
                isDone && styles.taskTitleDone,
              ]}
            >
              {task.title}
            </Text>
            {task.description ? (
              <Text
                style={[styles.taskDesc, { color: currentTheme.colors.subtext }]}
                numberOfLines={2}
              >
                {task.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Subtask Progress Bar (If Subtasks Exist) */}
        {totalSubtasks > 0 && (
          <View style={styles.subtaskRow}>
            <View style={styles.subtaskHeader}>
              <Ionicons name="checkbox-outline" size={13} color={currentTheme.colors.primary} />
              <Text style={[styles.subtaskLabel, { color: currentTheme.colors.subtext }]}>
                Subtasks ({doneSubtasks}/{totalSubtasks})
              </Text>
            </View>
            <View
              style={[
                styles.subtaskTrack,
                { backgroundColor: isWhite ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.08)' },
              ]}
            >
              <View
                style={[
                  styles.subtaskFill,
                  {
                    width: `${(doneSubtasks / totalSubtasks) * 100}%`,
                    backgroundColor: currentTheme.colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Footer Meta Row */}
        <View style={[styles.footerRow, { borderTopColor: currentTheme.colors.border }]}>
          <View style={styles.dateMetaCol}>
            {task.assigned_date ? (
              <View style={styles.metaPill}>
                <Ionicons name="paper-plane-outline" size={11} color={currentTheme.colors.subtext} />
                <Text style={[styles.metaText, { color: currentTheme.colors.subtext }]}>
                  {task.assigned_date}
                </Text>
              </View>
            ) : null}
            {task.due_date ? (
              <View style={styles.metaPill}>
                <Ionicons name="calendar-outline" size={11} color={currentTheme.colors.primary} />
                <Text style={[styles.metaText, { color: currentTheme.colors.primary, fontWeight: '700' }]}>
                  Due: {task.due_date}
                </Text>
              </View>
            ) : null}
          </View>

          {task.assignee?.name && (
            <View style={styles.metaPill}>
              <View style={[styles.avatarMini, { backgroundColor: currentTheme.colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: currentTheme.colors.primary }]}>
                  {task.assignee.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.metaText, { color: currentTheme.colors.subtext }]}>
                {task.assignee.name.split(' ')[0]}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onEditPress || onPress}
            style={[
              styles.editBtn,
              { backgroundColor: currentTheme.colors.primaryLight },
            ]}
          >
            <Ionicons name="create-outline" size={13} color={currentTheme.colors.primary} />
            <Text style={[styles.editText, { color: currentTheme.colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardDone: {
    opacity: 0.65,
  },
  cardWhiteShadow: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
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
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxTouch: {
    marginTop: 2,
  },
  checkedBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inProgressBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
  },
  titleCol: {
    flex: 1,
  },
  taskTitle: {
    fontSize: Typography.body + 1,
    fontWeight: '700',
    lineHeight: 22,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDesc: {
    fontSize: Typography.sm,
    marginTop: 3,
    lineHeight: 18,
  },
  subtaskRow: {
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
  subtaskTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  subtaskFill: {
    height: '100%',
    borderRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatarMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '800',
  },
  metaText: {
    fontSize: Typography.xs + 1,
    fontWeight: '500',
  },
  submittedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  submittedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
  },
  dateMetaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  editBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

