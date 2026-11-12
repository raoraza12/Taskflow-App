import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { showAlert } from '../../src/lib/alerts';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { DatePickerInput } from '../../src/components/DatePickerInput';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { TaskPriority, TaskStatus } from '../../src/types/database';
import { THEMES } from '../../src/constants/theme';

export default function CreateTaskScreen() {
  const { user, teams, today, getTeamMembers, createTask, addSubtask, theme } = useApp();
  const currentTheme = THEMES[theme] || THEMES.snow;
  const router = useRouter();

  // Mode: Personal Task vs Team Task
  const [isPersonal, setIsPersonal] = useState<boolean>(teams.length === 0);
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [assigneeId, setAssigneeId] = useState(user?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  // Dates: Assigned/Publish Date and Due Date
  const [assignedDate, setAssignedDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Subtasks & File Attachments
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasksList, setSubtasksList] = useState<string[]>([]);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size?: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const members = teamId ? getTeamMembers(teamId) : [];

  const handleAddSubtaskItem = () => {
    if (!subtaskInput.trim()) return;
    setSubtasksList([...subtasksList, subtaskInput.trim()]);
    setSubtaskInput('');
  };

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setAttachedFile({ name: file.name, size: file.size });
      }
    } catch {
      showAlert('Error', 'Could not open document picker');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!isPersonal && !teamId) {
      setError('Please select a team workspace or switch to Personal Task');
      return;
    }

    setLoading(true);
    const res = await createTask({
      teamId: isPersonal ? null : teamId,
      isPersonal,
      assigneeId: isPersonal ? user!.id : (assigneeId || user!.id),
      title,
      description,
      status,
      priority,
      assignedDate,
      dueDate,
      startTime,
      endTime,
    });

    if (res.ok && res.task) {
      for (const st of subtasksList) {
        await addSubtask(res.task.id, st);
      }
      setLoading(false);
      showAlert('Success', isPersonal ? 'Personal task created!' : 'Team task assigned!');
      router.back();
    } else {
      setLoading(false);
      setError(res.error || 'Failed to create task');
    }
  };

  return (
    <ScreenWrapper title="Create Task" subtitle="New Sprint Ticket or Personal Goal" showBack>
      {/* 0. Workspace Scope Switcher: Personal vs Team */}
      <View style={styles.scopeSwitcher}>
        <TouchableOpacity
          style={[
            styles.scopeTabBtn,
            !isPersonal && styles.scopeTabBtnActive,
          ]}
          onPress={() => {
            if (teams.length === 0) {
              showAlert('No Teams', 'You need to create or join a team first to make team tasks.');
              return;
            }
            setIsPersonal(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people"
            size={16}
            color={!isPersonal ? '#ffffff' : currentTheme.colors.subtext}
          />
          <Text style={[styles.scopeTabText, !isPersonal && styles.scopeTabTextActive]}>
            Team Task ({teams.length} Teams)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scopeTabBtn,
            isPersonal && styles.scopeTabBtnActive,
          ]}
          onPress={() => {
            setIsPersonal(true);
            setAssigneeId(user?.id || '');
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person"
            size={16}
            color={isPersonal ? '#ffffff' : currentTheme.colors.subtext}
          />
          <Text style={[styles.scopeTabText, isPersonal && styles.scopeTabTextActive]}>
            Personal Solo Task
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. Team & Assignee Selection (Only when Team Task is active) */}
      {!isPersonal && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="briefcase" size={16} color={currentTheme.colors.primary} />
            <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Select Team Workspace</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            {teams.map((t) => {
              const isSelected = teamId === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[
                    styles.chipItem,
                    {
                      backgroundColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.bgElevated,
                      borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setTeamId(t.id);
                    setAssigneeId(user?.id || '');
                  }}
                >
                  <Ionicons
                    name="layers-outline"
                    size={14}
                    color={isSelected ? '#ffffff' : currentTheme.colors.subtext}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.chipItemText,
                      { color: isSelected ? '#ffffff' : currentTheme.colors.text, fontWeight: isSelected ? '700' : '600' },
                    ]}
                  >
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Assignee Selection */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person-add" size={16} color={currentTheme.colors.primary} />
            <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>
              Assignee Teammate ({members.length})
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            {members.map((m) => {
              const isSelected = assigneeId === m.user_id;
              return (
                <Pressable
                  key={m.id}
                  style={[
                    styles.chipItem,
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
                  <View>
                    <Text
                      style={[
                        styles.chipItemText,
                        {
                          color: isSelected ? currentTheme.colors.primary : currentTheme.colors.text,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {m.profile?.name} {m.user_id === user?.id ? '(Me)' : ''}
                    </Text>
                    {m.profile?.username ? (
                      <Text style={styles.miniUsername}>@{m.profile.username}</Text>
                    ) : null}
                  </View>
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
        placeholder="e.g. Design app lock screen"
        value={title}
        onChangeText={setTitle}
      />

      <Input
        label="Description (Optional)"
        placeholder="Add context, specifications or acceptance criteria..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {/* 3. Priority Selection */}
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
          const iconName = p === 'high' ? 'flame' : p === 'medium' ? 'flash' : 'leaf-outline';

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
                name={iconName}
                size={16}
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

      {/* 4. Schedule Dates (Manual Text + Interactive Calendar Popup) */}
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
            placeholder="09:00"
            value={startTime}
            onChangeText={setStartTime}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="End Time"
            placeholder="10:00"
            value={endTime}
            onChangeText={setEndTime}
          />
        </View>
      </View>

      {/* 5. Subtasks / Checklist */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="checkbox" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Checklist / Subtasks</Text>
      </View>
      <View style={styles.subtaskInputRow}>
        <Input
          placeholder="Add subtask item..."
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

      {subtasksList.map((st, idx) => (
        <View
          key={idx}
          style={[
            styles.subtaskItem,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <Ionicons name="checkbox-outline" size={18} color={currentTheme.colors.primary} />
          <Text style={[styles.subtaskTitle, { color: currentTheme.colors.text }]}>{st}</Text>
          <TouchableOpacity onPress={() => setSubtasksList(subtasksList.filter((_, i) => i !== idx))}>
            <Ionicons name="close-circle-outline" size={20} color={currentTheme.colors.danger} />
          </TouchableOpacity>
        </View>
      ))}

      {/* 6. Optional File Attachment */}
      <View style={[styles.sectionHeaderRow, { marginTop: Spacing.md }]}>
        <Ionicons name="attach" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.sectionLabel, { color: currentTheme.colors.text }]}>Attachment (Optional)</Text>
      </View>
      {attachedFile ? (
        <Card
          style={[
            styles.attachedCard,
            {
              backgroundColor: currentTheme.colors.bgElevated,
              borderColor: currentTheme.colors.border,
            },
          ]}
        >
          <Ionicons name="document-attach" size={24} color={currentTheme.colors.primary} />
          <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
            <Text style={[styles.fileName, { color: currentTheme.colors.text }]}>{attachedFile.name}</Text>
            {attachedFile.size ? (
              <Text style={[styles.fileSize, { color: currentTheme.colors.subtext }]}>
                {(attachedFile.size / 1024).toFixed(1)} KB
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => setAttachedFile(null)}>
            <Ionicons name="trash-outline" size={20} color={currentTheme.colors.danger} />
          </TouchableOpacity>
        </Card>
      ) : (
        <Button
          title="Attach Document or Image"
          variant="outline"
          icon={<Ionicons name="attach" size={18} color={currentTheme.colors.primary} />}
          onPress={handlePickFile}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        title={isPersonal ? 'Save Personal Task 🚀' : 'Save & Assign Team Task 🚀'}
        onPress={handleSubmit}
        loading={loading}
        style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scopeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.md,
    gap: 6,
  },
  scopeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  scopeTabBtnActive: {
    backgroundColor: '#4f46e5',
  },
  scopeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  scopeTabTextActive: {
    color: '#ffffff',
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
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  chipItemText: {
    fontSize: Typography.body,
  },
  miniUsername: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  miniAvatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  miniAvatarDotText: {
    color: '#ffffff',
    fontSize: 11,
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
    paddingVertical: 11,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: Typography.sm,
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
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: Typography.body,
    marginHorizontal: Spacing.sm,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  fileName: {
    fontSize: Typography.body,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: Typography.sm,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
});
