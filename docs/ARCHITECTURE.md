# ReqPub v2 architecture

This document explains the design and the reasoning, in the order a reviewer will question it: why the concurrency model looks like this, then the data model, security, realtime, external collaboration, migration, and the residual limits we accept knowingly.

## 1. The concurrency model

v1 failed under nine editors because of two compounding properties: whole-object writes (every save shipped an entire array or answers object) and stale reads (no realtime, cache-first opens). Any two concurrent writers overwrote each other's whole object, and because reads were stale, the overwrite was the norm. The audit that preceded this rebuild counted the read-modify-write anti-pattern in roughly eighteen places.

v2 adopts the model that Figma and Linear each arrived at independently for structured documents: server-ordered, property-level last-write-wins with explicit conflict detection, not a CRDT. Figma's engineering write-up describes rejecting OT as unnecessary and letting the server define event order. Linear has described its sync engine as server-sequenced, field-level LWW for structured fields, with an embedded CRDT reserved for freeform rich text. A PRD worksheet is structured fields (named sections, discrete rows), which is exactly the case where property-level resolution is the accepted approach. The rule of thumb from the sync-engine literature: property-level conflicts want LWW with detection; character-level co-typing in one span wants a CRDT. We have the former.

Concretely:

**Scalar fields** (`project_fields`) carry an integer `rev`. The only write path is the `save_field` RPC: `UPDATE … WHERE rev = $base`. Zero rows updated means someone else saved first: the RPC returns their value, author, and rev, and the client resolves it deliberately. If you are mid-typing that field, your text is kept and re-submitted on the winner's rev (you also get a notice naming the other editor); if you had left the field, the newer save is accepted and shown. Either way, nothing is ever silently destroyed; the losing write is *known* to have lost. This is Fowler's Optimistic Offline Lock, applied per field so the collision surface is a single question, not the document.

**Repeating rows** (`field_rows`) make adds INSERTs, so simultaneous adds cannot overwrite each other; the failure that ate notes and requirements in v1 is structurally impossible. Each row keeps the same rev-checked update rule. Requirement identity (`FR-003`) derives from a per-field counter `k` allocated inside the insert RPC under an advisory lock: concurrent adds get distinct, permanent numbers, and deleting a row never renumbers the rest (soft delete preserves the sequence).

**Versions** are allocated by `create_version` under a per-project advisory lock: `seq = max + 1` and the label math happen server-side, so two managers clicking Generate at once produce v1.4 and v1.5, never two v1.4s (a v1 data-loss bug from colliding snapshots).

**Durability.** Every write is awaited. Transient failures (network, 5xx, 429) retry with exponential backoff; the save state is always visible (saving / saved / offline / failed-with-Retry), and the page warns before unload while anything is unflushed. v1's fire-and-forget `console.warn` writes are gone.

