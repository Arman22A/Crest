-- Prepared locally. Do not apply to production without an approved rollout.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

create table if not exists private.crest_app_owners (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table private.crest_app_owners enable row level security;
revoke all on private.crest_app_owners from public, anon, authenticated;

-- Run this operation explicitly only after the target Auth state is reviewed. It
-- never places the UUID in source control and fails closed on an unexpected state.
create or replace function private.seed_crest_owner_from_single_auth_user()
returns void
language plpgsql
security definer
set search_path = ''
as $crest_owner_seed$
declare
  eligible_count integer;
begin
  select count(*)
    into eligible_count
    from auth.users
   where email_confirmed_at is not null
     and deleted_at is null
     and (banned_until is null or banned_until <= now());

  if eligible_count <> 1 then
    raise exception 'Crest owner seed requires exactly one confirmed active Auth user; found %', eligible_count;
  end if;

  insert into private.crest_app_owners (user_id)
  select id
    from auth.users
   where email_confirmed_at is not null
     and deleted_at is null
     and (banned_until is null or banned_until <= now())
  on conflict (user_id) do nothing;
end
$crest_owner_seed$;

revoke all on function private.seed_crest_owner_from_single_auth_user() from public, anon, authenticated, service_role;

create or replace function private.is_crest_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
      from private.crest_app_owners as owner
      join auth.users as auth_user on auth_user.id = owner.user_id
     where owner.user_id = (select auth.uid())
       and auth_user.email_confirmed_at is not null
       and auth_user.deleted_at is null
       and (auth_user.banned_until is null or auth_user.banned_until <= now())
  );
$function$;

revoke all on function private.is_crest_owner() from public, anon, authenticated, service_role;
grant execute on function private.is_crest_owner() to authenticated;

alter table public.progress_sync
  drop constraint if exists progress_sync_payload_object_check,
  drop constraint if exists progress_sync_payload_size_check,
  drop constraint if exists progress_sync_revision_check,
  drop constraint if exists progress_sync_owner_shape_check;

alter table public.progress_sync
  add constraint progress_sync_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  add constraint progress_sync_payload_size_check
    check (pg_column_size(payload) <= 1048576),
  add constraint progress_sync_revision_check
    check (revision >= 1),
  add constraint progress_sync_owner_shape_check
    check (user_id is null or sync_id = 'user:' || user_id::text);

alter table public.push_subscriptions
  add column if not exists privacy_mode text not null default 'neutral';

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_owner_shape_check,
  drop constraint if exists push_subscriptions_endpoint_https_check,
  drop constraint if exists push_subscriptions_endpoint_length_check,
  drop constraint if exists push_subscriptions_subscription_object_check,
  drop constraint if exists push_subscriptions_subscription_size_check,
  drop constraint if exists push_subscriptions_device_name_length_check,
  drop constraint if exists push_subscriptions_timezone_length_check,
  drop constraint if exists push_subscriptions_reminder_days_object_check,
  drop constraint if exists push_subscriptions_reminder_days_size_check,
  drop constraint if exists push_subscriptions_privacy_mode_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_owner_shape_check
    check (user_id is null or sync_id = 'user:' || user_id::text),
  add constraint push_subscriptions_endpoint_https_check
    check (endpoint ~ '^https://'),
  add constraint push_subscriptions_endpoint_length_check
    check (length(endpoint) between 12 and 2048),
  add constraint push_subscriptions_subscription_object_check
    check (jsonb_typeof(subscription) = 'object'),
  add constraint push_subscriptions_subscription_size_check
    check (pg_column_size(subscription) <= 16384),
  add constraint push_subscriptions_device_name_length_check
    check (length(device_name) between 1 and 80),
  add constraint push_subscriptions_timezone_length_check
    check (length(timezone) between 1 and 100),
  add constraint push_subscriptions_reminder_days_object_check
    check (jsonb_typeof(reminder_days) = 'object'),
  add constraint push_subscriptions_reminder_days_size_check
    check (pg_column_size(reminder_days) <= 262144),
  add constraint push_subscriptions_privacy_mode_check
    check (privacy_mode in ('neutral', 'detailed'));

drop policy if exists deny_public_access on public.progress_sync;
drop policy if exists progress_sync_owner_select on public.progress_sync;
drop policy if exists progress_sync_owner_insert on public.progress_sync;
drop policy if exists progress_sync_owner_update on public.progress_sync;
drop policy if exists progress_sync_owner_delete on public.progress_sync;

revoke all on public.progress_sync from public, anon, authenticated;
grant select, insert, update on public.progress_sync to authenticated;

create policy progress_sync_owner_select
  on public.progress_sync for select to authenticated
  using ((select auth.uid()) = user_id and (select private.is_crest_owner()));
create policy progress_sync_owner_insert
  on public.progress_sync for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and sync_id = 'user:' || (select auth.uid())::text
    and (select private.is_crest_owner())
  );
