# Changelog

## 2.11.0 — trackable partner notes; cleaner sign-in copy

- Every partner note now gets a stable per-project reference (PN-1, PN-2, …) and
  a self-describing headline taken from its first line, so two notes never read
  the same "Partner note" in the inbox. The reference shows as a small monospace
  chip beside the note; the team can cite "PN-4" in conversation, and the partner
  sees the same reference on their own thread.
- References come from a monotonic per-project counter, so a number is never
  reused even if a note is later deleted — a given PN-N always means one note.
  Existing partner notes are backfilled with references and headlines.
- Sign-in copy: dropped the dash and the "same door" line for a plain
  "One sign-in for your team workspace and your partner portal."
- Apply supabase/fix-partner-notes.sql (idempotent; adds the reference column +
  counter, updates partner_post/partner_thread_v2, backfills), then re-upload the
  folder. New backend test covers reference allocation, monotonicity across a
  deletion, headline snippets, and backfill (10 checks). Full suite: 186.


## 2.10.2 — partners and SMEs see their own uploaded files

- A partner (and a seated SME) now sees the files they uploaded on their own
  thread, and they persist across reloads and return visits — not just a
  session-only confirmation. partner_thread_v2 and sme_thread now return each
  thread's attachments, scoped exactly like the messages those parties already
  read (no new exposure). After an upload the app refreshes that thread, so the
  file appears immediately and stays.
- Apply by re-running supabase/fix-attachments.sql (idempotent — it now also
  redefines those two thread reads), then re-upload the folder. No storage or
  edge-function change. Backend test now covers both thread reads returning the
  uploader's own files (18 checks); full suite 176.


## 2.10.1 — attachments post cleanly with no scanner configured

- With no virus scanner wired, uploads now post as ordinary files: the toast
  reads "Uploaded", and there is no "not yet scanned" flag on the chip or in the
  Files list. The audit record still stores the true scan_status; the UI simply
  doesn't badge the normal, scanner-off state.
- Flags are reserved for genuinely notable states: "scan failed" when a scanner
  is configured but unreachable (and "blocked" for infected, which never stores).
  Set SCAN_URL later and clean files show "scanned clean" — no other change.
- Frontend only; no SQL and no edge-function redeploy. Re-upload the folder.


## 2.10.0 — file attachments (with virus scanning)

Partners, seated SMEs, and the team can now attach documents to a conversation —
PDFs, Office files, text/CSV/Markdown, images, zips. Files are virus-scanned on
the way in, stored privately, and reachable only through short-lived signed links.

- Where they land: on the thread they came in on (Inbox → conversation), plus a
  per-PRD roll-up under Access → "Files from reviewers". The team downloads from
  either; new files appear live.
- Where they're stored: a private Supabase Storage bucket, one metadata row per
  file in a new attachments table, scoped by the same row-level security as
  everything else. Not in the database as bytes — signed URLs only.
- Uploaders: the team (any thread), partners (their note threads), and seated
  SMEs (their durable workspace link). Anonymous one-off brief links cannot
  upload — every uploader is a known party. 25 MB cap, type allow-list, 40/hour.
- Virus scan: an edge function (attachment-upload) type/size-checks and scans
  each file before storing it. Infected files are rejected and never stored;
  clean files store plainly; if the scanner isn't configured or is unavailable
  the file is stored and flagged (amber "unscanned"), so nothing unsafe is ever
  mistaken for cleared. Point SCAN_URL at a private ClamAV REST service; set
  SCAN_FAIL_CLOSED=true to block instead of flag on scanner outages.
- Defense in depth: attachment_add re-validates type, size, thread ownership,
  rejects infected, rate-limits, and writes every upload to the audit log — so
  even a bug in the function cannot persist an unsafe or cross-tenant file.

Setup is three steps (fix-attachments.sql, storage-attachments.sql, deploy the
edge function) plus optional scanner config — see docs/ATTACHMENTS.md. New
backend test proves the guards, authorization resolvers, RLS, and rate limit
against a real Postgres (16 checks). Full suite: 174.


