# Changelog

## 2.34.1 · the components move to where they are read

Copy placement only. No schema, no behavior, no database step.

The hero's third line listed what the record contains: acceptance
thresholds, requirements with fit criteria, named approvals, one
immutable baseline, one fingerprint verified outside the platform. In
the hero it was answering a question the reader has not asked yet.
Three seconds into the page, nobody knows they want a fingerprint.

It now opens the How it works section, where the enterprise buyer starts
reading technically and is looking for what the thing actually is. The
lead sentence sits under the section heading, and the five components
render as a numbered specification strip above the three steps. Same
words, in the place where they answer a question the reader is holding.

The hero is now two lines: the category, then the failure. docs/
POSITIONING.md pins both verbatim and records where the third line went,
so the doc and the page cannot drift apart.

Checks unchanged at 231 unit and 399 backend. Deploy: push and hard-
refresh. Nothing to run in Supabase.

## 2.34.0 · the client portal, and the update link as a panel

Five changes. One fixes a defect the client could see, three widen what
the record answers without widening what it decides, and one moves the
words on the front page.

- **The site leads with accountability.** The H1 is now "The
  accountability record for enterprise AI development," with the old
  problem line promoted to the subhead beneath it and the measurable
  definition of done as the third line. Acceptance names one moment at
  the end; accountability names the whole span the record covers, and
  development is the word the buyer uses while the work is happening.
  The precise phrases stay in the body, where they carry the mechanism.
  The problem section further down no longer repeats the subhead: it
  reads "Everyone agreed. Nobody agreed to the same thing."
  docs/POSITIONING.md carries the hero verbatim so the doc and the page
  cannot drift, plus the reasoning and two new never-claim lines.

- **One partner identity per email per workspace.** partners carried no
  uniqueness on organization and email, so one client email could hold
  two identities in one workspace, each with its own access grant to the
  same project - and every read joining access to identities to projects
  returned that project once per identity. The portal rendered it twice.
  A unique index on (org_id, lower(email)) now forbids it, preceded by a
  merge that keeps the oldest row. The merge lifts the login link off
  whichever row was actually claimed at signup, because the oldest row
  is often the one a manager typed first and keeping it naively would
  cost the partner their own account. It lifts profile text the keeper
  lacks, unions both identities' project grants, and repoints every note
  before deleting anything: comms and partner_notes are both ON DELETE
  SET NULL, so deleting first would leave a partner's whole history
  unattributed and drop it out of their thread. partner_projects_v2 now
  selects a distinct project list as a second layer, deliberately
  redundant with the index, so a future identity defect stays a data
  problem instead of a visible one.

- **Notes at a baseline.** discovery_entries gains the version_seq
  column comms has carried since v2, and both are stamped at creation
  with the baseline that was current when they were written. Each
  version card now lists what was filed against it, read only. The stamp
  is metadata about a note and never content in a baseline: snapshots
  still hold answers and sections only, there is no control anywhere to
  include a note in one, and promotion remains the single path by which
  a note becomes part of the agreement.

- **The update link becomes a panel.** Inside the existing token page,
  and every piece of it a read of state that already exists: every
  pending and completed signature on the update's baseline, each linking
  to its own signature page; read-only links to prior baselines in
  presentation mode with their recorded fingerprints; and a comment box.
  Authorization links point at the existing sign page, never at a new
  approval mechanism. The panel mints no share tokens and computes no
  fingerprints - publishing a baseline to a link is the team's
  disclosure decision and reading an update must not make it for them,
  and a fingerprint is a fact captured at a moment, so a baseline
  without one shows nothing rather than an invented hash. The comment is
  the one write: it lands in comms under a new external origin,
  attributed to the recipient the token was issued to, filed against the
  same baseline the update reported on. There is no name field, so the
  name on the record is the one the sender addressed the link to; a link
  issued to nobody refuses comments rather than filing them anonymously.
  A comment approves nothing and changes nothing about the agreement.

- **Risks and issues, authored.** A rows question - the risk or issue,
  its impact, a named owner, a status - following the gate plan pattern
  exactly: engagement content that prints, diffs, versions, travels in
  the baseline, and appears in the update panel because it is in the
  record. Status is a fixed list (Open, Mitigating, Accepted, Closed)
  rather than free text, because an open column fills with Red and Amber
  inside one engagement and RAG vocabulary in the record is the first
  step toward the rollup this product must never build. No computed
  rollup, health verdict, or project-status dashboard exists over these
  rows, and docs/POSITIONING.md now states the test that separates
  authored content from a tracker: who wrote the value, does it move on
  its own, and what does it do outside the baseline.

