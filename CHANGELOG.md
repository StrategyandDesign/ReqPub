# Changelog

## 2.19.1 · one click, one project

- **Fixed: a fast double-click on New project created two identical projects.**
  Surfaced in production on 2026-07-13 (two "Test New Version" drafts, seconds
  apart). Root cause: the create is a network round trip and the dashboard
  stayed fully live while it ran - no in-flight flag, no disabled state, no
  visible feedback until the project opened - so a second click (double-click,
  or a retry after "nothing happened") ran the handler again, and each run
  generates its own project id. Present since 2.14, unchanged by 2.19.0; a
  `durable()` retry cannot cause it (the id is fixed per attempt, so a replay
  hits the primary key), only a second handler run can.
- The fix is belt and braces: the handler now refuses re-entry while a create
  is in flight, and the view renders the name field and button disabled with
  the button reading "Creating…" and refusing pointer events, so a second
  click has nothing live to land on. Plain Enter in the name field now creates
  the project too, through the same guarded path, so key auto-repeat and an
  Enter-then-click pair collapse to one creation - and the "did that work?"
  moment that invites a second click is gone.
- Cleanup of the incident: archive either duplicate from its card (trash icon,
  type the name to confirm); both are drafts with no version, so nothing else
  references them.
- New committed suite `tests/views.test.mjs` (8 checks): views are pure string
  builders, so their contracts pin in Node with no DOM. It locks the busy/dead
  create state, the template picker and name persistence, the Health tab, the
  discovery promotion buttons across PRD and engagement modes, the back-link
  pill retiring the buttons, and the fingerprint chip with the attributed
  version note. Known class, deliberately not touched here: other direct-insert
  buttons (add partner, add approver, add discovery entry, replies) share the
  same unguarded shape; none has produced a duplicate in practice, and each
  needs its own busy state, so they ship separately if reported. Frontend only,
  no schema change. Suite now 313 (98 + 215).


## 2.19.0 · record health, template starts, promotion with attribution, fingerprinted client report

- **Health tab (Document · Health).** The record now surfaces its own readiness:
  every Must requirement without a fit criterion, AI declared with no evaluation
  criteria (or criteria with no golden set), safeguarding declared necessary but
  not designed, components without owners, requirements untagged once components
  exist, an empty out-of-scope list, an approved latest version with no published
  brief, and every unresolved "to confirm" placeholder. Signals are DERIVED
  predicates over the working draft - computed on open, never stored, gone the
  moment the gap is fixed - and sort gaps ahead of warnings. Below them, "What
  this record holds" counts versions, named sign-offs, requirements, decisions,
  discovery entries, external inputs, and promotions: counts, deliberately not a
  composite score, because a number that cannot be defended under review has no
  place on a requirements record. Engagement charters get the same tab with the
  software-only signals gated off and a warning for an empty decision log. Pure
  module (`app/js/health.js`), fifteen unit tests, frontend only.
- **Start from a template.** New projects can start from a validated shape:
  product requirements, consulting engagement charter, or baseline assessment
  (Section 9 unlocked with guardrail criteria, data sensitivity, safeguarding
  on) - or blank, which remains a true no-op. Templates are starter structure
  with deliberate "to confirm" placeholders, so a fresh project opens with its
  own punch list on the Health tab; the typed project name lands as
  `ctrl_product` so the document titles itself immediately. Every template
  validates against the question bank and assembles through the real builders
  (the same rule the seed generator enforces), and application flows through the
  SAME rev-checked RPCs as live editing - scalars first, then rows in authored
  order, nothing bypassing the server's concurrency or size rules. Ten unit
  tests; no schema change.
