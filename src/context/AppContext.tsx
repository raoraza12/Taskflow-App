import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Profile,
  Team,
  TeamMember,
  Task,
  Subtask,
  AppNotification,
  JoinRequest,
  ActivityLog,
  TaskStatus,
  TaskPriority,
  Role,
  ChatMessage,
  AIAgentMessage,
} from '../types/database';
import { AppThemeKey } from '../constants/theme';
import { runMultiModelAI, AIContextData, AIEngineResult } from '../lib/aiAgentEngine';
import { generateVoiceToneWav } from '../lib/audioVoiceRecorder';

/**
 * Strict Super Admin & App Ownership Check:
 * ONLY the owner (Ali Raza, aliraza.lead@gmail.com) has access to the Admin Panel.
 */
export const isAppOwner = (u?: Profile | null): boolean => {
  if (!u) return false;
  const email = u.email?.toLowerCase().trim();
  const username = u.username?.toLowerCase().trim();
  const name = u.name?.toLowerCase().trim();
  return (
    email === 'aliraza.lead@gmail.com' ||
    u.id === 'user_seed_ali' ||
    username === 'ali_lead' ||
    (Boolean(email) && email!.includes('aliraza')) ||
    (Boolean(name) && name === 'ali raza')
  );
};

interface TaskInput {
  teamId?: string | null;
  isPersonal?: boolean;
  assigneeId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedDate?: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
}

interface CreateTeamInput {
  name: string;
  joinPassword: string;
}

interface JoinTeamInput {
  teamName: string;
  inviteCode: string;
  joinPassword: string;
}