Checks: 231 unit (five new on the risks section: rendering, the unowned
owner fallback, travel in the answers, three-way contiguous renumbering,
and exclusion from the PRD path), 399 backend (two new suites -
partner-identity at 20 covering uniqueness, the merge, portal
deduplication with the index dropped, and history preservation;
update-panel at 37 covering the version_seq wall around the snapshot,
the panel reads, and the comment's attribution and powerlessness).

Deploy: run supabase/fix-partner-identity.sql, then
supabase/fix-update-panel.sql, then supabase/fix-updates.sql - or re-run
schema.sql end to end, which does all three and needs none of them.
Frontend is a push and a hard refresh. node tools/smoke.mjs now expects
61 functions and 5 edge routes.

## 2.33.1 · images unblocked

One line. The app page's Content-Security-Policy allowed images only
from 'self' and data:, so every walkthrough image was refused inline
while loading fine as a direct navigation. img-src now trusts
https://*.supabase.co, the same origin connect-src has trusted all
along. Login and signup keep the stricter policy; they render no
storage images. Frontend-only: push and hard-refresh. Checks unchanged
at 226 unit and 342 backend.

## 2.33.0 · the walkthrough on every PRD surface

v2.32 built the walkthrough; this release puts it where the record is
read. One appendix, five surfaces, one token-gated image path.

- **In the document.** The Read tab and presentation mode render an
  Appendix, Demo Walkthrough, under the PRD: numbered figures, caption
  bubbles, live set on the working draft, the sealed set when a version
  is selected. The canonical markdown is untouched; the appendix
  composes at render time, so every fingerprint and export hash stands.
- **On the shared PRD.** The brief payload now carries the frozen
  walkthrough (order, captions, file references only; bytes never enter
  a payload). The SME brief page and the read-only presentation link
  render the same appendix. Publishing at generate time, the share
  modal, re-publishing, and brand republish all carry it.
- **Images for accountless readers.** New walkthrough-image edge
  function: a reader presents the share token and a shot id; the new
  walkthrough_image_access function proves the token is a live brief
  share AND the shot sits inside the walkthrough frozen into that exact
  version, then the function redirects to a ten-minute signed URL on
  the private bucket. Nothing else in the bucket is reachable this way,
  revoking the share closes the path instantly, and a file flagged
  infected after freezing stops serving.
- **In the Word export.** The .doc gains the same appendix with images
  embedded as downscaled data URLs (1300px JPEG), since a Word file
  cannot chase expiring links. Print and the external Print/PDF button
  inherit the appendix from the page. The client baseline report, SOW
  exhibit, and gate packet stay text-only on purpose: those are
  acceptance artifacts, not demos.

Checks: 226 unit (share.test proves the payload carries minimal fields,
never on pilot, absent when empty), 342 backend (five new checks on the
image gate). Deploy: re-run schema.sql (section 20), deploy the NEW
walkthrough-image edge function with Verify JWT off, push the frontend,
node tools/smoke.mjs now expects 60 functions and 5 edge routes.

## 2.32.0 · demo link + walkthrough

Two asks from the build team, both riding existing invariants rather than
new machinery.

- **Demo link.** One new optional answer in the Links group (Section 14.2,
  or its engagement twin). The document carries a Demo line only when a
  demo exists; every already-generated document is byte-identical. Because
  the link is an answer, it autosaves, rev-checks, freezes into every
  version snapshot, and lands on shares and exports with zero new code
  paths. When set, the workspace header shows a Demo pill that opens it
  in a new tab.
- **Demo walkthrough.** A new Walkthrough tab in the Document group:
  screenshots in the order the build team should read them, each with a
  caption bubble stating the action on screen. Any teammate uploads
  (image types only), captions, reorders, and removes; uploads ride the
  existing scanning pipeline and also land on the Files list. A new
  walkthrough_shots table holds only order and captions; direct writes
  are revoked and four definer functions (add, caption, move, remove)
  are the only paths, with membership gates, an image-only and
  never-infected rule, a 500-character caption cap, duplicate refusal,
  and per-project advisory locks on ordering. Removing a shot detaches
  it; deleting the file stays manager-only on attachments. Generating a
  version freezes the walkthrough (order, captions, file references)
  inside the snapshot, under the same fingerprint, and the tab renders
  the sealed set when a version is selected. Add and remove land on the
  activity trail; caption and reorder churn stays quiet.
- **Upload function: project-anchored team path.** attachment-upload now
  accepts project_id as an alternative to comm_id for signed-in
  teammates, resolved by the new attachment_team_target function. Same
  scan, same Storage layout, same attachment_add registration, comm null.
- The walkthrough is team-facing this release. Exposing it on external
  share views is a follow-on: accountless viewers need a token-gated
  signed-URL path for the private bucket, and that grant deserves its
  own review.

Checks: 223 unit (was 221), 337 backend (was 316; walkthrough.test adds
21). Deploy: re-run schema.sql (idempotent; section 19 lands), redeploy
the attachment-upload edge function (the project path is in the
function, not the schema), push the frontend, then node tools/smoke.mjs;
the probe set now covers 59 functions.

## 2.31.0 · audit gates

Two new tools close the gap where the frontend, the schema, and the
deployed backend could drift apart without anything failing.

- **tools/audit.mjs, the static gate.** Runs in CI before the suites and
  exits nonzero on any mismatch: every data-action in rendered markup,
  querySelector lookup, and palette entry has a handler and every handler
  is used somewhere; every rpc() callsite resolves to a function defined
  in supabase/schema.sql; every edge invocation, including the direct
  fetch to attachment-upload, has a folder under supabase/functions;
  node --check passes on all sixteen app/js modules; and app/js plus
  every served page carries no em dash and none of the AI-tell
  vocabulary (list in tools/audit-lib.mjs). Dynamic data-action
  concatenations must resolve to string literals or the build blocks.
- **tools/smoke.mjs, the live prober.** Run after a deploy: origin
  defaults from CNAME, keys from config.js. Confirms production serves
  this exact repo (sha256 over index.html, app/index.html, and each
  app/js module), that all 54 callable schema functions answer at
  /rest/v1/rpc (trigger functions excluded; the set is generated from
  schema.sql, so a migration never applied fails loudly), that the four
  edge functions are reachable, and that direct anon writes to versions
  and sign_requests are refused at the privilege layer. Probes cannot
  mutate: no session, nil-uuid filters, impossible foreign keys, and
  Prefer: tx=rollback on every write attempt. --plan prints the probe
  set without touching the network.
- **CI blocks on symmetry.** The audit runs first in the workflow; the
  backend end-to-end suite joins after the unit suites, so a push that
  breaks either a symmetry or a server path never reaches green.
- **create_org and claim_invites are committed** (schema section 18).
  Both have existed in production since v1 but were never in schema.sql,
  so a fresh install from the committed schema could not create its
  first workspace or honor an invite. Folded in verbatim from the
  deployed definitions; the backend suite applies both copies in one
  database and proves they agree.

Checks unchanged at 221 unit and 316 backend; the audit stands in front
of them as a sixth gate of its own. Deploy: re-run schema.sql
(idempotent) so section 18 lands, push the frontend, then run
node tools/smoke.mjs against production.

## 2.30.2 · problem section tightened

The problem and why-now paragraphs are shorter and the figures carry
dollar signs: $585 billion, $1 billion or more. Claims unchanged and
still attributed to Gartner and RAND. Copy only; checks unchanged at
221 unit and 316 backend. Deploy is a frontend push.

## 2.30.1 · hero copy

The hero subtitle now reads exactly as directed: "All parties sign the
measurable definition of done. Acceptance thresholds. Requirements with
fit criteria. Named approvals. One immutable baseline. One fingerprint
verified outside the platform." The buyer-naming and dual-use sentences
came out. The title is unchanged. Copy only; no code, no schema, checks
unchanged at 221 unit and 316 backend. Deploy is a frontend push.

## 2.30.0 · the power package

A design-team pass over the internal platform, decided by outside
evidence and approved in full: four features that make output faster for
the PM already inside the tool, and one loudly rejected. Nothing here is
a tracker, a dashboard, or generated content.

- **Document-first project creation.** The creation screen offers
  Documents beside the starter templates. Choosing it opens the new
  project straight into Populate from documents: the same deterministic
  mapper, the same preview of where every section lands, nothing written
  without approval. The fastest path off Word and email now starts at
  the start.
- **Bulk paste into rows.** Every rows section carries a Paste rows
  action. A list or a table copied from Word or Excel parses through the
  intake extraction: named headers map, headerless tables are read by
  content, MoSCoW letters expand, IDs stay as prefixes. The overlay
  states the parsed count, previews the first rows, and adds only on the
  approve click. Input caps at 256 KB.
- **Keyboard-first worksheet.** j and k walk the questions, Enter opens
  the current one, Alt+Enter adds a row to the question being edited,
  ? shows the sheet, and the palette lists the eight most recently
  edited questions on top. Accelerators fire only outside editable
  fields, so typing is never hijacked. The recent list is session
  memory, on purpose.
- **Firm templates and clone-from-record** (supabase/
  fix-record-templates.sql, schema section 17). A manager saves the
  standing structure of a record: organization, document type,
  non-functional requirements, glossary. Never client content; the
  whitelist holds on save and again on apply, so a hand-edited payload
  cannot smuggle sections in. Members start new records from a template
  chip that shows its last-reviewed date, or clone a prior record's
  standing structure from a picker. Server caps: name 80 characters,
  payload 64 KB, 50 templates per org. Reads pass RLS; writes pass
  RPCs; direct table writes are revoked; template actions land on the
  activity log.
- **Rejected: talk-to-text.** Two independent reasons, either
  sufficient. Structured-field entry is where speech measurably loses
  to keying once correction time counts. And the browser's default
  speech path streams client-confidential audio to a third-party
  server, with on-device processing still Chrome-desktop-only and
  recently regressed. Revisit only if on-device speech becomes stable
  across the browsers consulting firms actually run.

Checks: 221 unit (five paste, three payload-whitelist, two creation
contracts), 316 backend (a new 18-check firm-templates suite on a real
Postgres: caps, roles, RLS, review dates, revoked writes). Deploy: run
supabase/fix-record-templates.sql once, then push the frontend.

## 2.29.0 · the position, on the record

Two research passes over the live market settled the positioning: ReqPub
is the signed acceptance record for enterprise AI programs, sold to the
consulting partner on the hook for the outcome, with vendor
forward-deployed engineering programs as the first beachhead. This
release puts that position on the public page, adds the one artifact the
position was missing, and writes the claims discipline into the repo so
it survives any single conversation.

- **The public page leads with the position.** New hero: "The signed
  acceptance record for enterprise AI programs." The lead names the
  buyer and the mechanics in five sentences. A why-now paragraph carries
  only attributed facts: Gartner's 585 billion dollar AI services
  forecast for 2026, RAND's finding that more than 80 percent of AI
  projects fail, and the 2026 wave of forward-deployed engineering
  commitments from Anthropic, OpenAI, Amazon, and Microsoft. The
  doctrine section now names forward-deployed engineers explicitly and
  keeps the line the company owns: a gate review on a dashboard is a
  meeting; a gate on a fingerprinted baseline is evidence. A new
  section gives partners the one-sentence and one-paragraph versions
  they can repeat inside their firms without help.
- **The SOW exhibit ships** (sowExhibitMd and printSowExhibit in
  exports.js; button beside the client baseline report; palette entry).
  One click on a baseline produces the acceptance baseline formatted to
  attach to a statement of work: the acceptance table (dimension,
  metric, threshold, eval set), the requirements with fit criteria and
  priorities, the recorded sign-offs, a signature table for the
  agreement, and the fingerprint with its printed recipe. Bracketed
  fields are for counsel. Every other line derives from the record. The
  exhibit states plainly when no sign-offs are recorded and makes no
  claim beyond what the record contains. The client report, the
  implementation package, and the exhibit carry the same SHA-256.
- **The claims discipline is in the repo** (docs/POSITIONING.md, new
  section). Every claim the site makes is mapped to a shipped
  capability. The claims ReqPub never makes are written down: no
  failure-prevention claims, no dispute-winning claims, no regulatory
  compliance claims, no scoring or monitoring of AI systems, and never
  "AI acceptance criteria" as a product name. Kill criteria for the
  position are recorded so a failed premise gets caught, not argued.
- **The meta-PRD carries the exhibit** as a Must requirement with its
  fit criterion, and the seeds regenerated (335 rows).

Checks: 211 unit (two new exhibit contracts in fingerprint.test), 298
backend. No schema change; deploy is a frontend push.

## 2.28.2 · say why, not just no

A 20-page PRD uploaded to intake produced "No selectable text - likely a
scanned PDF; paste its text instead." The diagnosis was wrong and the
advice was impossible: the file's text had been converted to vector
outlines on export (a design-tool artifact - thousands of filled paths,
zero text operators, zero images), so there is nothing to select or paste
from that file in any viewer on any machine.

- **An empty extraction now reads the page operators and says why**
  (pdfEmptyDiagnosis in intake.js, pure and unit-pinned; main.js probes
  the first three pages when extraction comes back empty). A scan (one
  image per page, few paths) gets: run OCR first, or paste the text.
  Outlined text (hundreds of filled paths, no text operators) gets the
  only advice that works: re-export from the source tool with selectable
  text, or upload the .docx - which since 2.28.0 lands tables intact.
  A PDF that is neither stays on the generic line. Verified against the
  exact file that produced the wrong message: verdict outlined.

Checks: 209 unit. No schema change; deploy is a frontend push.

## 2.28.1 · the decision is the status

Two corrections from live use, both the same disease: the interface asked
for ceremony the record did not need.

- **An approval decision advances the version by itself.** Before: an
  approver assigned on a draft could click Approve, watch their row flip
  to Approved, and watch the version pill keep saying Draft until someone
  also clicked Send for review - the record contradicting itself on
  screen. Now the rule lives where the decision lands (approval_decide,
  rewritten in supabase/fix-approval-advance.sql and schema.sql 9.4): the
  first approval moves a draft into review; the last approval moves the
  version to Approved; a changes request moves it to Changes requested;
  reopening a decision on an approved version drops it back to In review,
  because a version is never Approved while any slot is not. The
  waiting-on-you feed now includes draft-version assignments, since an
  assignee's single click is enough. Send for review remains as the
  explicit kickoff; it is no longer a required ceremony. The RPC returns
  jsonb with the resulting version status so the pill updates in place,
  and the auto transition is logged to activity with via=approval. This
  is derivation, not workflow automation: the status now derives from the
  sign-off decisions instead of being hand-maintained beside them - the
  doctrine's own test, applied to the doctrine's own object.
  fix-approver-assignment.sql's superseded function bodies were removed
  so re-running that historical patch can never downgrade a deployment.
- **The intake next step is unmissable.** After adding files or pasting
  text, the user had to know to click Preview mapping. The button now
  arms as the primary action the moment there is anything to map and no
  plan yet, and its label states the order of operations: "Preview
  mapping before applying." Pasting text arms it on blur. Once a plan
  exists, Apply to the record is the primary action, as before.

Checks: 208 unit (one new render contract pins the armed button), 298
backend (the approvals suite grew from 18 to 26 checks and now proves the
draft-to-approved single click, the mixed-decision path, the reopen
fallback, and the activity log entry). Deploy: run
supabase/fix-approval-advance.sql once, then push the frontend.

## 2.28.0 · tables are the document

Intake could read a PRD's prose and lose its substance. A consulting-grade
requirements document is mostly tables, and the extractor read PDFs as
text lines only: statement and fit-criterion cells interleaved as bare
lines, and the priority cells ("M M1 T") landed as standalone lines the
segmenter mistook for ALLCAPS headings, shattering one real 16-page PRD
into 98 junk segments. Word documents failed the same way from a different
cause: mammoth's markdown writer flattens tables into bare paragraphs.
Reproduced against a real table-built PRD: 9 placements, mostly junk (1
garbage functional-requirement row against 60 real ones), 98 unplaced
fragments. This release makes tables first-class in both formats. Same
file after: 60 of 60 functional requirements with their permanent IDs,
real fit criteria, and expanded priorities; 21 NFRs; 5 evaluation rows;
9 metrics; 9 assumptions; 9 personas; 9 interfaces; 15 glossary terms;
goals, releases, and decisions; unplaced down to 5 honest blocks.

- **A geometry engine rebuilds PDF tables deterministically**
  (pdfMarkdownFromItems in intake.js). pdf.js reports the exact x and y of
  every text fragment. Fragments cluster into visual lines by y; recurring
  x positions are the columns; a new logical row begins when the leftmost
  column receives text and the vertical rhythm agrees (line spacing inside
  a row is the smallest gap in the region, so a wrapped ID cell like
  "EVAL-M2-0" / "1" never starts a false row); wrapped cells merge into
  their columns. Detected tables emit as markdown pipe tables - the
  mapper's native form - and everything else stays prose. Running headers
  and footers (same short line on most pages, digits normalized) are
  dropped. Four or more aligned fragments on one line are tabular on
  sight, which is how a one-row stub left by a page break survives.
  Items without coordinates degrade to the old line join exactly, so the
  function is a strict superset of the v2.26.1 behavior. Pure, no
  network, no model calls, fully unit-pinned.
- **Headerless tables are read by content** (inferColumns). Some PDFs draw
  the header row as one text run the geometry cannot split, so the first
  data row lands as the markdown header. Content identifies the columns:
  an ID column is IDs, a MoSCoW column is single letters, and of the
  remaining wide columns the left one is the statement and the right one
  the fit criterion. When the header row itself is data, it is restored
  as a row from the raw uncased cells. IDs wrapped by a narrow cell are
  recognized and normalized de-spaced ("EVAL-M2-0 1" lands as
  EVAL-M2-01), which also keeps a Rel column ("M2") from stealing the id
  role.
- **Extraction is table-first for every rows target.** fr, nfr, eval,
  metrics, glossary, persona, interfaces, gates, and the new decisions
  target read every pipe table in their section - named headers when
  present, inferred columns when not. The source's permanent IDs ride as
  a prefix on the primary text (FR-M1-001: ...), because identifiers are
  doctrine and must survive intake. MoSCoW letters expand (M, S, C, W
  become Must, Should, Could, Won't). List-shaped sections (goals,
  assumptions) accept tables too, one line per row with the ID kept and a
  Label column carried in parens. Columns the record has no home for
  (Rel, Ver) are dropped; the uploaded document stays their source of
  truth. The old whole-body fallback that turned a section's intro prose
  into one junk row is removed: a rows section with neither bullets nor
  tables contributes nothing, honestly.
- **Structure mapping got three corrections.** Two-level numbered
  headings (7.1, 7.4) segment with their depth and number; a numbered
  subsection whose number proves the nesting inherits a rows-shaped
  parent no matter what its own title says ("7.4 ... the CI gate" inside
  Functional Requirements is functional requirements, not stage gates),
  while under a long-form parent a subsection speaks for itself (1.1
  Goals classifies as goals) and an unknown title stays unplaced -
  unplaced beats misplaced. The ALLCAPS heading rule now requires a real
  word of three letters, so a stray "M M1 T" line can never split a
  document again. New classifications: Users lands in personas, Releases
  in gates, Decisions in the decisions rows, and Data/Privacy/
  Safeguarding sections land in NFRs, where privacy requirements belong.
- **Word documents keep their tables** (htmlToIntakeMd). The docx path
  now converts through mammoth's HTML, which preserves tables, and a
  bounded pure walker turns that HTML into the segmenter's markdown:
  tables become pipe tables, headings become #-headings, list items
  become bullets, entities decode once at the end. mdUnescape stays
  exported and tested; the docx path no longer needs it.
- **Pinned against the document that exposed the failure.** 15 new unit
  checks (41 intake total, 207 suite-wide), including a fixture of real
  page geometry frozen verbatim from the table-built PRD's assumptions
  page: the engine must rebuild that exact table, wrapped statement and
  label cells merged, IDs and labels intact, forever.

Known limits, stated plainly: a table split across a page break relies on
the per-page repeated header plus one-row stub recovery (the Collection
Ventures template repeats headers, so it round-trips); a mid-word wrap in
a narrow cell keeps its space ("Demonstra tion") - cosmetic, and in this
template confined to a dropped column; user-story prose between a rows
section's tables is not row data and is not imported. Deploy is a
frontend push only - no schema change.

## 2.27.0 · the ten-second read

A weekly client update, published from the record. The reader is the
client executive; the user is the consultant who forwards it Friday
morning; the job is that the reader knows what is needed from him in ten
seconds and trusts every line under it. The design constraint that shapes
the whole feature: this product's doctrine forbids RAID logs and status
dashboards, so nothing in an update is hand-maintained - it is an
evidence digest, not a status report.

- **Everything derives; nothing is typed into being.** A pure assembler
  (app/js/update.js) builds the draft from record truth: pending
  approvals, live signature links, and named gate deciders become the
  asks; the activity trail inside the window since the last update
  becomes What moved; health signals, past-due and undated gates, open
  sign-offs, and pending signatures become the open-items register,
  graded by a fixed rubric (high blocks a gate or a review; watch is
  everything else) and sorted high first. Items open last week and
  resolved now appear struck as Closed once, then age off - a pure key
  diff against the frozen previous payload, no bookkeeping anywhere. 10
  new unit checks pin the derivation, the grading, the window, the diff,
  and byte-for-byte determinism.
- **The composer picks; the record decides.** On the new Updates tab
  (Document group, beside Health), a manager composes the week: pick up
  to three asks and reword freely, untick any internal movement line, add
  at most one line the record does not carry yet - published stamped as a
  note - and one editorial sentence in their own voice. The open-items
  register renders in the composer but cannot be edited there; the
  interface itself holds the no-RAID line. Fix the record to change it.
- **Published means frozen.** update_publish is manager-gated, allocates
  seq under a project lock (the create_version discipline), generates the
  token server-side, caps the payload, and writes the activity trail.
  Direct writes to the updates table are revoked from the application
  role: no rewrite, no insert, no delete, by anyone, through any path but
  the RPCs. A bad publish can be withdrawn - the link then says so
  plainly - but never edited. 20 new backend checks pin authorization,
  allocation, the caps, row-level security, immutability at the grant,
  the token page, and withdrawal.
- **The page is the client's, quietly ours.** One white page, no colored
  panels, no chips: position and weight carry priority. A three-fact
  strip (needed from you, health, next milestone), then the asks with
  what each unblocks, then What moved, the register, and Next. The
  engagement lead's own name sits in the masthead; ReqPub sits in the
  footer as the system of record, with the baseline label and fingerprint
  and the archive-copy promise the sign links established: this link
  always renders exactly this update. The same builder renders the live
  page and the print, so the PDF and the link can never disagree. One
  hard page discipline: asks cap at three, movement at four including the
  note, the register at six with the remainder counted.
- Suites: 192 unit + 290 backend = 482 checks green on a clean copy.

Deploy: run supabase/fix-updates.sql once on the live database, then push
the frontend. No function or secret changes.

## 2.26.1 · every surface tells the truth

Three drifts between what the product said and what was so, each closed at
the layer that owns it: the project name now follows the worksheet, uploads
now carry the structure the mapper needs, and the e-sign surfaces now state
only what actually happened.

- **The project name follows the worksheet, everywhere, forever.** The
  "Product or project name" answer (ctrl_product) is the name people
  actually edit, but the dashboard, the approvals feed, invites, the
  signer's page, and both signature mailers read projects.name - written
  once at creation and never again. Rename the record and the email a
  client signed from still carried the old name. Now a trigger (schema
  section 15) syncs projects.name inside the same transaction as the save,
  through every write path - save_field, seeds, migrations - with the
  jsonb-safe extraction (value #>> '{}'; value::text keeps the JSON quotes
  and would have renamed the project to "RecordMade" with literal quotation
  marks). Guard rails: a cleared answer never blanks the name, non-string
  shapes are left alone, the synced name is trimmed and capped at 200
  characters. supabase/fix-project-name-sync.sql carries the trigger plus a
  one-time repair for records that drifted before it existed, from the same
  expression so the two cannot disagree. 10 new backend checks pin the
  repair, its idempotence, the live path, the extraction, every guard, and
  the surface the drift actually hurt: sign_request_context now serves the
  renamed project.
- **Word uploads reach the mapper as Markdown, and PDFs are read.** Intake
  ran docx through mammoth's extractRawText, which flattens headings and
  drops bullet markers - so a structured Word document landed as one
  unplaced blob (demonstrated: the same file classifies three sections as
  markdown, zero as raw text). docx now converts through convertToMarkdown,
  and mammoth's punctuation escapes are undone by a pure, tested inverse
  (mdUnescape) so "month\." never lands in a stored answer. pdf joins the
  accept list: pdf.js 3.11.174 extracts text lines (pdfTextFromItems
  rebuilds line structure from the hasEOL layout marks, so ALLCAPS and
  numbered headings still classify), the worker ships vendored at
  app/vendor/pdf.worker.min.js and loads same-origin because the browser
  will not start a cross-origin worker script, and a scanned PDF with no
  selectable text is refused with a plain ask to paste - never a silent
  empty artifact. Both transformations are pure intake.js exports; 6 new
  unit checks pin the line joining, the segmenter handoff, the unescape,
  and the degenerate inputs.
- **The e-sign surfaces stop overstating.** Three fixes, one discipline.
  The receipt page's "Email me this receipt" trusted a resolved promise,
  but functions.invoke resolves with {data, error} on an HTTP failure - it
  does not throw - so a refused send still rendered "Receipt sent"; success
  is now only what the function itself says. The Signatures chip read
  "Sent" on a pending request, asserting a delivery that may never have
  happened (email is best-effort and the link is often only copied); it
  now reads "Awaiting signature", and the row beside it says "requested",
  not "sent". And send-sign-receipt is rewritten to look up through
  sign_request_context - the same definer RPC the signer's page reads -
  instead of service-role table queries: one round trip replaces three,
  the recipient still comes only from the row, and the function no longer
  holds the service role key at all; the anon key suffices because the
  token is the credential and the RPC enforces it. Stated trade: the RPC
  payload carries the snapshot the page renders, acceptable for a
  per-click receipt send.
- Suites: 182 unit + 270 backend = 452 checks green on a clean copy.

Deploy: run supabase/fix-project-name-sync.sql once on the live database
(trigger + one-time repair; re-running is safe), then redeploy the receipt
mailer: `supabase functions deploy send-sign-receipt --no-verify-jwt`. The
frontend push must include the new app/vendor/pdf.worker.min.js. No other
function or secret changes; send-sign-receipt stops needing the service
role key it previously read.

## 2.26.0 · sign here, start here

Two capabilities the client asked to have immediately functional, shipped
whole: e-sign v1 on exact baselines, and populating a blank record from
documents. Both land through the record's existing spine - approvals,
rev-checked writes, the activity trail - so nothing new has to be trusted.

- **E-sign v1: a recorded electronic signature on an exact baseline.** A
  manager sends a token-keyed request from the Versions panel; the signer's
  page renders the stored snapshot and the signer's own browser recomputes
  and verifies the send-time fingerprint before asking for a name. Signing
  requires a typed name plus recorded consent and lands as a normal
  version_approvals row - decided, timestamped by the provenance trigger,
  linked both ways to the signature record - so covers, gate packets,
  health, and the approve gate see it with zero new concepts. Declines
  carry a reason; revocation is pending-only and a signed record is never
  un-signed from the app; every event writes the activity trail. The same
  link stays live as the signer's archive copy: it always re-renders the
  exact signed document with the receipt, prints to PDF, and can email
  itself to the signer. The words on every surface are exact: a recorded
  electronic signature with an audit trail, not cryptographic sealing -
  sealing is the v2 phase.
- **The signature record is RPC-only.** Direct writes to sign_requests are
  revoked from the application role; five definer functions (create,
  context, sign, decline, revoke) are the only path - manager-gated where
  they must be, token-scoped where the signer acts, anon-callable only
  where the token is the credential. 29 new backend checks pin the
  lifecycle, the approval landing, the state machine, the boundaries, and
  the trail.
- **Two mailers, each honest about its authority.** send-sign-request runs
  under the caller's own JWT and can only mail rows the caller's row-level
  security can see; send-sign-receipt is token-keyed, requires a signed
  row, and mails only that row's own signer - the recipient is never
  caller-supplied. Email is best-effort by design: the request link is
  always created, copied, and shown in the panel, so delivery problems
  never block a signature.
- **Populate from documents: a blank record fills itself, deterministically.**
  Paste text or add files on the Document tab; a pure mapper
  (app/js/intake.js - no AI calls, no network) segments by headings,
  classifies by an ordered keyword map, extracts bullets and markdown
  tables into the right row shapes, and shows the full mapping for approval
  before a single write happens. Requirements carry src = Import · file
  exactly like discovery promotion; Must / Should / Could language becomes
  the priority; an Acceptance: tail becomes the fit criterion; eval tables
  carry their eval-set column; and unrecognized sections are never guessed -
  they wait in an unplaced list for a human target or a skip.
- **Intake never overwrites.** A filled answer is kept and reported, rows
  are additive, and writes run through the same rev-checked RPCs as typing,
  sequentially, with live progress - the applyTemplate discipline, reused.
  txt and md read exactly; docx is best-effort through mammoth from the
  pinned CDN the CSP already allows; anything else is refused with a plain
  ask to paste. 20 new unit checks pin segmentation, classification,
  extraction, the plan, the never-overwrite rule, and the executor.
- Approval rows created by signature render '· e-signed' in the workflow
  panel and on both cover surfaces. The meta-PRD's e-signature requirement
  moves from Should to shipped Must carrying v1's exact claim; sealing
  stays Should, gated on independent verification.
- Suites: 176 unit + 260 backend = 436 checks green on a clean copy.

Deploy: run supabase/fix-esign.sql once on the live database, then
`supabase functions deploy send-sign-request` (keep Verify JWT on) and
`supabase functions deploy send-sign-receipt --no-verify-jwt`. Resend
secrets (RESEND_API_KEY, INVITE_FROM, APP_URL) carry over from send-invite.

## 2.25.1 · the hardening pass

A pre-review adversarial audit of the full codebase: exploit surfaces,
escaping discipline, auth on the edge, identifier integrity, organization,
and the AI-tell sweep. One defect found and fixed. Ten surfaces verified
clean, each with the evidence stated.

- **Found and fixed: acceptance ids could diverge inside one zip.** The
  2.25.0 acceptance block numbered criteria by array index while the
  printed document and the checklist number by permanent key. Delete a row
  once and requirements.json says EVAL-002 where every other artifact says
  EVAL-003 - an id mismatch between the document the client signed and the
  machine-readable export, inside the same fingerprinted package. All three
  now use the permanent key; the regression test pins a gapped fixture to
  EVAL-001, EVAL-003, never renumbered.
- **Verified clean, with evidence.** No esc() in attribute position
  anywhere (escA everywhere an attribute is built); the markdown pipeline
  escapes before transforming. Brand logos pass a data:image whitelist at
  all three render surfaces, size-capped, attributes escaped. CSP on every
  app page: no inline script, pinned script host, frame-ancestors none,
  supabase-only connect. The invite function authenticates the caller,
  verifies a pending invite under the caller's own row-level security, and
  escapes every interpolation into the email; it cannot be used as an open
  relay. Download filenames are stripped to a safe charset. Zero
  target=_blank without noopener. Zero TODO, FIXME, debugger, or stray
  console logging. Zero AI-tell vocabulary and zero em dashes repo-wide
  (the one in zipstore's test remains as UTF-8 round-trip payload).
- **Stated, not hidden:** client write retries are at-least-once on lost
  responses; rev-checked RPCs make field and row replays inert; keyless
  inserts (approval slots) can rarely duplicate and are manager-visible,
  provenance-stamped, and removable. Now documented in SECURITY.md, because
  a reviewer finding an undocumented behavior trusts nothing else on the
  page.
- **Organization, decided on the record:** main.js is 1,761 lines of
  dispatch and orchestration with a visible seam; the split ships with the
  next structural feature and its tests, not as a cosmetic refactor the
  week of an external review. docs/ARCHITECTURE.md carries the reasoning.
- Suites: 156 unit + 231 backend = 387 checks green on a clean copy.

## 2.25.0 · the signed number travels

Built from field research on forward-deployed AI engineering (Ode, the
OpenAI deployment venture, Palantir, Distyl, Tribe, the consultancy FDE
programs) under a strict adoption bar: one feature cleared it, everything
else was rejected on the record.

- **What cleared, and why.** The field's converging convention for AI
  acceptance is a threshold table on a named eval set with a stated sampling
  rule, wired as a launch gate; buyers now request evaluation artifacts like
  audited financials; and "who signed off, on what threshold, on what
  baseline" is the documented open question at handoff. ReqPub already owned
  two thirds of that sentence. This release closes the rest:
  - The AI acceptance criteria table gains an **Eval set** column. A
    threshold without a named set can be cherry-picked; a threshold on a
    named set is a number the client can sign. The set travels everywhere
    the number does: worksheet, charter, PRD, published brief, checklist.
  - **requirements.json gains an acceptance block**: id, dimension, metric,
    threshold, eval set - the signed numbers, machine-readable, consumable
    as a CI gate by any build team, sealed under the same baseline
    fingerprint as the client report.
  - **requirements.json gains an approvals block**: role, name, status,
    decided_at, with the latest decision date - answering who signed, on
    what, machine-readably. Labeled honestly in the file itself: approvals
    are record-state; the fingerprint covers the baseline, not this block.
  - acceptance.md now leads with the signed thresholds table; the checklist
    boxes carry the eval set beside each threshold; starters anchor their
    placeholder thresholds with a to-confirm eval set; the Verification
    prose says "the named eval set" where it said "a golden dataset."
- **Rejected under the bar, deliberately and on the record:** storing eval
  results or runs (the record holds what the meter is judged against, never
  the meter - results live in eval tooling; an acceptance decision is a
  decisions-log entry, already supported); agent decision-rights tables (a
  separate venture's ground); model or system card generation; EU AI Act and
  ISO 42001 compliance mappings (the GRC lane); and eval-platform
  integrations (standing rule: deferred until a real integration pulls).
- One clause added to the site's proof section so the copy matches the
  package contents. One phrase removed from the Fathering seed PRD
  ("single source of truth" reworded to "authoritative record") so the
  banned-language grep runs clean repo-wide.
- Suites: 156 unit + 231 backend = 387 checks green. Content and
  composition only; create_version stores the snapshot verbatim, so there is
  no Supabase migration. Regenerated seed files are included.

## 2.24.0 · the record beside the builders

- **Positioning extended to the AI implementation wave, in three tiers, all
  grounded in the verified Ode launch (2026-07-15).** Verified from primary
  sources: Anthropic, Blackstone, and Hellman & Friedman launched Ode with
  Anthropic, built on Fractional AI (acquired May 2026), targeting mid-size
  companies with embedded engineers; "forward deployed" is Anthropic's own
  vocabulary. Press-reported and labeled as such: roughly $1.5B and about
  100 engineers. The consequence ReqPub owns: every engagement in this
  category creates the question nobody in that stack answers - what the
  system was authorized to do, what done means in numbers, who signed it.
- **Tier 1, rooms:** three verbatim lines added to docs/POSITIONING.md,
  including the doctrine sentence for the wave: AI does the work; the record
  proves what it was allowed to do and what done means. Naming Ode in rooms
  as market evidence is permitted; it never appears on the site.
- **Tier 2, site:** one paragraph added to the Works beside your platform
  section. When the work includes an AI system, the record carries the
  evaluation table the client signs (dimension, metric, threshold), their
  engineers consume requirements.json on day one, and the client signs the
  number that stops the meter. Every sentence is shipped product truth from
  2.20 and 2.21. No other site change.
- **Tier 3, doctrine:** POSITIONING.md's agentic paragraph split into dated
  fact and remaining hypothesis; AI implementation firms added to the
  per-audience lines as a channel, never a competitor; the external
  discipline line extended to cover the new category.
- Banned-language sweep clean on both changed files; page validates. Suites:
  154 unit + 231 backend = 385 checks green. No product or schema change.

## 2.23.4 · the anchor is atomic

- **Field report: the Request an introduction button did nothing on the live
  site.** Reproduced on reqpub.com with a browser, not a theory. The anchor
  pair was intact (unique ids, target present, both buttons resolving to
  #intro), the DOM carried no scripts, nothing overlapped the button. The
  split that cracked it: instant scrolls always landed; smooth scrolls died
  at frame zero. The page set scroll-behavior: smooth on html, and Chromium
  cancels an in-flight smooth scroll when layout shifts under it - which a
  late-loading web font does. One measurement mid-investigation (9.5px) was
  my own harness racing two hash writes in one task; owned and discarded.
  The clean protocol proved both halves: with smooth off, the same click
  path lands at 5607 of a 5643 target, every time.
- **Fix: the smooth rule is gone.** Fragment jumps are now instant and
  uncancelable on every engine. The prefers-reduced-motion override stays as
  a harmless declaration of intent. No markup, copy, or design change.
- **Deploy drift found while diagnosing:** the served index.html carries a
  stylesheet link that this repo does not - hand-added on the server,
  almost certainly a web font, and the very reflow source that exposed the
  smooth bug. The record and the deploy must match: either the link joins
  the repo or it comes off the server. Redeploy this file either way.
- Suites: 154 unit + 231 backend = 385 checks green. One CSS declaration
  removed; nothing else touched.

## 2.23.3 · the site tells the story

- **Public site copy refreshed against the 2.21-2.23 record**, adjudicating
  two advisor memos. Adopted from the copy deck: the gate card now carries
  named gates, stored readiness, and the one-click committee packet; a new
  section answers the first silent objection ("Your program platform reports
  progress. ReqPub proves agreement") with the two-layer visual and the
  never-build list; a new proof section tells the one-fingerprint story
  (client report and implementation package, same SHA-256); the builders card
  carries the entire agentic story in one sentence; the security section
  gains the fingerprint claim with its honest boundary and the verified
  numbers, version-stamped so they cannot rot; meta descriptions rewritten.
- **Rejected from the first memo, on the record:** "single source of truth"
  (the tracker category's own phrase; claiming it files ReqPub in their
  category), "the record defends itself even if the platform disappears"
  (true at sealing, not today), the AI-era essay (the 2.23.2 audit certifies
  zero AI-tell vocabulary; the site holds the same line), and a bare
  homepage check-count (it lives on the security section with a version
  stamp instead).
- **Corrected in the second memo's own deck, from the code:** the export
  card claimed every export carries the fingerprint. docMeta computes no
  hash; the fingerprint lives on the client report, the gate packet, and the
  implementation package. The shipped copy scopes the claim to exactly those
  three. And "two independent adversarial audits" became "audit findings and
  fixes are published in the repo and the changelog," which is the sentence
  the evidence supports.
- Also fixed: the hero mock's brand chip read RecordMade, a sister venture's
  name on the ReqPub hero. It now reads Northwind, matching the fictional
  client on the card, which is what the brand-overlay slot demonstrates. The
  mock card also gained the gate eyebrow, the fingerprint row, and the
  record-state row, so the marketing card looks like a real 2.23 export.
- Copy only. No schema, product, or payload change. Banned-language sweep
  clean (no em dashes, no tracker-category phrases, no AI-tell vocabulary);
  HTML tag balance and attribute uniqueness validated.

## 2.23.2 · the fine-tooth pass

An adversarial audit of 2.23.x before external code review: every button
against every handler, every role against every surface, every export against
the house style, every new write path against the schema's guards. Three
findings, fixed; nine suspicions, cleared with evidence.

**Found and fixed.**
- The gate packet leaked in-app remedy copy: a stored health signal's detail
  ("Open that version in Version history and record the sign-off...") printed
  into the client-facing steering-committee PDF. The packet now carries the
  evidence line and the signal labels with their ×N only. Regression pinned:
  the packet test asserts the remedy copy is absent.
- Twelve em dashes shipped inside client-delivered artifacts - nine across
  the implementation package's four generated files, two on the printed cover
  approvals rail and the client report's incorporated list, one in the
  positioning one-pager. All replaced with the house hyphen. The one em dash
  in tests/zipstore.test.mjs stays on purpose: it is UTF-8 payload proving
  byte-exact round-trips, not copy.
- Neither approval-slot writer had a double-click guard, so a fast double
  click could record the same signer twice. Both now share a busy flag with
  try/finally release.

**Verified clean, with the evidence stated.**
- save_field and upsert_row impose no question-id whitelist, so the gate-plan
  rows flow through the same rev-checked path as every field; the gated
  starter cannot be rejected server-side.
- The gate name is escaped on the printed cover (esc) and everywhere else it
  travels through the markdown pipeline, which escapes before transforming
  (inlineMd). No injection path from user-named gates.
- All 115 rendered data-action controls dispatch: the click switch, the
  change-event matchers (version selector, feedback filter, member role,
  discovery export, build stamp), and the palette's programmatic actions.
  Zero dead buttons.
- Client portal, SME workspace, and presentation surfaces reference neither
  snapshot.gate nor snapshot.health; the share payload is built from answers
  only. Gate names and readiness evidence cannot reach an external audience
  except on documents a manager deliberately exports.
- No schema change, no wire-key change, no origin or author-kind change, no
  payload-shape change anywhere in 2.23.x: existing engagements, threads,
  briefs, portals, and invite flows are untouched by construction.
- Zero AI-tell vocabulary in product, docs, or seeds; zero provenance
  language (the "advisory" hits are Postgres advisory locks); zero debug
  logging outside deliberate console.warn/error paths.
- Slot writers are manager-gated in the UI and manager-or-self-gated in the
  RPC; version generation is manager-only; document exports are read-only
  under row-level security for every role that can see them.
- healthSignals guards every context field, and discovery is initialized
  before any generate, so evidence capture cannot throw mid-baseline.
- Suites: 154 unit + 231 backend = 385 checks green on a clean copy.

## 2.23.1 · the warning that named no version

- **Field report investigated: "Approvers added but still shown as gap."**
  Verdict in three parts. The signal logic was correct: the warning was about
  v1.0 (approved with zero sign-off slots, as seeded records are), not the
  v1.1 the user had just fixed - but the signal named no version, so the fix
  landed on the wrong baseline and the warning survived it. Worse, the remedy
  was locked out: the schema permits recording a sign-off on an approved
  version (slot insert is manager-gated, the provenance trigger forces it in
  pending and stamps decided_by/decided_at truthfully), but the UI hid the
  add controls exactly on approved versions, and the signal's own copy
  claimed the only fix was "future baselines." A warning that can never
  clear violates the Health tab's stated contract and trains people to
  ignore the tab.
- **Fixed, all three.** Version-scoped signals now name their versions
  ("Approved without a named sign-off: v1.0"), so the fix lands where the
  problem is. Version history now offers "Record sign-off" on approved
  baselines - insert plus decide in one action, stamped to whoever records
  it, framed as what it is: evidence, recorded late, honestly attributed.
  The warning clears the moment it lands.
- **And the numbers now agree.** The topbar pill said "2 gaps" for a record
  with 0 gaps and 2 warnings (it counted signals and called them all gaps);
  the 2.23 cover line summed per-signal counts (and would have said 8
  warnings for the same record the Health tab called 2). One convention
  everywhere now: gaps and warnings count signals, multiplicity stays on the
  row as ×N. The pill never calls a warning a gap, and gaps outrank warnings
  in its label.
- Suites: 154 unit + 231 backend = 385 checks green. Frontend only; no
  schema change, nothing to run in Supabase.

## 2.23.0 · the gate moves to the record

- **Positioning corrected with facts, then written down.** The program
  platform the reference firm champions is shared infrastructure (built and
  owned by a third party, allied with other consultancies too), and it HAS
  approvals, stage gates, audit trails, and time-based locking - claiming
  otherwise would die in the first demo. The honest line sits one level
  deeper: a gate review on a dashboard is a meeting; a gate on an immutable,
  fingerprinted baseline is evidence. The tracker's truth requires the
  tracker; the record verifies outside it. Its objects are projects and
  tasks; nothing there owns what "done" means. Doctrine, per-audience lines,
  the four-phase path, and the never-build list live in
  `docs/POSITIONING.md`; the one-page, names-nobody visual for the room is
  `docs/positioning.svg`; `docs/DEPLOY.md` sharpened to match.
- **A gate is a named decision, by named deciders, against stated criteria,
  on a fixed artifact.** Three of the four already existed (versions,
  approvers, the state machine). Now the fourth: Generate version gains an
  optional gate name, free text so every firm's methodology fits, stored as
  `snapshot.gate` inside the jsonb `create_version` stores verbatim - no
  schema change - rendered as the cover eyebrow and a workspace pill when
  viewing that baseline.
- **Criteria evidence at the gate.** At generation, the record's readiness
  signals are computed and stored as `snapshot.health`: not a live signal
  (those stay derived, never stored) but the state of the record at the
  moment it was fixed, inside an already-immutable baseline. The cover rail
  carries "Record state: 0 gaps · 2 warnings"; the Verification section
  names each one. Soft gate, never a hard block: "approved with two known
  warnings, named" is the most defensible sentence in the product.
- **The gate packet.** One click produces the steering-committee artifact:
  gate name, criteria state at the baseline, the per-column evidence diff
  since the prior baseline, the approvals rail, and the fingerprint with its
  recipe - pure composition of tested functions, honest fallbacks when the
  gate is unnamed or the baseline predates evidence capture. When the
  committee decides on the packet, the gate decision has moved to the record.
- **The gate plan is content.** A Stage-gated engagement starter ships four
  classic gates (gate, criteria, deciding role, target date) through the same
  validated-template path as everything else; the plan enters the charter as
  a numbered Gate Plan section with contiguous renumbering (gates at 3, AI
  acceptance at 4 when both are present), and plain charters stay
  byte-identical. The gate deciders were already built: approver roles,
  manual sign-off slots, and the 2.22 named-approvers signal do the
  enforcing.
- Never built, restated: Gantt, RAG rollups, RAID logs, timelines,
  notification engines, auto-advancing workflows, portfolio dashboards.
- Suites: 152 unit + 231 backend = 383 checks green. No schema change.

## 2.22.1 · the sweep behind the rename

- **Full-platform audit of the word "Partner," every occurrence classified.**
  The 2.22.0 rename covered the primary surfaces; this sweep caught what it
  missed. Fixed, because a person could read them: the invite email a client
  receives said "added as a **partner**" (the worst possible surface - the
  wire key stays `partner`, the words now say client contact); the share
  modal, publish hint, access empty states, inbox copy, brand and files
  descriptions, "new replies" badges, and two toasts; the thread author pill
  rendered the raw `author_kind` key ("partner" lowercase) and now maps to
  Client contact / SME / Team; the schema's uploader-name fallback said
  'Partner' when a client contact had no name on file - one word inside
  `attachment_uploader`, recreated by `supabase/fix-client-contact-label.sql`
  (idempotent, display-only, no authorization or shape change); and the
  meta-PRD's own prose (market, context, goals, scope, releases, components,
  people) now says client portal and client contacts, regenerated through the
  validator.
- **Left alone, deliberately, and on the record:** every schema identifier
  (`partner` role, `partners`, `partner_access`, origin and author-kind keys,
  RPC names), every code identifier and action key, the wire parameter to the
  invite function, test files and fixtures, `docs/AUDIT.md` (a dated
  historical record), older changelog entries (history stays history), and
  the two PRDs where "partner" means something else: the e-sign PRD's
  commercial partners and the Fathering PRD's partnered groups. Words keep
  their senses.
- Living docs (SECURITY.md, ARCHITECTURE.md, ATTACHMENTS.md, README) now say
  client contact in prose and `partner` only when naming the schema role.
- Suites: 145 unit + 231 backend = 376 checks green, backend rerun in full
  because schema.sql changed. Deploy note: run
  `supabase/fix-client-contact-label.sql` once, and redeploy the send-invite
  edge function (`supabase functions deploy send-invite`).

## 2.22.0 · the right names in the room

- **Independently verified before building:** the buyer's reference firm
  already runs a program-management platform across engagements (Kearney is a
  founding partner of Sensei Labs' Conductor - milestones, dashboards, stage
  gates, benefits tracking). Consequence, adopted as doctrine: ReqPub does not
  grow program-status surfaces. The tracker says where the program is; ReqPub
  proves what was agreed, by whom, in which version. Written into
  `docs/DEPLOY.md`.
- **"Partner" leaves the user interface.** The buyer's firm reserves that
  word for its owners; "give the client a Partner login" misfires in the
  room. Every user-visible string now says **Client contact** and **Client
  portal** - role badges, the access tab, share copy, the portal header,
  toasts, onboarding, docs, and the meta-PRD. The schema role stays `partner`
  permanently: tables, RPCs, policies, and tests are untouched. Copy only.
- **Workspace-per-client is now written doctrine.** Internal roles are
  workspace-wide by construction (`is_project_member` = org membership);
  external access is per-project by construction (`partner_access`, tokens).
  So the confidentiality wall is the workspace: one workspace per client
  account, never one spanning clients. A consultant at three clients belongs
  to three workspaces. `docs/DEPLOY.md` carries the rule and the full
  persona-to-surface map; nobody in a standard engagement structure needs a
  surface that does not already exist. The sponsor signs with zero accounts:
  manual approval slots (`approver_user_id` null) with server-stamped
  recording provenance, already shipped.
- **The procedural approver rule became a signal.** "Every version gets named
  approvers before review" was advice; now it is a deterministic gap. A
  version in review with zero sign-off slots flags as a gap (the approvals
  gate only protects versions that have slots); an approved version with no
  named sign-off warns. Rides the health panel and the workspace gaps pill
  automatically. This is the control that lets analysts hold write access
  without a new permission tier.
- Deferred with reasons on the record: a true Editor role (writes, cannot
  approve or manage access - schema change, wait for the pull); a
  cross-workspace rollup for senior stakeholders (new server surface, wait
  for the ask); "recorded by" on the cover for manually recorded sign-offs
  (`decided_by` is a bare uuid today - stamping the name is a schema change,
  same class as Editor).
- Suites: 145 unit + 231 backend = 376 checks green. No schema change; copy,
  one signal, and doctrine.

## 2.21.0 · one baseline, two audiences, one fingerprint

- **The implementation package.** The client baseline report gains its
  counterpart for the build team: one click on a stored baseline downloads
  `requirements.json` (every requirement row with its permanent id, statement,
  fit criterion, priority, component, promotion source, and attested
  recorder), `acceptance.md` (the fit criteria and AI thresholds as a testable
  checklist), `CHANGES.md` (the per-column evidence diff against the prior
  baseline), `prd.md` (the full assembled document), and a README carrying the
  fingerprint and its recipe. The same SHA-256 sits on the client report, so
  the document the client signed and the package the builders received are
  provably the same baseline. Every file is a pure function of the stored
  snapshot (`app/js/implpkg.js`, 9 tests). Delivery stays dependency-free: a
  STORE-only zip writer (`app/js/zipstore.js`, ~90 lines, deterministic bytes
  per baseline) whose suite parses its own output with an independent reader
  and recomputes every CRC-32; the archive also validates under system `unzip`
  and Python's `zipfile`. No third-party zip library, per review guidance.
- **Health-first landing, refined rule.** A project now opens on Record
  health once it has a baseline and on the document before one exists -
  pre-baseline the job is drafting, post-baseline the job is defending. The
  rule is one pure function (`landingTab`), and an explicit tab request always
  wins. Every workspace tab gains an ambient gaps pill (red for hard gaps,
  amber for warnings, absent at zero) computed from the same deterministic
  signals as the Health tab, one click away from it.
- **Record of engagement on the client report.** Versions, named sign-offs,
  and the client's own inputs incorporated in this baseline, listed by
  permanent id and source: "your input became FR-012 and it is in the baseline
  you signed." Counts only, every number pointing at rows; statements stay
  behind the share-scoping boundary; the list caps at twelve with a remainder
  count. Renders only when the data is supplied.
- **Role-aware first session.** The empty dashboard now says, in one sentence,
  what the record is for the role in front of it. Copy, not architecture,
  sized accordingly.
- Meta-PRD regenerated through the validator: 22 functional requirements,
  including fit criteria for all three capabilities above.
- Deliberately not built, per the same review: no composite health score
  (counts, not scores, stays the doctrine), no portfolio-level health on the
  dashboard (that is a server-side rollup or nothing), and no revenue claims
  in the product. The claims that survive review are the ones the suite can
  point at.
- Known cost, deferred with eyes open: `main.js` is 1,645 lines and grows by
  one switch case per feature. The next structural feature should split it;
  this release added handlers, not structure, on purpose.
- Suites: 143 unit + 231 backend = 374 checks green. No schema change; this
  release is frontend and pure computed surfaces only.

## 2.20.0 · the record defends itself

- **Fixed, critical: a project manager could silently rewrite an approved
  baseline.** Independent review caught what two internal audits missed: the
  `ver_update` policy plus the table grant allowed a direct `UPDATE` of any
  column on `versions` - snapshot, status, label, `created_at` - bypassing
  `version_set_status` (the transition whitelist and the all-approvals-green
  gate) and writing no activity row. The client only ever used that surface
  for the build tag. Versions now match the posture of `project_fields`,
  `field_rows`, and `activity`: direct write revoked, the policy dropped
  permanently, and the build tag moves only through `version_set_build`
  (manager-gated, 120-char cap, logged as `version.build`). Live installs run
  `supabase/fix-version-integrity.sql` once. Locked by a 16-check adversarial
  suite (`tests/backend-e2e/version-integrity.test.mjs`), including a legacy
  simulation proving the fix closes an existing install.
- **Fixed: creating a project could show two identical cards - one database
  row rendered twice.** The org-channel realtime echo of the insert can arrive
  while `await createProject` is still in flight; the sync engine (whose state
  IS the app state) added the row, then the handler blind-unshifted its local
  copy of the same id. Both cards mirrored `projectStats[id]` in lockstep -
  exactly the "two cards, identical pills" incident. Worst on template starts
  (a consulting engagement holds the dashboard open through ~13 RPCs of update
  echoes), but present on every starter including Blank. Both the local write
  and the echo now flow through one pure reconciler (`upsertById`), in either
  arrival order; and a `durable()` retry that trips the primary key now reads
  as the success it is instead of provoking a real second project
  (`isDupKey`). Locked by `tests/projdedup.test.mjs` (8 checks). The 2.19.1
  double-click guard remains as its own layer.
- **AI Acceptance Criteria are now sellable.** The section enters consulting
  engagement mode: when an engagement declares AI, acceptance criteria land as
  charter section 3 - right after the success metrics they harden into
  numbers - and the charter renumbers contiguously (1..9 with AI, 1..8
  without, byte-identical). The layout is one function (`engSections`), so the
  worksheet and the document can never disagree. Briefs gain an explicit
  opt-in share section: the client sees dimension, metric, and threshold -
  the number that stops the meter - shaped in the payload itself; component
  tags do not ride along, and the FR fit-criterion doctrine stays absolute.
  PRDs are untouched (Section 9 remains AI Evaluation Criteria).
- **A diff is now a defense.** The Changes view renders, for every modified
  requirement, the exact columns that changed with prior and current text:
  "FR-014 · fit criterion: ~~within 5 seconds~~ → within 30 seconds."
  `reqDiffDetail` covers FR, NFR, EVAL, and IR; bookkeeping keys never report.
- **Evidence dates on covers.** A printed baseline carries the baseline's own
  date and, when approved, the date of the last sign-off. Two prints of one
  approved version read the same; the print date is footer metadata.
- **Honesty pass.** The audit-trail claim now says exactly what is true: the
  trail records versions, status changes, approvals, build-tag changes, and
  inbound submissions; edit attribution is server-stamped on every field and
  row; baselines are immutable snapshots. The schema comment advertising a
  `field.saved` action that was never written is corrected. Decisions render
  the attested recorder beside the claimed owner: "Tim (recorded by Ana
  Reyes)" - the recorder is `upsert_row`'s server-stamped identity, and every
  underscore-prefixed row key is now formal bookkeeping: never a filled row,
  never a diff, stripped from every share payload.
- **Record health accumulates.** Two derived facts join the counts: client
  inputs incorporated in the approved baseline (promotion-sourced rows in the
  latest approved snapshot - never guessed from the draft) and the last
  client-visible change (the latest approved baseline's date).
- Meta-PRD regenerated through the validator: 19 functional requirements
  including the three shipped above, the immutability NFR, and honest counts.
- Deferred, deliberately: role-tailored empty-state copy; busy states on other
  direct-insert buttons (the reconciler pattern now exists for both).
- Suites: 121 unit + 231 backend = 352 checks green.

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
