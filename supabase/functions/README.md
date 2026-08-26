# Edge Functions

- `_shared`: strict request validation and non-sensitive HTTP responses.
- `crest-user-api`: JWT-authenticated owner API with RLS-scoped database access.
- `crest-cron-dispatch`: scheduler-only reminder dispatcher.
- `crest-api`: unchanged legacy mixed gateway retained for rollback and old-device
  migration until separate cleanup approval.

The legacy source was copied byte-for-byte from the private recovery point. It uses
the platform-provided `SUPABASE_SERVICE_ROLE_KEY`; the replacement functions use
the current `@supabase/server` environment contract. No key values are stored here.

Pinned remote imports:

- `@supabase/server@1.4.1`
- `web-push@3.6.7`

Do not deploy either new function until the migration, owner allowlist, environment
variable names, and denial tests are reviewed. Never put `.env` files in Git.
