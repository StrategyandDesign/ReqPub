# Deploying ReqPub v2 — cutover runbook

> Upgrading from an earlier v2 deployment: re-run `supabase/schema.sql` (it is
> idempotent and applies the 2.1 hardenings: share fencing, rate limits,
> identity triggers, size constraints), then push the new frontend. No
> migration step is needed for a v2 → v2.1 upgrade.

Same Supabase project, same domain. v1 keeps working until step 4, and its data is never modified — `kv`, `partner_notes`, and `submissions` remain untouched as a fallback.

## 0. Before you start

Have at hand: the Supabase dashboard for the existing project, and push access to the GitHub Pages repo behind reqpub.com. Confirm `config.js` in this folder still contains your project URL and anon key (it was carried over — no change needed unless you rotated keys).

## 1. Backend — Supabase SQL Editor, in this order

1. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**. Expect "Success". Safe to re-run.
2. New query, paste `supabase/migrate.sql`, **Run**. This copies every org's projects, worksheet answers, versions, feedback, notes, partner threads, input requests, and discovery into the new tables. Idempotent — re-running never duplicates.
3. New query, paste `supabase/verify.sql`, **Run**. Every `pass` column should be `true`, and the v1/v2 count rows should match (small deltas only where v1 arrays contained blank items, which are intentionally skipped).

If any check fails, stop — v1 is still live and nothing user-facing has changed. The failure output names the entity to investigate.

## 2. Realtime prerequisite

v2 uses Broadcast-from-Database on private channels; `schema.sql` already created the triggers and the `realtime.messages` policies. No dashboard toggle is required for broadcast. (The old v1 `harden-collab.sql` publication for `kv` can stay; it is unused by v2.)

## 3. Frontend — GitHub

Replace the repo contents with the contents of this folder (keep the same repo and CNAME):

- Root: `index.html`, `config.js`, `site.css`, `site.js`, legal pages, `CNAME`, `.nojekyll`, `package.json`, `README.md`, redirect stubs (`app.html`, `signup.html`, `landing.html`)
- Folders: `app/` (now contains `app.css` and `js/`), `login/`, `signup/`, `supabase/`, `tests/`, `docs/`, `.github/`

Commit to `main`. GitHub Pages redeploys automatically (or via the included Actions workflow if Pages is set to "GitHub Actions").

## 4. Smoke test (10 minutes, two browsers)

1. Sign in as a manager in browser A, open a migrated project. The worksheet, versions, inbox history, discovery, and links should all be present.
2. Sign in as a second manager in browser B (or an incognito window), open the same project. You should see each other's presence avatars in the top bar.
3. A types in *Product vision*; B watches it arrive after A pauses. B types in *Problem statement* simultaneously — both persist. Both add a functional requirement at the same moment — two rows, two different FR numbers.
4. Both click **Generate version** at nearly the same time — two versions with distinct numbers appear.
5. Open an old SME brief link from before the migration — it still renders, and a submitted review appears in the Inbox live, with a reply thread the SME can see at their link.
6. Sign in as a partner — assigned projects, published brief, migrated threads, and new-note flow all work.
7. Check the **Activity** tab — the edits you just made are recorded with names.

## 5. Rollback

Frontend-only: revert the GitHub commit — v1 runs against `kv` exactly as before (v2 tables sit unused; edits made in v2 after cutover will not be reflected back into `kv`, so roll back promptly or not at all). The v1 SQL objects were never dropped.

## 6. After a comfortable soak (a week or two)

Optionally archive v1 data: rename `kv` to `kv_v1_backup` (don't drop it), and remove the v1-only RPCs if you want a minimal surface. Nothing in v2 references them.

## Invite emails

The `send-invite` edge function is unchanged. If it was deployed for v1, invites keep emailing; if not, invites still work — managers can tell people to sign up with the invited email (the account is claimed automatically at first sign-in).
