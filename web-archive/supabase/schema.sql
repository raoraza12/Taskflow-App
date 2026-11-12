-- Future Supabase migration (MVP currently uses localStorage + account isolation).
-- Enable when moving to hosted backend.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  assignee_id uuid not null references profiles(id),
  created_by_id uuid not null references profiles(id),
  title text not null,
  description text default '',
  status text not null check (status in ('todo', 'in_progress', 'done')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  due_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean default false,
  related_task_id uuid references tasks(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  detail text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table tasks enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

-- Example policies (tighten before production)
create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "own notifications" on notifications for select using (auth.uid() = user_id);
create policy "own activity" on activity_logs for select using (auth.uid() = user_id);
