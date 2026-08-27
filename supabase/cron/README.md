# Reminder cron

Production runs `crest-dispatch-reminders` once per minute and reads its scheduler
secret from Vault.

`20260827000000_switch_reminder_cron_dispatch.sql` changes only the Edge Function
path from `crest-api` to `crest-cron-dispatch`. It preserves the existing command,
schedule, active state, and Vault lookup. The scheduler secret must remain in
Supabase Secrets or Vault and must never be written directly into a migration,
repository file, response, or log.

The migration is idempotent and fails closed when an existing job contains an
unexpected command. Rollback uses the same `cron.alter_job` operation to replace
`/crest-cron-dispatch` with `/crest-api`; the exact command remains only in Supabase
and the private recovery point.
