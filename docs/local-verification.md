# Local security-foundation verification

Date: 2026-08-26

Branch: `security-foundation`

Production baseline: `74702c54273f3df1517db826211de25dc9345215`

This report covers local and read-only checks only. No Supabase migration, Edge
Function deployment, key rotation, Auth change, Cron change, GitHub push, merge,
or GitHub Pages publication was performed.

## Passed locally

- `script.js` and `sw.js` pass `node --check`.
- All TypeScript files under `supabase/functions` pass Node's strip-types syntax
  check.
- `manifest.webmanifest` parses as JSON and includes a stable PWA id.
- `supabase/config.toml` parses with Python `tomllib`.
- The GitHub Actions workflow passes static structure checks. A full YAML parser
  is not installed in this workstation environment.
- All 19 Node tests pass, including optimistic-concurrency conflicts, streaming
  request limits, notification privacy, safe device deletion, and validation
  limits.
- The current production payload backup is accepted without alteration by the
  new validator: schema version 34, 5 calendars, 145,326 JSON bytes.
- The private pre-security backup passes 74 integrity and structural checks.
- Secret scans report zero private-key, secret-key, or non-empty secret-env
  values in the worktree and all 32 Git commits.
- `git diff --check` reports no whitespace errors.
- Local browser checks passed at 1440x900, 390x844, and 360x800 with no
  horizontal overflow or console errors. Signed-out planner content is hidden,
  inert, and excluded from the accessibility tree.
- Every asset in the service-worker cache list returned HTTP 200 from the local
  server.

## Read-only Supabase Advisors

Security Advisor currently reports only the two pre-existing warnings:

1. `extension_in_public`: `pg_net` is installed in the `public` schema.
2. `auth_leaked_password_protection`: leaked-password protection is disabled.

Performance Advisor reports zero findings.

These results describe the unchanged production project. The local migrations
and Edge Functions have not been applied to Supabase.

## Still pending

- Run `supabase start` and `supabase test db` in GitHub CI or another Docker
  environment to execute the 21 pgTAP database assertions.
- Test authenticated user and Cron Edge Functions in an isolated Supabase test
  environment before any production deployment.
- Test real Web Push delivery, subscription repair, offline recovery, and PWA
  update on the owner's iPhone and laptop.
- Confirm the owner's iPhone login before disabling public sign-up.
- Re-run Security and Performance Advisors after approved schema changes.
- Push only the review branch first; production `main`, GitHub Pages, and
  Supabase must remain unchanged until separately approved.
