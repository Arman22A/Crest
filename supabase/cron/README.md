# Reminder cron

Production currently runs `crest-dispatch-reminders` once per minute. The live job
calls the legacy mixed function and reads its scheduler secret from Vault.

The security rollout will create a separate call to `crest-cron-dispatch`. The
scheduler secret must remain in Supabase Secrets or Vault and must never be written
directly into a migration, cron command, repository file, response, or log.

The existing cron job is deliberately not changed by this branch. Its exact current
configuration is stored only in the private recovery point. Changing it is a remote
production action that requires explicit approval after the new function is tested.