## 2.9.1 — wider subtitles; landing black band aligned

- Team dashboard and partner-portal subtitles were capped narrow (520/560px) and
  wrapped early; widened to 760px so the intro line runs further across.
- Landing page: the black "Projects don't fail at the build" band was the only
  single-column statement section left-aligned while the others (judgment, the
  section headers, pricing, CTA) are centered — so it read as out of step. It is
  now centered to match, and its headline/paragraph widths were increased so the
  copy spans further across the band.


## 2.9.0 — durable SME workspaces (one link, one continuous thread)

Fixes the SME continuity problem: previously every SME interaction minted a new
link and a new thread, so one expert's exchanges scattered across many links and
were lost if a bookmark was, and the team saw fragmented inbox items ("where does
this land?"). Now each SME has one durable workspace per PRD.

- A manager "seats" an SME (name + email) on a PRD from Access → SME workspaces,
  and gets a stable personal link to send. Re-seating the same email returns the
  SAME link — one workspace per (PRD, SME), idempotent.
- The SME opens that link (no account, any device) and sees their workspace: the
  branded read-only PRD (always the latest published version, live brand) plus
  ONE continuous thread with the team. Everything they and the team exchange
  stays in that one place across every version. The link is the durable key, so
  it no longer depends on the SME's browser storage.
- The team sees one thread per SME per PRD, and a roster with reply counts.
- Backend: sme_seat / sme_seats added, sme_thread extended to carry the branded
  PRD. Apply supabase/fix-sme-workspace.sql (one idempotent file). New backend
  test proves idempotent seating, the branded PRD in the thread, a continuous
  ordered conversation over time, and the roster: 16 checks. Full suite: 158.

Also in this line: replies no longer double in the inbox (2.8.4), partners see
only review-ready PRDs with real names (2.8.2–2.8.3), the brand-logo overlay
(2.8.1), and one-click Approve on the dashboard card (2.8.0 line).


## 2.8.4 — fix replies doubling in the conversation log

- Fix: a team reply in the inbox appeared twice (identical, both "just now").
  Cause was a realtime race — the websocket echo of the inserted message often
  arrives before the HTTP insert response resolves, and the optimistic local
  add was not deduplicated, so the same message was appended twice.
- All message adds (optimistic and realtime) now go through one shared
  pushUnique helper that adds by id only if absent, so a reply lands exactly
  once no matter which path wins the race. New unit test covers both orderings,
  repeated echoes, and distinct messages that happen to share text (5 checks).


## 2.8.3 — partners see only review-ready PRDs; friendlier portal copy

- Partners now see a PRD only once the team has published a brief for it.
  Assignments still being drafted no longer appear in the portal (this also
  removes the internal-id cards entirely, rather than just relabeling them).
  partner_projects_v2 filters to projects that have a live brief share.
- Rewrote the partner home intro. It no longer explains the partner's own job
  back to them; it just says what the page is: "The PRDs assigned to you for
  review. Any note you send opens a thread with the team."
- fix-partner-portal.sql updated to the same filter — run that one file in
  Supabase to apply. Backend test updated: an assigned-but-unpublished PRD is
  now asserted hidden (12 checks); full suite still green.


## 2.8.2 — partner portal shows real PRD names

- Fix: in the partner portal, a PRD assigned to a partner before its brief was
  published showed the project's internal id (e.g. "pmr1muwemsaciw") as the card
  title. partner_projects_v2 now returns the project's actual name, and the
  portal uses it as the title fallback, so every assignment reads properly
  whether or not a brief has been published yet ("No published brief yet" still
  shows underneath until the team publishes one).
- Rolled the brand-logo overlay (2.8.1) and this name fix into a single
  supabase/fix-partner-portal.sql — run that one file in the SQL editor; it is
  idempotent and supersedes the earlier fix-brand-overlay.sql.
- Backend test now covers the name in the partner payload and an assigned-but-
  unpublished PRD (proves the title is the name, never the id): 13 checks.


## 2.8.1 — brand-logo overlay fix + one-click Approve

Brand logo now reaches every external viewer, whenever it is uploaded.
- Fix: a collaborator logo added to a PRD *after* its brief was shared did not
  appear on the partner's view (nor on SME brief / presentation links shared
  earlier), because external viewers read a version snapshot taken at share time
  and the logo is a current property of the project.
