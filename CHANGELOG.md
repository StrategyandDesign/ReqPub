# Changelog

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
