export type Role = 'owner' | 'admin' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'submitted' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type JoinRequestStatus = 'pending' | 'approved' | 'declined';
export type NotificationKind =
  | 'general'
  | 'join_request'
  | 'join_result'
  | 'task'
  | 'task_assigned'
  | 'task_submitted'
  | 'task_due_soon'
  | 'chat_mention'
  | 'member_removed'
  | 'system';

export interface Profile {
  id: string;
  google_id: string;
  name: string;
  username: string;
  email: string;
  picture?: string;
  email_verified: boolean;
  created_at: string;
  isAdmin?: boolean;
  status?: 'active' | 'suspended';
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  join_password: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  profile?: Profile;
}

export interface Task {
  id: string;
  team_id?: string | null;
  is_personal?: boolean;
  assignee_id: string;
  created_by_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_date: string; // Publish / assignment date e.g. "2026-11-11"
  due_date: string;      // Submission deadline date e.g. "2026-11-15"
  start_time: string;
  end_time: string;
  submitted_at?: string;
  submission_note?: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  subtasks?: Subtask[];
  attachments?: TaskAttachment[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  related_task_id?: string;
  related_join_request_id?: string;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  status: JoinRequestStatus;
  created_at: string;
  resolved_at?: string;
  profile?: Profile;
  team?: Team;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  detail: string;
  created_at: string;
}

export interface UserSecurity {
  user_id: string;
  app_lock_pin: string | null;
  is_locked: boolean;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  team_id: string;
  user_id: string;
  user_name: string;
  user_username: string;
  user_picture?: string;
  text?: string;
  type: 'text' | 'voice';
  voice_duration?: number;
  voice_waveform?: number[];
  audio_url?: string;
  mentions?: string[];
  created_at: string;
}

export interface AIAgentMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  action_type?: 'task_created' | 'task_assigned' | 'task_completed' | 'info' | 'clarification' | 'security_alert';
  action_data?: any;
  model_used?: string;
  created_at: string;
}


