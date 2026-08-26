begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@crest.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@crest.test');

insert into private.crest_app_owners (user_id)
values ('11111111-1111-4111-8111-111111111111');

insert into public.progress_sync (sync_id, user_id, payload, revision) values
  ('user:11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '{"source":"initial"}', 1),
  ('user:22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', '{"source":"other"}', 1);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.progress_sync'::regclass),
  'progress_sync has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.push_subscriptions'::regclass),
  'push_subscriptions has RLS enabled'
);
select has_index('public', 'progress_sync', 'progress_sync_user_id_key', 'one progress row per user is indexed uniquely');
select function_privs_are(
  'public', 'crest_push_progress', array['bigint', 'jsonb'], 'authenticated', array['EXECUTE'],
  'authenticated can call only the RLS-scoped OCC operation'
);
select ok(
  has_table_privilege('authenticated', 'public.progress_sync', 'SELECT,INSERT,UPDATE'),
  'authenticated has only the operations needed for progress synchronization'
);
select ok(
  not has_table_privilege('authenticated', 'public.progress_sync', 'DELETE'),
  'authenticated cannot delete the cloud progress row'
);

set local role anon;
select throws_ok(
  $$select count(*) from public.progress_sync$$,
  '42501',
  null,
  'anonymous callers have no table privilege to read progress'
);
select throws_ok(
  $$select * from public.crest_push_progress(1, '{}'::jsonb)$$,
  '42501',
  null,
  'anonymous callers cannot execute progress writes'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*) from public.progress_sync$$,
  array[1::bigint],
  'the allowlisted owner sees only their row'
);
select results_eq(
  $$select result_status, current_revision from public.crest_push_progress(1, '{"device":"phone"}'::jsonb)$$,
  $$values ('saved'::text, 2::bigint)$$,
  'the first device saves revision 2'
);
select results_eq(
  $$select result_status, current_revision from public.crest_push_progress(1, '{"device":"laptop"}'::jsonb)$$,
  $$values ('conflict'::text, 2::bigint)$$,
  'a stale second device receives a conflict instead of overwriting'
);
select results_eq(
  $$select payload->>'device' from public.progress_sync$$,
  array['phone'::text],
  'the stale write did not replace the stored payload'
);
select throws_ok(
  $$update public.progress_sync set user_id = '22222222-2222-4222-8222-222222222222' returning 1$$,
  '42501',
  null,
  'the owner cannot reassign row ownership'
);

select ok(public.crest_consume_rate_limit('test_notification'), 'test notification request 1 is allowed');
select ok(public.crest_consume_rate_limit('test_notification'), 'test notification request 2 is allowed');
select ok(public.crest_consume_rate_limit('test_notification'), 'test notification request 3 is allowed');
select is(public.crest_consume_rate_limit('test_notification'), false, 'test notification request 4 is rate limited');
select throws_ok(
  $$select private.consume_crest_rate_limit('test_notification', 1000, 1)$$,
  '42501',
  null,
  'authenticated callers cannot bypass fixed limits through the private helper'
);
select throws_ok(
  $$select private.is_crest_owner()$$,
  '42501',
  null,
  'authenticated callers cannot invoke the private allowlist helper directly'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select results_eq(
  $$select count(*) from public.progress_sync$$,
  array[0::bigint],
  'a non-allowlisted authenticated user cannot read even their own seeded row'
);
select throws_ok(
  $$insert into public.progress_sync (sync_id, user_id, payload) values ('user:22222222-2222-4222-8222-222222222222-x', '22222222-2222-4222-8222-222222222222', '{}')$$,
  '42501',
  null,
  'a non-allowlisted user cannot create progress'
);

select * from finish();
rollback;
