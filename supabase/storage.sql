-- ==========================================
-- Supabase Storage Bucket Setup
-- ==========================================

-- Insert bucket for task attachments if not exists
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Authenticated users can upload task attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'task-attachments');

create policy "Authenticated users can view task attachments"
  on storage.objects for select to authenticated
  using (bucket_id = 'task-attachments');

create policy "Users can delete own uploads or team owners can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'task-attachments' and (auth.uid() = owner));

