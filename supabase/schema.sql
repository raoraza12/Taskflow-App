-- ==========================================
-- TaskFlow Database Schema for Supabase
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  google_id text not null,
  name text not null,
  email text unique not null,
  picture text,
  email_verified boolean default true,
  created_at timestamptz default now()
);

-- 2. TEAMS TABLE
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text unique not null,
  join_password text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- 3. TEAM MEMBERS TABLE
create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

-- 4. TASKS TABLE
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  created_by_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  status text not null check (status in ('todo', 'in_progress', 'done')) default 'todo',
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  due_date date not null,
  start_time time not null default '09:00',
  end_time time not null default '10:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. SUBTASKS TABLE (Checklists)
create table if not exists public.subtasks (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  done boolean default false,
  position integer default 0,
  created_at timestamptz default now()
);

-- 6. TASK ATTACHMENTS TABLE
create table if not exists public.task_attachments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- 7. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('general', 'join_request', 'join_result', 'task', 'member_removed')),
  title text not null,
  body text not null,
  read boolean default false,
  related_task_id uuid references public.tasks(id) on delete set null,
  related_join_request_id uuid,
  created_at timestamptz default now()
);

-- 8. JOIN REQUESTS TABLE
create table if not exists public.join_requests (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'declined')) default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- 9. ACTIVITY LOGS TABLE
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  detail text not null,
  created_at timestamptz default now()
);

-- 10. APP LOCK PIN (Stored securely or hashed per user)
create table if not exists public.user_security (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  app_lock_pin text,
  is_locked boolean default true,
  updated_at timestamptz default now()
);