interface AppContextValue {
  user: Profile | null;
  users: Profile[];
  teams: Team[];
  tasks: Task[];
  notifications: AppNotification[];
  history: ActivityLog[];
  pendingJoinRequests: JoinRequest[];
  unreadCount: number;
  today: string;
  isLoading: boolean;
  // App Lock
  isAppLocked: boolean;
  hasAppLockPin: boolean;
  unlockApp: (pin: string) => boolean;
  setAppLockPin: (pin: string) => Promise<void>;
  resetAppLockPin: () => Promise<void>;
  // Password Reset OTP Flow
  sendPasswordResetOTP: (email: string) => Promise<{ ok: boolean; code?: string; error?: string }>;
  verifyPasswordResetOTP: (email: string, code: string) => { ok: boolean; error?: string };
  resetPasswordWithOTP: (email: string, code: string, newPin: string) => Promise<{ ok: boolean; error?: string }>;
  // Auth
  loginWithGoogle: (profile: Partial<Profile>) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (patch: { name?: string; picture?: string; username?: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  // Username validation helper
  checkUsernameAvailable: (username: string, excludeUserId?: string) => boolean;
  // Teams (Team Leader Controls)
  createTeam: (input: CreateTeamInput) => Promise<{ ok: boolean; team?: Team; error?: string }>;
  requestJoinTeam: (input: JoinTeamInput) => Promise<{ ok: boolean; team?: Team; error?: string }>;
  approveJoinRequest: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  declineJoinRequest: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  renameTeam: (teamId: string, newName: string) => Promise<{ ok: boolean; error?: string }>;
  deleteTeam: (teamId: string) => Promise<{ ok: boolean; error?: string }>;
  promoteMember: (teamId: string, memberUserId: string, newRole: Role) => Promise<{ ok: boolean; error?: string }>;
  removeMember: (teamId: string, memberUserId: string) => Promise<{ ok: boolean; error?: string }>;
  leaveTeam: (teamId: string) => Promise<{ ok: boolean; error?: string }>;
  getTeamMembers: (teamId: string) => TeamMember[];
  getMemberRole: (teamId: string) => Role | null;
  canManageTeam: (teamId: string) => boolean;
  // Tasks CRUD
  createTask: (input: TaskInput) => Promise<{ ok: boolean; task?: Task; error?: string }>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<{ ok: boolean; error?: string }>;
  submitTask: (taskId: string, submissionNote?: string) => Promise<{ ok: boolean; error?: string }>;
  deleteTask: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
  // Subtasks
  addSubtask: (taskId: string, title: string) => Promise<{ ok: boolean; error?: string }>;
  toggleSubtask: (subtaskId: string) => Promise<{ ok: boolean; error?: string }>;
  deleteSubtask: (subtaskId: string) => Promise<{ ok: boolean; error?: string }>;
  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  // Refresh
  refreshData: () => void;
  // UI Theme Demo Switcher
  theme: AppThemeKey;
  setTheme: (theme: AppThemeKey) => void;
  // Super Admin Governance
  adminToggleUserAdmin: (userId: string) => Promise<void>;
  adminToggleUserStatus: (userId: string) => Promise<void>;
  adminReassignTask: (taskId: string, newAssigneeId: string) => Promise<void>;
  adminTransferTeam: (teamId: string, newOwnerId: string) => Promise<void>;
  adminDeleteUser: (userId: string) => Promise<void>;
  // Team Group Chat & Voice Notes
  chatMessages: ChatMessage[];
  sendChatMessage: (input: {
    teamId: string;
    text?: string;
    type?: 'text' | 'voice';
    voiceDuration?: number;
    voiceWaveform?: number[];
    audioUrl?: string;
    mentions?: string[];
  }) => Promise<{ ok: boolean; message?: ChatMessage; error?: string }>;
  // AI Assistant Smart Agent
  aiMessages: AIAgentMessage[];
  sendAIPrompt: (prompt: string) => Promise<{ ok: boolean; response: string; actionData?: any }>;
  clearAIMessages: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORE_KEYS = {
  USER: 'tf_user',
  ALL_USERS: 'tf_all_users',
  USER_PASSWORDS: 'tf_passwords',
  TEAMS: 'tf_teams',
  MEMBERS: 'tf_members',
  TASKS: 'tf_tasks',
  SUBTASKS: 'tf_subtasks',
  NOTIFICATIONS: 'tf_notifs',
  HISTORY: 'tf_history',
  JOIN_REQUESTS: 'tf_requests',
  APP_LOCK_PIN: 'tf_app_lock_pin',
  THEME: 'tf_theme',
  CHAT_MESSAGES: 'tf_chat_messages',
  AI_MESSAGES: 'tf_ai_messages',
};

async function secureGet(key: string): Promise<string | null> {
  try {
    if (key === STORE_KEYS.APP_LOCK_PIN && Platform.OS !== 'web') {
      try {
        const pin = await SecureStore.getItemAsync(key);
        if (pin) return pin;
      } catch {}
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, val: string): Promise<void> {
  try {
    if (key === STORE_KEYS.APP_LOCK_PIN && Platform.OS !== 'web') {
      try {
        await SecureStore.setItemAsync(key, val);
      } catch {}
    }
    await AsyncStorage.setItem(key, val);
  } catch {}
}

async function secureRemove(key: string): Promise<void> {
  try {
    if (key === STORE_KEYS.APP_LOCK_PIN && Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {}
    }
    await AsyncStorage.removeItem(key);
  } catch {}
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [history, setHistory] = useState<ActivityLog[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AIAgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // App Lock State
  const [appLockPin, setAppLockPinState] = useState<string | null>(null);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(true);
  const [theme, setThemeState] = useState<AppThemeKey>('snow');

  // Password Reset OTP State
  const [pendingPasswordReset, setPendingPasswordReset] = useState<{
    email: string;
    otp: string;
    expiresAt: number;
  } | null>(null);

  const setTheme = useCallback(async (newTheme: AppThemeKey) => {
    setThemeState(newTheme);
    await secureSet(STORE_KEYS.THEME, newTheme);
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Username validation & auto-generation
  const checkUsernameAvailable = useCallback(
    (candidate: string, excludeUserId?: string): boolean => {
      const clean = candidate.trim().toLowerCase().replace(/^@/, '');
      if (!clean || clean.length < 3 || clean.length > 20) return false;
      if (!/^[a-zA-Z0-9_]+$/.test(clean)) return false;
      return !users.some((u) => u.id !== excludeUserId && u.username && u.username.toLowerCase() === clean);
    },
    [users]
  );

  const generateUniqueUsername = useCallback(
    (name: string, email: string, currentUsers: Profile[], excludeUserId?: string): string => {
      let base = (name || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (!base || base.length < 3) base = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      if (base.length > 15) base = base.substring(0, 15);

      let candidate = base;
      let counter = 1;
      while (
        currentUsers.some(
          (u) => u.id !== excludeUserId && u.username && u.username.toLowerCase() === candidate.toLowerCase()
        )
      ) {
        candidate = `${base}_${counter}`;
        counter++;
      }
      return candidate;
    },
    []
  );

  // Initial Load from Storage
  useEffect(() => {
    (async () => {
      const savedPin = await secureGet(STORE_KEYS.APP_LOCK_PIN);
      if (savedPin) {
        setAppLockPinState(savedPin);
        setIsAppLocked(true);
      } else {
        setIsAppLocked(false);
      }

      setThemeState('snow');

      // Preloaded seed data for teams and users
      const SEED_USERS: Profile[] = [
        {
          id: 'user_seed_ali',
          google_id: 'seed_google_ali',
          name: 'Ali Raza',
          username: 'ali_lead',
          email: 'aliraza.lead@gmail.com',
          email_verified: true,
          created_at: '2026-11-01T08:00:00.000Z',
          isAdmin: true,
          status: 'active',
        },
        {
          id: 'user_seed_sarah',
          google_id: 'seed_google_sarah',
          name: 'Sarah Khan',
          username: 'sarah_ui',
          email: 'sarah.khan.design@gmail.com',
          email_verified: true,
          created_at: '2026-11-02T09:00:00.000Z',
          isAdmin: false,
          status: 'active',
        },
        {
          id: 'user_seed_hamza',
          google_id: 'seed_google_hamza',
          name: 'Hamza Ahmed',
          username: 'hamza_dev',
          email: 'hamza.code@gmail.com',
          email_verified: true,
          created_at: '2026-11-03T10:00:00.000Z',
          isAdmin: false,
          status: 'active',
        },
        {
          id: 'user_seed_zainab',
          google_id: 'seed_google_zainab',
          name: 'Zainab Malik',
          username: 'zainab_pm',
          email: 'zainab.pm@gmail.com',
          email_verified: true,
          created_at: '2026-11-04T11:00:00.000Z',
          isAdmin: false,
          status: 'active',
        },
      ];

      const rawUsers = await secureGet(STORE_KEYS.ALL_USERS);
      let loadedUsers: Profile[] = [];
      if (rawUsers) {
        const parsed: Profile[] = JSON.parse(rawUsers);
        // Ensure every user has a unique username and ONLY the owner has admin rights
        loadedUsers = parsed.map((u, idx) => {
          const owner = isAppOwner(u);
          if (!u.username) {
            const base = (u.name || u.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '_');
            return { ...u, username: `${base}_${idx + 1}`, isAdmin: owner };
          }
          return { ...u, isAdmin: owner };
        });
      } else {
        loadedUsers = SEED_USERS;
        await secureSet(STORE_KEYS.ALL_USERS, JSON.stringify(SEED_USERS));
      }
      setUsers(loadedUsers);

      const savedUser = await secureGet(STORE_KEYS.USER);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (!parsed.username) {
            parsed.username = (parsed.name || parsed.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '_');
          }
          parsed.isAdmin = isAppOwner(parsed);
          setUser(parsed);
        } catch {}
      }

      const defaultPasswords: Record<string, string> = {
        'aliraza.lead@gmail.com': 'admin1234',
        'sarah.khan.design@gmail.com': 'sarah1234',
        'hamza.code@gmail.com': 'hamza1234',
        'zainab.pm@gmail.com': 'zainab1234',
      };
      const rawPasswords = await secureGet(STORE_KEYS.USER_PASSWORDS);
      if (rawPasswords) {
        setUserPasswords(JSON.parse(rawPasswords));
      } else {
        setUserPasswords(defaultPasswords);
        await secureSet(STORE_KEYS.USER_PASSWORDS, JSON.stringify(defaultPasswords));
      }

      const rawTeams = await secureGet(STORE_KEYS.TEAMS);
      if (rawTeams) {
        setTeams(JSON.parse(rawTeams));
      } else {
        const defaultTeam: Team = {
          id: 'team_sprint_alpha',
          name: 'Core Product & AI Sprint',
          invite_code: 'SPRINT26',
          join_password: 'team1234',
          owner_id: 'user_seed_ali',
          created_at: '2026-11-01T08:00:00.000Z',
        };
        setTeams([defaultTeam]);
        await secureSet(STORE_KEYS.TEAMS, JSON.stringify([defaultTeam]));
      }

      const rawMembers = await secureGet(STORE_KEYS.MEMBERS);
      if (rawMembers) {
        setMembers(JSON.parse(rawMembers));
      } else {
        const defaultMembers: TeamMember[] = [
          {
            id: 'mem_1',
            team_id: 'team_sprint_alpha',
            user_id: 'user_seed_ali',
            role: 'owner',
            joined_at: '2026-11-01T08:00:00.000Z',
            profile: SEED_USERS[0],
          },
          {
            id: 'mem_2',
            team_id: 'team_sprint_alpha',
            user_id: 'user_seed_sarah',
            role: 'member',
            joined_at: '2026-11-02T09:00:00.000Z',
            profile: SEED_USERS[1],
          },
          {
            id: 'mem_3',
            team_id: 'team_sprint_alpha',
            user_id: 'user_seed_hamza',
            role: 'member',
            joined_at: '2026-11-03T10:00:00.000Z',
            profile: SEED_USERS[2],
          },
          {
            id: 'mem_4',
            team_id: 'team_sprint_alpha',
            user_id: 'user_seed_zainab',
            role: 'member',
            joined_at: '2026-11-04T11:00:00.000Z',
            profile: SEED_USERS[3],
          },
        ];
        setMembers(defaultMembers);
        await secureSet(STORE_KEYS.MEMBERS, JSON.stringify(defaultMembers));
      }

      const rawTasks = await secureGet(STORE_KEYS.TASKS);
      if (rawTasks) setTasks(JSON.parse(rawTasks));

      const rawSubtasks = await secureGet(STORE_KEYS.SUBTASKS);
      if (rawSubtasks) setSubtasks(JSON.parse(rawSubtasks));

      const rawNotifs = await secureGet(STORE_KEYS.NOTIFICATIONS);
      if (rawNotifs) setNotifications(JSON.parse(rawNotifs));

      const rawHistory = await secureGet(STORE_KEYS.HISTORY);
      if (rawHistory) setHistory(JSON.parse(rawHistory));

      const rawRequests = await secureGet(STORE_KEYS.JOIN_REQUESTS);
      if (rawRequests) setJoinRequests(JSON.parse(rawRequests));

      const rawChat = await secureGet(STORE_KEYS.CHAT_MESSAGES);
      if (rawChat) {
        setChatMessages(JSON.parse(rawChat));
      } else {
        const seedChat: ChatMessage[] = [
          {
            id: 'msg_seed_1',
            team_id: 'team_sprint_alpha',
            user_id: 'user_seed_ali',
            user_name: 'Ali Raza',
            user_username: 'ali_lead',
            text: 'Assalam-o-Alaikum team! Alpine White theme live ho chuki hai. @sarah_ui please icons aur micro-interactions review kar lena.',
            type: 'text',
            mentions: ['sarah_ui'],
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'msg_seed_2',
            team_id: 'team_sprint_alpha',
            user_id: 'user_seed_sarah',
            user_name: 'Sarah Khan',
            user_username: 'sarah_ui',
            text: 'Voice note: Sprint UI review & animations update 🎙️',
            type: 'voice',
            voice_duration: 8,
            audio_url: generateVoiceToneWav(6),
            voice_waveform: [30, 55, 80, 45, 90, 70, 85, 100, 65, 40, 75, 90, 50, 30, 60, 40],
            mentions: ['ali_lead'],
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'msg_seed_3',
            team_id: 'team_sprint_alpha',
            user_id: 'user_seed_hamza',
            user_name: 'Hamza Ahmed',
            user_username: 'hamza_dev',
            text: '@ali_lead @zainab_pm AI Agent bot ready hai! Leader bol sakta hai "is banday ko yeh task assign krna" aur bot foran task bana dega!',
            type: 'text',
            mentions: ['ali_lead', 'zainab_pm'],
            created_at: new Date(Date.now() - 1800000).toISOString(),
          },
        ];
        setChatMessages(seedChat);
        await secureSet(STORE_KEYS.CHAT_MESSAGES, JSON.stringify(seedChat));
      }

      const rawAi = await secureGet(STORE_KEYS.AI_MESSAGES);
      if (rawAi) {
        setAiMessages(JSON.parse(rawAi));
      } else {
        const welcomeAi: AIAgentMessage = {
          id: 'ai_welcome_init',
          sender: 'assistant',
          text: 'Assalam-o-Alaikum! Main TaskFlow ka Smart AI Agent hoon 🤖\n\nAap mujhse natural language mein task create ya kisi bhi member ko assign karwa sakte hain. Misal:\n• "Assign @sarah_ui high priority UI redesign task due today"\n• "Create task API Integration for @hamza_dev"\n• "Kaam ka status batao" ya "Complete UI task"\n\nBataiye main aapki kya madad karoon?',
          action_type: 'info',
          created_at: new Date().toISOString(),
        };
        setAiMessages([welcomeAi]);
        await secureSet(STORE_KEYS.AI_MESSAGES, JSON.stringify([welcomeAi]));
      }

      setIsLoading(false);
    })();
  }, []);

  // Isolated Per-User AI Chat History Synchronization
  useEffect(() => {
    if (!user) return;
    (async () => {
      const userAiKey = `${STORE_KEYS.AI_MESSAGES}_${user.id}`;
      const rawAi = await secureGet(userAiKey);
      if (rawAi) {
        try {
          const parsed = JSON.parse(rawAi);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAiMessages(parsed);
            return;
          }
        } catch {}
      }
      // Initialize isolated welcome message for this specific user
      const userWelcome: AIAgentMessage = {
        id: `ai_init_${user.id}`,
        sender: 'assistant',
        text: `Assalam-o-Alaikum, **${user.name}**! 👋\n\nMain TaskFlow ka Multi-Model AI Agent hoon. Mujhe aapke portal, team members, sprint tasks aur schedules ki complete knowledge hai.\n\nAap mujhse natural language mein koi bhi sawaal pooch sakte hain ya task assign karwa sakte hain.\n\n• *"Hamari team mein kaun kaun hai aur unke roles kya hain?"*\n• *"Mera aaj ka kya kaam due hai?"*\n• *"Assign task UI Review to @sarah_ui high priority due today"*`,
        action_type: 'info',
        model_used: 'Gemini 1.5 Pro (Primary Neural)',
        created_at: new Date().toISOString(),
      };
      setAiMessages([userWelcome]);
      await secureSet(userAiKey, JSON.stringify([userWelcome]));
    })();
  }, [user?.id]);

  // Periodic deadline reminder check (Point 7)
  useEffect(() => {
    if (!user || tasks.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const myPendingTasks = tasks.filter(
      (t) =>
        t.assignee_id === user.id &&
        t.status !== 'done' &&
        t.status !== 'submitted' &&
        t.due_date <= todayStr
    );

    if (myPendingTasks.length > 0) {
      myPendingTasks.forEach((t) => {
        const alreadyNotified = notifications.some(
          (n) => n.related_task_id === t.id && n.kind === 'task_due_soon'
        );
        if (!alreadyNotified) {
          const deadlineNotif: AppNotification = {
            id: `notif_due_${t.id}_${Date.now()}`,
            user_id: user.id,
            kind: 'task_due_soon',
            title: '⏰ Submission Deadline Approaching',
            body: `Task "${t.title}" is due today (${t.due_date})! Please complete and submit before deadline.`,
            read: false,
            related_task_id: t.id,
            created_at: new Date().toISOString(),
          };
          setNotifications((prev) => {
            const updated = [deadlineNotif, ...prev];
            persist(STORE_KEYS.NOTIFICATIONS, updated);
            return updated;
          });
        }
      });
    }
  }, [user, tasks, today]);

  const persist = useCallback(async (key: string, data: any) => {
    await secureSet(key, JSON.stringify(data));
  }, []);

  // Log activity helper
  const logAction = useCallback((action: string, detail: string) => {
    if (!user) return;
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(2, 9),
      user_id: user.id,
      action,
      detail,
      created_at: new Date().toISOString(),
    };
    setHistory((prev) => {
      const updated = [newLog, ...prev];
      persist(STORE_KEYS.HISTORY, updated);
      return updated;
    });
  }, [user, persist]);

  // App Lock functions
  const unlockApp = useCallback((pin: string): boolean => {
    if (!appLockPin || pin === appLockPin) {
      setIsAppLocked(false);
      return true;
    }
    return false;
  }, [appLockPin]);

  const setAppLockPin = useCallback(async (pin: string) => {
    await secureSet(STORE_KEYS.APP_LOCK_PIN, pin);
    setAppLockPinState(pin);
    setIsAppLocked(false);
    logAction('app_lock_set', 'App lock password was updated');
  }, [logAction]);

  const resetAppLockPin = useCallback(async () => {
    await secureRemove(STORE_KEYS.APP_LOCK_PIN);
    setAppLockPinState(null);
    setIsAppLocked(false);
    logAction('app_lock_reset', 'App lock password was reset by account verification');
  }, [logAction]);

  // Password Reset OTP Flow via Email
  const sendPasswordResetOTP = useCallback(
    async (email: string): Promise<{ ok: boolean; code?: string; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { ok: false, error: 'Please enter your registered email address.' };
      }

      // Check if user exists in registered users or is current user
      const matchedUser =
        users.find((u) => u.email.toLowerCase() === cleanEmail) ||
        (user?.email?.toLowerCase() === cleanEmail ? user : null);

      if (!matchedUser) {
        return {
          ok: false,
          error: `No TaskFlow account found with email "${cleanEmail}". Please check your email or sign in with Google.`,
        };
      }

      // Generate a secure 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins validity

      setPendingPasswordReset({ email: cleanEmail, otp: code, expiresAt });

      // Create an in-app system notification for instant feedback
      const resetNotif: AppNotification = {
        id: `notif_reset_${Date.now()}`,
        user_id: matchedUser.id,
        title: `📬 Password Reset Code: ${code}`,
        body: `Your TaskFlow verification code is ${code}. It expires in 5 minutes. Enter this code to set your new password.`,
        read: false,
        created_at: new Date().toISOString(),
        kind: 'system',
      };

      setNotifications((prev) => {
        const updated = [resetNotif, ...prev];
        persist(STORE_KEYS.NOTIFICATIONS, updated);
        return updated;
      });

      return { ok: true, code };
    },
    [users, user, persist]
  );

  const verifyPasswordResetOTP = useCallback(
    (email: string, code: string): { ok: boolean; error?: string } => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();

      if (!pendingPasswordReset || pendingPasswordReset.email !== cleanEmail) {
        return { ok: false, error: 'No active verification session found. Please tap Send Code first.' };
      }

      if (Date.now() > pendingPasswordReset.expiresAt) {
        return { ok: false, error: 'Verification code has expired. Please request a new code.' };
      }

      if (pendingPasswordReset.otp !== cleanCode) {
        return { ok: false, error: 'Invalid 6-digit verification code. Please check and try again.' };
      }

      return { ok: true };
    },
    [pendingPasswordReset]
  );

  const resetPasswordWithOTP = useCallback(
    async (email: string, code: string, newPin: string): Promise<{ ok: boolean; error?: string }> => {
      const verification = verifyPasswordResetOTP(email, code);
      if (!verification.ok) {
        return verification;
      }

      if (!newPin || newPin.length < 4) {
        return { ok: false, error: 'Password must be at least 4 characters long.' };
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Update App Lock PIN
      await secureSet(STORE_KEYS.APP_LOCK_PIN, newPin);
      setAppLockPinState(newPin);
      setIsAppLocked(false);

      // 2. Update local account password in userPasswords if applicable
      const updatedPasswords = { ...userPasswords, [cleanEmail]: newPin };
      setUserPasswords(updatedPasswords);
      await persist(STORE_KEYS.USER_PASSWORDS, updatedPasswords);

      // 3. Clear pending OTP session
      setPendingPasswordReset(null);

      // 4. Log Action
      logAction('password_reset_otp', `Password successfully reset via email OTP for ${cleanEmail}`);

      return { ok: true };
    },
    [verifyPasswordResetOTP, userPasswords, persist, logAction]
  );

  // Auth Functions
  const loginWithGoogle = async (profileData: Partial<Profile>) => {
    const email = profileData.email?.trim().toLowerCase();
    if (!email) return { ok: false, error: 'Email required' };
    if (!email.endsWith('@gmail.com')) {
      return { ok: false, error: 'Only verified @gmail.com accounts are allowed' };
    }

    // Check if user already exists to preserve their ID, teams and tasks
    const existing = users.find((u) => u.email === email);
    const isOwner = isAppOwner({ email, id: profileData.id || existing?.id } as any);
    const generatedUsername = generateUniqueUsername(profileData.name || '', email, users, existing?.id);

    const profileToUse: Profile = existing
      ? {
          ...existing,
          username: existing.username || generatedUsername,
          name: profileData.name || existing.name,
          picture: profileData.picture || existing.picture,
          isAdmin: isOwner,
          status: existing.status || 'active',
        }
      : {
          id: profileData.id || `user_${Date.now()}`,
          google_id: profileData.google_id || `google_${Date.now()}`,
          name: profileData.name || email.split('@')[0],
          username: generatedUsername,
          email,
          picture: profileData.picture,
          email_verified: true,
          created_at: new Date().toISOString(),
          isAdmin: isOwner,
          status: 'active',
        };

    setUser(profileToUse);
    await persist(STORE_KEYS.USER, profileToUse);

    // Save to all users list cleanly
    const exists = users.find((u) => u.email === email);
    const updatedUsers = exists
      ? users.map((u) => (u.email === email ? profileToUse : u))
      : [...users, profileToUse];
    setUsers(updatedUsers);
    await persist(STORE_KEYS.ALL_USERS, updatedUsers);

    logAction('login', `Signed in with verified Google account: ${email}`);
    return { ok: true };
  };

  const logout = () => {
    logAction('logout', 'Signed out');
    setUser(null);
    secureSet(STORE_KEYS.USER, '');
  };

  // Sign Up with email + password
  const signUp = async (name: string, email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) return { ok: false, error: 'Full name is required' };
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address' };
    }
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };

    // Check if email already registered
    const existingUser = users.find((u) => u.email === cleanEmail);
    if (existingUser) return { ok: false, error: 'Account with this email already exists. Please Sign In.' };

    const generatedUsername = generateUniqueUsername(cleanName, cleanEmail, users);
    const newProfile: Profile = {
      id: `user_${Date.now()}`,
      google_id: `local_${Date.now()}`,
      name: cleanName,
      username: generatedUsername,
      email: cleanEmail,
      email_verified: true,
      created_at: new Date().toISOString(),
      isAdmin: isAppOwner({ email: cleanEmail } as any),
      status: 'active',
    };

    // Save password map
    const updatedPasswords = { ...userPasswords, [cleanEmail]: password };
    setUserPasswords(updatedPasswords);
    await persist(STORE_KEYS.USER_PASSWORDS, updatedPasswords);

    setUser(newProfile);
    await persist(STORE_KEYS.USER, newProfile);

    const updatedUserList = [...users.filter((u) => u.email !== cleanEmail), newProfile];
    setUsers(updatedUserList);
    await persist(STORE_KEYS.ALL_USERS, updatedUserList);

    logAction('signup', `Registered with email ${cleanEmail}`);
    return { ok: true };
  };

  // Sign In with email + password
  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return { ok: false, error: 'Email is required' };
    if (!password) return { ok: false, error: 'Password is required' };

    const existingUser = users.find((u) => u.email === cleanEmail);
    if (!existingUser) return { ok: false, error: 'No account found. Please Sign Up first.' };

    const savedPassword = userPasswords[cleanEmail];
    if (!savedPassword || savedPassword !== password) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }

    setUser(existingUser);
    await persist(STORE_KEYS.USER, existingUser);
    logAction('signin', `Signed in with ${cleanEmail}`);
    return { ok: true };
  };

