import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { showAlert } from '../../src/lib/alerts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { DatePickerInput } from '../../src/components/DatePickerInput';
import { Ionicons } from '@expo/vector-icons';
import { TaskPriority, TaskStatus } from '../../src/types/database';
import { THEMES } from '../../src/constants/theme';

export default function EditTaskScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const {
    tasks,
    user,
    getTeamMembers,
    updateTask,
    submitTask,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    theme,
  } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;
  const router = useRouter();

  const task = tasks.find((t) => t.id === taskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedDate, setAssignedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Subtask local input
  const [subtaskInput, setSubtaskInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssigneeId(task.assignee_id);
      setStatus(task.status);
      setPriority(task.priority);
      setAssignedDate(task.assigned_date || task.created_at?.slice(0, 10) || '');
      setDueDate(task.due_date);
      setStartTime(task.start_time);
      setEndTime(task.end_time);
    }
  }, [task]);

  if (!task) {
    return (
      <ScreenWrapper title="Task Not Found" showBack>
        <Text style={{ color: currentTheme.colors.subtext }}>This task does not exist or was deleted.</Text>
        <Button title="Back to Tasks" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
      </ScreenWrapper>
    );
  }

  const members = task.team_id ? getTeamMembers(task.team_id) : [];
  const isAssignee = task.assignee_id === user?.id;

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert('Validation', 'Task title cannot be empty.');
      return;
    }

    const res = await updateTask(task.id, {
      title,
      description,
      assignee_id: assigneeId,
      status,
      priority,
      assigned_date: assignedDate,
      due_date: dueDate,
      start_time: startTime,
      end_time: endTime,
    });

    if (res.ok) {
      showAlert('Saved', 'Task details updated successfully.');
      router.back();
    } else {
      showAlert('Error', res.error || 'Failed to update task');
    }
  };

  const handleSubmitForReview = async () => {
    showAlert(
      'Submit Task',
      'Submit this task for Team Leader review and approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Now 🚀',
          onPress: async () => {
            setSubmitting(true);
            const res = await submitTask(task.id, 'Task finished and submitted for review');
            setSubmitting(false);
            if (res.ok) {
              showAlert('Success', 'Task submitted! Team Leader has been notified.');
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    showAlert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          router.back();
        },
      },
    ]);
  };

  const handleAddSubtaskItem = async () => {
    if (!subtaskInput.trim()) return;
    await addSubtask(task.id, subtaskInput.trim());
    setSubtaskInput('');
  };

  return (
    <ScreenWrapper title="Edit Task" subtitle="Modify Ticket, Assignee & Subtasks" showBack>
      {/* 0. Submission Status Banner */}
      {task.status === 'submitted' && (
        <View style={styles.submittedAlert}>
          <Ionicons name="time" size={20} color="#0284c7" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.submittedTitle}>Task Submitted for Leader Review</Text>
            <Text style={styles.submittedSub}>
              Submitted on {new Date(task.submitted_at || task.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}

      {/* 1. Assignee Selection (If Team Task) */}
      {members.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person" size={16} color={currentTheme.colors.primary} />
            <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Assignee Teammate</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            {members.map((m) => {
              const isSelected = assigneeId === m.user_id;
              return (
                <Pressable
                  key={m.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? currentTheme.colors.primaryLight : currentTheme.colors.bgElevated,
                      borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
                    },
                  ]}
                  onPress={() => setAssigneeId(m.user_id)}
                >
                  <View
                    style={[
                      styles.miniAvatarDot,
                      { backgroundColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.subtext },
                    ]}
                  >
                    <Text style={styles.miniAvatarDotText}>
                      {m.profile?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? currentTheme.colors.primary : currentTheme.colors.text,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {m.profile?.name} {m.user_id === user?.id ? '(Me)' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* 2. Core Details */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="document-text" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Task Details</Text>
      </View>
      <Input
        label="Title *"
        placeholder="Task title..."
        value={title}
        onChangeText={setTitle}
      />

      <Input
        label="Description"
        placeholder="Add details, criteria or updates..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {/* 3. Status Selection */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="pulse" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Status</Text>
      </View>
      <View style={styles.rowSelectors}>
        {(['todo', 'in_progress', 'submitted', 'done'] as const).map((st) => {
          const isSelected = status === st;
          const stColor =
            st === 'done'
              ? currentTheme.colors.ok
              : st === 'submitted'
              ? '#0284c7'
              : st === 'in_progress'
              ? currentTheme.colors.warn
              : currentTheme.colors.primary;
          const stBg =
            st === 'done'
              ? currentTheme.colors.okLight
              : st === 'submitted'
              ? 'rgba(2, 132, 199, 0.1)'
              : st === 'in_progress'
              ? currentTheme.colors.warnLight
              : currentTheme.colors.primaryLight;
          const stIcon =
            st === 'done'
              ? 'checkmark-done-circle'
              : st === 'submitted'
              ? 'arrow-up-circle'
              : st === 'in_progress'
              ? 'time'
              : 'list';

          return (
            <Pressable
              key={st}
              style={[
                styles.selectorBtn,
                {
                  backgroundColor: isSelected ? stBg : currentTheme.colors.bgElevated,
                  borderColor: isSelected ? stColor : currentTheme.colors.border,
                },
              ]}
              onPress={() => setStatus(st)}
            >
              <Ionicons
                name={stIcon}
                size={14}
                color={isSelected ? stColor : currentTheme.colors.subtext}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: isSelected ? stColor : currentTheme.colors.subtext,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {st.replace('_', ' ').toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 4. Priority Selection */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="flag" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Priority Level</Text>
      </View>
      <View style={styles.rowSelectors}>
        {(['low', 'medium', 'high'] as const).map((p) => {
          const isSelected = priority === p;
          const pColor =
            p === 'high' ? currentTheme.colors.danger : p === 'medium' ? currentTheme.colors.warn : currentTheme.colors.ok;
          const pBg =
            p === 'high'
              ? currentTheme.colors.dangerLight
              : p === 'medium'
              ? currentTheme.colors.warnLight
              : currentTheme.colors.okLight;
          const pIcon = p === 'high' ? 'flame' : p === 'medium' ? 'flash' : 'leaf-outline';

          return (
            <Pressable
              key={p}
              style={[
                styles.selectorBtn,
                {
                  backgroundColor: isSelected ? pBg : currentTheme.colors.bgElevated,
                  borderColor: isSelected ? pColor : currentTheme.colors.border,
                },
              ]}
              onPress={() => setPriority(p)}
            >
              <Ionicons
                name={pIcon}
                size={15}
                color={isSelected ? pColor : currentTheme.colors.subtext}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: isSelected ? pColor : currentTheme.colors.subtext,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {p.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 5. Schedule & Deadlines (Manual + Calendar Picker) */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="calendar" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Schedule & Deadlines</Text>
      </View>

      <DatePickerInput
        label="Assigned / Publish Date"
        value={assignedDate}
        onChangeDate={setAssignedDate}
        placeholder="YYYY-MM-DD"
      />

      <DatePickerInput
        label="Submission Deadline (Due Date)"
        value={dueDate}
        onChangeDate={setDueDate}
        minDate={assignedDate}
        placeholder="YYYY-MM-DD"
      />

      <View style={styles.timeRow}>
        <View style={{ flex: 1, marginRight: Spacing.sm }}>
          <Input
            label="Start Time"
            value={startTime}
            onChangeText={setStartTime}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="End Time"
            value={endTime}
            onChangeText={setEndTime}
          />
        </View>
      </View>

      {/* 6. Subtasks Checklist */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="checkbox" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Subtasks Checklist</Text>
      </View>
      <View style={styles.subtaskInputRow}>
        <Input
          placeholder="New checklist item..."
          value={subtaskInput}
          onChangeText={setSubtaskInput}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        <Button
          title="+ Add"
          size="sm"
          onPress={handleAddSubtaskItem}
          style={{ marginLeft: Spacing.sm }}
        />
      </View>

      {task.subtasks?.map((st) => (
        <Card
          key={st.id}
          style={[
            styles.subtaskRow,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => toggleSubtask(st.id)}
            style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
          >
            <Ionicons
              name={st.done ? 'checkbox' : 'square-outline'}
              size={22}
              color={st.done ? currentTheme.colors.ok : currentTheme.colors.subtext}
            />
            <Text
              style={[
                styles.subtaskTitle,
                { color: currentTheme.colors.text },
                st.done && { textDecorationLine: 'line-through', color: currentTheme.colors.subtext },
              ]}
            >
              {st.title}
            </Text>
          </Pressable>
          <TouchableOpacity onPress={() => deleteSubtask(st.id)}>
            <Ionicons name="trash-outline" size={18} color={currentTheme.colors.danger} />
          </TouchableOpacity>
        </Card>
      ))}

      {/* Action: Submit Task for Review (For Teammates) */}
      {isAssignee && task.status !== 'done' && task.status !== 'submitted' && (
        <Button
          title="Submit Task for Review 🚀"
          onPress={handleSubmitForReview}
          loading={submitting}
          style={{ marginTop: Spacing.md, backgroundColor: '#0284c7' }}
        />
      )}

      {/* Action Buttons */}
      <Button
        title="Save Changes"
        onPress={handleSave}
        style={{ marginTop: Spacing.sm }}
      />

      <Button
        title="Delete Task"
        variant="danger"
        onPress={handleDelete}
        style={{ marginTop: Spacing.sm, marginBottom: Spacing.xl }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  submittedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  submittedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284c7',
  },
  submittedSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionLabel: {
    fontSize: Typography.body,
    fontWeight: '700',
  },
  horizontalChips: {
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.body,
  },
  miniAvatarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  miniAvatarDotText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  rowSelectors: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  selectorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  subtaskTitle: {
    fontSize: Typography.body,
    marginLeft: Spacing.sm,
    flex: 1,
  },
});
