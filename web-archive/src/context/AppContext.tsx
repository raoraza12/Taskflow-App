import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActivityLog,
  AppNotification,
  GoogleProfile,
  JoinRequest,
  Role,
  Task,
  TaskPriority,
  TaskStatus,
  Team,
  User,
} from '../types'
import {
  activityForUser,
  canManageTeam,
  isTeamMember,
  joinRequestsForUser,
  logActivity,
  membersOfTeam,
  notificationsForUser,
  pendingJoinRequestsForOwner,
  pushNotification,
  randomCode,
  store,
  tasksVisibleToUser,
  teamsForUser,
  todayISO,
  uid,
  userById,
} from '../lib/storage'

interface TaskInput {
  teamId: string
  assigneeId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  startTime: string
  endTime: string
}

interface CreateTeamInput {
  name: string
  joinPassword: string
}

interface JoinTeamInput {
  teamName: string
  inviteCode: string
  joinPassword: string
}

interface AppContextValue {
  user: User | null
  users: User[]
  teams: Team[]
  tasks: Task[]
  notifications: AppNotification[]
  history: ActivityLog[]
  pendingJoinRequests: JoinRequest[]
  myJoinRequests: JoinRequest[]
  unreadCount: number
  loginWithGoogle: (profile: GoogleProfile) => { ok: true } | { ok: false; error: string }
  logout: () => void
  changeAppPassword: (
    currentPassword: string,
    newPassword: string,
  ) => { ok: true } | { ok: false; error: string }
  setInitialAppPassword: (password: string) => { ok: true } | { ok: false; error: string }
  createTeam: (input: CreateTeamInput) => Team | { error: string }
  requestJoinTeam: (input: JoinTeamInput) => { ok: true } | { ok: false; error: string }
  approveJoinRequest: (requestId: string) => { ok: true } | { ok: false; error: string }
  declineJoinRequest: (requestId: string) => { ok: true } | { ok: false; error: string }
  removeMember: (teamId: string, memberUserId: string) => { ok: true } | { ok: false; error: string }
  getTeamMembers: (teamId: string) => ReturnType<typeof membersOfTeam>
  getMemberRole: (teamId: string) => Role | null
  canManage: (teamId: string) => boolean
  createTask: (input: TaskInput) => { ok: true } | { ok: false; error: string }
  updateTask: (taskId: string, patch: Partial<TaskInput>) => { ok: true } | { ok: false; error: string }
  deleteTask: (taskId: string) => { ok: true } | { ok: false; error: string }
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  requestBrowserNotifications: () => Promise<NotificationPermission | 'unsupported'>
  refresh: () => void
  today: string
}

const AppContext = createContext<AppContextValue | null>(null)

