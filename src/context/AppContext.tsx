import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import {
  Profile,
  Team,
  TeamMember,
  Task,
  TaskAttachment,
  Subtask,
  AppNotification,
  JoinRequest,
  ActivityLog,
  TaskStatus,
  TaskPriority,
  Role,
  ChatMessage,
  AIAgentMessage,
  TeammateConnection,
} from '../types/database';
import { AppThemeKey } from '../constants/theme';
import { runMultiModelAI, AIContextData, AIEngineResult } from '../lib/aiAgentEngine';
import { triggerDeviceNotification, requestNotificationPermissions, registerForExpoPushToken } from '../lib/deviceNotifications';
import { uploadCloudMedia } from '../lib/cloudMedia';
import { CONFIG } from '../constants/config';

/**
 * Strict Super Admin & App Ownership Check:
 * ONLY the owner (Ali Raza, aliraza.lead@gmail.com) has access to the Admin Panel.
 */
export const isAppOwner = (u?: Profile | null): boolean => {
  if (!u || !u.email) return false;
  return u.email.toLowerCase().trim() === 'aliraza.lead@gmail.com';
};

interface DeletedIdsState {
  teams: string[];
  members: string[];
  tasks: string[];
  subtasks: string[];
  messages: string[];
}

const EMPTY_DELETED_IDS: DeletedIdsState = {
  teams: [],
  members: [],
  tasks: [],
  subtasks: [],
  messages: [],
};

