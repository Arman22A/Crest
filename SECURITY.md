# Crest security foundation

This branch prepares the security rollout without changing production. AI, OpenAI,
voice input, and function calling are intentionally outside this work.

## Trust boundaries

- GitHub Pages serves public static files and the public sign-in screen.
- The browser contains only the Supabase project URL, publishable key, and public
  VAPID key. These values are intentionally public and carry no privileged access.
- `crest-user-api` requires the platform JWT check, `@supabase/server@1.4.1` user
  authentication, a server-side owner ID, database allowlisting, and RLS.
- `crest-cron-dispatch` is a separate service endpoint. It accepts only the
  scheduler secret, uses constant-time comparison, and has no user actions.
- The old mixed `crest-api` remains available only during migration and rollback.
- VAPID private material and scheduler credentials belong in Supabase Edge Function
  Secrets or Vault. They must never be placed in the repository or browser.

## Database protection

The prepared migration creates a private owner allowlist without committing the
owner UUID. Its seed operation must be run explicitly after production is confirmed
to have exactly one active, confirmed Auth user.

RLS policies grant the allowlisted owner access only to rows whose `user_id` equals
`auth.uid()`. Anonymous and non-allowlisted users receive no rows. `sync_id` is tied
to `user_id`, and the existing partial unique index prevents two progress rows for
one account.

`crest_push_progress` is `SECURITY INVOKER`. It performs revision comparison and the
write in one PostgreSQL statement scope. A stale `baseRevision` returns the current
server state as a conflict instead of overwriting it.

Rate limits are stored atomically in PostgreSQL:

| Action | Limit |
| --- | ---: |
| pull | 120 per minute |
| push | 60 per minute |
| subscribe | 12 per minute |
| unsubscribe | 12 per minute |
| test_notification | 3 per 10 minutes |
| future_expensive | 5 per minute |

## Validation limits

Limits were selected after measuring the production row on 2026-08-25. PostgreSQL
reported about 101 KB for the JSONB value and its JSON transfer form is about 145 KB;
it contains a 73 KB profile photo, 5 calendars, 139 day plans, and 199 tasks.

- HTTP request: 1,200,000 bytes
- progress payload: 1 MiB
- JSON depth: 12; JSON values: 25,000
- calendars: 20; task types: 50
- day records: 5,000; tasks: 10,000; tasks per day: 100
- task title: 160; task description: 1,500; notes: 20,000 characters
- profile photo data URL: 600,000 characters
- goals: 100
- content items: 1,000; content templates: 200
- content long text: 20,000 characters
- reminder days: 60; reminders per day: 100; serialized reminder data: 256 KiB
- push endpoint: HTTPS only, at most 2,048 characters

## Device data

Normal sign-out keeps the per-user local copy. The separate destructive option first
saves progress, revokes the device notification endpoint, signs out locally, and
only then removes `crest-user-<user-id>`. It does not delete the shared offline PWA
cache. Any failed prerequisite stops deletion.

Notification text defaults to `neutral`, which does not expose task names on the
lock screen. The detailed mode is an explicit user choice.

## Reproducibility

- `supabase/config.toml` records function JWT modes.
- `supabase/migrations` contains the audited baseline and prepared security change.
- `supabase/tests/database` contains pgTAP allow/deny, OCC, and rate-limit tests.
- `tests` contains static, validation, PWA, and concurrency model tests.
- `.env.example` lists required variable names without values.
- GitHub Actions and runtime imports are version-pinned.

The private recovery point is stored outside the repository. It contains a complete
Git bundle, schema, actual migration history, RLS/grant inventory, cron inventory,
Edge source, current/backup rows, checksums, and a restore guide. Secret values are
not exported.

## Staged rollout

No production step is automatic. The required order is:

1. Test migrations and pgTAP in an isolated Supabase runtime.
2. Recheck the single confirmed Auth user and take a fresh private export.
3. Apply schema migration and explicitly seed the owner allowlist.
4. Set Edge Function secret values without displaying them.
5. Deploy `crest-user-api` with `verify_jwt=true` and test JWT/owner denial paths.
6. Deploy `crest-cron-dispatch` without changing the existing cron job.
7. Switch a local client to the new user API and test laptop synchronization.
8. Test the installed iPhone PWA with the owner.
9. Only then request approval to change cron and disable Auth signup.
10. Rotate/move VAPID and remove legacy data only under separate approvals.

Rollback keeps the old function and current cron untouched until the replacement is
verified. The browser switch `secureCloudRollout` remains `false` in this branch.

## Current remote findings

These remain open until production changes are approved and verified:

- Auth signup is still enabled. It must remain enabled until iPhone login is
  confirmed; hiding the form alone is not a security control.
- Supabase leaked-password protection is disabled. Enabling it may require a plan or
  Dashboard action and must be verified after change.
- the `pg_net` extension is reported in the public schema by Security Advisor. Its
  remediation must be tested before moving an extension used by cron.
- the current production Edge Function is mixed and has `verify_jwt=false`.
- active Web Push subscriptions were zero at audit time.

Supabase references:

- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/changelog?types=breaking-change

The breaking-change review also found Supabase's 2026 Data API exposure change. This
repository therefore uses explicit grants and RLS instead of assuming that a new
`public` table is reachable or protected by defaults.