- The two server read paths (partner_projects_v2 and get_share) now overlay the
  project's live brand_logo/brand_label onto the payload at read time, so the
  current logo shows the moment it is saved — no re-publishing, no re-sharing.
  The stored snapshot is never mutated (read-time only). If no logo is set the
  overlay yields an empty string, never a broken image.
- Apply with supabase/fix-brand-overlay.sql (a small, standalone, re-runnable
  snippet) or by re-running the full schema.sql. New backend test (10 checks)
  proves the overlay against a real Postgres, including the exact "share first,
  upload logo later" sequence and the untouched-snapshot guarantee.

One-click Approve on the dashboard card.
- A manager can now clear "Draft" straight from the project card: an Approve
  button walks the latest version Draft → In review → Approved in a single
  action, so nobody has to open Version history to publish. Draft cards carry a
  one-line hint noting it sends for review, then approves.
- If named approvers are still pending, the card explains that and points to the
  Version history panel to decide them — the approval gate is still honored.
- Unchanged by design: saving a new version always creates a fresh Draft
  baseline; the card badge mirrors the newest version's status.


## 2.8.0 — stress-test PRDs for Collection Ventures

- Added supabase/seed-prds.sql (generated and validated) that seeds two fully
  filled PRDs into the Collection Ventures workspace as drafts for the nine-
  person team to stress-test:
  · Removes the BotYield PRD.
  · Clean-rebuilds "Fathering Excellence Profile" from the Fathers.com Platform
    Authority Document (vision, users, phased solution, 15 functional
    requirements, NFRs, AI-evaluation criteria for Voice and the knowledge
    agent, data/privacy, interfaces, the build team, and a glossary).
  · Creates "ReqPub Platform" — the platform described as its own PRD: what has
    shipped (relational core, live collaboration, approvals and audit, sharing
    and brand) and the next phase (SOC 2 Type II, e-signature with cryptographic
    sealing) as Should requirements.
- Both PRDs seed as filled drafts with no version yet, so the team generates
  v1.0, approves, and shares as part of the exercise. The seed is idempotent
  and targets the workspace named exactly "Collection Ventures."
- Generator (tools/) validates every field against the real question bank and
  assembles each PRD through the document builders before emitting SQL. New
  backend test (13 checks) proves the seed against a real Postgres: BotYield
  removed, clean rebuild, documents assemble, permanent FR ids, idempotent.


## 2.7.1 — landing page copy refresh (invitation-only positioning)

- Rewrote the landing page to the v2 copy: "The requirements record your
  client approves." Baseline / Gate / Export framing, the judgment line,
  client-review and change sections, three-audience block, a security section
  that states only what is live with an explicit "on the roadmap" note for
  e-signature and SOC 2 (published when they ship, not before), flat
  per-project pricing, and an invitation-only final CTA.
- All contact routes to team@reqpub.com (CTA button, body copy, footer).
- Neutral fictional example (Northwind Field Services); no competitor
  comparison; plain declarative style, zero em-dash tics; "client" language
  kept by design. Footer address: Bentonville, AR.
- Frontend-only; no test or schema impact.


## 2.7.0 — read-only presentation link (share the PRD, view-only)