const addTombstoneId = (list: string[], id: string): string[] => {
  if (!id || list.includes(id)) return list;
  return [...list, id].slice(-500);
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
  attachments?: TaskAttachment[];
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
  resetPasswordWithOTP: (
    email: string,
    code: string,
    newPin: string,
    target?: 'account' | 'applock'
  ) => Promise<{ ok: boolean; error?: string }>;
  // Auth
  loginWithGoogle: (profile: Partial<Profile>) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (patch: {
    name?: string;
    picture?: string;
    username?: string;
    bio?: string;
    job_title?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  // Username validation helper
  checkUsernameAvailable: (username: string, excludeUserId?: string) => boolean;
  // Teams (Team Leader Controls)
  createTeam: (input: CreateTeamInput) => Promise<{ ok: boolean; team?: Team; error?: string }>;
  requestJoinTeam: (input: JoinTeamInput) => Promise<{ ok: boolean; team?: Team; pendingApproval?: boolean; error?: string }>;
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
  refreshData: () => Promise<void>;
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
  isAIAssistantOpen: boolean;
  openAIAssistant: () => void;
  closeAIAssistant: () => void;
  // Teammate Member-to-Member Connections
  connections: TeammateConnection[];
  sendTeammateRequest: (toUserId: string) => Promise<{ ok: boolean; error?: string }>;
  acceptTeammateRequest: (connectionId: string) => Promise<{ ok: boolean; error?: string }>;
  declineTeammateRequest: (connectionId: string) => Promise<{ ok: boolean; error?: string }>;
  getConnectionStatus: (otherUserId: string) => 'none' | 'pending_sent' | 'pending_received' | 'connected';
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
  CONNECTIONS: 'tf_connections',
  APP_LOCK_PIN: 'tf_app_lock_pin',
  THEME: 'tf_theme',
  CHAT_MESSAGES: 'tf_chat_messages',
  AI_MESSAGES: 'tf_ai_messages',
  DELETED_IDS: 'tf_deleted_ids',
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
  const [connections, setConnections] = useState<TeammateConnection[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AIAgentMessage[]>([]);
  const [deletedIds, setDeletedIds] = useState<DeletedIdsState>(EMPTY_DELETED_IDS);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const deletedIdsRef = useRef<DeletedIdsState>(EMPTY_DELETED_IDS);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const notifiedChatIdsRef = useRef<Set<string>>(new Set());
  const currentUserRef = useRef<Profile | null>(null);
  currentUserRef.current = user;

  const openAIAssistant = useCallback(() => setIsAIAssistantOpen(true), []);
  const closeAIAssistant = useCallback(() => setIsAIAssistantOpen(false), []);

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

      // Purge any legacy seed/test fixtures from device storage so only real workspace data persists
      const LEGACY_TEAM_IDS = new Set(['team_sprint_alpha', 'team_test1', 'team_7dp9vu']);
      const LEGACY_USER_IDS = new Set([
        'user_1',
        'user_friend_1',
        'user_seed_ali',
        'user_seed_sarah',
        'user_seed_hamza',
        'user_seed_zainab',
      ]);

      const rawUsers = await secureGet(STORE_KEYS.ALL_USERS);
      let loadedUsers: Profile[] = [];
      if (rawUsers) {
        const parsed: Profile[] = JSON.parse(rawUsers);
        loadedUsers = parsed
          .filter(
            (u) =>
              u &&
              !LEGACY_USER_IDS.has(u.id) &&
              u.email?.toLowerCase() !== 'zohaib@example.com'
          )
          .map((u, idx) => {
            const owner = isAppOwner(u);
            if (!u.username) {
              const base = (u.name || u.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '_');
              return { ...u, username: `${base}_${idx + 1}`, isAdmin: owner };
            }
            return { ...u, isAdmin: owner };
          });
        if (loadedUsers.length !== parsed.length) {
          await secureSet(STORE_KEYS.ALL_USERS, JSON.stringify(loadedUsers));
        }
      }
      setUsers(loadedUsers);

      const savedUser = await secureGet(STORE_KEYS.USER);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && LEGACY_USER_IDS.has(parsed.id) && parsed.email !== 'aliraza.lead@gmail.com') {
            await secureSet(STORE_KEYS.USER, '');
          } else if (parsed && parsed.email) {
            if (!parsed.username) {
              parsed.username = (parsed.name || parsed.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '_');
            }
            parsed.isAdmin = isAppOwner(parsed);
            setUser(parsed);
          }
        } catch {}
      }

      const rawPasswords = await secureGet(STORE_KEYS.USER_PASSWORDS);
      if (rawPasswords) {
        setUserPasswords(JSON.parse(rawPasswords));
      }

      const rawTeams = await secureGet(STORE_KEYS.TEAMS);
      if (rawTeams) {
        const parsedTeams: Team[] = JSON.parse(rawTeams);
        const cleanTeams = parsedTeams.filter(
          (t) =>
            t &&
            !LEGACY_TEAM_IDS.has(t.id) &&
            t.owner_id !== 'leader_remote' &&
            t.name !== 'Core Product & AI Sprint' &&
            t.name !== 'Test Team'
        );
        setTeams(cleanTeams);
        if (cleanTeams.length !== parsedTeams.length) {
          await secureSet(STORE_KEYS.TEAMS, JSON.stringify(cleanTeams));
        }
      }

      const rawMembers = await secureGet(STORE_KEYS.MEMBERS);
      if (rawMembers) {
        const parsedMembers: TeamMember[] = JSON.parse(rawMembers);
        const cleanMembers = parsedMembers.filter(
          (m) => m && !LEGACY_TEAM_IDS.has(m.team_id) && !LEGACY_USER_IDS.has(m.user_id)
        );
        setMembers(cleanMembers);
        if (cleanMembers.length !== parsedMembers.length) {
          await secureSet(STORE_KEYS.MEMBERS, JSON.stringify(cleanMembers));
        }
      }

      const rawTasks = await secureGet(STORE_KEYS.TASKS);
      if (rawTasks) {
        const parsedTasks: Task[] = JSON.parse(rawTasks);
        const cleanTasks = parsedTasks.filter((t) => t && !LEGACY_TEAM_IDS.has(t.team_id || ''));
        setTasks(cleanTasks);
      }

      const rawSubtasks = await secureGet(STORE_KEYS.SUBTASKS);
      if (rawSubtasks) setSubtasks(JSON.parse(rawSubtasks));

      const rawNotifs = await secureGet(STORE_KEYS.NOTIFICATIONS);
      if (rawNotifs) {
        const parsedNotifs: AppNotification[] = JSON.parse(rawNotifs);
        const cleanNotifs = parsedNotifs.filter((n) => n && !LEGACY_USER_IDS.has(n.user_id));
        setNotifications(cleanNotifs);
        cleanNotifs.forEach((n) => notifiedIdsRef.current.add(n.id));
      }

      const rawDeleted = await secureGet(STORE_KEYS.DELETED_IDS);
      if (rawDeleted) {
        try {
          const parsedDel = JSON.parse(rawDeleted);
          const cleanDel: DeletedIdsState = {
            teams: Array.isArray(parsedDel?.teams) ? parsedDel.teams.slice(-500) : [],
            members: Array.isArray(parsedDel?.members) ? parsedDel.members.slice(-500) : [],
            tasks: Array.isArray(parsedDel?.tasks) ? parsedDel.tasks.slice(-500) : [],
            subtasks: Array.isArray(parsedDel?.subtasks) ? parsedDel.subtasks.slice(-500) : [],
            messages: Array.isArray(parsedDel?.messages) ? parsedDel.messages.slice(-500) : [],
          };
          deletedIdsRef.current = cleanDel;
          setDeletedIds(cleanDel);
        } catch {}
      }

      const rawHistory = await secureGet(STORE_KEYS.HISTORY);
      if (rawHistory) setHistory(JSON.parse(rawHistory));

      const rawRequests = await secureGet(STORE_KEYS.JOIN_REQUESTS);
      if (rawRequests) {
        const parsedReqs: JoinRequest[] = JSON.parse(rawRequests);
        setJoinRequests(parsedReqs.filter((r) => r && !LEGACY_TEAM_IDS.has(r.team_id) && !LEGACY_USER_IDS.has(r.user_id)));
      }

      const rawConnections = await secureGet(STORE_KEYS.CONNECTIONS);
      if (rawConnections) setConnections(JSON.parse(rawConnections));

      const rawChat = await secureGet(STORE_KEYS.CHAT_MESSAGES);
      if (rawChat) {
        const parsedChat: ChatMessage[] = JSON.parse(rawChat);
        const cleanChat = parsedChat.filter(
          (m) => m && !LEGACY_TEAM_IDS.has(m.team_id) && !String(m.id || '').startsWith('msg_seed_')
        );
        setChatMessages(cleanChat);
        cleanChat.forEach((m) => notifiedChatIdsRef.current.add(m.id));
        if (cleanChat.length !== parsedChat.length) {
          await secureSet(STORE_KEYS.CHAT_MESSAGES, JSON.stringify(cleanChat));
        }
      }

      const rawAi = await secureGet(STORE_KEYS.AI_MESSAGES);
      if (rawAi) {
        setAiMessages(JSON.parse(rawAi));
      } else {
        const welcomeAi: AIAgentMessage = {
          id: 'ai_welcome_init',
          sender: 'assistant',
          text: 'Assalam-o-Alaikum! Main TaskFlow ka Smart AI Agent hoon 🤖\n\nAap mujhse natural language mein task create ya kisi bhi teammate ko assign karwa sakte hain. Misal:\n• "Assign @teammate high priority UI review task due today"\n• "Create task API Integration due tomorrow"\n• "Kaam ka status batao" ya "Complete UI task"\n\nBataiye main aapki kya madad karoon?',
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
        text: `Assalam-o-Alaikum, **${user.name}**! 👋\n\nMain TaskFlow ka Multi-Model AI Agent hoon. Mujhe aapke portal, team members, sprint tasks aur schedules ki complete knowledge hai.\n\nAap mujhse natural language mein koi bhi sawaal pooch sakte hain ya task assign karwa sakte hain.\n\n• *"Hamari team mein kaun kaun hai aur unke roles kya hain?"*\n• *"Mera aaj ka kya kaam due hai?"*\n• *"Create urgent task QA Review due today"*`,
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

  const recordTombstone = useCallback(
    async (category: keyof DeletedIdsState, id: string) => {
      if (!id) return;
      const next: DeletedIdsState = {
        ...deletedIdsRef.current,
        [category]: addTombstoneId(deletedIdsRef.current[category], id),
      };
      deletedIdsRef.current = next;
      setDeletedIds(next);
      await persist(STORE_KEYS.DELETED_IDS, next);
    },
    [persist]
  );

  const applyCloudState = useCallback(
    (state: any) => {
      if (!state) return;

      const srvDel = state.deletedIds || EMPTY_DELETED_IDS;
      const nextDel: DeletedIdsState = {
        teams: Array.from(new Set([...deletedIdsRef.current.teams, ...(Array.isArray(srvDel.teams) ? srvDel.teams : [])])).slice(-500),
        members: Array.from(new Set([...deletedIdsRef.current.members, ...(Array.isArray(srvDel.members) ? srvDel.members : [])])).slice(-500),
        tasks: Array.from(new Set([...deletedIdsRef.current.tasks, ...(Array.isArray(srvDel.tasks) ? srvDel.tasks : [])])).slice(-500),
        subtasks: Array.from(new Set([...deletedIdsRef.current.subtasks, ...(Array.isArray(srvDel.subtasks) ? srvDel.subtasks : [])])).slice(-500),
        messages: Array.from(new Set([...deletedIdsRef.current.messages, ...(Array.isArray(srvDel.messages) ? srvDel.messages : [])])).slice(-500),
      };
      deletedIdsRef.current = nextDel;
      setDeletedIds(nextDel);
      persist(STORE_KEYS.DELETED_IDS, nextDel);

      const delTeams = new Set(nextDel.teams);
      const delMembers = new Set(nextDel.members);
      const delTasks = new Set(nextDel.tasks);
      const delSubtasks = new Set(nextDel.subtasks);

      if (Array.isArray(state.teams)) {
        setTeams((prev) => {
          const map = new Map<string, Team>();
          prev.forEach((t) => {
            if (!delTeams.has(t.id) && t.owner_id !== 'leader_remote') map.set(t.id, t);
          });
          state.teams.forEach((t: Team) => {
            if (t && !delTeams.has(t.id) && t.owner_id !== 'leader_remote') map.set(t.id, t);
          });
          const merged = Array.from(map.values());
          persist(STORE_KEYS.TEAMS, merged);
          return merged;
        });
      }
      if (Array.isArray(state.members)) {
        setMembers((prev) => {
          const map = new Map<string, TeamMember>();
          prev.forEach((m) => {
            const k = `${m.team_id}_${m.user_id}`;
            if (!delMembers.has(k) && !delTeams.has(m.team_id)) map.set(k, m);
          });
          state.members.forEach((m: TeamMember) => {
            if (!m) return;
            const k = `${m.team_id}_${m.user_id}`;
            if (!delMembers.has(k) && !delTeams.has(m.team_id)) map.set(k, m);
          });
          const merged = Array.from(map.values());
          persist(STORE_KEYS.MEMBERS, merged);
          return merged;
        });
      }
      if (Array.isArray(state.tasks)) {
        setTasks((prev) => {
          const map = new Map<string, Task>();
          prev.forEach((t) => {
            if (!delTasks.has(t.id) && (!t.team_id || !delTeams.has(t.team_id))) map.set(t.id, t);
          });
          state.tasks.forEach((t: Task) => {
            if (!t || delTasks.has(t.id) || (t.team_id && delTeams.has(t.team_id))) return;
            const cur = map.get(t.id);
            if (!cur || new Date(t.updated_at || t.created_at).getTime() >= new Date(cur.updated_at || cur.created_at).getTime()) {
              map.set(t.id, t);
            }
          });
          const merged = Array.from(map.values());
          persist(STORE_KEYS.TASKS, merged);
          return merged;
        });
      }
      if (Array.isArray(state.subtasks)) {
        setSubtasks((prev) => {
          const map = new Map<string, Subtask>();
          prev.forEach((s) => {
            if (!delSubtasks.has(s.id) && !delTasks.has(s.task_id)) map.set(s.id, s);
          });
          state.subtasks.forEach((s: Subtask) => {
            if (s && !delSubtasks.has(s.id) && !delTasks.has(s.task_id)) map.set(s.id, s);
          });
          const merged = Array.from(map.values());
          persist(STORE_KEYS.SUBTASKS, merged);
          return merged;
        });
      }
      if (Array.isArray(state.chatMessages)) {
        const activeUserId = currentUserRef.current?.id;
        const myTeamIdsSet = new Set(
          (Array.isArray(state.members) ? state.members : latestSyncSnapshotRef.current.members)
            .filter((m: TeamMember) => m && m.user_id === activeUserId)
            .map((m: TeamMember) => m.team_id)
        );
        const teamsLookup: Team[] = Array.isArray(state.teams) ? state.teams : latestSyncSnapshotRef.current.teams;

        state.chatMessages.forEach((m: ChatMessage) => {
          if (
            m &&
            activeUserId &&
            m.user_id !== activeUserId &&
            m.user_id !== 'system' &&
            !String(m.id || '').startsWith('msg_seed_') &&
            myTeamIdsSet.has(m.team_id) &&
            !notifiedChatIdsRef.current.has(m.id)
          ) {
            notifiedChatIdsRef.current.add(m.id);
            const tName = teamsLookup.find((t) => t.id === m.team_id)?.name || 'Team Chat';
            triggerDeviceNotification({
              title: `💬 ${tName}`,
              body: `${m.user_name}: ${m.type === 'voice' ? '🎤 Sent a voice note' : (m.text || '')}`,
              data: { kind: 'chat_message', teamId: m.team_id },
            }).catch(() => {});
          } else if (m?.id) {
            notifiedChatIdsRef.current.add(m.id);
          }
        });

        setChatMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => {
            if (!delTeams.has(m.team_id) && !String(m.id || '').startsWith('msg_seed_')) map.set(m.id, m);
          });
          state.chatMessages.forEach((m: ChatMessage) => {
            if (m && !delTeams.has(m.team_id) && !String(m.id || '').startsWith('msg_seed_')) map.set(m.id, m);
          });
          const merged = Array.from(map.values())
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(-500);
          persist(STORE_KEYS.CHAT_MESSAGES, merged);
          return merged;
        });
      }
      if (Array.isArray(state.joinRequests)) {
        setJoinRequests((prev) => {
          const map = new Map<string, JoinRequest>();
          prev.forEach((r) => {
            if (!delTeams.has(r.team_id)) map.set(r.id, r);
          });
          state.joinRequests.forEach((r: JoinRequest) => {
            if (r && !delTeams.has(r.team_id)) map.set(r.id, r);
          });
          const merged = Array.from(map.values());
          persist(STORE_KEYS.JOIN_REQUESTS, merged);
          return merged;
        });
      }
      if (Array.isArray(state.connections)) {
        setConnections((prev) => {
          const map = new Map<string, TeammateConnection>();
          prev.forEach((c) => map.set(c.id, c));
          state.connections.forEach((c: TeammateConnection) => map.set(c.id, c));
          const merged = Array.from(map.values());
          persist(STORE_KEYS.CONNECTIONS, merged);
          return merged;
        });
      }
      if (Array.isArray(state.notifications)) {
        const activeUserId = currentUserRef.current?.id;
        state.notifications.forEach((n: AppNotification) => {
          if (n && activeUserId && n.user_id === activeUserId && !n.read && !notifiedIdsRef.current.has(n.id)) {
            notifiedIdsRef.current.add(n.id);
            triggerDeviceNotification({
              title: n.title,
              body: n.body,
              data: {
                kind: n.kind,
                taskId: n.related_task_id,
                teamId: n.related_team_id,
                joinRequestId: n.related_join_request_id,
                connectionId: n.related_connection_id,
              },
            }).catch(() => {});
          }
        });
        setNotifications((prev) => {
          const map = new Map<string, AppNotification>();
          prev.forEach((n) => {
            notifiedIdsRef.current.add(n.id);
            map.set(n.id, n);
          });
          state.notifications.forEach((n: AppNotification) => {
            if (!n) return;
            notifiedIdsRef.current.add(n.id);
            const cur = map.get(n.id);
            map.set(n.id, cur ? { ...n, read: Boolean(cur.read || n.read) } : n);
          });
          const merged = Array.from(map.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 400);
          persist(STORE_KEYS.NOTIFICATIONS, merged);
          return merged;
        });
      }
      if (Array.isArray(state.users)) {
        setUsers((prev) => {
          const map = new Map<string, Profile>();
          prev.forEach((u) => map.set(u.id, u));
          state.users.forEach((u: Profile) => {
            if (u) map.set(u.id, { ...u, isAdmin: isAppOwner(u) });
          });
          const merged = Array.from(map.values());
          persist(STORE_KEYS.ALL_USERS, merged);
          return merged;
        });
        const me = currentUserRef.current;
        if (me) {
          const serverMe = state.users.find(
            (u: Profile) => u.id === me.id || (u.email && me.email && u.email.toLowerCase() === me.email.toLowerCase())
          );
          if (serverMe) {
            if (serverMe.status === 'suspended') {
              setUser(null);
              secureSet(STORE_KEYS.USER, '');
            } else {
              const syncedMe = { ...me, ...serverMe, isAdmin: isAppOwner(serverMe) };
              if (
                syncedMe.name !== me.name ||
                syncedMe.username !== me.username ||
                syncedMe.picture !== me.picture ||
                syncedMe.bio !== me.bio ||
                syncedMe.job_title !== me.job_title ||
                syncedMe.isAdmin !== me.isAdmin
              ) {
                setUser(syncedMe);
                persist(STORE_KEYS.USER, syncedMe);
              }
            }
          }
        }
      }
    },
    [persist]
  );

  const syncCloudState = useCallback(
    async (action?: string, payload?: any) => {
      try {
        const response = await fetch(CONFIG.SYNC_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: action || 'MERGE', payload: payload || {} }),
        });
        let data: any = null;
        try {
          data = await response.json();
        } catch {}
        if (response.ok) {
          if (data && data.state) {
            applyCloudState(data.state);
          }
          return data;
        }
        return data && typeof data === 'object'
          ? { ok: false, ...data }
          : { ok: false, error: `Server error (${response.status})` };
      } catch (_) {
        // Offline resilience
      }
      return null;
    },
    [applyCloudState]
  );

  const latestSyncSnapshotRef = useRef({
    teams,
    members,
    tasks,
    subtasks,
    chatMessages,
    joinRequests,
    connections,
    notifications,
    users,
    deletedIds,
  });
  latestSyncSnapshotRef.current = {
    teams,
    members,
    tasks,
    subtasks,
    chatMessages,
    joinRequests,
    connections,
    notifications,
    users,
    deletedIds,
  };
  const mergedUserIdRef = useRef<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`${CONFIG.SYNC_API_URL}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          applyCloudState(data.state);
        }
      }
    } catch (_) {}
  }, [applyCloudState]);

  // Background Cloud Sync, Foreground Resume & Auto-Refresh Polling (Multi-Device Real-Time Sync)
  useEffect(() => {
    if (!user || isLoading) {
      if (!user) mergedUserIdRef.current = null;
      return;
    }

    requestNotificationPermissions().catch(() => {});
    registerForExpoPushToken()
      .then((pushToken) => {
        if (pushToken && user.expo_push_token !== pushToken) {
          syncCloudState('REGISTER_PUSH_TOKEN', { userId: user.id, token: pushToken }).catch(() => {});
        }
      })
      .catch(() => {});

    if (mergedUserIdRef.current !== user.id) {
      mergedUserIdRef.current = user.id;
      const snap = latestSyncSnapshotRef.current;
      const validTeams = snap.teams.filter((t) => t.owner_id !== 'leader_remote');
      syncCloudState('MERGE', {
        teams: validTeams,
        members: snap.members,
        tasks: snap.tasks,
        subtasks: snap.subtasks,
        chatMessages: snap.chatMessages,
        joinRequests: snap.joinRequests,
        connections: snap.connections,
        notifications: snap.notifications,
        users: snap.users,
        deletedIds: snap.deletedIds,
      });
    }

    const pollTimer = setInterval(() => {
      refreshData();
    }, 4000);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshData();
      }
    });

    return () => {
      clearInterval(pollTimer);
      appStateSub.remove();
    };
  }, [user, isLoading, syncCloudState, refreshData]);

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

      // Check local users first, then pull latest cloud registry if needed
      let matchedUser =
        users.find((u) => u.email.toLowerCase() === cleanEmail) ||
        (user?.email?.toLowerCase() === cleanEmail ? user : null);

      if (!matchedUser) {
        try {
          const res = await fetch(`${CONFIG.SYNC_API_URL}?t=${Date.now()}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.state) {
              applyCloudState(data.state);
              const cloudUsers: Profile[] = Array.isArray(data.state.users) ? data.state.users : [];
              matchedUser = cloudUsers.find((u) => u.email?.toLowerCase() === cleanEmail) || null;
            }
          }
        } catch {}
      }

      if (!matchedUser) {
        return {
          ok: false,
          error: `No TaskFlow account found with email "${cleanEmail}". Please check your email or sign in with Google.`,
        };
      }

      // Generate a 6-digit OTP code
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
      notifiedIdsRef.current.add(resetNotif.id);

      setNotifications((prev) => {
        const updated = [resetNotif, ...prev];
        persist(STORE_KEYS.NOTIFICATIONS, updated);
        return updated;
      });

      return { ok: true, code };
    },
    [users, user, persist, applyCloudState]
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
    async (
      email: string,
      code: string,
      newPin: string,
      target: 'account' | 'applock' = 'account'
    ): Promise<{ ok: boolean; error?: string }> => {
      const verification = verifyPasswordResetOTP(email, code);
      if (!verification.ok) {
        return verification;
      }

      if (!newPin || newPin.length < 4) {
        return { ok: false, error: 'Password must be at least 4 characters long.' };
      }

      const cleanEmail = email.trim().toLowerCase();

      if (target === 'applock') {
        await secureSet(STORE_KEYS.APP_LOCK_PIN, newPin);
        setAppLockPinState(newPin);
        setIsAppLocked(false);
        setPendingPasswordReset(null);
        logAction('app_lock_reset', `App lock password was reset via email OTP for ${cleanEmail}`);
        return { ok: true };
      }

      // Update account password in cloud database
      const cloudRes = await syncCloudState('RESET_USER_PASSWORD', {
        email: cleanEmail,
        newPassword: newPin,
      });
      if (cloudRes && !cloudRes.ok) {
        return { ok: false, error: cloudRes.error || 'Failed to reset password on server.' };
      }

      // Update local account password cache
      const updatedPasswords = { ...userPasswords, [cleanEmail]: newPin };
      setUserPasswords(updatedPasswords);
      await persist(STORE_KEYS.USER_PASSWORDS, updatedPasswords);

      setPendingPasswordReset(null);
      logAction('password_reset_otp', `Account password successfully reset via email OTP for ${cleanEmail}`);
      return { ok: true };
    },
    [verifyPasswordResetOTP, userPasswords, persist, logAction, syncCloudState]
  );

  // Auth Functions
  const loginWithGoogle = async (profileData: Partial<Profile>) => {
    const email = profileData.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) return { ok: false, error: 'Valid Google email is required' };

    const existing = users.find((u) => u.email.toLowerCase() === email);
    const isOwner = isAppOwner({ email } as Profile);
    const generatedUsername = generateUniqueUsername(profileData.name || '', email, users, existing?.id);

    const candidateProfile: Profile = existing
      ? {
          ...existing,
          google_id: profileData.google_id || existing.google_id,
          username: existing.username || generatedUsername,
          name: profileData.name || existing.name,
          picture: profileData.picture || existing.picture,
          isAdmin: isOwner,
          status: existing.status || 'active',
        }
      : {
          id: profileData.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

    const cloudRes = await syncCloudState('GOOGLE_LOGIN', { profile: candidateProfile });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Google authentication was rejected by server.' };
    }

    const rawResolved = cloudRes?.user || candidateProfile;
    const profileToUse: Profile = {
      ...rawResolved,
      isAdmin: isAppOwner(rawResolved),
    };

    if (profileToUse.status === 'suspended') {
      return { ok: false, error: 'This account has been suspended by the Workspace Admin.' };
    }

    setUser(profileToUse);
    await persist(STORE_KEYS.USER, profileToUse);

    const hasExisting = users.some((u) => u.id === profileToUse.id || u.email.toLowerCase() === email);
    const updatedUsers = hasExisting
      ? users.map((u) => (u.id === profileToUse.id || u.email.toLowerCase() === email ? profileToUse : u))
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

    const generatedUsername = generateUniqueUsername(cleanName, cleanEmail, users);
    const draftProfile: Profile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      google_id: `local_${Date.now()}`,
      name: cleanName,
      username: generatedUsername,
      email: cleanEmail,
      email_verified: true,
      created_at: new Date().toISOString(),
      isAdmin: isAppOwner({ email: cleanEmail } as Profile),
      status: 'active',
    };

    const cloudRes = await syncCloudState('REGISTER_USER', {
      profile: draftProfile,
      password,
    });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Account with this email already exists. Please Sign In.' };
    }

    if (!cloudRes) {
      const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existingUser) return { ok: false, error: 'Account with this email already exists. Please Sign In.' };
    }

    const newProfile: Profile = cloudRes?.user
      ? { ...cloudRes.user, isAdmin: isAppOwner(cloudRes.user) }
      : draftProfile;

    const updatedPasswords = { ...userPasswords, [cleanEmail]: password };
    setUserPasswords(updatedPasswords);
    await persist(STORE_KEYS.USER_PASSWORDS, updatedPasswords);

    setUser(newProfile);
    await persist(STORE_KEYS.USER, newProfile);

    const updatedUserList = [...users.filter((u) => u.email.toLowerCase() !== cleanEmail), newProfile];
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

    const cloudRes = await syncCloudState('LOGIN_USER', {
      email: cleanEmail,
      password,
    });

    if (cloudRes) {
      if (!cloudRes.ok) {
        return { ok: false, error: cloudRes.error || 'Invalid email or password. Please check your credentials.' };
      }

      const rawUser =
        cloudRes.user ||
        (Array.isArray(cloudRes.state?.users)
          ? cloudRes.state.users.find((u: Profile) => u.email?.toLowerCase() === cleanEmail)
          : null);

      if (!rawUser) {
        return { ok: false, error: 'No account found. Please Sign Up first.' };
      }

      const authenticatedUser: Profile = {
        ...rawUser,
        isAdmin: isAppOwner(rawUser),
      };

      const updatedPasswords = { ...userPasswords, [cleanEmail]: password };
      setUserPasswords(updatedPasswords);
      await persist(STORE_KEYS.USER_PASSWORDS, updatedPasswords);

      setUser(authenticatedUser);
      await persist(STORE_KEYS.USER, authenticatedUser);
      logAction('signin', `Signed in with ${cleanEmail}`);
      return { ok: true };
    }

    // Offline fallback only when server is unreachable
    const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!existingUser) return { ok: false, error: 'No account found. Please Sign Up first.' };
    if (existingUser.status === 'suspended') {
      return { ok: false, error: 'This account has been suspended by the Workspace Admin.' };
    }

    const savedPassword = userPasswords[cleanEmail];
    if (!savedPassword || savedPassword !== password) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }

    const syncedExisting: Profile = { ...existingUser, isAdmin: isAppOwner(existingUser) };
    setUser(syncedExisting);
    await persist(STORE_KEYS.USER, syncedExisting);
    logAction('signin', `Signed in offline with ${cleanEmail}`);
    return { ok: true };
  };

  // Update profile (name, picture, unique username, bio, job_title)
  const updateProfile = async (patch: {
    name?: string;
    picture?: string;
    username?: string;
    bio?: string;
    job_title?: string;
  }) => {
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

    let nextPicture = patch.picture;
    if (nextPicture && nextPicture.startsWith('data:')) {
      const uploadedUrl = await uploadCloudMedia(nextPicture, {
        folder: 'avatars',
        extension: 'jpg',
        contentType: 'image/jpeg',
      });
      if (uploadedUrl) {
        nextPicture = uploadedUrl;
      }
    }

    const cleanPatch = {
      ...(patch.name !== undefined && patch.name.trim() ? { name: patch.name.trim() } : {}),
      ...(nextPicture !== undefined ? { picture: nextPicture } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio.trim() } : {}),
      ...(patch.job_title !== undefined ? { job_title: patch.job_title.trim() } : {}),
      username: cleanedUsername,
    };

    const cloudRes = await syncCloudState('UPDATE_PROFILE', {
      userId: user.id,
      patch: cleanPatch,
    });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to update profile.' };
    }

    const updatedUser: Profile = cloudRes?.user
      ? { ...cloudRes.user, isAdmin: isAppOwner(cloudRes.user) }
      : {
          ...user,
          ...cleanPatch,
          isAdmin: isAppOwner(user),
        };

    setUser(updatedUser);
    await persist(STORE_KEYS.USER, updatedUser);

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

    // Prevent duplicate team names
    const nameExists = teams.some(
      (t) => t.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (nameExists) {
      return {
        ok: false,
        error: `Team name "${name}" is already registered. Please choose a different team name.`,
      };
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const teamId = `team_${inviteCode.toLowerCase()}`;

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

    // Await Cloud Database creation so duplicate names across devices are strictly rejected
    const cloudRes = await syncCloudState('CREATE_TEAM', { team: newTeam, member: newMember });
    if (cloudRes && cloudRes.ok === false) {
      return {
        ok: false,
        error: cloudRes.error || `Team name "${name}" is already registered. Please choose a different team name.`,
      };
    }

    const updatedTeams = [...teams.filter((t) => t.id !== newTeam.id), newTeam];
    const updatedMembers = [...members.filter((m) => !(m.team_id === teamId && m.user_id === user.id)), newMember];

    setTeams(updatedTeams);
    setMembers(updatedMembers);
    await persist(STORE_KEYS.TEAMS, updatedTeams);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    logAction('create_team', `Created team "${name}" as Leader`);
    return { ok: true, team: newTeam };
  };

  const requestJoinTeam = async (
    input: JoinTeamInput
  ): Promise<{ ok: boolean; team?: Team; pendingApproval?: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Must be logged in' };

    const cleanName = input.teamName.trim();
    const cleanCode = input.inviteCode.trim().toUpperCase();
    const cleanPass = input.joinPassword.trim();

    if (!cleanName && !cleanCode) return { ok: false, error: 'Team name or 6-digit invite code is required' };
    if (!cleanPass) return { ok: false, error: 'Team access password is required' };

    // 1. Direct Cloud Lookup & Join Request via Serverless API
    const cloudRes = await syncCloudState('REQUEST_JOIN', {
      teamName: cleanName,
      inviteCode: cleanCode,
      joinPassword: cleanPass,
      user,
    });

    if (cloudRes) {
      if (!cloudRes.ok) {
        return { ok: false, error: cloudRes.error || 'Failed to join team' };
      }

      if (cloudRes.team) {
        const targetTeam = cloudRes.team;
        // Clean out any old dummy teams with leader_remote and save the verified cloud team
        setTeams((prev) => {
          const filtered = prev.filter((t) => t.id !== targetTeam.id && t.owner_id !== 'leader_remote');
          const updated = [...filtered, targetTeam];
          persist(STORE_KEYS.TEAMS, updated);
          return updated;
        });

        if (cloudRes.alreadyMember) {
          return { ok: true, team: targetTeam };
        }

        if (cloudRes.pendingApproval) {
          return { ok: true, team: targetTeam, pendingApproval: true };
        }

        return { ok: true, team: targetTeam };
      }
    }

    // 2. Offline Resilience: Match by existing local teams
    let targetTeam = teams.find(
      (t) => (t.invite_code && t.invite_code.trim().toUpperCase() === cleanCode) ||
             (t.name && t.name.trim().toLowerCase() === cleanName.toLowerCase())
    );

    if (!targetTeam) {
      return {
        ok: false,
        error: `Workspace not found. Please verify the 6-digit invite code (${cleanCode}) or check your internet connection.`,
      };
    }

    const storedPass = (targetTeam.join_password || '').trim();
    if (storedPass && storedPass !== cleanPass && storedPass.toLowerCase() !== cleanPass.toLowerCase()) {
      return { ok: false, error: 'Team access password is incorrect. Please check the password provided by your Team Leader.' };
    }

    const alreadyMember = members.some((m) => m.team_id === targetTeam.id && m.user_id === user.id);
    if (alreadyMember) {
      return { ok: true, team: targetTeam };
    }

    return { ok: true, team: targetTeam, pendingApproval: true };
  };

  const approveJoinRequest = async (requestId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const req = joinRequests.find((r) => r.id === requestId);
    if (!req) return { ok: false, error: 'Request not found' };
    if (req.status !== 'pending') return { ok: true };

    const team = teams.find((t) => t.id === req.team_id);
    if (!team) return { ok: false, error: 'Team not found' };
    if (team.owner_id !== user.id && !canManageTeam(team.id) && !isAppOwner(user)) {
      return { ok: false, error: 'Only Team Leader or Admin can approve requests' };
    }

    const cloudRes = await syncCloudState('APPROVE_JOIN', { requestId });
    if (cloudRes) {
      if (!cloudRes.ok) {
        return { ok: false, error: cloudRes.error || 'Failed to approve join request' };
      }
      logAction('approve_join', `Approved join request ${requestId}`);
      return { ok: true };
    }

    // Offline fallback only when server is unreachable
    const requester = users.find((u) => u.id === req.user_id) || req.profile;
    const newMember: TeamMember = {
      id: `member_${Date.now()}`,
      team_id: team.id,
      user_id: req.user_id,
      role: 'member',
      joined_at: new Date().toISOString(),
      profile: requester,
    };

    const updatedMembers = [...members.filter((m) => !(m.team_id === team.id && m.user_id === req.user_id)), newMember];
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    const updatedRequests = joinRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'approved' as const, resolved_at: new Date().toISOString() } : r
    );
    setJoinRequests(updatedRequests);
    await persist(STORE_KEYS.JOIN_REQUESTS, updatedRequests);

    const userNotif: AppNotification = {
      id: `notif_appr_${requestId}`,
      user_id: req.user_id,
      kind: 'join_result',
      title: 'Join Request Approved! 🎉',
      body: `You are now a member of "${team.name}"`,
      read: false,
      created_at: new Date().toISOString(),
    };
    notifiedIdsRef.current.add(userNotif.id);
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

    const cloudRes = await syncCloudState('DECLINE_JOIN', { requestId });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to decline request' };
    }

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
    if (team.owner_id !== user.id && !isAppOwner(user)) {
      return { ok: false, error: 'Only team leader can rename the team' };
    }

    const cleanName = newName.trim();
    if (!cleanName) return { ok: false, error: 'Team name cannot be empty' };

    const nameExists = teams.some(
      (t) => t.id !== teamId && t.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (nameExists) {
      return {
        ok: false,
        error: `Another team with the name "${cleanName}" already exists. Please choose a unique name.`,
      };
    }

    const cloudRes = await syncCloudState('RENAME_TEAM', {
      teamId,
      actorId: user.id,
      newName: cleanName,
    });
    if (cloudRes && !cloudRes.ok) {
      return {
        ok: false,
        error: cloudRes.error || `Team name "${cleanName}" is already registered.`,
      };
    }

    const updatedTeams = teams.map((t) => (t.id === teamId ? { ...t, name: cleanName } : t));
    setTeams(updatedTeams);
    await persist(STORE_KEYS.TEAMS, updatedTeams);
    logAction('rename_team', `Renamed team to "${cleanName}"`);
    return { ok: true };
  };

  const deleteTeam = async (teamId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    if (team.owner_id !== user.id && !isAppOwner(user)) {
      return { ok: false, error: 'Only team leader can delete the team' };
    }

    const teamName = team.name;
    const cloudRes = await syncCloudState('DELETE_TEAM', {
      teamId,
      actorId: user.id,
      actorName: user.name,
    });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to delete team' };
    }

    await recordTombstone('teams', teamId);
    const removedTaskIds = tasks.filter((t) => t.team_id === teamId).map((t) => t.id);
    for (const tid of removedTaskIds) {
      await recordTombstone('tasks', tid);
    }

    const updatedTeams = teams.filter((t) => t.id !== teamId);
    const updatedMembers = members.filter((m) => m.team_id !== teamId);
    const updatedTasks = tasks.filter((t) => t.team_id !== teamId);
    const removedTaskSet = new Set(removedTaskIds);
    const updatedSubtasks = subtasks.filter((s) => !removedTaskSet.has(s.task_id));
    const updatedChat = chatMessages.filter((m) => m.team_id !== teamId);
    const updatedReqs = joinRequests.filter((r) => r.team_id !== teamId);

    setTeams(updatedTeams);
    setMembers(updatedMembers);
    setTasks(updatedTasks);
    setSubtasks(updatedSubtasks);
    setChatMessages(updatedChat);
    setJoinRequests(updatedReqs);

    await persist(STORE_KEYS.TEAMS, updatedTeams);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);
    await persist(STORE_KEYS.TASKS, updatedTasks);
    await persist(STORE_KEYS.SUBTASKS, updatedSubtasks);
    await persist(STORE_KEYS.CHAT_MESSAGES, updatedChat);
    await persist(STORE_KEYS.JOIN_REQUESTS, updatedReqs);

    logAction('delete_team', `Deleted team "${teamName}"`);
    return { ok: true };
  };

  const promoteMember = async (teamId: string, memberUserId: string, newRole: Role) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team || (team.owner_id !== user.id && !isAppOwner(user))) {
      return { ok: false, error: 'Only team leader can change roles' };
    }

    const cloudRes = await syncCloudState('PROMOTE_MEMBER', {
      teamId,
      actorId: user.id,
      memberUserId,
      newRole,
    });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to update member role' };
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
    if (!canManageTeam(teamId) && !isAppOwner(user)) {
      return { ok: false, error: 'Only team leader or admin can remove members' };
    }
    if (memberUserId === team.owner_id) return { ok: false, error: 'Cannot remove team leader' };

    const cloudRes = await syncCloudState('REMOVE_MEMBER', {
      teamId,
      actorId: user.id,
      memberUserId,
    });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to remove member' };
    }

    await recordTombstone('members', `${teamId}_${memberUserId}`);
    const updatedMembers = members.filter((m) => !(m.team_id === teamId && m.user_id === memberUserId));
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    logAction('remove_member', `Removed member from "${team.name}"`);
    return { ok: true };
  };

  const leaveTeam = async (teamId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const team = teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Team not found' };
    if (team.owner_id === user.id) return { ok: false, error: 'Leader cannot leave. Delete team instead.' };

    const teamName = team.name;
    const cloudRes = await syncCloudState('LEAVE_TEAM', {
      teamId,
      userId: user.id,
      userName: user.name,
    });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to leave team' };
    }

    await recordTombstone('members', `${teamId}_${user.id}`);
    const updatedMembers = members.filter((m) => !(m.team_id === teamId && m.user_id === user.id));
    setMembers(updatedMembers);
    await persist(STORE_KEYS.MEMBERS, updatedMembers);

    if (!cloudRes) {
      sendChatMessage({
        teamId,
        text: `🚪 ${user.name} has left the team.`,
      }).catch(() => {});
    }

    logAction('leave_team', `Left team "${teamName}"`);
    return { ok: true };
  };

  // Teammate Member-to-Member Connection Actions
  const sendTeammateRequest = async (toUserId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    if (user.id === toUserId) return { ok: false, error: 'Cannot connect with yourself' };

    const existing = connections.find(
      (c) =>
        ((c.from_user_id === user.id && c.to_user_id === toUserId) ||
          (c.from_user_id === toUserId && c.to_user_id === user.id)) &&
        c.status !== 'declined'
    );
    if (existing) {
      return { ok: true, error: 'Request or connection already exists' };
    }

    const newConn: TeammateConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      from_user_id: user.id,
      to_user_id: toUserId,
      status: 'pending',
      created_at: new Date().toISOString(),
      from_profile: user,
      to_profile: users.find((u) => u.id === toUserId),
    };

    const updatedConns = [newConn, ...connections];
    setConnections(updatedConns);
    await persist(STORE_KEYS.CONNECTIONS, updatedConns);

    syncCloudState('CONNECTION_REQUEST', {
      connection: newConn,
      senderName: user.name,
    }).catch(() => {});

    logAction('teammate_request', `Sent teammate request to user ${toUserId}`);
    return { ok: true };
  };

  const acceptTeammateRequest = async (connectionId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const conn = connections.find((c) => c.id === connectionId);
    if (!conn) return { ok: false, error: 'Connection request not found' };

    const updatedConns = connections.map((c) =>
      c.id === connectionId ? { ...c, status: 'accepted' as const, resolved_at: new Date().toISOString() } : c
    );
    setConnections(updatedConns);
    await persist(STORE_KEYS.CONNECTIONS, updatedConns);

    syncCloudState('CONNECTION_RESPOND', {
      connectionId,
      status: 'accepted',
      responderName: user.name,
    }).catch(() => {});

    logAction('accept_teammate', `Accepted teammate request from user ${conn.from_user_id}`);
    return { ok: true };
  };

  const declineTeammateRequest = async (connectionId: string) => {
    const updatedConns = connections.map((c) =>
      c.id === connectionId ? { ...c, status: 'declined' as const, resolved_at: new Date().toISOString() } : c
    );
    setConnections(updatedConns);
    await persist(STORE_KEYS.CONNECTIONS, updatedConns);

    syncCloudState('CONNECTION_RESPOND', {
      connectionId,
      status: 'declined',
      responderName: user?.name,
    }).catch(() => {});
    return { ok: true };
  };

  const getConnectionStatus = (otherUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'connected' => {
    if (!user || user.id === otherUserId) return 'none';
    const conn = connections.find(
      (c) =>
        ((c.from_user_id === user.id && c.to_user_id === otherUserId) ||
          (c.from_user_id === otherUserId && c.to_user_id === user.id)) &&
        c.status !== 'declined'
    );
    if (!conn) return 'none';
    if (conn.status === 'accepted') return 'connected';
    if (conn.from_user_id === user.id) return 'pending_sent';
    return 'pending_received';
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

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isPersonal = input.isPersonal !== undefined ? input.isPersonal : !input.teamId;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const presentMilitaryTime = `${hours}:${mins}`;
    const presentFormattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const currentIso = now.toISOString();
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
      assigned_time: presentFormattedTime,
      assigned_at: currentIso,
      due_date: input.dueDate || today,
      start_time: input.startTime || presentMilitaryTime,
      end_time: input.endTime || '18:00',
      ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
      created_at: currentIso,
      updated_at: currentIso,
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    await persist(STORE_KEYS.TASKS, updatedTasks);
    const cloudRes = await syncCloudState('SAVE_TASK', {
      task: newTask,
      actorId: user.id,
      actorName: user.name,
    });

    if (!cloudRes && newTask.assignee_id !== user.id) {
      const notif: AppNotification = {
        id: `notif_assign_${taskId}`,
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
    const submittedTask = updatedTasks.find((t) => t.id === taskId);
    const cloudRes = submittedTask
      ? await syncCloudState('SAVE_TASK', {
          task: submittedTask,
          actorId: user.id,
          actorName: user.name,
        })
      : null;

    if (!cloudRes) {
      const targetUserId = task.created_by_id !== user.id ? task.created_by_id : null;
      if (targetUserId) {
        const notif: AppNotification = {
          id: `notif_submit_${taskId}_${Date.now()}`,
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
    }

    logAction('submit_task', `Submitted task "${task.title}"`);
    return { ok: true };
  };

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: 'Task not found' };

    const isLeaderOrAdmin = canManageTeam(task.team_id ?? '') || task.created_by_id === user.id || isAppOwner(user);
    const isPersonalOwner = Boolean(task.is_personal || !task.team_id) && (task.assignee_id === user.id || task.created_by_id === user.id);

    if (!isLeaderOrAdmin && !isPersonalOwner) {
      if (task.assignee_id !== user.id) {
        return {
          ok: false,
          error: 'Permission Denied: Only the assignee or Team Leader can update this task.',
        };
      }
      if (
        patch.title !== undefined ||
        patch.description !== undefined ||
        patch.assignee_id !== undefined ||
        patch.priority !== undefined ||
        patch.due_date !== undefined ||
        patch.assigned_date !== undefined ||
        patch.start_time !== undefined ||
        patch.end_time !== undefined ||
        patch.team_id !== undefined
      ) {
        return {
          ok: false,
          error: 'Permission Denied: Only Team Leader or Admin can modify task details.',
        };
      }
      if (patch.status === 'done') {
        return {
          ok: false,
          error: 'Only Team Leader or Admin can mark team tasks Done. Please submit for review instead.',
        };
      }
    }

    const nextTask: Task = { ...task, ...patch, updated_at: new Date().toISOString() };
    const cloudRes = await syncCloudState('SAVE_TASK', {
      task: nextTask,
      actorId: user.id,
      actorName: user.name,
    });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to update task' };
    }

    const updatedTasks = tasks.map((t) => (t.id === taskId ? nextTask : t));
    setTasks(updatedTasks);
    await persist(STORE_KEYS.TASKS, updatedTasks);
    logAction('update_task', `Updated task details`);
    return { ok: true };
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return { ok: false, error: 'Must be logged in' };
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: 'Task not found' };

    const isLeaderOrAdmin = canManageTeam(task.team_id ?? '') || task.created_by_id === user.id || isAppOwner(user);
    if (!isLeaderOrAdmin) {
      return {
        ok: false,
        error: 'Permission Denied: Only Team Leader or Admin can delete tasks.',
      };
    }

    const cloudRes = await syncCloudState('DELETE_TASK', { taskId, actorId: user.id });
    if (cloudRes && !cloudRes.ok) {
      return { ok: false, error: cloudRes.error || 'Failed to delete task' };
    }

    await recordTombstone('tasks', taskId);
    const removedSubs = subtasks.filter((s) => s.task_id === taskId).map((s) => s.id);
    for (const sid of removedSubs) {
      await recordTombstone('subtasks', sid);
    }

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
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      task_id: taskId,
      title: title.trim(),
      done: false,
      position: subtasks.filter((s) => s.task_id === taskId).length,
      created_at: new Date().toISOString(),
    };
    const updatedSubtasks = [...subtasks, newSubtask];
    setSubtasks(updatedSubtasks);
    await persist(STORE_KEYS.SUBTASKS, updatedSubtasks);
    syncCloudState('SAVE_SUBTASK', { subtask: newSubtask }).catch(() => {});
    return { ok: true };
  };

  const toggleSubtask = async (subtaskId: string) => {
    let toggledSubtask: Subtask | null = null;
    const updated = subtasks.map((s) => {
      if (s.id === subtaskId) {
        toggledSubtask = { ...s, done: !s.done };
        return toggledSubtask;
      }
      return s;
    });
    setSubtasks(updated);
    await persist(STORE_KEYS.SUBTASKS, updated);
    if (toggledSubtask) {
      syncCloudState('SAVE_SUBTASK', { subtask: toggledSubtask }).catch(() => {});
    }
    return { ok: true };
  };

  const deleteSubtask = async (subtaskId: string) => {
    await recordTombstone('subtasks', subtaskId);
    const updated = subtasks.filter((s) => s.id !== subtaskId);
    setSubtasks(updated);
    await persist(STORE_KEYS.SUBTASKS, updated);
    syncCloudState('DELETE_SUBTASK', { subtaskId }).catch(() => {});
    return { ok: true };
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    persist(STORE_KEYS.NOTIFICATIONS, updated);
    syncCloudState('MARK_NOTIFICATION_READ', { notificationId: id }).catch(() => {});
  };

  const markAllNotificationsRead = () => {
    const uid = user?.id;
    const updated = notifications.map((n) => (!uid || n.user_id === uid ? { ...n, read: true } : n));
    setNotifications(updated);
    persist(STORE_KEYS.NOTIFICATIONS, updated);
    if (uid) {
      syncCloudState('MARK_ALL_NOTIFICATIONS_READ', { userId: uid }).catch(() => {});
    }
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
        assignee:
          users.find((u) => u.id === t.assignee_id) ||
          members.find((m) => m.user_id === t.assignee_id)?.profile ||
          (t.assignee_id === user?.id ? user : undefined),
        subtasks: subtasks.filter((s) => s.task_id === t.id),
      }));
  }, [tasks, myTeamIds, users, members, user, subtasks]);

  const pendingRequestsForOwner = useMemo(() => {
    if (!user) return [];
    const ownedTeams = new Set(teams.filter((t) => t.owner_id === user.id).map((t) => t.id));
    return joinRequests.filter((r) => r.status === 'pending' && ownedTeams.has(r.team_id));
  }, [user, teams, joinRequests]);

  // Super Admin Action Functions (Strictly Owner Only)
  const adminToggleUserAdmin = useCallback(async (userId: string) => {
    if (!isAppOwner(user)) return;
    const target = users.find((u) => u.id === userId);
    if (isAppOwner(target)) return;

    await syncCloudState('ADMIN_ACTION', {
      actorEmail: user!.email,
      subAction: 'TOGGLE_ADMIN',
      targetUserId: userId,
    });

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u));
      persist(STORE_KEYS.ALL_USERS, updated);
      return updated;
    });
    logAction('admin_role_change', `Toggled Admin privilege for user ID ${userId}`);
  }, [user, users, persist, logAction, syncCloudState]);

  const adminToggleUserStatus = useCallback(async (userId: string) => {
    if (!isAppOwner(user)) return;
    const target = users.find((u) => u.id === userId);
    if (isAppOwner(target)) return;

    await syncCloudState('ADMIN_ACTION', {
      actorEmail: user!.email,
      subAction: 'TOGGLE_STATUS',
      targetUserId: userId,
    });

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
  }, [user, users, persist, logAction, syncCloudState]);

  const adminReassignTask = useCallback(async (taskId: string, newAssigneeId: string) => {
    if (!isAppOwner(user)) return;
    const assignee = users.find((u) => u.id === newAssigneeId) || user || undefined;

    await syncCloudState('ADMIN_ACTION', {
      actorEmail: user!.email,
      subAction: 'REASSIGN_TASK',
      taskId,
      newAssigneeId,
    });

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
  }, [users, user, persist, logAction, syncCloudState]);

  const adminTransferTeam = useCallback(async (teamId: string, newOwnerId: string) => {
    if (!isAppOwner(user)) return;

    await syncCloudState('ADMIN_ACTION', {
      actorEmail: user!.email,
      subAction: 'TRANSFER_TEAM',
      teamId,
      newOwnerId,
    });

    setTeams((prev) => {
      const updated = prev.map((t) => (t.id === teamId ? { ...t, owner_id: newOwnerId } : t));
      persist(STORE_KEYS.TEAMS, updated);
      return updated;
    });
    logAction('admin_transfer_team', `Team ${teamId} ownership transferred to user ${newOwnerId}`);
  }, [user, persist, logAction, syncCloudState]);

  const adminDeleteUser = useCallback(async (userId: string) => {
    if (!isAppOwner(user)) return;
    const target = users.find((u) => u.id === userId);
    if (isAppOwner(target)) return;

    await syncCloudState('ADMIN_ACTION', {
      actorEmail: user!.email,
      subAction: 'DELETE_USER',
      targetUserId: userId,
    });

    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      persist(STORE_KEYS.ALL_USERS, updated);
      return updated;
    });
    setMembers((prev) => {
      const updated = prev.filter((m) => m.user_id !== userId);
      persist(STORE_KEYS.MEMBERS, updated);
      return updated;
    });
    logAction('admin_delete_user', `User ID ${userId} was deleted by admin`);
  }, [user, users, persist, logAction, syncCloudState]);

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
      const cloudRes = await syncCloudState('SEND_MESSAGE', { message: newMsg });

      if (!cloudRes && detectedMentions.length > 0) {
        const teamMemberIds = new Set(
          members.filter((m) => m.team_id === input.teamId).map((m) => m.user_id)
        );
        detectedMentions.forEach((mentionName) => {
          const target = users.find(
            (u) =>
              teamMemberIds.has(u.id) &&
              u.username &&
              u.username.toLowerCase() === mentionName.toLowerCase()
          );
          if (target && target.id !== user.id) {
            const notif: AppNotification = {
              id: `notif_mention_${newMsg.id}_${target.id}`,
              user_id: target.id,
              kind: 'chat_mention',
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
    [user, users, members, persist, logAction, syncCloudState]
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

      // 4. If intent created or assigned a task, execute in state using present local time
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
        isAIAssistantOpen,
        openAIAssistant,
        closeAIAssistant,
        connections,
        sendTeammateRequest,
        acceptTeammateRequest,
        declineTeammateRequest,
        getConnectionStatus,
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