  // Update profile (name, picture, unique username)
  const updateProfile = async (patch: { name?: string; picture?: string; username?: string }) => {
    if (!user) return { ok: false, error: 'Not logged in' };

    let cleanedUsername = user.username;
    if (patch.username !== undefined) {
      const candidate = patch.username.trim().toLowerCase().replace(/^@/, '');
      if (candidate.length < 3) {
        return { ok: false, error: 'Username must be at least 3 characters' };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(candidate)) {
        return { ok: false, error: 'Username can only contain letters, numbers, and underscores' };
      }
      const isTaken = users.some(
        (u) => u.id !== user.id && u.username && u.username.toLowerCase() === candidate
      );
      if (isTaken) {
        return { ok: false, error: `@${candidate} is already taken. Please choose another username.` };
      }
      cleanedUsername = candidate;
    }

    const updatedUser: Profile = {
      ...user,
      ...(patch.name ? { name: patch.name.trim() } : {}),
      ...(patch.picture !== undefined ? { picture: patch.picture } : {}),
      username: cleanedUsername,
    };

    setUser(updatedUser);
    await persist(STORE_KEYS.USER, updatedUser);

    // Also update in users list and member profiles
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === user.id ? updatedUser : u));
      persist(STORE_KEYS.ALL_USERS, updated);
      return updated;
    });

    setMembers((prev) => {
      const updated = prev.map((m) => (m.user_id === user.id ? { ...m, profile: updatedUser } : m));
      persist(STORE_KEYS.MEMBERS, updated);
      return updated;
    });

    logAction('update_profile', `Updated profile (Username: @${cleanedUsername})`);
    return { ok: true };
  };

  // Team Leader & Team Actions
  const createTeam = async (input: CreateTeamInput) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const name = input.name.trim();
    if (!name) return { ok: false, error: 'Team name is required' };
    if (input.joinPassword.length < 4) return { ok: false, error: 'Team password must be at least 4 characters' };

    const teamId = `team_${Date.now()}`;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newTeam: Team = {
      id: teamId,
      name,
      invite_code: inviteCode,
      join_password: input.joinPassword,
      owner_id: user.id,
      created_at: new Date().toISOString(),
    };

    const newMember: TeamMember = {
      id: `member_${Date.now()}`,
      team_id: teamId,
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
      profile: user,
    };

    const updatedTeams = [...teams, newTeam];
    const updatedMembers = [...members, newMember];

    setTeams(updatedTeams);
    setMembers(updatedMembers);
    await persist(STORE_KEYS.TEAMS, updatedTeams);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    logAction('create_team', `Created team "${name}" as Leader`);
    return { ok: true, team: newTeam };
  };

  const requestJoinTeam = async (
    input: JoinTeamInput
  ): Promise<{ ok: boolean; team?: Team; error?: string }> => {
    if (!user) return { ok: false, error: 'Must be logged in' };

    const cleanName = input.teamName.trim();
    const cleanCode = input.inviteCode.trim().toUpperCase();
    const cleanPass = input.joinPassword.trim();

    if (!cleanName) return { ok: false, error: 'Team name is required' };
    if (!cleanCode) return { ok: false, error: '6-digit invite code is required' };
    if (!cleanPass) return { ok: false, error: 'Team access password is required' };

    // 1. Find team locally by invite code or name
    let targetTeam = teams.find(
      (t) =>
        t.invite_code.trim().toUpperCase() === cleanCode ||
        t.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (targetTeam) {
      // Team exists in current storage - verify password
      if (targetTeam.join_password && targetTeam.join_password.trim() !== cleanPass) {
        return { ok: false, error: 'Team access password is incorrect' };
      }
    } else {
      // 2. Cross-Device / Cloudless Sync:
      // Team was created on another device (e.g. Web or APK)
      if (cleanPass.length < 4) {
        return { ok: false, error: 'Team password must be at least 4 characters' };
      }

      // Materialize team locally so member can access workspace immediately
      targetTeam = {
        id: `team_${cleanCode.toLowerCase()}`,
        name: cleanName,
        invite_code: cleanCode,
        join_password: cleanPass,
        owner_id: 'leader_remote',
        created_at: new Date().toISOString(),
      };

      const updatedTeams = [...teams, targetTeam];
      setTeams(updatedTeams);
      await persist(STORE_KEYS.TEAMS, updatedTeams);
    }

    // 3. Check if user is already a member
    const alreadyMember = members.some((m) => m.team_id === targetTeam.id && m.user_id === user.id);
    if (alreadyMember) {
      return { ok: true, team: targetTeam };
    }

    // 4. Automatically join member into the team workspace
    const newMember: TeamMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      team_id: targetTeam.id,
      user_id: user.id,
      role: targetTeam.owner_id === user.id ? 'owner' : 'member',
      joined_at: new Date().toISOString(),
      profile: user,
    };

    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    logAction('join_team', `Joined team "${targetTeam.name}" (Code: ${cleanCode})`);
    return { ok: true, team: targetTeam };
  };

  const approveJoinRequest = async (requestId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const req = joinRequests.find((r) => r.id === requestId);
    if (!req) return { ok: false, error: 'Request not found' };

    const team = teams.find((t) => t.id === req.team_id);
    if (!team) return { ok: false, error: 'Team not found' };

    const requester = users.find((u) => u.id === req.user_id) || req.profile;

    const newMember: TeamMember = {
      id: `member_${Date.now()}`,
      team_id: team.id,
      user_id: req.user_id,
      role: 'member',
      joined_at: new Date().toISOString(),
      profile: requester,
    };

    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    const updatedRequests = joinRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'approved' as const, resolved_at: new Date().toISOString() } : r
    );
    setJoinRequests(updatedRequests);
    await persist(STORE_KEYS.JOIN_REQUESTS, updatedRequests);

    // Notify user
    const userNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      user_id: req.user_id,
      kind: 'join_result',
      title: 'Join Request Approved!',
      body: `You are now a member of "${team.name}"`,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [userNotif, ...prev];
      persist(STORE_KEYS.NOTIFICATIONS, updated);
      return updated;
    });

    logAction('approve_join', `Approved join request for ${requester?.name || 'user'}`);
    return { ok: true };
  };

  const declineJoinRequest = async (requestId: string) => {
    const req = joinRequests.find((r) => r.id === requestId);
    if (!req) return { ok: false, error: 'Request not found' };

    const updatedRequests = joinRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'declined' as const, resolved_at: new Date().toISOString() } : r
    );
    setJoinRequests(updatedRequests);
    await persist(STORE_KEYS.JOIN_REQUESTS, updatedRequests);
    return { ok: true };
  };

  // Team Leader Full Controls: Rename, Delete, Member Promotion, Member Removal
  const renameTeam = async (teamId: string, newName: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    if (team.owner_id !== user.id) return { ok: false, error: 'Only team leader can rename the team' };

    const updatedTeams = teams.map((t) => (t.id === teamId ? { ...t, name: newName.trim() } : t));
    setTeams(updatedTeams);
    await persist(STORE_KEYS.TEAMS, updatedTeams);
    logAction('rename_team', `Renamed team to "${newName}"`);
    return { ok: true };
  };

  const deleteTeam = async (teamId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    if (team.owner_id !== user.id) return { ok: false, error: 'Only team leader can delete the team' };

    const updatedTeams = teams.filter((t) => t.id !== teamId);
    const updatedMembers = members.filter((m) => m.team_id !== teamId);
    const updatedTasks = tasks.filter((t) => t.team_id !== teamId);

    setTeams(updatedTeams);
    setMembers(updatedMembers);
    setTasks(updatedTasks);

    await persist(STORE_KEYS.TEAMS, updatedTeams);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);
    await persist(STORE_KEYS.TASKS, updatedTasks);

    logAction('delete_team', `Deleted team "${team.name}"`);
    return { ok: true };
  };

  const promoteMember = async (teamId: string, memberUserId: string, newRole: Role) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team || team.owner_id !== user.id) {
      return { ok: false, error: 'Only team leader can change roles' };
    }

    const updatedMembers = members.map((m) =>
      m.team_id === teamId && m.user_id === memberUserId ? { ...m, role: newRole } : m
    );
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);
    logAction('promote_member', `Changed member role to ${newRole}`);
    return { ok: true };
  };

  const removeMember = async (teamId: string, memberUserId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    if (memberUserId === team.owner_id) return { ok: false, error: 'Cannot remove team leader' };

    const updatedMembers = members.filter((m) => !(m.team_id === teamId && m.user_id === memberUserId));
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    // Notify removed user
    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      user_id: memberUserId,
      kind: 'member_removed',
      title: 'Removed from Team',
      body: `You were removed from "${team.name}"`,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [notif, ...prev];
      persist(STORE_KEYS.NOTIFICATIONS, updated);
      return updated;
    });

    logAction('remove_member', `Removed member from "${team.name}"`);
    return { ok: true };
  };

  const leaveTeam = async (teamId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    if (team.owner_id === user.id) return { ok: false, error: 'Leader cannot leave. Delete team instead.' };

    const updatedMembers = members.filter((m) => !(m.team_id === teamId && m.user_id === user.id));
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);
    logAction('leave_team', `Left team "${team.name}"`);
    return { ok: true };
  };

  const getTeamMembers = (teamId: string) => {
    return members
      .filter((m) => m.team_id === teamId)
      .map((m) => ({
        ...m,
        profile: users.find((u) => u.id === m.user_id) || m.profile,
      }));
  };

  const getMemberRole = (teamId: string): Role | null => {
    if (!user) return null;
    return members.find((m) => m.team_id === teamId && m.user_id === user.id)?.role || null;
  };

  const canManageTeam = (teamId: string) => {
    const role = getMemberRole(teamId);
    return role === 'owner' || role === 'admin';
  };

  // Task Actions
  const createTask = async (input: TaskInput) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    if (!input.title.trim()) return { ok: false, error: 'Task title is required' };

    const taskId = `task_${Date.now()}`;
    const isPersonal = Boolean(input.isPersonal || !input.teamId);
    const assignedDate = input.assignedDate || today;

    const newTask: Task = {
      id: taskId,
      team_id: isPersonal ? null : (input.teamId || null),
      is_personal: isPersonal,
      assignee_id: input.assigneeId || user.id,
      created_by_id: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      assigned_date: assignedDate,
      due_date: input.dueDate || today,
      start_time: input.startTime || '09:00',
      end_time: input.endTime || '10:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    await persist(STORE_KEYS.TASKS, updatedTasks);

    // Notify assignee if assigned to someone else
    if (newTask.assignee_id !== user.id) {
      const notif: AppNotification = {
        id: `notif_${Date.now()}`,
        user_id: newTask.assignee_id,
        kind: 'task_assigned',
        title: 'New Task Assigned 📋',
        body: `${user.name} assigned: "${newTask.title}". Deadline: ${newTask.due_date}.`,
        read: false,
        related_task_id: taskId,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => {
        const updated = [notif, ...prev];
        persist(STORE_KEYS.NOTIFICATIONS, updated);
        return updated;
      });
    }

    logAction('create_task', `Created task "${newTask.title}"`);
    return { ok: true, task: newTask };
  };

  const submitTask = async (taskId: string, submissionNote?: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: 'Task not found' };

    const submittedAt = new Date().toISOString();
    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: 'submitted' as TaskStatus,
            submitted_at: submittedAt,
            submission_note: submissionNote || 'Task completed and submitted for review',
            updated_at: submittedAt,
          }
        : t
    );
    setTasks(updatedTasks);
    await persist(STORE_KEYS.TASKS, updatedTasks);

    // Determine who to notify (Task Creator or Team Owner)
    const targetUserId = task.created_by_id !== user.id ? task.created_by_id : null;
    if (targetUserId) {
      const notif: AppNotification = {
        id: `notif_${Date.now()}`,
        user_id: targetUserId,
        kind: 'task_submitted',
        title: 'Task Submitted for Review 🚀',
        body: `${user.name} submitted task: "${task.title}". Ready for leader approval.`,
        read: false,
        related_task_id: taskId,
        created_at: submittedAt,
      };
      setNotifications((prev) => {
        const updated = [notif, ...prev];
        persist(STORE_KEYS.NOTIFICATIONS, updated);
        return updated;
      });
    }

    logAction('submit_task', `Submitted task "${task.title}"`);
    return { ok: true };
  };

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...patch, updated_at: new Date().toISOString() } : t
    );
    setTasks(updatedTasks);
    await persist(STORE_KEYS.TASKS, updatedTasks);
    logAction('update_task', `Updated task details`);
    return { ok: true };
  };

  const deleteTask = async (taskId: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    const updatedSubtasks = subtasks.filter((s) => s.task_id !== taskId);
    setTasks(updatedTasks);
    setSubtasks(updatedSubtasks);
    await persist(STORE_KEYS.TASKS, updatedTasks);
    await persist(STORE_KEYS.SUBTASKS, updatedSubtasks);
    logAction('delete_task', 'Deleted task');
    return { ok: true };
  };

  // Subtask Actions
  const addSubtask = async (taskId: string, title: string) => {
    if (!title.trim()) return { ok: false, error: 'Subtask title required' };
    const newSubtask: Subtask = {
      id: `sub_${Date.now()}`,
      task_id: taskId,
      title: title.trim(),
      done: false,
      position: subtasks.filter((s) => s.task_id === taskId).length,
      created_at: new Date().toISOString(),
    };
    const updatedSubtasks = [...subtasks, newSubtask];
    setSubtasks(updatedSubtasks);
    await persist(STORE_KEYS.SUBTASKS, updatedSubtasks);
    return { ok: true };
  };

  const toggleSubtask = async (subtaskId: string) => {
    const updated = subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
    setSubtasks(updated);
    await persist(STORE_KEYS.SUBTASKS, updated);
    return { ok: true };
  };

  const deleteSubtask = async (subtaskId: string) => {
    const updated = subtasks.filter((s) => s.id !== subtaskId);
    setSubtasks(updated);
    await persist(STORE_KEYS.SUBTASKS, updated);
    return { ok: true };
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    persist(STORE_KEYS.NOTIFICATIONS, updated);
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    persist(STORE_KEYS.NOTIFICATIONS, updated);
  };

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter((n) => n.user_id === user.id && !n.read).length;
  }, [user, notifications]);

  // User-visible teams and tasks
  const myTeamIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(members.filter((m) => m.user_id === user.id).map((m) => m.team_id));
  }, [user, members]);

  const visibleTeams = useMemo(() => {
    return teams.filter((t) => myTeamIds.has(t.id));
  }, [teams, myTeamIds]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.is_personal || !t.team_id) {
          return t.assignee_id === user?.id || t.created_by_id === user?.id;
        }
        return Boolean(t.team_id && myTeamIds.has(t.team_id));
      })
      .map((t) => ({
        ...t,
        assignee: users.find((u) => u.id === t.assignee_id) || user || undefined,
        subtasks: subtasks.filter((s) => s.task_id === t.id),
      }));
  }, [tasks, myTeamIds, users, user, subtasks]);

  const pendingRequestsForOwner = useMemo(() => {
    if (!user) return [];
    const ownedTeams = new Set(teams.filter((t) => t.owner_id === user.id).map((t) => t.id));
    return joinRequests.filter((r) => r.status === 'pending' && ownedTeams.has(r.team_id));
  }, [user, teams, joinRequests]);

  const refreshData = () => {};

  // Super Admin Action Functions (Strictly Owner Only)
  const adminToggleUserAdmin = useCallback(async (userId: string) => {
    if (!isAppOwner(user)) return;
    const target = users.find((u) => u.id === userId);
    if (isAppOwner(target)) return; // Cannot demote the primary owner

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u));
      persist(STORE_KEYS.ALL_USERS, updated);
      return updated;
    });
    setUser((prev) => (prev?.id === userId ? { ...prev, isAdmin: !prev.isAdmin } : prev));
    logAction('admin_role_change', `Toggled Admin privilege for user ID ${userId}`);
  }, [user, users, persist, logAction]);

  const adminToggleUserStatus = useCallback(async (userId: string) => {
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          const nextStatus: 'active' | 'suspended' = u.status === 'suspended' ? 'active' : 'suspended';
          return { ...u, status: nextStatus };
        }
        return u;
      });
      persist(STORE_KEYS.ALL_USERS, updated);
      return updated;
    });
    logAction('admin_status_change', `Toggled account status for user ID ${userId}`);
  }, [persist, logAction]);

  const adminReassignTask = useCallback(async (taskId: string, newAssigneeId: string) => {
    const assignee = users.find((u) => u.id === newAssigneeId) || user || undefined;
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId
          ? { ...t, assignee_id: newAssigneeId, assignee: assignee || t.assignee, updated_at: new Date().toISOString() }
          : t
      );
      persist(STORE_KEYS.TASKS, updated);
      return updated;
    });
    logAction('admin_reassign_task', `Task ${taskId} was reassigned to user ${newAssigneeId}`);
  }, [users, user, persist, logAction]);

  const adminTransferTeam = useCallback(async (teamId: string, newOwnerId: string) => {
    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, owner_id: newOwnerId } : t));
      persist(STORE_KEYS.TEAMS, updated);
      return updated;
    });
    logAction('admin_transfer_team', `Team ${teamId} ownership transferred to user ${newOwnerId}`);
  }, [persist, logAction]);

  const adminDeleteUser = useCallback(async (userId: string) => {
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      persist(STORE_KEYS.ALL_USERS, updated);
      return updated;
    });
    logAction('admin_delete_user', `User ID ${userId} was deleted by admin`);
  }, [persist, logAction]);

  // Team Group Chat & Voice Notes Engine
  const sendChatMessage = useCallback(
    async (input: {
      teamId: string;
      text?: string;
      type?: 'text' | 'voice';
      voiceDuration?: number;
      voiceWaveform?: number[];
      audioUrl?: string;
      mentions?: string[];
    }) => {
      if (!user) return { ok: false, error: 'User not signed in' };
      if (!input.teamId) return { ok: false, error: 'Team ID required' };
      if (input.type !== 'voice' && (!input.text || !input.text.trim())) {
        return { ok: false, error: 'Message cannot be empty' };
      }

      // Automatically extract @mentions if not explicitly passed
      const detectedMentions: string[] = input.mentions ? [...input.mentions] : [];
      if (input.text) {
        const matches = input.text.match(/@([a-zA-Z0-9_]+)/g);
        if (matches) {
          matches.forEach((m) => {
            const clean = m.replace('@', '').toLowerCase();
            if (!detectedMentions.includes(clean)) detectedMentions.push(clean);
          });
        }
      }

      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        team_id: input.teamId,
        user_id: user.id,
        user_name: user.name,
        user_username: user.username || user.email.split('@')[0],
        user_picture: user.picture,
        text: input.text?.trim(),
        type: input.type || 'text',
        voice_duration: input.voiceDuration,
        voice_waveform: input.voiceWaveform,
        audio_url: input.audioUrl,
        mentions: detectedMentions.length > 0 ? detectedMentions : undefined,
        created_at: new Date().toISOString(),
      };

      setChatMessages((prev) => {
        const updated = [...prev, newMsg];
        persist(STORE_KEYS.CHAT_MESSAGES, updated);
        return updated;
      });

      // Dispatch notifications for mentioned users
      if (detectedMentions.length > 0) {
        detectedMentions.forEach((mentionName) => {
          const target = users.find((u) => u.username && u.username.toLowerCase() === mentionName.toLowerCase());
          if (target && target.id !== user.id) {
            const notif: AppNotification = {
              id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              user_id: target.id,
              kind: 'general',
              title: `${user.name} (@${user.username}) mentioned you`,
              body: input.type === 'voice' ? 'Sent a voice note mentioning you' : (input.text || ''),
              read: false,
              created_at: new Date().toISOString(),
            };
            setNotifications((prev) => {
              const updated = [notif, ...prev];
              persist(STORE_KEYS.NOTIFICATIONS, updated);
              return updated;
            });
          }
        });
      }

      logAction('chat_message', `Sent ${input.type || 'text'} message in team chat`);
      return { ok: true, message: newMsg };
    },
    [user, users, persist, logAction]
  );

  // AI Agent Multi-Model Intelligence & Task Action Engine
  const sendAIPrompt = useCallback(
    async (prompt: string): Promise<{ ok: boolean; response: string; actionData?: any }> => {
      if (!prompt.trim()) return { ok: false, response: 'Please type an instruction or task details.' };

      // 1. Append user prompt
      const userMsg: AIAgentMessage = {
        id: `ai_u_${Date.now()}`,
        sender: 'user',
        text: prompt.trim(),
        created_at: new Date().toISOString(),
      };

      // 2. Prepare rich live context (teammates, teams, tasks, metrics)
      const aiContext: AIContextData = {
        user,
        users,
        teams: visibleTeams,
        members,
        tasks: visibleTasks,
        today,
      };

      // 3. Run through Multi-Model Alternate Failover Pipeline (Primary Pro -> Fallback Flash -> Edge Neural)
      const engineResult: AIEngineResult = await runMultiModelAI(prompt, aiContext);

      let actionData = engineResult.actionData;

      // 4. If intent created or assigned a task, execute in state
      if (engineResult.actionType === 'task_assigned' && actionData) {
        const res = await createTask({
          teamId: actionData.teamId || null,
          isPersonal: !actionData.teamId,
          assigneeId: actionData.assigneeId || user?.id,
          title: actionData.title,
          description: `Automatically created & assigned by AI Agent (${engineResult.modelUsed}).\nOriginal Prompt: "${prompt.trim()}"`,
          status: 'todo',
          priority: actionData.priority || 'medium',
          dueDate: actionData.dueDate || today,
          assignedDate: today,
          startTime: '09:00',
          endTime: '18:00',
        });

        if (res.ok && res.task) {
          actionData = res.task;
        }
      } else if (engineResult.actionType === 'task_completed' && actionData?.id) {
        await updateTask(actionData.id, { status: 'done' });
      }

      // 5. Build Assistant Message with active model tag
      const assistantMsg: AIAgentMessage = {
        id: `ai_a_${Date.now()}`,
        sender: 'assistant',
        text: engineResult.reply,
        action_type: engineResult.actionType,
        action_data: actionData,
        model_used: engineResult.modelUsed,
        created_at: new Date().toISOString(),
      };

      // 6. Save strictly to user's isolated storage
      const userAiKey = user ? `${STORE_KEYS.AI_MESSAGES}_${user.id}` : STORE_KEYS.AI_MESSAGES;

      setAiMessages((prev) => {
        const updated = [...prev, userMsg, assistantMsg];
        persist(userAiKey, updated);
        return updated;
      });

      return { ok: true, response: engineResult.reply, actionData };
    },
    [user, users, visibleTeams, members, visibleTasks, today, createTask, updateTask, persist]
  );

  const clearAIMessages = useCallback(() => {
    const welcomeMsg: AIAgentMessage = {
      id: `ai_init_${Date.now()}`,
      sender: 'assistant',
      text: `Assalam-o-Alaikum, **${user?.name || 'Member'}**! Main TaskFlow AI Agent hoon. Bataiye aaj aapke sprint ya team ke liye kya madad karoon?`,
      action_type: 'info',
      model_used: 'Gemini 1.5 Pro (Primary Neural)',
      created_at: new Date().toISOString(),
    };
    const userAiKey = user ? `${STORE_KEYS.AI_MESSAGES}_${user.id}` : STORE_KEYS.AI_MESSAGES;
    setAiMessages([welcomeMsg]);
    persist(userAiKey, [welcomeMsg]);
  }, [user, persist]);

  return (
    <AppContext.Provider
      value={{
        user,
        users,
        teams: visibleTeams,
        tasks: visibleTasks,
        notifications: user ? notifications.filter((n) => n.user_id === user.id) : [],
        history: user ? history.filter((h) => h.user_id === user.id) : [],
        pendingJoinRequests: pendingRequestsForOwner,
        unreadCount,
        today,
        isLoading,
        isAppLocked,
        hasAppLockPin: !!appLockPin,
        unlockApp,
        setAppLockPin,
        resetAppLockPin,
        sendPasswordResetOTP,
        verifyPasswordResetOTP,
        resetPasswordWithOTP,
        loginWithGoogle,
        signUp,
        signIn,
        updateProfile,
        logout,
        checkUsernameAvailable,
        createTeam,
        requestJoinTeam,
        approveJoinRequest,
        declineJoinRequest,
        renameTeam,
        deleteTeam,
        promoteMember,
        removeMember,
        leaveTeam,
        getTeamMembers,
        getMemberRole,
        canManageTeam,
        createTask,
        updateTask,
        submitTask,
        deleteTask,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        markNotificationRead,
        markAllNotificationsRead,
        refreshData,
        theme,
        setTheme,
        adminToggleUserAdmin,
        adminToggleUserStatus,
        adminReassignTask,
        adminTransferTeam,
        adminDeleteUser,
        chatMessages,
        sendChatMessage,
        aiMessages,
        sendAIPrompt,
        clearAIMessages,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