- Any role can now share the branded PRD as a fixed, read-only link
  (#present/…). It renders the published, section-scoped brief with the
  assigned logo as a clean, account-free page — no review form, no threads,
  just the record and a Print / PDF button. It reuses the brief's own token,
  so it exposes nothing the brief link does not and is revoked alongside it.
- Where it lives, per role:
  · Manager — Share modal ("Anyone, read-only"), the Access hub, and a
    "Copy read-only link" button inside Presentation mode.
  · Viewer — the Access hub row (works whenever a brief is published).
  · SME — a "Share view" button on the brief page they already hold.
  · Partner — a "Share view" button on their portal project; a new
    partner_present_token RPC hands them the public token for their assigned
    project (surfacing an existing token only, creating nothing).
- The presentation page is immutable: it points at a specific published
  version, so what a recipient opens is exactly what was shared.
- Tests: three backend checks (assigned partner gets the token, non-assigned
  gets nothing, anon can open the payload) and a seven-point render check.
  Backend suite now 79 checks.


## 2.6.0 — PRD brand logo and a designed, co-branded PDF

- The internal team can assign a collaborator's logo to a PRD (Access tab →
  Brand on the shared PRD). Managers upload a PNG/JPG/SVG/WebP; it is
  downscaled to a print-safe logo entirely in the browser (no upload service),
  stored on the project, and size-capped in the database.
- The assigned logo travels with the published brief, so accountless SMEs and
  account-holding partners see it on the PRD they review — co-signed by a small
  ReqPub mark. Changing the logo re-publishes live briefs automatically.
- Print / Save-as-PDF is redesigned into a proper document: a full cover page
  led by the collaborator's logo, the product title, a status chip, a metadata
  rail (version, status, prepared-by, date), and the approval sign-off list;
  then the body with a running header, repeating table headers across pages,
  numeric page margins, and page-break control. The Word export cover carries
  the logo and approvals too.
- SME brief and partner project pages gained a Print / PDF button, so external
  reviewers can produce the branded document themselves.
- New tests: branded-payload unit test, three backend checks (assign, logo
  reaches an anonymous SME via the published brief, size-cap rejection), and a
  brand render check. Backend suite now 76 checks.


## 2.5.0 — pre-review security & correctness hardening

Ran two independent adversarial audits (SQL/RLS and frontend/XSS) against the
actual code and fixed every real finding. Full write-up in docs/AUDIT.md.

- Realtime: project-channel broadcast restricted to managers, so a read-only
  viewer can no longer push fabricated live edits onto teammates' screens; the
  client also ignores malformed broadcast payloads.
- partner_reply now requires current project access (a de-assigned partner can
  no longer reply on historical threads), matching partner_post.
- Write is explicitly revoked from `authenticated` on project_fields,
  field_rows, and activity, so their write-only-via-RPC protection is
  affirmative rather than resting on the inherited v1 blanket grant; activity
  gained a foreign key to orgs.
- Approval provenance trigger: approver rows start pending and decisions stamp
  decided_by from auth.uid(), so sign-off cannot be forged even by direct write.
- Anonymous rate limits are serialized with advisory locks (closing a TOCTOU
  race) and the submission cap counts all anon origins together.
- Migration attributes recovered submissions by the share's project, not the
  unauthenticated payload's project id.
- Numeric version-label CHECK constraint; null-safe Promote handlers; a
  top-level guard so any unexpected data shape surfaces as a toast, never a
  dead button.
- New indexes on partners(user_id) and partner_access(project_id).
- Backend suite grew to 73 checks (nine new hardening assertions); verify.sql
  gained six hardening checks. Unit and render suites unchanged and green.


## 2.4.1 — auth page audit: password reset fixed, legal footers added

- Fixed Forgot password end to end. Two defects: the signed-in auto-redirect
  fired during recovery (the reset link establishes a temporary session, so
  users were bounced into the app before they could set a new password), and
  only one of Supabase's two link formats was handled. The page now listens
  for the PASSWORD_RECOVERY event (covers both implicit and PKCE flows),
  suppresses the redirect while recovering, and shows a clear message with a
  retry path when a link is expired or already used.
- Requires one Supabase setting: Authentication → URL Configuration →
  Redirect URLs must include https://reqpub.com/login/ (otherwise reset
  emails return users to the landing page instead of the reset form).
