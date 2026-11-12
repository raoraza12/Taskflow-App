import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { useApp } from '../../src/context/AppContext';
import { THEMES } from '../../src/constants/theme';

type StyleTab = 'all' | 'tactile' | 'saas' | 'vibrant' | 'snow';

export default function UIStylesDemoScreen() {
  const router = useRouter();
  const { theme, setTheme } = useApp();
  const [activeTab, setActiveTab] = useState<StyleTab>('all');

  // Interactive task state across demos
  const [task1Done, setTask1Done] = useState(false);
  const [task2Done, setTask2Done] = useState(false);
  const [task3Done, setTask3Done] = useState(false);
  const [task4Done, setTask4Done] = useState(false);

  return (
    <ScreenWrapper
      title="Task Management Design Systems"
      subtitle="4 Ergonomic, Professional Themes Engineered for Productivity"
      headerRight={
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="close" size={20} color="#e8eaed" />
        </TouchableOpacity>
      }
    >
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            Compare All 4
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'tactile' && { backgroundColor: '#6366f1' },
          ]}
          onPress={() => setActiveTab('tactile')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'tactile' && { color: '#ffffff', fontWeight: '800' },
            ]}
          >
            🎯 1. Linear
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'saas' && { backgroundColor: '#14b8a6' },
          ]}
          onPress={() => setActiveTab('saas')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'saas' && { color: '#ffffff', fontWeight: '800' },
            ]}
          >
            ⚡ 2. Height
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'vibrant' && { backgroundColor: '#3b82f6' },
          ]}
          onPress={() => setActiveTab('vibrant')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'vibrant' && { color: '#ffffff', fontWeight: '800' },
            ]}
          >
            🌿 3. Notion
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'snow' && { backgroundColor: '#4f46e5' },
          ]}
          onPress={() => setActiveTab('snow')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'snow' && { color: '#ffffff', fontWeight: '800' },
            ]}
          >
            ❄️ 4. Alpine White
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* THEME 1: Linear Pro (Graphite & Electric Indigo)                          */}
      {/* ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'tactile') && (
        <View style={styles.sectionContainer1}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.badgeIndicator1}>
              <Text style={styles.badgeIndicatorText}>SYSTEM 1 · LINEAR STYLE</Text>
            </View>
            <Text style={styles.sectionTitle}>Linear Pro (Graphite & Indigo)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Precision sprint engineering. Neutral graphite surfaces that prevent eye strain, with electric indigo focus highlights and tactile press feedback.
          </Text>

          {/* Theme 1 KPI Stats Banner */}
          <LinearGradient
            colors={['#1e1b4b', '#111420']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.linearKpiBanner}
          >
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#818cf8' }]}>88%</Text>
              <Text style={styles.kpiLabel}>Sprint Velocity</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#10b981' }]}>14/16</Text>
              <Text style={styles.kpiLabel}>Tasks Done</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#f59e0b' }]}>2 Days</Text>
              <Text style={styles.kpiLabel}>Sprint Left</Text>
            </View>
          </LinearGradient>

          {/* Theme 1 Interactive Task Card */}
          <LinearInteractiveCard
            done={task1Done}
            onToggle={() => setTask1Done(!task1Done)}
          />

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              styles.applyThemeBtn,
              { backgroundColor: '#6366f1' },
              theme === 'tactile' && styles.applyThemeBtnCurrent,
            ]}
            onPress={() => setTheme('tactile')}
          >
            <Ionicons
              name={theme === 'tactile' ? 'checkmark-circle' : 'color-palette'}
              size={18}
              color="#ffffff"
            />
            <Text style={styles.applyThemeText}>
              {theme === 'tactile' ? 'Active App Theme (Linear Pro)' : 'Apply Linear Pro Theme'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* THEME 2: Height Minimal (Carbon Charcoal & Sharp Teal)                     */}
      {/* ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'saas') && (
        <View style={styles.sectionContainer2}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.badgeIndicator2}>
              <Text style={styles.badgeIndicatorText}>SYSTEM 2 · HEIGHT STYLE</Text>
            </View>
            <Text style={styles.sectionTitle}>Height Minimal (Carbon & Teal)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Minimalist high-density developer workspace. Deep neutral carbon canvas, 1px architectural slate borders, and sharp teal focus accents.
          </Text>

          {/* Theme 2 KPI Banner */}
          <LinearGradient
            colors={['#132b28', '#0f1418']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heightKpiBanner}
          >
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#14b8a6' }]}>32</Text>
              <Text style={styles.kpiLabel}>OPEN TASKS</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#38bdf8' }]}>12</Text>
              <Text style={styles.kpiLabel}>IN REVIEW</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#10b981' }]}>99.8%</Text>
              <Text style={styles.kpiLabel}>ON TRACK</Text>
            </View>
          </LinearGradient>

          {/* Theme 2 Task Card */}
          <HeightInteractiveCard
            done={task2Done}
            onToggle={() => setTask2Done(!task2Done)}
          />

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              styles.applyThemeBtn,
              { backgroundColor: '#14b8a6' },
              theme === 'saas' && styles.applyThemeBtnCurrent,
            ]}
            onPress={() => setTheme('saas')}
          >
            <Ionicons
              name={theme === 'saas' ? 'checkmark-circle' : 'color-palette'}
              size={18}
              color="#ffffff"
            />
            <Text style={styles.applyThemeText}>
              {theme === 'saas' ? 'Active App Theme (Height Minimal)' : 'Apply Height Minimal Theme'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* THEME 3: Notion / Asana Calm (Warm Slate & Ocean Blue)                    */}
      {/* ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'vibrant') && (
        <View style={styles.sectionContainer3}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.badgeIndicator3}>
              <Text style={styles.badgeIndicatorText}>SYSTEM 3 · NOTION / ASANA</Text>
            </View>
            <Text style={styles.sectionTitle}>Notion Calm (Warm Slate & Blue)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Human, comfortable everyday productivity. Warm dark charcoal canvas with soft ocean blue accents, gentle 18px curves, and zero aggressive saturation.
          </Text>

          {/* Theme 3 KPI Banner */}
          <LinearGradient
            colors={['#1a2436', '#14161d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.notionKpiBanner}
          >
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#60a5fa' }]}>21</Text>
              <Text style={styles.kpiLabel}>Completed Today</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#f59e0b' }]}>4</Text>
              <Text style={styles.kpiLabel}>In Progress</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#10b981' }]}>5 Day</Text>
              <Text style={styles.kpiLabel}>Team Streak</Text>
            </View>
          </LinearGradient>

          {/* Theme 3 Task Card */}
          <NotionInteractiveCard
            done={task3Done}
            onToggle={() => setTask3Done(!task3Done)}
          />

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              styles.applyThemeBtn,
              { backgroundColor: '#3b82f6' },
              theme === 'vibrant' && styles.applyThemeBtnCurrent,
            ]}
            onPress={() => setTheme('vibrant')}
          >
            <Ionicons
              name={theme === 'vibrant' ? 'checkmark-circle' : 'color-palette'}
              size={18}
              color="#ffffff"
            />
            <Text style={styles.applyThemeText}>
              {theme === 'vibrant' ? 'Active App Theme (Notion Calm)' : 'Apply Notion Calm Theme'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* THEME 4: Alpine White (Pure Porcelain & Royal Indigo)                    */}
      {/* ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'snow') && (
        <View style={styles.sectionContainer4}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.badgeIndicator4}>
              <Text style={styles.badgeIndicatorText4}>SYSTEM 4 · ALPINE WHITE LIGHT MODE</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: '#0f172a' }]}>Alpine White (Pure Porcelain & Indigo)</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: '#64748b' }]}>
            Ultra-clean studio white light mode. Pure porcelain canvas, deep obsidian typography, and high-contrast royal indigo accents that feel exceptionally crisp, modern, and tight.
          </Text>

          {/* Theme 4 KPI Banner */}
          <LinearGradient
            colors={['#e0e7ff', '#f8fafc']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.snowKpiBanner}
          >
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#4f46e5' }]}>28</Text>
              <Text style={[styles.kpiLabel, { color: '#64748b' }]}>Completed Today</Text>
            </View>
            <View style={[styles.kpiDivider, { backgroundColor: '#cbd5e1' }]} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#d97706' }]}>3</Text>
              <Text style={[styles.kpiLabel, { color: '#64748b' }]}>In Progress</Text>
            </View>
            <View style={[styles.kpiDivider, { backgroundColor: '#cbd5e1' }]} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: '#059669' }]}>98%</Text>
              <Text style={[styles.kpiLabel, { color: '#64748b' }]}>Sprint Velocity</Text>
            </View>
          </LinearGradient>

          {/* Theme 4 Task Card */}
          <SnowInteractiveCard
            done={task4Done}
            onToggle={() => setTask4Done(!task4Done)}
          />

          {/* Apply Button */}
          <TouchableOpacity
            style={[
              styles.applyThemeBtn,
              { backgroundColor: '#4f46e5' },
              theme === 'snow' && styles.applyThemeBtnCurrent,
            ]}
            onPress={() => setTheme('snow')}
          >
            <Ionicons
              name={theme === 'snow' ? 'checkmark-circle' : 'color-palette'}
              size={18}
              color="#ffffff"
            />
            <Text style={styles.applyThemeText}>
              {theme === 'snow' ? 'Active App Theme (Alpine White)' : 'Apply ❄️ Alpine White Theme'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScreenWrapper>
  );
}

