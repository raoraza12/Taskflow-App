-- ==========================================
-- Supabase Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.task_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.join_requests enable row level security;
alter table public.activity_logs enable row level security;
alter table public.user_security enable row level security;

-- PROFILES
create policy "Public profiles are readable by authenticated users" 
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile" 
  on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- TEAMS
create policy "Team members can view teams they belong to"
  on public.teams for select to authenticated
  using (
    exists (
      select 1 from public.team_members 
      where team_members.team_id = teams.id 
      and team_members.user_id = auth.uid()
    ) or owner_id = auth.uid()
  );

create policy "Users can create teams"
  on public.teams for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Team owners can update their teams"
  on public.teams for update to authenticated
  using (auth.uid() = owner_id);

create policy "Team owners can delete their teams"
  on public.teams for delete to authenticated
  using (auth.uid() = owner_id);

-- TEAM MEMBERS
create policy "Team members can view members in their team"
  on public.team_members for select to authenticated
  using (
    exists (
      select 1 from public.team_members as tm
      where tm.team_id = team_members.team_id 
      and tm.user_id = auth.uid()
    )
  );

create policy "Team owner or admin can add/remove members"
  on public.team_members for all to authenticated
  using (
    exists (
      select 1 from public.team_members as tm
      where tm.team_id = team_members.team_id 
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    ) or exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
  );

-- TASKS
create policy "Team members can view tasks in their team"
  on public.tasks for select to authenticated
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Team members can create tasks"
  on public.tasks for insert to authenticated
  with check (
    exists (
      select 1 from public.team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Team members can update tasks"
  on public.tasks for update to authenticated
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Task creator, team owner, or admin can delete tasks"
  on public.tasks for delete to authenticated
  using (
    created_by_id = auth.uid() or
    exists (
      select 1 from public.team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
      and team_members.role in ('owner', 'admin')
    )
  );

-- SUBTASKS
create policy "Team members can view, create, update, delete subtasks"
  on public.subtasks for all to authenticated
  using (
    exists (
      select 1 from public.tasks
      join public.team_members on team_members.team_id = tasks.team_id
      where tasks.id = subtasks.task_id
      and team_members.user_id = auth.uid()
    )
  );

-- TASK ATTACHMENTS
create policy "Team members can view attachments"
  on public.task_attachments for select to authenticated
  using (
    exists (
      select 1 from public.tasks
      join public.team_members on team_members.team_id = tasks.team_id
      where tasks.id = task_attachments.task_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Team members can upload attachments"
  on public.task_attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid() and
    exists (
      select 1 from public.tasks
      join public.team_members on team_members.team_id = tasks.team_id
      where tasks.id = task_attachments.task_id
      and team_members.user_id = auth.uid()
    )
  );

create policy "Uploader or team admin can delete attachments"
  on public.task_attachments for delete to authenticated
  using (
    uploaded_by = auth.uid() or
    exists (
      select 1 from public.tasks
      join public.team_members on team_members.team_id = tasks.team_id
      where tasks.id = task_attachments.task_id
      and team_members.user_id = auth.uid()
      and team_members.role in ('owner', 'admin')
    )
  );

-- NOTIFICATIONS
create policy "Users can only manage their own notifications"
  on public.notifications for all to authenticated
  using (user_id = auth.uid());

-- JOIN REQUESTS
create policy "Users can view and create their own join requests"
  on public.join_requests for select to authenticated
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.teams
      where teams.id = join_requests.team_id
      and teams.owner_id = auth.uid()
    )
  );

create policy "Users can insert join requests"
  on public.join_requests for insert to authenticated
  with check (user_id = auth.uid());

create policy "Team owners/admins can update join requests"
  on public.join_requests for update to authenticated
  using (
    exists (
      select 1 from public.teams
      where teams.id = join_requests.team_id
      and teams.owner_id = auth.uid()
    )
  );

-- ACTIVITY LOGS
create policy "Users can view and create their own activity logs"
  on public.activity_logs for all to authenticated
  using (user_id = auth.uid());

-- USER SECURITY
create policy "Users can manage their own security pin"
  on public.user_security for all to authenticated
  using (user_id = auth.uid());

