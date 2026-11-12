import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../lib/haptics';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';
import { useRouter } from 'expo-router';

export const AIAssistantModal: React.FC = () => {
  const { aiMessages, sendAIPrompt, clearAIMessages, users } = useApp();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Floating button subtle pulse
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isThinking) return;

    setInputText('');
    setIsThinking(true);

    try {
      await sendAIPrompt(textToSend);
    } finally {
      setIsThinking(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const quickPrompts = [
    { label: '👥 Team Members & Roles', prompt: 'Hamari team mein kaun kaun hai aur unke kya roles hain?' },
    { label: '👤 Mera Aaj Ka Kaam', prompt: 'Mera aaj ka kya kaam due hai?' },
    { label: '🔥 High Priority Tasks', prompt: 'High priority pending tickets dikhao' },
    { label: '⚠️ Overdue Tickets', prompt: 'Overdue tasks kaun se hain?' },
    { label: '📋 In-Review Submissions', prompt: 'Tasks submitted for review dikhao' },
    { label: '⚡ Assign to @sarah_ui', prompt: 'Assign UI Redesign task to @sarah_ui high priority due today' },
    { label: '📊 Status Summary', prompt: 'Workspace ka status aur velocity metrics batao' },
  ];

  return (
    <>
      {/* Floating Smart AI FAB */}
      <View style={styles.fabContainer}>
        <Animated.View style={animatedFabStyle}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => {
              triggerHaptic('light');
              setIsOpen(true);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4f46e5', '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons name="sparkles" size={22} color="#ffffff" />
              <View style={styles.fabOnlineDot} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* AI Assistant Chat Modal */}
      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop} />

          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.botIconWrap}>
                  <Ionicons name="sparkles" size={18} color="#4f46e5" />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.title}>TaskFlow AI Agent</Text>
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineText}>Online</Text>
                    </View>
                  </View>
                  <Text style={styles.subtitle}>Multi-Model Engine (Gemini Pro · Flash · Edge)</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={clearAIMessages}
                  style={styles.iconBtn}
                >
                  <Ionicons name="refresh-outline" size={19} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.iconBtn}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Prompt Chips */}
            <View style={styles.quickPromptsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsList}>
                {quickPrompts.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickPromptChip}
                    onPress={() => handleSend(q.prompt)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash-outline" size={13} color="#4f46e5" />
                    <Text style={styles.quickPromptText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Message Thread */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {aiMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <Animated.View
                    key={msg.id}
                    entering={FadeInDown.duration(250)}
                    style={[
                      styles.msgRow,
                      isUser ? styles.msgRowUser : styles.msgRowBot,
                    ]}
                  >
                    {!isUser && (
                      <View style={styles.botAvatar}>
                        <Ionicons name="hardware-chip-outline" size={16} color="#4f46e5" />
                      </View>
                    )}

                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                      <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
                        {msg.text}
                      </Text>

                      {/* Interactive Task Preview Card if created */}
                      {msg.action_data && (msg.action_type === 'task_assigned' || msg.action_type === 'task_created') && (
                        <View style={styles.taskCardPreview}>
                          <View style={styles.taskCardHeader}>
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                            <Text style={styles.taskCardHeading}>Task Dispatched to Sprint</Text>
                          </View>
                          <Text style={styles.taskCardTitle}>{msg.action_data.title}</Text>
                          <View style={styles.taskCardMeta}>
                            <View style={styles.metaPill}>
                              <Ionicons name="flag" size={12} color="#dc2626" />
                              <Text style={styles.metaPillText}>{msg.action_data.priority?.toUpperCase()}</Text>
                            </View>
                            <View style={styles.metaPill}>
                              <Ionicons name="calendar-outline" size={12} color="#64748b" />
                              <Text style={styles.metaPillText}>{msg.action_data.due_date}</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.viewTasksBtn}
                            onPress={() => {
                              setIsOpen(false);
                              router.push('/(tabs)/tasks');
                            }}
                          >
                            <Text style={styles.viewTasksBtnText}>View on Tasks Board →</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.bubbleFooter}>
                        {!isUser && msg.model_used ? (
                          <View style={styles.modelTagWrap}>
                            <Ionicons name="sparkles" size={10} color="#4f46e5" />
                            <Text style={styles.modelTagText}>{msg.model_used}</Text>
                          </View>
                        ) : <View />}
                        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampBot]}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}

              {isThinking && (
                <View style={[styles.msgRow, styles.msgRowBot]}>
                  <View style={styles.botAvatar}>
                    <Ionicons name="hardware-chip-outline" size={16} color="#4f46e5" />
                  </View>
                  <View style={[styles.bubble, styles.bubbleBot, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <ActivityIndicator size="small" color="#4f46e5" />
                    <Text style={styles.thinkingText}>AI is analyzing & assigning task...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask AI in Roman Urdu or English (e.g. Assign UI task to @sarah_ui)..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() ? styles.sendBtnDisabled : null]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isThinking}
              >
                <Ionicons name="arrow-up" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 80,
    right: 18,
    zIndex: 9999,
  },
  fabBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fabOnlineDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    height: '82%',
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  onlineText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  quickPromptsWrap: {
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickPromptsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickPromptText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 14,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleTextUser: {
    color: '#ffffff',
    fontWeight: '500',
  },
  bubbleTextBot: {
    color: '#0f172a',
    fontWeight: '400',
  },
  thinkingText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  taskCardPreview: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  taskCardHeading: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  taskCardTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  taskCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '700',
  },
  viewTasksBtn: {
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderRadius: 6,
  },
  viewTasksBtnText: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '700',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  modelTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modelTagText: {
    color: '#4f46e5',
    fontSize: 9,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timestampBot: {
    color: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 21,
    paddingHorizontal: 16,
    color: '#0f172a',
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
