import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../src/context/AppContext';
import { Colors, Radius, Spacing, Typography } from '../../src/constants/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage } from '../../src/types/database';
import { voiceRecorder, VoicePlayerService } from '../../src/lib/audioVoiceRecorder';

export default function TeamChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId?: string }>();
  const { user, users, teams, chatMessages, sendChatMessage } = useApp();

  // Active Team (from query param or first available team)
  const activeTeam = teams.find((t) => t.id === params.teamId) || teams[0];
  const teamMessages = chatMessages.filter((m) => m.team_id === activeTeam?.id);

  const [inputText, setInputText] = useState('');
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [micError, setMicError] = useState('');
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Note Playback Real Audio State
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const activePlaybackRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      VoicePlayerService.stopAll();
      voiceRecorder.cancelRecording();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const scrollViewRef = useRef<ScrollView>(null);

  // Pulsing animation for recording dot
  const pulseVal = useSharedValue(1);
  useEffect(() => {
    if (isRecording) {
      pulseVal.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        true
      );
    } else {
      pulseVal.value = 1;
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseVal.value }],
  }));

  // Handle typing to detect @mention
  const handleTextChange = (text: string) => {
    setInputText(text);

    // Look for @ symbol near the cursor
    const lastAtIdx = text.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const query = text.substring(lastAtIdx + 1);
      // Check if there is no space after @
      if (!query.includes(' ')) {
        setShowMentionPopup(true);
        setMentionQuery(query.toLowerCase());
        return;
      }
    }
    setShowMentionPopup(false);
  };

  const handleSelectMention = (username: string) => {
    const lastAtIdx = inputText.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const beforeAt = inputText.substring(0, lastAtIdx);
      const newText = `${beforeAt}@${username} `;
      setInputText(newText);
    } else {
      setInputText(`${inputText}@${username} `);
    }
    setShowMentionPopup(false);
  };

  // Filter team users for autocomplete
  const filteredUsers = users.filter((u) => {
    if (!mentionQuery) return true;
    return (
      (u.username && u.username.toLowerCase().includes(mentionQuery)) ||
      u.name.toLowerCase().includes(mentionQuery)
    );
  });

  // Send Text Message
  const handleSendText = async () => {
    if (!inputText.trim() || !activeTeam) return;
    const text = inputText;
    setInputText('');
    setShowMentionPopup(false);

    await sendChatMessage({
      teamId: activeTeam.id,
      text,
      type: 'text',
    });

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Start Voice Recording (Real Microphone Capture)
  const startRecording = async () => {
    setMicError('');
    setIsRecording(true);
    setRecordDuration(0);

    const res = await voiceRecorder.startRecording();
    if (!res.ok && res.error) {
      setMicError(res.error);
    }

    recordTimerRef.current = setInterval(() => {
      setRecordDuration((prev) => prev + 1);
    }, 1000);
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    voiceRecorder.cancelRecording();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordDuration(0);
    setMicError('');
  };

  // Send Voice Note with Real Audio Blob & Base64 persistence
  const sendVoiceNote = async () => {
    if (!activeTeam) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);

    const recResult = await voiceRecorder.stopRecording();
    const finalDuration = recResult.durationSec > 0 ? recResult.durationSec : Math.max(1, recordDuration);
    setIsRecording(false);
    setRecordDuration(0);
    setMicError('');

    await sendChatMessage({
      teamId: activeTeam.id,
      type: 'voice',
      voiceDuration: finalDuration,
      voiceWaveform: recResult.waveform && recResult.waveform.length > 0 ? recResult.waveform : [30, 60, 45, 80, 100, 65, 40, 85, 70, 50, 90, 40],
      audioUrl: recResult.audioUrl,
      text: `Voice note (${finalDuration}s)`,
    });

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Toggle Voice Note Playback (Real Audio Playback through Speakers)
  const togglePlayVoiceNote = (
    msgOrId: ChatMessage | string,
    durationSec?: number,
    audioUrl?: string
  ) => {
    let id: string;
    let duration: number = 5;
    let url: string | undefined = undefined;

    if (typeof msgOrId === 'object' && msgOrId !== null) {
      id = msgOrId.id;
      duration = msgOrId.voice_duration || 5;
      url = msgOrId.audio_url;
    } else {
      id = String(msgOrId);
      duration = durationSec || 5;
      url = audioUrl;
    }

    if (playingMsgId === id) {
      if (activePlaybackRef.current) activePlaybackRef.current.stop();
      VoicePlayerService.stopAll();
      setPlayingMsgId(null);
      setPlaybackProgress(0);
    } else {
      if (activePlaybackRef.current) activePlaybackRef.current.stop();
      VoicePlayerService.stopAll();

      setPlayingMsgId(id);
      setPlaybackProgress(0);

      const controller = VoicePlayerService.play(
        url,
        duration,
        (pct) => setPlaybackProgress(pct),
        () => {
          setPlayingMsgId(null);
          setPlaybackProgress(0);
          activePlaybackRef.current = null;
        }
      );

      activePlaybackRef.current = controller;
    }
  };

  // Helper to format text with highlighted @username pills
  const renderMessageContent = (text: string, isMe: boolean) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return (
      <Text style={[styles.bubbleMsgText, isMe ? styles.bubbleMsgTextMe : styles.bubbleMsgTextOther]}>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <Text
                key={i}
                style={[
                  styles.mentionHighlight,
                  isMe ? styles.mentionHighlightMe : styles.mentionHighlightOther,
                ]}
              >
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.teamName} numberOfLines={1}>
            {activeTeam ? activeTeam.name : 'Team Group Chat'}
          </Text>
          <View style={styles.headerSubRow}>
            <View style={styles.liveDot} />
            <Text style={styles.memberCountText}>
              {users.length} members • Voice & Discussion Active
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => router.push('/(tabs)/teams')}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Messages Thread */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.encryptionNotice}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" />
          <Text style={styles.encryptionText}>
            End-to-end team discussion channel. Type @ to mention teammates.
          </Text>
        </View>

        {teamMessages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const isVoice = msg.type === 'voice';
          const isPlayingThis = playingMsgId === msg.id;

          return (
            <Animated.View
              key={msg.id}
              entering={FadeInDown.duration(200)}
              style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}
            >
              {!isMe && (
                <View style={styles.avatarWrap}>
                  {msg.user_picture ? (
                    <Image source={{ uri: msg.user_picture }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{msg.user_name?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                {/* Author Name & Username */}
                {!isMe && (
                  <View style={styles.authorRow}>
                    <Text style={styles.authorName}>{msg.user_name}</Text>
                    <View style={styles.usernamePill}>
                      <Text style={styles.usernamePillText}>@{msg.user_username}</Text>
                    </View>
                  </View>
                )}

                {/* Content: Voice Note or Text */}
                {isVoice ? (
                  <View style={styles.voiceNoteCard}>
                    <TouchableOpacity
                      onPress={() => togglePlayVoiceNote(msg)}
                      style={[styles.playBtn, isMe ? styles.playBtnMe : styles.playBtnOther]}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isPlayingThis ? 'pause' : 'play'}
                        size={18}
                        color={isMe ? '#4f46e5' : '#ffffff'}
                      />
                    </TouchableOpacity>

                    {/* Waveform Bars */}
                    <View style={styles.waveformWrap}>
                      <View style={styles.waveformBars}>
                        {(msg.voice_waveform || [30, 60, 45, 80, 100, 65, 40, 85, 70, 50, 90, 40]).map(
                          (h, idx) => {
                            const barProgress = (idx / 12) * 100;
                            const isPlayed = isPlayingThis && playbackProgress >= barProgress;
                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.waveBar,
                                  {
                                    height: Math.max(6, (h / 100) * 24),
                                    backgroundColor: isMe
                                      ? isPlayed
                                        ? '#ffffff'
                                        : 'rgba(255, 255, 255, 0.45)'
                                      : isPlayed
                                      ? '#4f46e5'
                                      : '#cbd5e1',
                                  },
                                ]}
                              />
                            );
                          }
                        )}
                      </View>
                      <View style={styles.voiceDurationRow}>
                        <Text style={[styles.voiceDurationText, isMe ? styles.voiceDurationTextMe : null]}>
                          {isPlayingThis
                            ? `${formatSecs(Math.round(((msg.voice_duration || 8) * playbackProgress) / 100))} / `
                            : ''}
                          {formatSecs(msg.voice_duration || 8)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  renderMessageContent(msg.text || '', isMe)
                )}

                {/* Timestamp */}
                <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Floating @ Mention Autocomplete Popup */}
      {showMentionPopup && (
        <Animated.View entering={FadeInUp.duration(150)} style={styles.mentionPopup}>
          <View style={styles.mentionPopupHeader}>
            <Ionicons name="at" size={15} color="#4f46e5" />
            <Text style={styles.mentionPopupTitle}>Mention Team Member</Text>
          </View>
          <ScrollView style={styles.mentionList} keyboardShouldPersistTaps="always">
            {filteredUsers.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mentionItem}
                onPress={() => handleSelectMention(item.username)}
              >
                <View style={styles.mentionAvatar}>
                  <Text style={styles.mentionAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mentionItemName}>{item.name}</Text>
                  <Text style={styles.mentionItemUser}>@{item.username}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Bottom Bar: Text Input or Active Voice Recorder */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isRecording ? (
          <View style={styles.recordingTray}>
            <View style={styles.recordingLeft}>
              <Animated.View style={[styles.recordDot, pulseStyle]} />
              <Text style={styles.recordingTimeText}>Recording {formatSecs(recordDuration)}</Text>
            </View>

            <View style={styles.recordingActions}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecBtn}>
                <Ionicons name="trash-outline" size={20} color="#e11d48" />
              </TouchableOpacity>

              <TouchableOpacity onPress={sendVoiceNote} style={styles.sendRecBtn}>
                <LinearGradient
                  colors={['#4f46e5', '#7c3aed']}
                  style={styles.sendRecGradient}
                >
                  <Ionicons name="send" size={16} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.inputTray}>
            <TouchableOpacity
              onPress={startRecording}
              style={styles.micBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={20} color="#4f46e5" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Message team... (type @ for mention)"
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={handleTextChange}
              onSubmitEditing={handleSendText}
              returnKeyType="send"
              multiline={false}
            />

            <TouchableOpacity
              onPress={handleSendText}
              style={[styles.sendBtn, !inputText.trim() ? styles.sendBtnDisabled : null]}
              disabled={!inputText.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  teamName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  memberCountText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 16,
    gap: 12,
  },
  encryptionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  encryptionText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '85%',
  },
  msgRowMe: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  avatarWrap: {
    marginBottom: 4,
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#4f46e5',
    fontWeight: '800',
    fontSize: 12,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleMe: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  authorName: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  usernamePill: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  usernamePillText: {
    color: '#4f46e5',
    fontSize: 10,
    fontWeight: '700',
  },
  bubbleMsgText: {
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleMsgTextMe: {
    color: '#ffffff',
    fontWeight: '400',
  },
  bubbleMsgTextOther: {
    color: '#0f172a',
    fontWeight: '400',
  },
  mentionHighlight: {
    fontWeight: '800',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  mentionHighlightMe: {
    color: '#fef08a',
    backgroundColor: 'rgba(254, 240, 138, 0.2)',
  },
  mentionHighlightOther: {
    color: '#4f46e5',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  voiceNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 190,
    paddingVertical: 2,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnMe: {
    backgroundColor: '#ffffff',
  },
  playBtnOther: {
    backgroundColor: '#4f46e5',
  },
  waveformWrap: {
    flex: 1,
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3.5,
    borderRadius: 2,
  },
  voiceDurationRow: {
    marginTop: 2,
  },
  voiceDurationText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  voiceDurationTextMe: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  timeText: {
    fontSize: 9.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTextOther: {
    color: '#94a3b8',
  },
  mentionPopup: {
    position: 'absolute',
    bottom: 66,
    left: 14,
    right: 14,
    maxHeight: 180,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    padding: 8,
  },
  mentionPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 4,
  },
  mentionPopupTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mentionList: {
    maxHeight: 130,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  mentionAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAvatarText: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '800',
  },
  mentionItemName: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  mentionItemUser: {
    color: '#4f46e5',
    fontSize: 10.5,
    fontWeight: '600',
  },
  inputTray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
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
  recordingTray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e11d48',
  },
  recordingTimeText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '700',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelRecBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRecBtn: {
    borderRadius: 19,
  },
  sendRecGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
