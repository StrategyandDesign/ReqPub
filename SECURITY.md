# Security

## Reporting

Report suspected vulnerabilities privately to the workspace owner (see the
repository contact). Do not open public issues for security reports. Include
reproduction steps and, where relevant, the org and project involved. You will
get an acknowledgment, and fixes ship as a schema and/or frontend release with
notes in CHANGELOG.md.

## Model, in brief

Full detail lives in `docs/ARCHITECTURE.md` §3. The essentials:

- Every table carries row-level security scoped to the organization. Membership
  checks run through SECURITY DEFINER helpers to avoid RLS recursion.
- Worksheet fields and rows cannot be written directly: the rev-checked RPCs
  (`save_field`, `upsert_row`, `delete_row`) are the only mutation path, so
  concurrency checks and size ceilings cannot be bypassed by a modified client.
- Team identity on messages and team notes is stamped server-side from the
  signed-in user's profile; a client-supplied name is ignored.
- Anonymous endpoints (SME submissions, request intake, SME replies) are token
  gated with 144-bit random tokens and rate limited per project, request, and
  thread. Share-link payloads are curated subsets that never contain fit
  criteria, schedules, or internal notes.
- Share tokens cannot be hijacked across organizations: publishing a link is
  fenced to the caller's own org and project.
- Realtime channels are private. Members receive and send; partners receive
  only; anonymous visitors have no channel access. Database state is never
  writable through realtime.
- The `activity` table is append-only (no update or delete policies exist) and
  is written by SECURITY DEFINER functions.
- The frontend ships a CSP with no inline scripts, escapes every interpolation
  through a single helper, and holds no secret beyond the public anon key.

## Independent audit

Before external review the code passed two independent adversarial audits (SQL/RLS
and frontend/XSS) run against the actual code. Findings and fixes are recorded in
`docs/AUDIT.md`; the hardening fixes ship with regression tests in the backend
suite (148 checks).

## Accepted residual risks

Documented deliberately rather than hidden:

- `style-src 'unsafe-inline'` remains in the CSP (the UI uses inline style
  attributes). Script injection is the XSS vector that matters and is closed.
- A signed-in org member can send client broadcasts on project channels; other
  clients treat them as view hints only, and the database rejects any write
  that does not pass the rev-checked RPCs. Members are trusted internal staff.
- Supabase project administrators can alter data with SQL, outside the
  in-app audit trail. That boundary belongs to Supabase access control:
  restrict dashboard access accordingly.
