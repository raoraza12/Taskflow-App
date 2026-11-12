export type Role = 'owner' | 'admin' | 'member'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type JoinRequestStatus = 'pending' | 'approved' | 'declined'
export type NotificationKind =
  | 'general'
  | 'join_request'
  | 'join_result'
  | 'task'
  | 'member_removed'

export interface User {
  id: string
  googleId: string
  name: string
  email: string
  picture?: string
  emailVerified: boolean
  /** App password (not Google password) — changeable in Profile */
  appPassword: string
  createdAt: string
}

export interface Team {
  id: string
  name: string
  /** Public invite code shown to members */
  inviteCode: string
  /** Secret pass required with team name to request join */
  joinPassword: string
  ownerId: string
  createdAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: Role
  joinedAt: string
}

export interface JoinRequest {
  id: string
  teamId: string
  userId: string
  status: JoinRequestStatus
  createdAt: string
  resolvedAt?: string
}

export interface Task {
  id: string
  teamId: string
  assigneeId: string
  createdById: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
}

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  read: boolean
  createdAt: string
  relatedTaskId?: string
  relatedJoinRequestId?: string
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  detail: string
  createdAt: string
}

export interface Session {
  userId: string
}

export interface GoogleProfile {
  googleId: string
  email: string
  name: string
  picture?: string
  emailVerified: boolean
}
