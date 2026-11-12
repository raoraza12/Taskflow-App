import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';

interface DatePickerInputProps {
  label: string;
  value: string; // format YYYY-MM-DD
  onChangeDate: (date: string) => void;
  minDate?: string;
  placeholder?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChangeDate,
  minDate,
  placeholder = 'YYYY-MM-DD',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date().toISOString().slice(0, 10));

  const todayStr = new Date().toISOString().slice(0, 10);

  const setShortcut = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = d.toISOString().slice(0, 10);
    setTempDate(dateStr);
    onChangeDate(dateStr);
    setModalVisible(false);
  };

  const handleConfirm = () => {
    onChangeDate(tempDate);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeDate}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity
          style={styles.calendarBtn}
          onPress={() => {
            setTempDate(value || todayStr);
            setModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Mini Calendar Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="calendar" size={20} color="#4f46e5" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitle}>Select {label}</Text>
                <Text style={styles.modalSub}>Pick from calendar or use quick chips</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Quick shortcuts */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => setShortcut(0)}>
                <Text style={styles.shortcutText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => setShortcut(1)}>
                <Text style={styles.shortcutText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => setShortcut(3)}>
                <Text style={styles.shortcutText}>+3 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shortcutChip} onPress={() => setShortcut(7)}>
                <Text style={styles.shortcutText}>Next Week</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <Calendar
              current={tempDate || todayStr}
              minDate={minDate}
              onDayPress={(day: any) => setTempDate(day.dateString)}
              markedDates={{
                [tempDate]: {
                  selected: true,
                  selectedColor: '#4f46e5',
                },
              }}
              theme={{
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#64748b',
                selectedDayBackgroundColor: '#4f46e5',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#4f46e5',
                dayTextColor: '#0f172a',
                arrowColor: '#4f46e5',
                monthTextColor: '#0f172a',
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
              }}
            />

            <View style={styles.modalFooter}>
              <Text style={styles.selectedDateText}>Selected: {tempDate}</Text>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmBtnText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    height: 48,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: Spacing.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  shortcutChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  confirmBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

