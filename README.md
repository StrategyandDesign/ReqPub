# ReqPub v2

From discovery to versioned, approved, testable requirements — rebuilt for real concurrent editing.

ReqPub is a static frontend (GitHub Pages) on a Supabase backend. v2 replaces v1's client-authoritative key-value sync — the source of the lost-write incidents under nine concurrent editors — with a relational model, server-side concurrency control, live realtime, and presence. The guided worksheet, the deterministic PRD builders, the brand, and every v1 share link are preserved.

## What changed, in one paragraph

In v1 every shared structure was a JSON blob under one key, pushed whole with last-write-wins. Two people adding notes in the same second meant one note vanished. In v2 every shared collection is rows (adds are inserts — concurrent adds both land), every scalar worksheet field is one row with an integer `rev` (stale writes are *detected and returned*, never silently applied), version numbers are allocated server-side under a lock, all writes are awaited and retried with visible saving/saved/failed state, and everyone sees everyone's work live over authorized realtime channels with presence avatars. The same architecture pattern Figma and Linear ship: server-ordered, field-level conflict resolution — no CRDT needed for structured documents.

## Repository map

```
├── index.html, site.css, site.js      marketing landing (carried over)
├── login/  signup/                    auth pages
├── app/                               the product
│   ├── index.html  app.css
│   └── js/
│       ├── core.js                    utilities, icons, theme
│       ├── domain.js                  question bank + deterministic PRD builders (pure, tested)
│       ├── data.js                    Supabase client + repository (durable, retried writes)
│       ├── sync.js                    concurrency engine: rev-checked saves, realtime, presence
│       ├── exports.js                 Word / Markdown / print / executive summary
│       ├── views-app.js               shell, dashboard, workspace, palette
│       ├── views-collab.js            inbox, feedback, discovery, notes, versions+approvals, activity
│       ├── views-external.js          partner portal + accountless SME pages
│       └── main.js                    state, routing, events
├── supabase/
│   ├── schema.sql                     v2 tables, RLS, RPCs, triggers, realtime auth
│   ├── migrate.sql                    v1 kv → v2 rows (idempotent; v1 data left intact)
│   ├── verify.sql                     post-migration checks
│   └── functions/send-invite/         invite email edge function (Resend)
├── tests/
│   ├── domain.test.mjs                13 document/diff/brief tests
│   ├── sync.test.mjs                  12 multi-writer concurrency simulations
│   ├── share.test.mjs                 7 section-scoped share payload tests
│   └── backend-e2e/run.mjs            73 checks against a real embedded Postgres
├── docs/AUDIT.md                      pre-review security audit: findings + fixes
└── terms/privacy/cookies/…            legal pages (carried over)
```

## Quick start

Deploying or migrating: read **DEPLOY.md** (the exact cutover runbook). Design rationale: **docs/ARCHITECTURE.md**.

Run the test suite:

```bash
npm test              # domain + concurrency simulations (no install needed beyond node)
npm i && npm run test:backend   # full backend e2e on an embedded Postgres
```

## Roles

Manager (internal, writes), Viewer (internal, reads everything and can reply), Partner (external account, assigned projects only, threads with the team), SME (no account — tokened links for briefs, app testing, and input requests, each opening a live two-way thread).

## Enterprise posture

Append-only audit trail written by database triggers; a real approval state machine (a version cannot be Approved while a named approver is pending); per-field edit attribution with server-stamped team identity; immutable version baselines; org-scoped RLS on every table; rate-limited anonymous endpoints; input size ceilings; command palette (⌘K); dark mode; exports carry status, approvals, and revision history. See SECURITY.md for the threat model and accepted residual risks, and CHANGELOG.md for release history.
