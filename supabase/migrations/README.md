# Crest migrations

`20260825000000_remote_state_baseline.sql` is an idempotent schema snapshot derived
from the production database audited on 2026-08-25. It intentionally contains no
rows, owner UUID, secret values, or cron command.

`20260825001000_security_foundation.sql` establishes owner-only RLS and optimistic
concurrency. Production received the reviewed migration after a private backup and
the isolated CI checks passed.

`20260827000000_switch_reminder_cron_dispatch.sql` preserves the existing Cron job
and Vault lookup while switching only the Edge Function path to the dedicated,
secret-protected dispatcher.

The six historical production migration statements are retained only in the private
recovery point because their earliest statement assumes that `progress_sync` already
exists. The baseline file is the reproducible starting point for a fresh local stack.

Do not apply these migrations to production before:

1. validating them in an isolated local stack or approved Supabase branch;
2. reviewing the generated diff;
3. confirming the production user count is still exactly one;
4. taking a fresh data export;
5. obtaining explicit rollout approval.