create policy progress_sync_owner_update
  on public.progress_sync for update to authenticated
  using ((select auth.uid()) = user_id and (select private.is_crest_owner()))
  with check (
    (select auth.uid()) = user_id
    and sync_id = 'user:' || (select auth.uid())::text
    and (select private.is_crest_owner())
  );
drop policy if exists deny_public_access on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_select on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_update on public.push_subscriptions;
drop policy if exists push_subscriptions_owner_delete on public.push_subscriptions;

revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create policy push_subscriptions_owner_select
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id and (select private.is_crest_owner()));
create policy push_subscriptions_owner_insert
  on public.push_subscriptions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and sync_id = 'user:' || (select auth.uid())::text
    and (select private.is_crest_owner())
  );
create policy push_subscriptions_owner_update
  on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id and (select private.is_crest_owner()))
  with check (
    (select auth.uid()) = user_id
    and sync_id = 'user:' || (select auth.uid())::text
    and (select private.is_crest_owner())
  );
create policy push_subscriptions_owner_delete
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id and (select private.is_crest_owner()));

create or replace function public.crest_push_progress(
  p_base_revision bigint,
  p_payload jsonb
)
returns table (
  result_status text,
  current_revision bigint,
  server_updated_at timestamptz,
  server_payload jsonb
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  saved public.progress_sync%rowtype;
begin
  if caller_id is null then
    raise insufficient_privilege using message = 'Authenticated user required';
  end if;
  if p_base_revision is null or p_base_revision < 0 then
    raise invalid_parameter_value using message = 'base revision must be zero or greater';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise invalid_parameter_value using message = 'payload must be a JSON object';
  end if;

  if p_base_revision = 0 then
    insert into public.progress_sync (sync_id, user_id, payload, revision, updated_at)
    values ('user:' || caller_id::text, caller_id, p_payload, 1, clock_timestamp())
    on conflict (sync_id) do nothing
    returning * into saved;

    if found then
      return query select 'saved'::text, saved.revision, saved.updated_at, saved.payload;
      return;
    end if;
  end if;

  update public.progress_sync
     set payload = p_payload,
         revision = revision + 1,
         updated_at = clock_timestamp()
   where user_id = caller_id
     and revision = p_base_revision
  returning * into saved;

  if found then
    return query select 'saved'::text, saved.revision, saved.updated_at, saved.payload;
    return;
  end if;

  select *
    into saved
    from public.progress_sync
   where user_id = caller_id;

  if found then
    return query select 'conflict'::text, saved.revision, saved.updated_at, saved.payload;
  else
    return query select 'conflict'::text, 0::bigint, null::timestamptz, null::jsonb;
  end if;
end
$function$;

revoke all on function public.crest_push_progress(bigint, jsonb) from public, anon;
grant execute on function public.crest_push_progress(bigint, jsonb) to authenticated;

create table if not exists private.crest_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, action)
);

alter table private.crest_rate_limits enable row level security;
revoke all on private.crest_rate_limits from public, anon, authenticated;

create or replace function private.consume_crest_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  bucket timestamptz;
  next_count integer;
begin
  if caller_id is null or not (select private.is_crest_owner()) then
    raise insufficient_privilege using message = 'Crest owner authorization required';
  end if;
  if p_action not in ('pull', 'push', 'subscribe', 'unsubscribe', 'test_notification', 'future_expensive') then
    raise invalid_parameter_value using message = 'unknown rate-limit action';
  end if;
  if p_limit < 1 or p_limit > 1000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise invalid_parameter_value using message = 'invalid rate-limit parameters';
  end if;

  bucket := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.crest_rate_limits (
    user_id, action, window_started_at, request_count, updated_at
  ) values (
    caller_id, p_action, bucket, 1, clock_timestamp()
  )
  on conflict (user_id, action) do update
     set window_started_at = excluded.window_started_at,
         request_count = case
           when private.crest_rate_limits.window_started_at = excluded.window_started_at
             then private.crest_rate_limits.request_count + 1
           else 1
         end,
         updated_at = clock_timestamp()
  returning request_count into next_count;

  return next_count <= p_limit;
end
$function$;

revoke all on function private.consume_crest_rate_limit(text, integer, integer) from public, anon, authenticated, service_role;

create or replace function public.crest_consume_rate_limit(p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return case p_action
    when 'pull' then private.consume_crest_rate_limit('pull', 120, 60)
    when 'push' then private.consume_crest_rate_limit('push', 60, 60)
    when 'subscribe' then private.consume_crest_rate_limit('subscribe', 12, 60)
    when 'unsubscribe' then private.consume_crest_rate_limit('unsubscribe', 12, 60)
    when 'test_notification' then private.consume_crest_rate_limit('test_notification', 3, 600)
    when 'future_expensive' then private.consume_crest_rate_limit('future_expensive', 5, 60)
    else false
  end;
end
$function$;

revoke all on function public.crest_consume_rate_limit(text) from public, anon;
grant execute on function public.crest_consume_rate_limit(text) to authenticated;
