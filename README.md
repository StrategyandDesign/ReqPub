# ReqPub v2

From discovery to versioned, approved, testable requirements, rebuilt for real concurrent editing.

ReqPub is a static frontend (GitHub Pages) on a Supabase backend. v2 replaces v1's client-authoritative key-value sync, which lost writes under concurrent editing, with a relational model, server-side concurrency control, realtime, and presence. The guided worksheet, the deterministic PRD builders, the brand, and every v1 share link are preserved.

## What changed

In v1 every shared structure was a JSON blob under one key, pushed whole with last-write-wins, so two people editing in the same second could drop each other's work. In v2 every shared collection is rows (adds are inserts, so concurrent adds both land), every scalar worksheet field is one row with an integer `rev` (a stale write is detected and returned to the client, never silently applied), version numbers are allocated server-side under a lock, all writes are awaited and retried with a visible saving/saved/failed state, and everyone sees everyone's work live over authorized realtime channels. The model is server-ordered, field-level conflict resolution rather than a CRDT; the reasoning, with citations, is in `docs/ARCHITECTURE.md`.

## Repository map

```
├── index.html, site.css, site.js       marketing landing + legal-page assets
├── landing.html, app.html, signup.html  redirect stubs to canonical paths
├── login/  signup/                      auth pages
├── config.js                            Supabase URL + anon key
├── app/
│   ├── index.html  app.css
│   └── js/
│       ├── core.js                      utilities, icons, theme, shared helpers
│       ├── domain.js                    question bank + deterministic PRD builders (pure, tested)
│       ├── data.js                      Supabase client + repository (durable, retried writes)
│       ├── sync.js                      concurrency engine: rev-checked saves, realtime, presence
│       ├── exports.js                   Word / Markdown / print / executive summary
│       ├── views-app.js                 shell, dashboard, workspace, command palette
│       ├── views-collab.js              inbox, discovery, notes, versions + approvals, access, activity
│       ├── views-external.js            partner portal, SME workspace, accountless SME pages
│       └── main.js                      state, routing, events
├── supabase/
│   ├── schema.sql                       v2 tables, RLS, RPCs, triggers, realtime auth
│   ├── migrate.sql                      v1 kv to v2 rows (idempotent; v1 data left intact)
│   ├── verify.sql                       post-migration checks
│   ├── seed-prds.sql                    optional worked-example PRDs
│   ├── fix-*.sql                        standalone, idempotent feature migrations
│   ├── storage-attachments.sql          private attachments bucket + policies
│   └── functions/
│       ├── send-invite/                 invite email (Resend)
│       └── attachment-upload/           file upload with virus scan
├── tests/
│   ├── domain.test.mjs                  15 document / diff / brief / decision tests
│   ├── sync.test.mjs                    12 multi-writer concurrency simulations
│   ├── share.test.mjs                   10 section-scoped share-payload tests
│   ├── msgdedup.test.mjs               5 optimistic/realtime dedupe tests
│   └── backend-e2e/                     148 checks against a real embedded Postgres
│       ├── run.mjs                      core schema, RLS, RPCs, migration (79)
│       ├── brand-overlay.test.mjs       live-brand overlay on shared views (12)
│       ├── sme-workspace.test.mjs       durable SME workspace (16)
│       ├── attachments.test.mjs         attachment guards, authz, RLS, rate limit (18)
│       ├── partner-notes.test.mjs       partner-note references + backfill (10)
│       └── seed-prds.test.mjs           seed-data integrity (13)
├── tools/                               PRD seed generator (validated against the builders)
├── docs/
│   ├── ARCHITECTURE.md                  design rationale + citations
│   ├── AUDIT.md                         pre-review security & correctness audit
│   └── ATTACHMENTS.md                   file-attachment setup
└── terms / privacy / cookies / …        legal pages
```

## Quick start

Deploying or migrating: read `DEPLOY.md` (the cutover runbook). Design rationale: `docs/ARCHITECTURE.md`.

```bash
npm test                        # 42 domain + concurrency + dedupe checks (node only)
npm i && npm run test:backend   # 148 checks on an embedded Postgres
```

## Roles

Manager (internal, writes), Viewer (internal, reads everything and can reply), Partner (external account, assigned projects only, threads and file uploads with the team), SME (accountless tokened links for briefs, app testing, and input requests, plus a durable per-PRD workspace, each opening a two-way thread).

## Enterprise posture

Append-only audit trail written by database triggers; a real approval state machine (a version cannot be Approved while a named approver is pending); per-field edit attribution with server-stamped team identity; immutable version baselines; org-scoped RLS on every table; rate-limited anonymous endpoints; input size ceilings; virus-scanned uploads stored in a private bucket. Also a command palette (⌘K), dark mode, and exports that carry status, approvals, and revision history. See `SECURITY.md` for the threat model and accepted residual risks, and `CHANGELOG.md` for release history.
