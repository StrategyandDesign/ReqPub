# Changelog

## 2.1.0 — hardening release

Security

- Fixed a cross-org share overwrite: `share_put` now fences its conflict path
  to the caller's own org and project, so a colliding or guessed token
  belonging to another workspace is refused instead of updated.
- Rate limits on all anonymous endpoints: SME submissions (60/hour per project
  per origin), request intake (30/hour per request), SME thread replies
  (30/hour per thread).
- Realtime send (presence, client broadcast) restricted to org members;
  partners now receive only. Database writes were never possible via realtime.
- Team author identity on messages and team notes is stamped server-side from
  the signed-in profile; client-supplied names are ignored for team entries.
- Size ceilings: 256 KB per worksheet answer, 128 KB per row (enforced in the
  RPCs), 20 KB per comm/message body (CHECK constraints on new writes).

Correctness and resilience

- `durable()` no longer retries definitive PostgREST errors (permission,
  constraint, missing function); retries are reserved for genuine network
  failures. Permission errors now surface immediately instead of after 2.5s.
- Render errors show a recovery screen instead of a blank page.
- Session expiry or sign-out in another tab returns the app to the login page.
- New index `comms(org_id, created_at)` for dashboard rollups.
- `verify.sql` now also checks broadcast availability, identity triggers, and
  size constraints.

Project hygiene

- LICENSE (proprietary), SECURITY.md, CHANGELOG.md, CI workflow running the
  domain and concurrency suites on every push.
- Backend e2e extended: cross-org token takeover attempt, anonymous rate-limit
  trip, server-stamped team identity, oversize-payload rejection, and
  viewer-role RLS checks executed under the `authenticated` role.
- Accessibility: dialogs carry `role="dialog"` and `aria-modal`; the command
  palette input is labeled.

## 2.0.0 — relational rebuild

- Ground-up rebuild from the v1 key-value architecture: relational schema,
  rev-checked field saves, insert-based rows with permanent requirement IDs,
  server-allocated version numbers, realtime broadcast with presence, approval
  workflow, append-only audit trail, accountless SME threads, partner portal,
  per-user read receipts, dark mode, command palette, full data migration from
  v1 with legacy links preserved.