**The residual, stated honestly:** two people typing in the *same* scalar field in the same window converge to the later writer, with the earlier writer notified and the blast radius held to one field. Presence ("Ana is editing this field") makes that a social non-event rather than a data race. Character-level merging inside one field would require Yjs and a build step; it is deliberately out of scope, and the architecture leaves room for it (a single field's storage could switch to a CRDT column without touching anything else).

## 2. Data model

Everything shared is rows in Postgres; nothing user-visible lives in a JSON blob keyed by org anymore.

- `projects`: one row per PRD. `id` stays **text** to preserve v1 ids, and with them every share link and partner assignment in the wild.
- `project_fields`: one row per scalar answer (`project_id, field_id` PK, `value jsonb`, `rev`, author attribution).
- `field_rows`: one row per repeating item (requirements, personas, metrics, goals), with `k` (permanent identity), `pos` (ordering), `rev`, soft `deleted`.
- `versions`: immutable baselines. seq, label, full snapshot (answers + rendered sections), build tag, and a **status state machine** (`draft → in_review → approved / changes_requested`) enforced in `version_set_status`.
- `version_approvals`: named approver slots per version. The gate is real: `approved` is refused while any approver is pending. (Of the tools surveyed, Productboard, Jira Product Discovery, and Confluence, none ships a native approval gate; Aha! is the exception. This is deliberate white space.)
- `comms`: every communication (app feedback, brief reviews, SME input, partner notes, team/meeting notes) in one table with `origin`, unified status (`new / in_review / actioned / closed`), version linkage, promotion tracking, a human-readable `ref` for partner notes, and optionally a `reply_token` for accountless SME threads.
- `messages`: threaded replies on any `comm` or `request`, with `author_kind` (team / partner / sme). Insert-only.
- `attachments`: metadata for files uploaded by the team, partners, and seated SMEs (org, project, thread, uploader, name, type, size, storage path, scan status). Bytes live in a private Storage bucket; this table is the audit anchor. Every row is written by a `SECURITY DEFINER` RPC that the upload edge function calls only after a virus scan.
- `input_requests`: tokened "ask an SME" links with prompt, due date, status.
- `discovery_entries`: the research log.
- `read_marks`: per-user read receipts (v1 stored these org-wide, which was simply wrong).
- `user_profiles`: display names for attribution and presence.
- `activity`: the audit trail. Insert-only (no update/delete policies exist), written by SECURITY DEFINER triggers and RPCs, so the log cannot be edited from the app at all. This mirrors the Palantir action-log posture: history survives even the person who made it.

## 3. Security model

Row-level security on every table; membership checks run through `SECURITY DEFINER` helper functions (`is_org_member`, `is_org_manager`, `is_project_partner`) to avoid RLS recursion, the pattern proven in v1 and kept.

- Managers write; Viewers read everything and may post comms/replies (their inserts are constrained to their own identity: `author_user = auth.uid()`).
- Racy structures cannot be written directly at all. No INSERT/UPDATE policies exist on `project_fields` or `field_rows`; the RPCs are the only path, so rev checks cannot be bypassed by a creative client.
- Messages inserts verify the parent belongs to the same org (no cross-org thread injection).
- Partners touch nothing directly; their surface is a small set of RPCs that scope every query to `partner_access` rows for `auth.uid()`.
- SMEs have no account. Share and reply tokens are 144-bit random URL-safe strings generated server-side (`gen_random_bytes`), not guessable hashes; payloads served to them are curated subsets built by the app (`buildSharePayload`) that never include fit criteria, schedules, or internal notes. Legacy v1 hash tokens continue to resolve because the rows were migrated, but all new tokens are random.
- Anonymous endpoints are rate limited server-side: 60 submissions per project per origin per hour, 30 per input request per hour, 30 replies per SME thread per hour, and 40 file uploads per project per hour. Publishing a share is fenced to the caller's own org and project, so a colliding or guessed token belonging to another workspace is refused rather than overwritten.
- Team identity is server-stamped: when a signed-in member writes a team message or team note, the author name is taken from their profile, not from the request. External viewers therefore cannot be shown words under a teammate's forged name.
- Uploaded files are virus-scanned in an edge function before storage, stored in a private bucket reachable only through short-lived signed URLs, capped at 25 MB and an allow-list of document/image types, and re-validated in the database on insert. Infected files are rejected and never stored.
- Input has ceilings: 256 KB per worksheet answer and 128 KB per row enforced in the RPCs, 20 KB per comm or message body enforced by CHECK constraints on new writes.
- The frontend ships a CSP with no inline scripts, escapes every interpolation through one `esc()` helper, and holds no secrets beyond the public anon key.

## 4. Realtime and presence

Change fan-out uses **Broadcast-from-Database**: AFTER-triggers on the collaborative tables (fields, rows, versions, comms, input requests, discovery, attachments, messages, approvals) call `realtime.broadcast_changes()` onto `proj:<project_id>` (and `org:<org_id>` for the project list). Supabase's own guidance now recommends broadcast over `postgres_changes` for multi-subscriber scale: `postgres_changes` re-evaluates RLS per subscriber per change and is the likelier bottleneck at nine-plus editors. Channels are **private**: RLS policies on `realtime.messages` admit org members and assigned partners only.

Clients apply incoming events idempotently: fields/rows accept only newer `rev`s (which also makes self-echoes no-ops), inserts dedupe by id, and nothing ever overwrites a locally dirty or focused field, so realtime can never fight your own typing.

Presence rides the same project channel: each client tracks `{user, name, focused field}` (state, not keystrokes, per Supabase guidance). The UI renders workspace avatars and a per-question "X is editing" chip, which converts the one remaining same-field race into something people see coming.

Channel rights are asymmetric: org members receive and send (presence requires send); partners receive only. Clients treat incoming payloads as view updates, and nothing received over a channel can reach the database except through the rev-checked RPCs, so a forged broadcast can at worst repaint a screen until the next fetch.

Trigger failure safety: every broadcast call is wrapped so a realtime outage can never fail a write; the audit logger likewise.

## 5. External collaboration

Three tiers, matching how the surveyed tools converge (paid makers, scoped free collaborators, zero-friction reviewers), plus the partner layer none of them model:

- **SMEs (no account):** brief review, app testing, and input-request pages served by token. Every submission returns a private reply token, so the SME bookmarks the page and has a two-way thread with the team (`sme_thread` / `sme_reply`), no login ever. A seated SME also gets a durable per-PRD workspace reached by one stable link that resumes the same thread across versions and devices. v1 SMEs fired feedback into a void.
- **Partners (account):** a portal listing assigned projects with the latest *published* brief, their notes as live threads (each carrying a stable `PN-n` reference), and direct reply. Partner identity is server-derived, never client-asserted.
- **Team:** managers and viewers, with viewers deliberately able to participate in conversation while remaining unable to touch the document.

Partners and seated SMEs can also attach documents to their threads. Uploads are virus-scanned, stored privately, and land in the team's inbox and a per-PRD file roll-up; see `docs/ATTACHMENTS.md`.

## 6. Migration

`migrate.sql` decomposes every kv blob into rows: index to projects; answers to fields and rows (`_k` becomes `k`, so requirement IDs survive; `__k_*` counters are superseded by server allocation, verified to continue the sequence); versions, snapshots, builds, and document status to `versions`; feedback and notes (plus `partner_notes`, deduplicated by legacy id) to `comms` with their threads to `messages`; noteReqs to `input_requests`, adopting the legacy share token so old links keep working; submissions that no manager ever saw are recovered into the inbox. Everything is keyed on primary keys or `legacy_id` with `ON CONFLICT DO NOTHING`, idempotent by construction and proven idempotent in the e2e suite. v1 tables are read, never written.

## 7. Verification

Three layers, all in the repo and all green at delivery. Counts are current as of this release; the suites themselves are the source of truth.

1. Pure document pipeline: `tests/domain.test.mjs` (13: builders, IDs, diffing, brief redaction, summary math), `tests/share.test.mjs` (10: section-scoped share payloads and selection/display alignment), `tests/msgdedup.test.mjs` (5: optimistic/realtime message dedupe).
2. `tests/sync.test.mjs` (12): the real client engine against a mock server implementing the RPC contracts. Nine simultaneous adders, cross-field and same-field races (both focus cases), keystroke coalescing, transient-failure retry, generate collisions, remote-delete-while-editing, realtime idempotence.
3. `tests/backend-e2e/` (148): a genuine embedded Postgres with Supabase shims. `run.mjs` (79) runs a full v1 seed (two orgs), schema, migration twice, and every core RPC exercised as manager, viewer, partner, rival-org manager, and anonymous SME, including the adversarial set (cross-org share-token takeover attempt, anonymous rate-limit trip, forged team-name rejection, oversize-payload rejection, and viewer RLS under the `authenticated` database role). The feature suites add brand overlay (12), the durable SME workspace (16), attachments (18: type/size/infected guards, authorization resolvers, RLS, rate limit), partner-note references and backfill (10), and seed-data integrity (13).

`npm test` runs layers 1 and 2 with node only (40 checks). `npm run test:backend` runs layer 3 (148) on an embedded Postgres. Total: 188.

## 8. Known limits

Same-field simultaneous typing is last-writer-wins with notice (see §1). Supabase Realtime delivery is at-least-once and unordered across tables; the rev/id idempotence rules absorb this. The activity trail records app-level actions, not raw SQL run by a project admin in the Supabase dashboard (nothing client-side can close that; it is Supabase's boundary). Exports use the browser's print engine for PDF, a deliberate zero-dependency choice. Virus scanning depends on an external scanner being configured; with none configured, uploads are stored and clearly flagged as unscanned rather than blocked (configurable to fail-closed).
