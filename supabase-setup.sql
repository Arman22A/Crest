create table if not exists public.progress_sync (
  sync_code text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.progress_sync to anon, authenticated;

alter table public.progress_sync enable row level security;

drop policy if exists "progress_sync_select" on public.progress_sync;
drop policy if exists "progress_sync_insert" on public.progress_sync;
drop policy if exists "progress_sync_update" on public.progress_sync;

create policy "progress_sync_select"
on public.progress_sync
for select
using (true);

create policy "progress_sync_insert"
on public.progress_sync
for insert
with check (true);

create policy "progress_sync_update"
on public.progress_sync
for update
using (true)
with check (true);
