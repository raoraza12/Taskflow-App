import type {
  ActivityLog,
  AppNotification,
  JoinRequest,
  NotificationKind,
  Session,
  Subtask,
  Task,
  Team,
  TeamMember,
  User,
} from '../types'

const KEYS = {
  users: 'tm_users_v2',
  teams: 'tm_teams_v2',
  members: 'tm_members_v2',
  tasks: 'tm_tasks_v2',
  subtasks: 'tm_subtasks_v2',
  notifications: 'tm_notifications_v2',
  activity: 'tm_activity_v2',
  joinRequests: 'tm_join_requests_v2',
  session: 'tm_session_v2',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const uid = () =>
  crypto.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function randomCode(len = 6) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len)
    .toUpperCase()
}

export const store = {
  getUsers: () => read<User[]>(KEYS.users, []),
  setUsers: (users: User[]) => write(KEYS.users, users),

  getTeams: () => read<Team[]>(KEYS.teams, []),
  setTeams: (teams: Team[]) => write(KEYS.teams, teams),

  getMembers: () => read<TeamMember[]>(KEYS.members, []),
  setMembers: (members: TeamMember[]) => write(KEYS.members, members),

  getTasks: () => read<Task[]>(KEYS.tasks, []),
  setTasks: (tasks: Task[]) => write(KEYS.tasks, tasks),

  getSubtasks: () => read<Subtask[]>(KEYS.subtasks, []),
  setSubtasks: (subtasks: Subtask[]) => write(KEYS.subtasks, subtasks),

  getNotifications: () => read<AppNotification[]>(KEYS.notifications, []),
  setNotifications: (items: AppNotification[]) => write(KEYS.notifications, items),

  getActivity: () => read<ActivityLog[]>(KEYS.activity, []),
  setActivity: (items: ActivityLog[]) => write(KEYS.activity, items),

  getJoinRequests: () => read<JoinRequest[]>(KEYS.joinRequests, []),
  setJoinRequests: (items: JoinRequest[]) => write(KEYS.joinRequests, items),

  getSession: () => read<Session | null>(KEYS.session, null),
  setSession: (session: Session | null) => {
    if (!session) localStorage.removeItem(KEYS.session)
    else write(KEYS.session, session)
  },
}

export function notificationsForUser(userId: string) {
  return store
    .getNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function activityForUser(userId: string) {
  return store
    .getActivity()
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function logActivity(userId: string, action: string, detail: string) {
  const items = store.getActivity()
  items.push({
    id: uid(),
    userId,
    action,
    detail,
    createdAt: new Date().toISOString(),
  })
  store.setActivity(items)
}

export function pushNotification(
  userId: string,
  title: string,
  body: string,
  opts?: {
    kind?: NotificationKind
    relatedTaskId?: string
    relatedJoinRequestId?: string
    browserNotify?: boolean
  },
) {
  const items = store.getNotifications()
  items.push({
    id: uid(),
    userId,
    kind: opts?.kind ?? 'general',
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
    relatedTaskId: opts?.relatedTaskId,
    relatedJoinRequestId: opts?.relatedJoinRequestId,
  })
  store.setNotifications(items)

  const browserNotify = opts?.browserNotify ?? true
  if (browserNotify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body })
    } catch {
      /* ignore */
    }
  }
}

export function teamsForUser(userId: string) {
  const memberTeamIds = new Set(
    store.getMembers().filter((m) => m.userId === userId).map((m) => m.teamId),
  )
  return store.getTeams().filter((t) => memberTeamIds.has(t.id))
}

export function membersOfTeam(teamId: string) {
  return store.getMembers().filter((m) => m.teamId === teamId)
}

export function isTeamMember(teamId: string, userId: string) {
  return store.getMembers().some((m) => m.teamId === teamId && m.userId === userId)
}

export function canManageTeam(teamId: string, userId: string) {
  const m = store.getMembers().find((x) => x.teamId === teamId && x.userId === userId)
  return m?.role === 'owner' || m?.role === 'admin'
}

export function tasksVisibleToUser(userId: string) {
  const myTeamIds = new Set(teamsForUser(userId).map((t) => t.id))
  return store
    .getTasks()
    .filter((t) => myTeamIds.has(t.teamId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.startTime.localeCompare(b.startTime))
}

export function userById(userId: string) {
  return store.getUsers().find((u) => u.id === userId)
}

export function pendingJoinRequestsForOwner(ownerId: string) {
  const ownedTeamIds = new Set(store.getTeams().filter((t) => t.ownerId === ownerId).map((t) => t.id))
  return store
    .getJoinRequests()
    .filter((r) => r.status === 'pending' && ownedTeamIds.has(r.teamId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function joinRequestsForUser(userId: string) {
  return store
    .getJoinRequests()
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