- **Discovery promotes into the record.** A discovery entry now promotes in one
  click into a numbered requirement (To requirement → FR-###) or decision (To
  decision → DEC-###), mirroring the inbox: the entry keeps a back-link pill
  showing what it became, the promote buttons retire, and an engagement offers
  only the decision path. Promoted rows carry a `src` note ('Discovery · Jane',
  'Inbox · SME') that never travels in share payloads (FR rows are still mapped
  to statement + component only) but lets the next generated version note
  attribute additions to their origin: "+2 requirements · FR-012 from Discovery
  · Jane". The relay loop - input, discovery, requirement, baseline - is now on
  the record end to end. Backend change is one column under the existing
  manager-only policy, shipped as `supabase/fix-discovery-promote.sql`
  (idempotent; also in schema.sql for fresh installs). Eleven backend tests
  added covering the column, the fix path, RLS, and durability across a schema
  re-apply.
- **Client baseline report (PDF).** One client-grade export from the Summary tab
  and the command palette: the executive summary, then exactly what a published
  brief may contain (built through `buildSharePayload`, so the share-scoping
  boundary IS the content boundary - fit criteria and internal fields are
  absent, not hidden), then the revision record, behind the designed cover. The
  cover and a Verification section carry the baseline fingerprint: SHA-256 over
  the canonical JSON (keys sorted, arrays in order, UTF-8) of {label, seq,
  snapshot}, with the recipe restated on the document so anyone holding the
  stored snapshot recomputes it without ReqPub. Produced only from a stored
  baseline, never the working draft. Every version row in Version history also
  gets a compute-and-copy Fingerprint control. Stated plainly on the document
  and in SECURITY.md: the fingerprint identifies the exact baseline; it is not
  a signature or trusted timestamp - sealing remains the e-signature phase.
- **CI now runs everything.** The backend end-to-end suite (embedded Postgres)
  joins the unit suites on every push and pull request, with a locale guard for
  the `en_US.UTF-8` requirement embedded-postgres pins for initdb. "215 backend
  checks green on every change" is now a sentence CI enforces rather than a
  local habit.
- **The platform's own PRD caught up with the platform.** The ReqPub Platform
  worked example now specifies this release as Phase 5 (shipped) with four Must
  requirements whose fit criteria map one-to-one to the new tests, corrects its
  verification note to the real suite counts (90 unit, 215 backend - it said 33
  and 79), and adds Fingerprint and Readiness signal to the glossary. README
  wording fixed to match SECURITY.md: the audit trail is written by SECURITY
  DEFINER functions, not triggers.
- Apply `supabase/fix-discovery-promote.sql` (idempotent; one column, no new
  grant or policy) or re-run `schema.sql`. Suite now 305 (90 + 215).


## 2.18.1 · inbox threads show their latest activity

- An inbox thread now displays the time of its most recent message, not when the
  thread was created, and the Inbox, App, and Notes lists sort the most recently
  active thread first. Previously a thread showed its open time, so a partner or
  SME whose latest reply landed days after the thread started looked stale and was
  easy to miss. Pairs with the new-reply flag: the thread both reads by its latest
  reply and lights up until a teammate opens it. Frontend only, no schema change.


## 2.18.0 · team-level "new reply" notification

- When an SME, partner, or app reviewer posts or replies on a PRD, the thread now
  carries a team-level "New reply" flag that stays lit until any team member opens
  the thread, then clears for everyone. This closes a gap: the previous signal was
  a per-user, per-thread read receipt, so a reply landing on a thread a teammate
  had already opened never resurfaced.
- The flag is two timestamps on each thread: `last_ext_at` advances on an external
  post or reply (via database triggers, so every path is covered), and
  `team_seen_at` advances the moment any member opens the thread through the new
  `comm_seen` RPC (viewers included, since they cannot write the table directly). A
  thread is unseen while `last_ext_at` is newer than `team_seen_at`. Team notes and
  the empty SME workspace shell never flag.
- Surfaced in three places from that one flag: a "New reply" badge on the dashboard
  project card, a count on the project's Inbox tab, and a "New reply" tag on the
  specific thread. Opening the thread clears all three. Backend change is two
  nullable columns, two triggers, and one RPC, shipped as
  `supabase/fix-new-reply.sql` (idempotent; backfilled so it starts clean). Eleven
  backend tests added; suite now 256 (52 + 204).


## 2.17.0 · pre-review hardening

- Invite email (`send-invite`): the edge function now authorizes the caller under
  their own identity before sending, confirming they have already added the
  recipient to a workspace they manage. This closes an authenticated path to
  emailing arbitrary addresses. Its CORS origin is restricted to the app URL.
- Output escaping: the sign-in and sign-up pages render status and error text with
  `textContent` and full entity-escaping rather than character stripping, and the
  Access tab renders a brand logo only when it is a valid image data URI (matching
  the external share and export surfaces).
- Documentation: clarified that uploads are scanned when a scanner is configured,
  recorded the invite-authorization control and the CORS and scanner posture in
  `SECURITY.md`, and reconciled the reproduce-block counts in `docs/AUDIT.md`.
- No schema change. Redeploy the `send-invite` edge function to pick up the
  authorization check. The 245-check suite stays green.


## 2.16.3 · deploy migration is pooler-safe (single DO block)

- The Fathering deployment used a session temp table to pass the resolved project
  id between statements. Supabase's SQL editor runs through a connection pooler,
  which does not carry a session temp table (or a multi-statement transaction)
  across statements, so it failed with `relation "_fb" does not exist`. The whole
  migration is now one plpgsql DO block that holds the project id in a variable,
  making it a single atomic statement that runs cleanly under pooling. Behavior is
  unchanged and the 21-check test still passes.


## 2.16.2 · Fathering Baseline Assessment deployment (FC-REQ-001)

- Mapped the Phase 1 Fathers.com requirements document (FC-REQ-001, Baseline
  Father Profile Assessment) section-for-section into the ReqPub worksheet: 27
  functional, 13 non-functional, 4 AI-evaluation, and 7 interface requirements,
  plus overview, users, solution (with the Appendix C scoring model folded in),
  metrics, assumptions, data and privacy, people, and glossary. It assembles into
  the full 17-section document, validated through the real builders.
- Added `supabase/deploy-fathering-baseline.sql`: a single-transaction migration
  that rebuilds the existing Fathering project in place. It retitles the project
  to "Fathering Baseline Assessment", erases every SME/partner interchange
  (threads, messages, input requests, share links, attachments, and the partner
  assignments) for a fresh deployment, replaces the worksheet content, clears
  prior versions, and publishes an APPROVED v1.1 signed off by the document's
  named approvers (Micah Canfield, Alon Arad, Dr. Ken Canfield). Branding, the
  audit log, and every other project are left untouched.
- The stored v1.1 snapshot is the exact { answers, sections } shape the app
  writes itself, so the approved baseline renders and exports identically. A
  21-check backend test proves the retitle, the full erase, the content
  replacement, the approved v1.1 with its three approvers, that a bystander
  project is untouched, and that a re-run is idempotent. Suite now 245 (52 + 193).


## 2.16.1 · Esign API worked example + landing fix

- Added a third worked-example PRD, Esign API, the API-first e-signature service
  behind ReqPub sign-off: envelope lifecycle, recipients and fields, the signing
  ceremony (draw, type, click, decline, self-sign), assurance levels, a
  hash-chained append-only ledger, and a sealed bundle that verifies offline. It
  is authored in the same seed template as the others (14 functional requirements,
  measurable fit criteria, component tags) and validated through the real
  document builders.
- The seed generator now emits, alongside the combined `seed-prds.sql`, a
  standalone `seed-<name>.sql` per example so a single PRD can be added to a live
  workspace without re-seeding the others. Six seed checks added (three examples
  now covered, plus standalone-safety); suite now 224 (52 + 172).
- Landing page: the problem headline now breaks after the first sentence, so
  "They fail at 'that's not what we agreed.'" sits on its own line.


## 2.16.0 · in-app approval routing (Send for review actually reaches someone)

- Approvals were a manual sign-off ledger: "Send for review" only flipped the
  status label, an approver was free text with no account, nobody was notified,
  and only a manager could check a slot off. That was unclear. An approver slot
  can now be assigned to a real team member, chosen from a roster picker when you
  add it.
- An assigned teammate sees a "Waiting on your approval" flag on their dashboard
  (in-app, no email) the moment a version is sent for review, and can approve
  their OWN sign-off. A manager can still decide any slot; anyone else is refused.
  Provenance is unchanged and now proven for self-approval: a sign-off is always
  attributed to whoever actually made it. Free-text, name-only approvers still
  work as manual sign-offs, marked as such.
- The Version history copy now states plainly how it works: Send for review moves
  a version to In review; assign a teammate for an in-app flag and self-approval,
  or record a manual sign-off; and a version cannot be Approved while any approver
  is pending. Backend change is one nullable column plus three functions, shipped
  as `supabase/fix-approver-assignment.sql` (idempotent; existing rows unaffected).
  Eighteen backend tests added (`tests/backend-e2e/approvals.test.mjs`); suite now
  218 (52 + 166).


## 2.15.0 · engagement mode (one worksheet, two document types)

- A project now has a document type, chosen in Document Control: a product or
  project requirements specification (the default, and every existing project) or
  a consulting engagement. The engagement type produces an engagement record,
  numbered 1 to 8: objective and context, success metrics, scope and approach with
  workstreams, assumptions and dependencies and constraints, stakeholders and
  roles, decisions and rationale, glossary, revision history.
- It is the same worksheet and the same fields. Engagement mode hides the
  software-specific sections (functional and non-functional requirements, method,
  AI evaluation, interfaces, verification, traceability, personas, data and
  privacy) and reuses everything else, so nothing is duplicated and a team can
  switch a project's framing without re-entering it. The worksheet, the
  jump-to-section anchors, versioning, approvals, sharing, and exports all serve
  both modes.
- The requirements path is byte-for-byte unchanged: existing projects carry no
  document type, so they render exactly as before. Proven by test, including an
  assertion that output is identical whether the type is unset or set to
  requirements. Positioning language broadened to "the record your client
  approves" across the landing page and the app. Frontend only, no SQL. Ten tests
  added (new `tests/engagement.test.mjs`); suite now 200 (52 + 148).


## 2.14.0 · decision log (Decisions and Rationale)

- Added a first-class "Decisions and Rationale" section (worksheet section 16): a
  permanent record of each material decision, with the options considered, the
  rationale, who decided, the date, and what it supersedes. Each row gets a
  permanent ID (DEC-###) from the same mechanism as requirements, so a decision
  is citable and its number is never reused even after edits or deletion.
- It renders in the assembled document as an ID-numbered table, appears in the
  worksheet and in version diffs automatically (the section list drives all of
  it), and shows a clear placeholder when empty. Existing sections are unchanged;
  only Revision History moved from 16 to 17. Frontend only, no SQL.
- This is the reusable primitive behind the "engagement agreement and decision
  record" direction: the same versioning, approval, and audit now cover decisions,
  not only requirements. Two tests added; suite now 190 (42 + 148).


## 2.13.0 · team controls which sections partners and SMEs see

- The section selector now clearly governs every external view. When the team
  publishes a brief, the chosen sections are exactly what partners see in the
  portal, what SMEs see in their workspace, and what any review link shows. The
  picker now says so ("What do partners and SMEs see?").
- Alignment is explicit and enforced: the renderer honors the published section
  list, so display always equals selection. Previously the payload filtered the
  data and the renderer showed whatever was present; now it also gates by section.
- Sections are driven by one registry. Each section declares its backing fields,
  so adding a new one is a single edit: it appears in the selector and travels in
  the share payload when selected, with no change to the payload builder. It stays
  hidden from readers until a matching render block is added, which is the
  "shareable now, displayable later" behavior requested.
- Unshared content stays absent from the payload itself, not merely hidden, so the
  picker remains a real boundary; fit criteria and internal fields are never
  included. Two tests added (selection/display alignment; new-section shareable
  but hidden). Suite now 188 (40 + 148). Frontend only, no SQL.


## 2.12.2 · repository and documentation accuracy pass

Pre-review housekeeping ahead of external audit. No product code changed.
- Removed a committed embedded-Postgres data directory (tests/backend-e2e/.pgdata)
  that GitHub's web upload had picked up despite being gitignored.
- Corrected the README repository map and every test count to match the current
  tree and suites (38 unit + 148 backend = 186 checks). docs/ARCHITECTURE.md now
  includes the attachments and SME-workspace tables and the full backend suite;
  AUDIT.md and SECURITY.md counts aligned.
- Revised the README, ARCHITECTURE, DEPLOY, ATTACHMENTS, AUDIT, and SECURITY docs
  for accuracy and concision following the v2.5 audit.


## 2.12.1 · "product or project" naming

- The naming field is now "Product or project name" (with matching helper), and
  the dashboard placeholder, the "name it first" prompt, and the document title
  fallback all say "product or project" too - so a PRD can describe a project or
  an initiative, not only a shippable product. This also resolves an existing
  mismatch (the dashboard button already said "New project").
- Scope note: standard requirements-doc section vocabulary (e.g. "Product
  vision") is left as-is - recognized terms that read fine for a project - and
  the marketing site keeps its brand voice. Both are easy to broaden on request.
- Nothing changes internally (every record is already a "project"); this is copy
  only. Frontend only - re-upload the folder.


## 2.12.0 · consolidated the document panel navigation (11 tabs → 4)

Reworked the right-panel information architecture from eleven equally-weighted
tabs (wrapping to two rows) into four job-based sections in a single row, with a
segmented sub-nav. Every view is preserved - regrouped, not removed.

- Document - Read · Summary · Changes · Versions (segmented sub-nav).
- Inbox - Messages · App · Notes (the old Feedback and Notes tabs were just
  filters the Inbox already had; they now live where they belong).
- Discovery - kept first-class.
- Share - Access · People (the old People + Access, unified).
- Activity - moved to an audit-trail icon in the toolbar (reference, not daily).
- The Cmd-K command palette still jumps straight to any view; its labels now read
  as "Section · View" (e.g. "Inbox · App feedback") to match the new structure.

Content routing is unchanged under the hood (every view still keys off the same
state), so saved deep-links and existing actions all still land correctly.
Frontend only - no SQL, no edge-function change. Re-upload the folder.


## 2.11.0 · trackable partner notes; cleaner sign-in copy

- Every partner note now gets a stable per-project reference (PN-1, PN-2, …) and
  a self-describing headline taken from its first line, so two notes never read
  the same "Partner note" in the inbox. The reference shows as a small monospace
  chip beside the note; the team can cite "PN-4" in conversation, and the partner
  sees the same reference on their own thread.
- References come from a monotonic per-project counter, so a number is never
  reused even if a note is later deleted - a given PN-N always means one note.
  Existing partner notes are backfilled with references and headlines.
- Sign-in copy: dropped the dash and the "same door" line for a plain
  "One sign-in for your team workspace and your partner portal."
- Apply supabase/fix-partner-notes.sql (idempotent; adds the reference column +
  counter, updates partner_post/partner_thread_v2, backfills), then re-upload the
  folder. New backend test covers reference allocation, monotonicity across a
  deletion, headline snippets, and backfill (10 checks). Full suite: 186.


## 2.10.2 · partners and SMEs see their own uploaded files

- A partner (and a seated SME) now sees the files they uploaded on their own
  thread, and they persist across reloads and return visits - not just a
  session-only confirmation. partner_thread_v2 and sme_thread now return each
  thread's attachments, scoped exactly like the messages those parties already
  read (no new exposure). After an upload the app refreshes that thread, so the
  file appears immediately and stays.
- Apply by re-running supabase/fix-attachments.sql (idempotent - it now also
  redefines those two thread reads), then re-upload the folder. No storage or
  edge-function change. Backend test now covers both thread reads returning the
  uploader's own files (18 checks); full suite 176.


## 2.10.1 · attachments post cleanly with no scanner configured

- With no virus scanner wired, uploads now post as ordinary files: the toast
  reads "Uploaded", and there is no "not yet scanned" flag on the chip or in the
  Files list. The audit record still stores the true scan_status; the UI simply
  doesn't badge the normal, scanner-off state.
- Flags are reserved for genuinely notable states: "scan failed" when a scanner
  is configured but unreachable (and "blocked" for infected, which never stores).
  Set SCAN_URL later and clean files show "scanned clean" - no other change.
- Frontend only; no SQL and no edge-function redeploy. Re-upload the folder.


## 2.10.0 · file attachments (with virus scanning)

Partners, seated SMEs, and the team can now attach documents to a conversation -
PDFs, Office files, text/CSV/Markdown, images, zips. Files are virus-scanned on
the way in, stored privately, and reachable only through short-lived signed links.

- Where they land: on the thread they came in on (Inbox → conversation), plus a
  per-PRD roll-up under Access → "Files from reviewers". The team downloads from
  either; new files appear live.
- Where they're stored: a private Supabase Storage bucket, one metadata row per
  file in a new attachments table, scoped by the same row-level security as
  everything else. Not in the database as bytes - signed URLs only.
- Uploaders: the team (any thread), partners (their note threads), and seated
  SMEs (their durable workspace link). Anonymous one-off brief links cannot
  upload - every uploader is a known party. 25 MB cap, type allow-list, 40/hour.
- Virus scan: an edge function (attachment-upload) type/size-checks and scans
  each file before storing it. Infected files are rejected and never stored;
  clean files store plainly; if the scanner isn't configured or is unavailable
  the file is stored and flagged (amber "unscanned"), so nothing unsafe is ever
  mistaken for cleared. Point SCAN_URL at a private ClamAV REST service; set
  SCAN_FAIL_CLOSED=true to block instead of flag on scanner outages.
- Defense in depth: attachment_add re-validates type, size, thread ownership,
  rejects infected, rate-limits, and writes every upload to the audit log - so
  even a bug in the function cannot persist an unsafe or cross-tenant file.

Setup is three steps (fix-attachments.sql, storage-attachments.sql, deploy the
edge function) plus optional scanner config - see docs/ATTACHMENTS.md. New
backend test proves the guards, authorization resolvers, RLS, and rate limit
against a real Postgres (16 checks). Full suite: 174.


## 2.9.1 · wider subtitles; landing black band aligned

- Team dashboard and partner-portal subtitles were capped narrow (520/560px) and
  wrapped early; widened to 760px so the intro line runs further across.
- Landing page: the black "Projects don't fail at the build" band was the only
  single-column statement section left-aligned while the others (judgment, the
  section headers, pricing, CTA) are centered - so it read as out of step. It is
  now centered to match, and its headline/paragraph widths were increased so the
  copy spans further across the band.


## 2.9.0 · durable SME workspaces (one link, one continuous thread)

Fixes the SME continuity problem: previously every SME interaction minted a new
link and a new thread, so one expert's exchanges scattered across many links and
were lost if a bookmark was, and the team saw fragmented inbox items ("where does
this land?"). Now each SME has one durable workspace per PRD.

- A manager "seats" an SME (name + email) on a PRD from Access → SME workspaces,
  and gets a stable personal link to send. Re-seating the same email returns the
  SAME link - one workspace per (PRD, SME), idempotent.
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
only review-ready PRDs with real names (2.8.2-2.8.3), the brand-logo overlay
(2.8.1), and one-click Approve on the dashboard card (2.8.0 line).


## 2.8.4 · fix replies doubling in the conversation log

- Fix: a team reply in the inbox appeared twice (identical, both "just now").
  Cause was a realtime race - the websocket echo of the inserted message often
  arrives before the HTTP insert response resolves, and the optimistic local
  add was not deduplicated, so the same message was appended twice.
- All message adds (optimistic and realtime) now go through one shared
  pushUnique helper that adds by id only if absent, so a reply lands exactly
  once no matter which path wins the race. New unit test covers both orderings,
  repeated echoes, and distinct messages that happen to share text (5 checks).


## 2.8.3 · partners see only review-ready PRDs; friendlier portal copy

- Partners now see a PRD only once the team has published a brief for it.
  Assignments still being drafted no longer appear in the portal (this also
  removes the internal-id cards entirely, rather than just relabeling them).
  partner_projects_v2 filters to projects that have a live brief share.
- Rewrote the partner home intro. It no longer explains the partner's own job
  back to them; it just says what the page is: "The PRDs assigned to you for
  review. Any note you send opens a thread with the team."
- fix-partner-portal.sql updated to the same filter - run that one file in
  Supabase to apply. Backend test updated: an assigned-but-unpublished PRD is
  now asserted hidden (12 checks); full suite still green.


## 2.8.2 · partner portal shows real PRD names

- Fix: in the partner portal, a PRD assigned to a partner before its brief was
  published showed the project's internal id (e.g. "pmr1muwemsaciw") as the card
  title. partner_projects_v2 now returns the project's actual name, and the
  portal uses it as the title fallback, so every assignment reads properly
  whether or not a brief has been published yet ("No published brief yet" still
  shows underneath until the team publishes one).
- Rolled the brand-logo overlay (2.8.1) and this name fix into a single
  supabase/fix-partner-portal.sql - run that one file in the SQL editor; it is
  idempotent and supersedes the earlier fix-brand-overlay.sql.
- Backend test now covers the name in the partner payload and an assigned-but-
  unpublished PRD (proves the title is the name, never the id): 13 checks.


## 2.8.1 · brand-logo overlay fix + one-click Approve

Brand logo now reaches every external viewer, whenever it is uploaded.
- Fix: a collaborator logo added to a PRD *after* its brief was shared did not
  appear on the partner's view (nor on SME brief / presentation links shared
  earlier), because external viewers read a version snapshot taken at share time
  and the logo is a current property of the project.
- The two server read paths (partner_projects_v2 and get_share) now overlay the
  project's live brand_logo/brand_label onto the payload at read time, so the
  current logo shows the moment it is saved - no re-publishing, no re-sharing.
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
  Version history panel to decide them - the approval gate is still honored.
- Unchanged by design: saving a new version always creates a fresh Draft
  baseline; the card badge mirrors the newest version's status.


## 2.8.0 · stress-test PRDs for Collection Ventures

- Added supabase/seed-prds.sql (generated and validated) that seeds two fully
  filled PRDs into the Collection Ventures workspace as drafts for the nine-
  person team to stress-test:
  · Removes the BotYield PRD.
  · Clean-rebuilds "Fathering Excellence Profile" from the Fathers.com Platform
    Authority Document (vision, users, phased solution, 15 functional
    requirements, NFRs, AI-evaluation criteria for Voice and the knowledge
    agent, data/privacy, interfaces, the build team, and a glossary).
  · Creates "ReqPub Platform" - the platform described as its own PRD: what has
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


## 2.7.1 · landing page copy refresh (invitation-only positioning)

- Rewrote the landing page to the v2 copy: "The requirements record your
  client approves." Baseline / Gate / Export framing, the judgment line,
  client-review and change sections, three-audience block, a security section
  that states only what is live with an explicit "on the roadmap" note for
  e-signature and SOC 2 (published when they ship, not before), flat
  per-project pricing, and an invitation-only final CTA.
- All contact routes to team@reqpub.com (CTA button, body copy, footer).
- Neutral fictional example (Northwind Field Services); no competitor
  comparison; "client" language kept by design. Footer address: Bentonville, AR.
- Frontend-only; no test or schema impact.


## 2.7.0 · read-only presentation link (share the PRD, view-only)

- Any role can now share the branded PRD as a fixed, read-only link
  (#present/…). It renders the published, section-scoped brief with the
  assigned logo as a clean, account-free page - no review form, no threads,
  just the record and a Print / PDF button. It reuses the brief's own token,
  so it exposes nothing the brief link does not and is revoked alongside it.
- Where it lives, per role:
  · Manager - Share modal ("Anyone, read-only"), the Access hub, and a
    "Copy read-only link" button inside Presentation mode.
  · Viewer - the Access hub row (works whenever a brief is published).
  · SME - a "Share view" button on the brief page they already hold.
  · Partner - a "Share view" button on their portal project; a new
    partner_present_token RPC hands them the public token for their assigned
    project (surfacing an existing token only, creating nothing).
- The presentation page is immutable: it points at a specific published
  version, so what a recipient opens is exactly what was shared.
- Tests: three backend checks (assigned partner gets the token, non-assigned
  gets nothing, anon can open the payload) and a seven-point render check.
  Backend suite now 79 checks.


## 2.6.0 · PRD brand logo and a designed, co-branded PDF

- The internal team can assign a collaborator's logo to a PRD (Access tab →
  Brand on the shared PRD). Managers upload a PNG/JPG/SVG/WebP; it is
  downscaled to a print-safe logo entirely in the browser (no upload service),
  stored on the project, and size-capped in the database.
- The assigned logo travels with the published brief, so accountless SMEs and
  account-holding partners see it on the PRD they review - co-signed by a small
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


## 2.5.0 · pre-review security & correctness hardening

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


## 2.4.1 · auth page audit: password reset fixed, legal footers added

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


## 2.4.0 · section-scoped sharing, workspace switcher, invite links

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


## 2.3.0 · partner profile and portal refinements

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


## 2.2.0 · live document follow, presentation mode, Access hub

- The document pane now follows your typing: edits appear in the rendered
  document as you write, the pane scrolls to the section you are editing, and
  the section heading flashes to mark the spot. Teammates' edits stream into
  the pane the same way, even while you type.
- Presentation mode: an expand button in the document toolbar (and ⌘K) shows
  only the rendered requirements document, full screen, with print-to-PDF at
  hand. It live-updates during editing sessions. Esc exits.
- New Access tab replaces Links: one page organized by audience - your team,
  partners (grant or revoke this project per partner, add a partner inline),
  review and testing links for the latest version, input requests with
  response counts, and any older links still live.
- New Share button in the document toolbar: pick the audience (teammate,
  partner, SME reviewer, app tester, or a question for an SME) and it routes
  to exactly the right action - creating and copying links on the spot.
- Frontend-only release: no database changes; redeploying the site is enough.


## 2.1.1 · production hotfix

- Fixed all SME/anonymous submissions failing on Supabase ("Could not send"):
  the token generator called gen_random_bytes, which Supabase installs in the
  `extensions` schema, while the function's search_path was pinned to public.
  url_token now sets `search_path = public, extensions`. Affected request
  intake, brief reviews, app-testing feedback, and share publishing.
- The test harness now installs pgcrypto exactly as Supabase does (in the
  `extensions` schema), so this environment-parity bug class is caught locally.
- SME pages now report the real reason a send failed (link revoked, hourly
  limit reached, message too long) instead of a generic connection message.


## 2.1.0 · hardening release

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

## 2.0.0 · relational rebuild

- Ground-up rebuild from the v1 key-value architecture: relational schema,
  rev-checked field saves, insert-based rows with permanent requirement IDs,
  server-allocated version numbers, realtime broadcast with presence, approval
  workflow, append-only audit trail, accountless SME threads, partner portal,
  per-user read receipts, dark mode, command palette, full data migration from
  v1 with legacy links preserved.
