import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useApp } from '../context/AppContext';
import { THEMES, AppThemeKey } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useApp();
  const [modalVisible, setModalVisible] = useState(false);

  const currentTheme = THEMES[theme];

  return (
    <>
      {/* Floating / Compact Switcher Pill */}
      <TouchableOpacity
        style={[
          styles.switcherPill,
          {
            backgroundColor: currentTheme.colors.bgElevated,
            borderColor: currentTheme.colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="color-palette" size={16} color={currentTheme.colors.primary} />
        <Text style={[styles.pillText, { color: currentTheme.colors.text }]}>
          {currentTheme.name}
        </Text>
        <Ionicons name="chevron-down" size={14} color={currentTheme.colors.subtext} />
      </TouchableOpacity>

      {/* Theme Selection Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable
          style={styles.overlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: currentTheme.colors.bgElevated,
                borderColor: currentTheme.colors.borderGlow,
                borderRadius: currentTheme.cardRadius,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="sparkles" size={20} color={currentTheme.colors.primary} />
                <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>
                  Choose App Color Theme
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={currentTheme.colors.subtext} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: currentTheme.colors.subtext }]}>
              Har theme ka alag visual color world hai (Purple, Emerald Green, Sunset Amber):
            </Text>

            {/* 3 Theme Options */}
            {(Object.keys(THEMES) as AppThemeKey[]).map((key) => {
              const t = THEMES[key];
              const isSelected = theme === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isSelected ? t.colors.bgSoft : t.colors.bgElevated,
                      borderColor: isSelected ? t.colors.primary : t.colors.border,
                      borderRadius: t.cardRadius,
                    },
                  ]}
                  onPress={() => {
                    setTheme(key);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.optionHeader}>
                    <View style={styles.titleWithTag}>
                      <Text style={[styles.themeName, { color: t.colors.text }]}>
                        {t.name}
                      </Text>
                      <Text style={[styles.themeTag, { color: t.colors.primary }]}>
                        {t.tag}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View
                        style={[
                          styles.radioSelected,
                          { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
                        ]}
                      >
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      </View>
                    ) : (
                      <View style={styles.radioUnselected} />
                    )}
                  </View>

                  <Text style={[styles.themeDesc, { color: t.colors.subtext }]}>
                    {t.description}
                  </Text>

                  {/* Visual Color Dots Preview */}
                  <View style={styles.dotsRow}>
                    <View style={[styles.colorDot, { backgroundColor: t.colors.bg }]} />
                    <View style={[styles.colorDot, { backgroundColor: t.colors.bgElevated }]} />
                    <View style={[styles.colorDot, { backgroundColor: t.colors.primary }]} />
                    <View style={[styles.colorDot, { backgroundColor: t.colors.secondary }]} />
                    <View style={[styles.colorDot, { backgroundColor: t.colors.ok }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  switcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161c2b',
    borderWidth: 1,
    borderColor: '#26334d',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0f1422',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: '#222d42',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: Typography.heading,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: Typography.sm,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  themeOptionCard: {
    padding: Spacing.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleWithTag: {
    flex: 1,
  },
  themeName: {
    fontSize: Typography.body + 1,
    fontWeight: '800',
  },
  themeTag: {
    fontSize: Typography.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  themeDesc: {
    fontSize: Typography.sm,
    lineHeight: 18,
    marginTop: 4,
  },
  radioSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioUnselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});