function toPublicUser(u: User): User {
  return { ...u }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const session = store.getSession()
  const rawUser = session ? store.getUsers().find((u) => u.id === session.userId) ?? null : null
  const user = rawUser ? toPublicUser(rawUser) : null

  useEffect(() => {
    void tick
  }, [tick])

  const teams = useMemo(() => (user ? teamsForUser(user.id) : []), [user, tick])
  const tasks = useMemo(() => (user ? tasksVisibleToUser(user.id) : []), [user, tick])
  const notifications = useMemo(
    () => (user ? notificationsForUser(user.id) : []),
    [user, tick],
  )
  const history = useMemo(() => (user ? activityForUser(user.id) : []), [user, tick])
  const pendingJoinRequests = useMemo(
    () => (user ? pendingJoinRequestsForOwner(user.id) : []),
    [user, tick],
  )
  const myJoinRequests = useMemo(
    () => (user ? joinRequestsForUser(user.id) : []),
    [user, tick],
  )
  const users = useMemo(() => store.getUsers().map(toPublicUser), [tick])
  const unreadCount = notifications.filter((n) => !n.read).length

  const loginWithGoogle: AppContextValue['loginWithGoogle'] = (profile) => {
    if (!profile.emailVerified) {
      return { ok: false, error: 'Only Google-verified emails are allowed' }
    }
    const email = profile.email.trim().toLowerCase()
    const usersList = store.getUsers()
    let existing = usersList.find(
      (u) => u.googleId === profile.googleId || u.email === email,
    )

    if (existing) {
      existing = {
        ...existing,
        googleId: profile.googleId,
        name: profile.name,
        email,
        picture: profile.picture,
        emailVerified: true,
      }
      store.setUsers(usersList.map((u) => (u.id === existing!.id ? existing! : u)))
      store.setSession({ userId: existing.id })
      logActivity(existing.id, 'login', 'Signed in with Google (verified)')
      refresh()
      return { ok: true }
    }

    const newUser: User = {
      id: uid(),
      googleId: profile.googleId,
      name: profile.name,
      email,
      picture: profile.picture,
      emailVerified: true,
      appPassword: '',
      createdAt: new Date().toISOString(),
    }
    store.setUsers([...usersList, newUser])
    store.setSession({ userId: newUser.id })
    logActivity(newUser.id, 'signup', 'Account created via Google Auth (verified email)')
    refresh()
    return { ok: true }
  }

  const logout = () => {
    if (user) logActivity(user.id, 'logout', 'Logged out')
    store.setSession(null)
    refresh()
  }

  const setInitialAppPassword: AppContextValue['setInitialAppPassword'] = (password) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    if (password.length < 4) return { ok: false, error: 'Password must be at least 4 characters' }
    const usersList = store.getUsers()
    const idx = usersList.findIndex((u) => u.id === user.id)
    if (idx < 0) return { ok: false, error: 'User not found' }
    if (usersList[idx].appPassword) {
      return { ok: false, error: 'App password already set — use change password' }
    }
    usersList[idx] = { ...usersList[idx], appPassword: password }
    store.setUsers(usersList)
    logActivity(user.id, 'password_set', 'App password set')
    refresh()
    return { ok: true }
  }

  const changeAppPassword: AppContextValue['changeAppPassword'] = (currentPassword, newPassword) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    const usersList = store.getUsers()
    const idx = usersList.findIndex((u) => u.id === user.id)
    if (idx < 0) return { ok: false, error: 'User not found' }
    const current = usersList[idx]
    if (!current.appPassword) {
      return { ok: false, error: 'No app password yet — set one first' }
    }
    if (current.appPassword !== currentPassword) {
      return { ok: false, error: 'Current password is incorrect' }
    }
    if (newPassword.length < 4) {
      return { ok: false, error: 'New password must be at least 4 characters' }
    }
    usersList[idx] = { ...current, appPassword: newPassword }
    store.setUsers(usersList)
    logActivity(user.id, 'password_change', 'App password changed')
    refresh()
    return { ok: true }
  }

  const createTeam: AppContextValue['createTeam'] = (input) => {
    if (!user) return { error: 'Sign in with Google first' }
    if (!user.emailVerified) return { error: 'Verified Google email required' }
    const name = input.name.trim()
    const joinPassword = input.joinPassword.trim()
    if (!name) return { error: 'Team name required' }
    if (joinPassword.length < 4) return { error: 'Team password must be at least 4 characters' }
    if (
      store.getTeams().some((t) => t.name.toLowerCase() === name.toLowerCase())
    ) {
      return { error: 'Team name already taken' }
    }

    const team: Team = {
      id: uid(),
      name,
      inviteCode: randomCode(6),
      joinPassword,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    }
    store.setTeams([...store.getTeams(), team])
    store.setMembers([
      ...store.getMembers(),
      {
        id: uid(),
        teamId: team.id,
        userId: user.id,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      },
    ])
    logActivity(user.id, 'team_create', `Created team "${team.name}"`)
    refresh()
    return team
  }

  const requestJoinTeam: AppContextValue['requestJoinTeam'] = (input) => {
    if (!user) return { ok: false, error: 'Sign in with Google first' }
    const teamName = input.teamName.trim()
    const inviteCode = input.inviteCode.trim().toUpperCase()
    const joinPassword = input.joinPassword.trim()

    const team = store.getTeams().find(
      (t) =>
        t.name.toLowerCase() === teamName.toLowerCase() &&
        t.inviteCode === inviteCode &&
        t.joinPassword === joinPassword,
    )
    if (!team) {
      return { ok: false, error: 'Team name / code / password incorrect' }
    }
    if (isTeamMember(team.id, user.id)) {
      return { ok: false, error: 'You are already in this team' }
    }
    const existingPending = store
      .getJoinRequests()
      .find((r) => r.teamId === team.id && r.userId === user.id && r.status === 'pending')
    if (existingPending) {
      return { ok: false, error: 'Join request already pending approval' }
    }

    const request: JoinRequest = {
      id: uid(),
      teamId: team.id,
      userId: user.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    store.setJoinRequests([...store.getJoinRequests(), request])
    logActivity(user.id, 'join_request', `Requested to join "${team.name}"`)
    pushNotification(
      team.ownerId,
      'Join request',
      `${user.name} (${user.email}) wants to join "${team.name}"`,
      { kind: 'join_request', relatedJoinRequestId: request.id },
    )
    refresh()
    return { ok: true }
  }

  const approveJoinRequest: AppContextValue['approveJoinRequest'] = (requestId) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    const requests = store.getJoinRequests()
    const idx = requests.findIndex((r) => r.id === requestId)
    if (idx < 0) return { ok: false, error: 'Request not found' }
    const req = requests[idx]
    if (req.status !== 'pending') return { ok: false, error: 'Request already resolved' }

    const team = store.getTeams().find((t) => t.id === req.teamId)
    if (!team) return { ok: false, error: 'Team not found' }
    if (team.ownerId !== user.id && !canManageTeam(team.id, user.id)) {
      return { ok: false, error: 'Only team owner/admin can approve' }
    }

    requests[idx] = {
      ...req,
      status: 'approved',
      resolvedAt: new Date().toISOString(),
    }
    store.setJoinRequests(requests)

    if (!isTeamMember(team.id, req.userId)) {
      store.setMembers([
        ...store.getMembers(),
        {
          id: uid(),
          teamId: team.id,
          userId: req.userId,
          role: 'member',
          joinedAt: new Date().toISOString(),
        },
      ])
    }

    logActivity(user.id, 'join_approve', `Approved join for ${userById(req.userId)?.email}`)
    pushNotification(
      req.userId,
      'Join approved',
      `Your request to join "${team.name}" was approved`,
      { kind: 'join_result', relatedJoinRequestId: req.id },
    )

    const items = store.getNotifications().map((n) =>
      n.relatedJoinRequestId === requestId && n.userId === user.id
        ? { ...n, read: true }
        : n,
    )
    store.setNotifications(items)
    refresh()
    return { ok: true }
  }

  const declineJoinRequest: AppContextValue['declineJoinRequest'] = (requestId) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    const requests = store.getJoinRequests()
    const idx = requests.findIndex((r) => r.id === requestId)
    if (idx < 0) return { ok: false, error: 'Request not found' }
    const req = requests[idx]
    if (req.status !== 'pending') return { ok: false, error: 'Request already resolved' }

    const team = store.getTeams().find((t) => t.id === req.teamId)
    if (!team) return { ok: false, error: 'Team not found' }
    if (team.ownerId !== user.id && !canManageTeam(team.id, user.id)) {
      return { ok: false, error: 'Only team owner/admin can decline' }
    }

    requests[idx] = {
      ...req,
      status: 'declined',
      resolvedAt: new Date().toISOString(),
    }
    store.setJoinRequests(requests)
    logActivity(user.id, 'join_decline', `Declined join for ${userById(req.userId)?.email}`)
    pushNotification(
      req.userId,
      'Join declined',
      `Your request to join "${team.name}" was declined`,
      { kind: 'join_result', relatedJoinRequestId: req.id },
    )

    const items = store.getNotifications().map((n) =>
      n.relatedJoinRequestId === requestId && n.userId === user.id
        ? { ...n, read: true }
        : n,
    )
    store.setNotifications(items)
    refresh()
    return { ok: true }
  }

  const removeMember: AppContextValue['removeMember'] = (teamId, memberUserId) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    const team = store.getTeams().find((t) => t.id === teamId)
    if (!team) return { ok: false, error: 'Team not found' }
    if (!canManageTeam(teamId, user.id)) {
      return { ok: false, error: 'Only owner/admin can remove members' }
    }
    if (memberUserId === team.ownerId) {
      return { ok: false, error: 'Cannot remove team owner' }
    }
    if (!isTeamMember(teamId, memberUserId)) {
      return { ok: false, error: 'User is not a member' }
    }

    store.setMembers(
      store.getMembers().filter((m) => !(m.teamId === teamId && m.userId === memberUserId)),
    )
    logActivity(
      user.id,
      'member_remove',
      `Removed ${userById(memberUserId)?.email} from ${team.name}`,
    )
    pushNotification(
      memberUserId,
      'Removed from team',
      `You were removed from "${team.name}"`,
      { kind: 'member_removed' },
    )
    refresh()
    return { ok: true }
  }

  const getTeamMembers = (teamId: string) => {
    if (!user || !isTeamMember(teamId, user.id)) return []
    return membersOfTeam(teamId)
  }

  const getMemberRole = (teamId: string): Role | null => {
    if (!user) return null
    return membersOfTeam(teamId).find((m) => m.userId === user.id)?.role ?? null
  }

  const canManage = (teamId: string) => {
    if (!user) return false
    return canManageTeam(teamId, user.id)
  }

  const createTask: AppContextValue['createTask'] = (input) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    if (!isTeamMember(input.teamId, user.id)) {
      return { ok: false, error: 'Not a team member' }
    }
    if (!input.title.trim()) return { ok: false, error: 'Title required' }
    if (!isTeamMember(input.teamId, input.assigneeId)) {
      return { ok: false, error: 'Assignee must be a team member' }
    }

    const now = new Date().toISOString()
    const task: Task = {
      id: uid(),
      teamId: input.teamId,
      assigneeId: input.assigneeId,
      createdById: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate || todayISO(),
      startTime: input.startTime || '09:00',
      endTime: input.endTime || '10:00',
      createdAt: now,
      updatedAt: now,
    }
    store.setTasks([...store.getTasks(), task])
    logActivity(user.id, 'task_create', `Created "${task.title}"`)

    if (input.assigneeId !== user.id) {
      pushNotification(
        input.assigneeId,
        'New task assigned',
        `${user.name} assigned you: ${task.title} (${task.dueDate} ${task.startTime}-${task.endTime})`,
        { kind: 'task', relatedTaskId: task.id },
      )
    }
    refresh()
    return { ok: true }
  }

  const updateTask: AppContextValue['updateTask'] = (taskId, patch) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    const tasksList = store.getTasks()
    const idx = tasksList.findIndex((t) => t.id === taskId)
    if (idx < 0) return { ok: false, error: 'Task not found' }
    const existing = tasksList[idx]
    if (!isTeamMember(existing.teamId, user.id)) {
      return { ok: false, error: 'No access' }
    }

    const nextAssignee = patch.assigneeId ?? existing.assigneeId
    if (patch.assigneeId && !isTeamMember(existing.teamId, patch.assigneeId)) {
      return { ok: false, error: 'Assignee must be a team member' }
    }

    const updated: Task = {
      ...existing,
      ...patch,
      title: patch.title?.trim() ?? existing.title,
      description:
        patch.description !== undefined ? patch.description.trim() : existing.description,
      assigneeId: nextAssignee,
      updatedAt: new Date().toISOString(),
    }
    tasksList[idx] = updated
    store.setTasks(tasksList)
    logActivity(user.id, 'task_update', `Updated "${updated.title}"`)

    if (nextAssignee !== existing.assigneeId && nextAssignee !== user.id) {
      pushNotification(
        nextAssignee,
        'Task reassigned',
        `${user.name} assigned you: ${updated.title}`,
        { kind: 'task', relatedTaskId: updated.id },
      )
    } else if (existing.assigneeId !== user.id && nextAssignee === existing.assigneeId) {
      pushNotification(
        existing.assigneeId,
        'Task updated',
        `${user.name} updated: ${updated.title}`,
        { kind: 'task', relatedTaskId: updated.id },
      )
    }
    refresh()
    return { ok: true }
  }

  const deleteTask: AppContextValue['deleteTask'] = (taskId) => {
    if (!user) return { ok: false, error: 'Not logged in' }
    const task = store.getTasks().find((t) => t.id === taskId)
    if (!task) return { ok: false, error: 'Task not found' }
    if (!isTeamMember(task.teamId, user.id)) return { ok: false, error: 'No access' }

    store.setTasks(store.getTasks().filter((t) => t.id !== taskId))
    store.setSubtasks(store.getSubtasks().filter((s) => s.taskId !== taskId))
    logActivity(user.id, 'task_delete', `Deleted "${task.title}"`)
    refresh()
    return { ok: true }
  }

  const markNotificationRead = (id: string) => {
    if (!user) return
    const items = store.getNotifications().map((n) =>
      n.id === id && n.userId === user.id ? { ...n, read: true } : n,
    )
    store.setNotifications(items)
    refresh()
  }

  const markAllNotificationsRead = () => {
    if (!user) return
    const items = store.getNotifications().map((n) =>
      n.userId === user.id ? { ...n, read: true } : n,
    )
    store.setNotifications(items)
    refresh()
  }

  const requestBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') return 'unsupported' as const
    return Notification.requestPermission()
  }

  const value: AppContextValue = {
    user,
    users,
    teams,
    tasks,
    notifications,
    history,
    pendingJoinRequests,
    myJoinRequests,
    unreadCount,
    loginWithGoogle,
    logout,
    changeAppPassword,
    setInitialAppPassword,
    createTeam,
    requestJoinTeam,
    approveJoinRequest,
    declineJoinRequest,
    removeMember,
    getTeamMembers,
    getMemberRole,
    canManage,
    createTask,
    updateTask,
    deleteTask,
    markNotificationRead,
    markAllNotificationsRead,
    requestBrowserNotifications,
    refresh,
    today: todayISO(),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