// ---------------------------------------------------------------------------
// THEME 1 CARD: Linear Pro (Graphite & Indigo)
// ---------------------------------------------------------------------------
function LinearInteractiveCard({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.linearCardWrap, animStyle]}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.97, { damping: 15 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
        style={styles.linearCardInner}
      >
        <View style={styles.linearCardContent}>
          {/* Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.linearPill}>
              <View style={styles.linearDot} />
              <Text style={styles.linearPillText}>HIGH PRIORITY</Text>
            </View>
            <Text style={styles.linearDueText}>🕒 10:00 - 11:30</Text>
          </View>

          {/* Main */}
          <View style={styles.cardMainRow}>
            <TouchableOpacity onPress={onToggle} style={styles.linearCheckBtn}>
              {done ? (
                <View style={styles.linearCheckedCircle}>
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                </View>
              ) : (
                <View style={styles.linearUncheckedCircle} />
              )}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.cardTitle,
                  done && { textDecorationLine: 'line-through', color: '#64748b' },
                ]}
              >
                Ship Production OAuth & Multi-Team Routing
              </Text>
              <Text style={styles.cardDesc}>
                Clean neutral graphite cards with electric indigo focus.
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={['#6366f1', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: done ? '100%' : '75%' }]}
              />
            </View>
            <Text style={styles.progressText}>
              {done ? 'Completed' : '3 of 4 subtasks done'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// THEME 2 CARD: Height Minimal (Carbon Charcoal & Pure Teal)
// ---------------------------------------------------------------------------
function HeightInteractiveCard({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <View style={styles.heightCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.heightBadgeGroup}>
          <Text style={styles.heightBadge}>ENG-492</Text>
          <Text style={styles.heightPriorityBadge}>HIGH</Text>
        </View>
        <Text style={styles.heightDateText}>Due Today</Text>
      </View>

      <View style={styles.cardMainRow}>
        <TouchableOpacity onPress={onToggle} style={styles.heightCheckbox}>
          {done ? (
            <Ionicons name="checkbox" size={20} color="#14b8a6" />
          ) : (
            <Ionicons name="square-outline" size={20} color="#64748b" />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardTitle,
              done && { textDecorationLine: 'line-through', color: '#64748b' },
            ]}
          >
            Deploy High-Performance Redis Cache Layer
          </Text>
          <Text style={styles.cardDesc}>
            Razor-sharp 1px slate borders with crisp monospace accents.
          </Text>
        </View>
      </View>

      <View style={styles.heightFooter}>
        <Text style={styles.heightFooterText}>assignee: raza@taskflow.dev</Text>
        <TouchableOpacity style={styles.heightActionBtn}>
          <Text style={styles.heightActionBtnText}>Review PR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// THEME 3 CARD: Notion Calm (Warm Slate & Ocean Blue)
// ---------------------------------------------------------------------------
function NotionInteractiveCard({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <View style={styles.notionCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.notionPill}>
          <Text style={styles.notionPillText}>High Priority</Text>
        </View>
        <Text style={styles.notionMeta}>Due at 5:00 PM</Text>
      </View>

      <View style={styles.cardMainRow}>
        <TouchableOpacity onPress={onToggle} style={{ marginRight: 12 }}>
          {done ? (
            <View style={styles.notionCheckedCircle}>
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
          ) : (
            <View style={styles.notionUncheckedCircle} />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardTitle,
              done && { textDecorationLine: 'line-through', color: '#64748b' },
            ]}
          >
            Finalize Sprint Milestones & Team Backlog
          </Text>
          <Text style={styles.cardDesc}>
            Gentle on the eyes, warm dark charcoal with ocean blue clarity.
          </Text>
        </View>
      </View>

      <View style={styles.notionFooter}>
        <Text style={styles.notionAssignee}>👤 Raza Khan</Text>
        <TouchableOpacity style={styles.notionBtn}>
          <Text style={styles.notionBtnText}>Update Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// THEME 4 CARD: Alpine White (Pure Porcelain & Royal Indigo)
// ---------------------------------------------------------------------------
function SnowInteractiveCard({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <View style={styles.snowCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.snowPill}>
          <Ionicons name="flame" size={12} color="#e11d48" />
          <Text style={styles.snowPillText}>High Priority</Text>
        </View>
        <Text style={styles.snowMeta}>Due at 09:30 AM</Text>
      </View>

      <View style={styles.cardMainRow}>
        <TouchableOpacity onPress={onToggle} style={{ marginRight: 12 }}>
          {done ? (
            <View style={styles.snowCheckedCircle}>
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
          ) : (
            <View style={styles.snowUncheckedCircle} />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.snowCardTitle,
              done && { textDecorationLine: 'line-through', color: '#94a3b8' },
            ]}
          >
            Implement Real-Time Team Activity Feed
          </Text>
          <Text style={styles.snowCardDesc}>
            Crisp pure white surface, high-contrast obsidian slate typography, and electric royal indigo accents.
          </Text>
        </View>
      </View>

      <View style={styles.snowFooter}>
        <View style={styles.snowAssigneeRow}>
          <View style={styles.snowAvatarMini}>
            <Text style={styles.snowAvatarText}>AK</Text>
          </View>
          <Text style={styles.snowAssignee}>Ali Khan</Text>
        </View>
        <TouchableOpacity style={styles.snowBtn}>
          <Text style={styles.snowBtnText}>Open Ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1e222f',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // ---------------- SECTIONS ----------------
  sectionContainer1: {
    marginBottom: 28,
    backgroundColor: '#0d0f14',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282e3f',
  },
  sectionContainer2: {
    marginBottom: 28,
    backgroundColor: '#090a0d',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242936',
  },
  sectionContainer3: {
    marginBottom: 28,
    backgroundColor: '#121316',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2e313a',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  badgeIndicator1: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIndicator2: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIndicator3: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIndicatorText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },

  // ---------------- BANNER KPI ----------------
  linearKpiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  heightKpiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  notionKpiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // ---------------- CARDS ----------------
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },

  // Linear Card
  linearCardWrap: {
    borderRadius: 16,
    marginBottom: 14,
  },
  linearCardInner: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#282e3f',
  },
  linearCardContent: {
    padding: 16,
  },
  linearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  linearDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#818cf8',
  },
  linearPillText: {
    color: '#c7d2fe',
    fontSize: 10,
    fontWeight: '800',
  },
  linearDueText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  linearCheckBtn: {
    marginRight: 12,
    marginTop: 2,
  },
  linearCheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linearUncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  progressWrap: {
    marginTop: 4,
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },

  // Height Card
  heightCard: {
    backgroundColor: '#12141a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242936',
    padding: 16,
    marginBottom: 14,
  },
  heightBadgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  heightBadge: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 10,
    color: '#14b8a6',
    fontWeight: '700',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heightPriorityBadge: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 10,
    color: '#f43f5e',
    fontWeight: '700',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heightDateText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  heightCheckbox: {
    marginRight: 10,
    marginTop: 2,
  },
  heightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242936',
  },
  heightFooterText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
  heightActionBtn: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heightActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Notion Card
  notionCard: {
    backgroundColor: '#1a1b20',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2e313a',
    padding: 16,
    marginBottom: 14,
  },
  notionPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  notionPillText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
  },
  notionMeta: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  notionCheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notionUncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  notionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2e313a',
  },
  notionAssignee: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  notionBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
  },
  notionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Apply Button
  applyThemeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  applyThemeBtnCurrent: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  applyThemeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // THEME 4: Alpine White Styles
  sectionContainer4: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  badgeIndicator4: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeIndicatorText4: {
    color: '#4f46e5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  snowKpiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  snowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  snowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  snowPillText: {
    color: '#e11d48',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  snowMeta: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  snowCheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snowUncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  snowCardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  snowCardDesc: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  snowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  snowAssigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snowAvatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snowAvatarText: {
    color: '#4f46e5',
    fontSize: 9,
    fontWeight: '800',
  },
  snowAssignee: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  snowBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  snowBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
