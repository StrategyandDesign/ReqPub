# Security

## Write semantics, stated plainly

Client writes retry only on transient failures (timeouts, 5xx, network
loss) with exponential backoff; definitive errors return immediately. A
response lost at the network layer after a successful write means retries
are at-least-once. Field and row writes are safe under this: they go
through rev-checked server RPCs, so a replay is rejected as stale. Direct
inserts without a natural unique key (approval slots) can, rarely, duplicate
on a lost response; slots are manager-visible and manager-editable, and the
provenance trigger stamps every row, so a duplicate is evident and
removable, never silent. Project creation deduplicates by key.

Brand logos are accepted only as data:image URIs (png, jpeg, gif, webp,
svg+xml), size-capped, and the whitelist is enforced at every render
surface (workspace preview, external brief, printed exports), with all
attributes escaped.

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
- The invite email function verifies, under the caller's own identity, that they
  have already added the recipient to a workspace they manage (a row visible to
  them only under the manager-scoped policy) before sending, so it cannot be used
  to email arbitrary addresses.
- Realtime channels are private. Members receive and send; client contacts (the `partner` role) receive
  only; anonymous visitors have no channel access. Database state is never
  writable through realtime.
- The `activity` table is append-only (no update or delete policies exist) and
  is written by SECURITY DEFINER functions.
- A version's baseline fingerprint is SHA-256 over the canonical JSON (object
  keys sorted, arrays in order, UTF-8) of `{label, seq, snapshot}` as stored.
  It identifies the exact baseline an export was produced from and recomputes
  from the stored row alone; it is NOT a signature or a trusted timestamp -
  cryptographic sealing is the e-signature phase, and no sealing claim is made
  before it ships.
- The frontend ships a CSP with no inline scripts, escapes every interpolation
  through a single helper, and holds no secret beyond the public anon key.

## Independent audit

Before external review the code passed two independent adversarial audits (SQL/RLS
and frontend/XSS) run against the actual code. Findings and fixes are recorded in
`docs/AUDIT.md`; the hardening fixes ship with regression tests in the backend
suite (215 checks).

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
- Uploads are virus-scanned only when a scanner (`SCAN_URL`) is configured. With
  none set, a file stores flagged `unscanned`; a scanner error stores `error`
  unless `SCAN_FAIL_CLOSED` is enabled. Configure a private scanner (for example a
  self-hosted ClamAV REST service) and `SCAN_FAIL_CLOSED` in production; see
  `docs/ATTACHMENTS.md`.
- The `attachment-upload` function reflects a permissive CORS origin. It
  authorizes by bearer JWT (team, client contact) or the SME reply token, not by
  cookies, so a cross-origin request carries no ambient authority and CORS is not
  its trust boundary; a leaked token would be the concern. `send-invite`
  restricts its origin to the app URL.