- Login and signup now carry legal footers: Terms, Privacy, Cookies,
  Acceptable use, and Confidentiality links with a copyright line. Signup
  states agreement to the Terms, Privacy, and Acceptable Use policies above
  the create button; login notes agreement below the form.


## 2.4.0 — section-scoped sharing, workspace switcher, invite links

Sharing control

- Review briefs are now section-scoped: a picker with a sensible preselected
  set (what we are building, goals, who it is for, the solution, what it will
  do, not in scope) lets the team add or remove sections before publishing.
  The choice is remembered per project and applied when new versions publish.
- Scoping is enforced at payload build: unselected sections are absent from
  the share itself, not hidden by the page. Covered by 7 new tests, including
  the guarantee that fit criteria never appear under any selection.
- The Access tab shows how many sections each live brief shares, with one
  click to edit; SME pages state how many sections the team shared; partner
  portals inherit the scope automatically from the published brief.

Workspaces and team invites

- New workspace switcher on the dashboard: the workspace chip opens a menu of
  every workspace your account belongs to (one email, many workspaces), with
  workspace settings and create-a-workspace built in.
- Invite links: every pending invite in Workspace settings has a copy-link
  button. The link opens signup with a banner naming the workspace and the
  email prefilled; existing accounts are pointed to sign in, and the
  invitation attaches automatically either way.
- Managers grant and revoke workspace access per member as before; the
  switcher and settings entry points make it obvious where.

Delight

- Cmd/Ctrl+Enter sends the message you are writing anywhere in the product:
  inbox replies, team notes, partner notes and replies, SME thread replies.


## 2.3.0 — partner profile and portal refinements

- Partners now have a real profile: full name, title, and organization,
  editable from a new account menu in the portal. The name flows through to
  every note and reply the team sees, and to the portal greeting. Saved
  through a dedicated RPC; only the partner can edit their own profile.
- A gentle banner asks partners with no name set to add one, so the team
  never receives notes from a nameless account.
- New-version awareness: assignment cards show a "New vX" badge when the team
  has published a version the partner has not opened yet, and cards sort by
  what needs attention first (team replies waiting, then unseen versions).
- The portal refreshes itself when the partner returns to the tab, so briefs
  and threads are current without a reload.
- Conversation inputs in the portal no longer carry prescriptive SME prompt
  text; the composer is neutral ("Send a note to the team") while usage
  patterns are still being learned.
- Backend e2e grew to 64 checks, covering profile save, name flow-through to
  notes, context exposure, and rejection of non-partner profile edits.


## 2.2.0 — live document follow, presentation mode, Access hub

- The document pane now follows your typing: edits appear in the rendered
  document as you write, the pane scrolls to the section you are editing, and
  the section heading flashes to mark the spot. Teammates' edits stream into
  the pane the same way, even while you type.
- Presentation mode: an expand button in the document toolbar (and ⌘K) shows
  only the rendered requirements document, full screen, with print-to-PDF at
  hand. It live-updates during editing sessions. Esc exits.
- New Access tab replaces Links: one page organized by audience — your team,
  partners (grant or revoke this project per partner, add a partner inline),
  review and testing links for the latest version, input requests with
  response counts, and any older links still live.
- New Share button in the document toolbar: pick the audience (teammate,
  partner, SME reviewer, app tester, or a question for an SME) and it routes
  to exactly the right action — creating and copying links on the spot.
- Frontend-only release: no database changes; redeploying the site is enough.


## 2.1.1 — production hotfix

- Fixed all SME/anonymous submissions failing on Supabase ("Could not send"):
  the token generator called gen_random_bytes, which Supabase installs in the
  `extensions` schema, while the function's search_path was pinned to public.
  url_token now sets `search_path = public, extensions`. Affected request
  intake, brief reviews, app-testing feedback, and share publishing.
- The test harness now installs pgcrypto exactly as Supabase does (in the
  `extensions` schema), so this environment-parity bug class is caught locally.
- SME pages now report the real reason a send failed (link revoked, hourly
  limit reached, message too long) instead of a generic connection message.


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
