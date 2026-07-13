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
│       ├── core.js                      utilities, icons, theme, baseline fingerprint, shared helpers
│       ├── domain.js                    question bank + deterministic PRD builders (pure, tested)
│       ├── health.js                    record health: readiness signals + counts (pure, tested)
│       ├── templates.js                 validated project starters applied via the live RPCs (tested)
│       ├── data.js                      Supabase client + repository (durable, retried writes)
│       ├── sync.js                      concurrency engine: rev-checked saves, realtime, presence
│       ├── exports.js                   Word / Markdown / print / executive summary / client baseline report
│       ├── views-app.js                 shell, dashboard, workspace, command palette
│       ├── views-collab.js              inbox, discovery, notes, versions + approvals, health, access, activity
│       ├── views-external.js            partner portal, SME workspace, accountless SME pages
│       └── main.js                      state, routing, events
├── supabase/
│   ├── schema.sql                       v2 tables, RLS, RPCs, triggers, realtime auth
│   ├── migrate.sql                      v1 kv to v2 rows (idempotent; v1 data left intact)
│   ├── verify.sql                       post-migration checks
│   ├── seed-prds.sql                    optional worked-example PRDs (all three)
│   ├── seed-<name>.sql                  each example PRD standalone (add one without re-seeding the rest)
│   ├── deploy-fathering-baseline.sql    rebuild the Fathering project in place from FC-REQ-001 (approved v1.1)
│   ├── fix-*.sql                        standalone, idempotent feature migrations
│   ├── storage-attachments.sql          private attachments bucket + policies
│   └── functions/
│       ├── send-invite/                 invite email (Resend)
│       └── attachment-upload/           file upload with virus scan
├── tests/
│   ├── domain.test.mjs                  24 document / diff-evidence / brief / attribution tests
│   ├── sync.test.mjs                    12 multi-writer concurrency simulations
│   ├── share.test.mjs                   13 section-scoped share-payload tests
│   ├── msgdedup.test.mjs               5 optimistic/realtime dedupe tests
│   ├── engagement.test.mjs             15 engagement-charter + AI-acceptance + PRD-invariance tests
│   ├── health.test.mjs                 17 readiness-signal + record-count + accumulation tests
│   ├── templates.test.mjs              10 template validation + RPC-application tests
│   ├── fingerprint.test.mjs            9 canonical-JSON / SHA-256 / client-report tests
│   ├── views.test.mjs                  8 view-render contracts (picker, guard, health, promotion)
│   ├── projdedup.test.mjs              8 project-list reconciliation + retry-semantics tests
│   └── backend-e2e/                     231 checks against a real embedded Postgres
│       ├── run.mjs                      core schema, RLS, RPCs, migration (79)
│       ├── brand-overlay.test.mjs       live-brand overlay on shared views (12)
│       ├── sme-workspace.test.mjs       durable SME workspace (16)
│       ├── attachments.test.mjs         attachment guards, authz, RLS, rate limit (18)
│       ├── partner-notes.test.mjs       partner-note references + backfill (10)
│       ├── approvals.test.mjs           approver assignment, self-approve authz, gate (18)
│       ├── seed-prds.test.mjs           seed-data integrity, 3 example PRDs + standalone (19)
│       ├── deploy-fathering.test.mjs    rebuild-in-place deploy: erase, replace, approve v1.1 (21)
│       ├── new-reply.test.mjs           team-level new-reply flag: post/reply flags, any teammate clears (11)
│       ├── discovery-promote.test.mjs   discovery promotion back-link: column, fix, RLS, durability (11)
│       └── version-integrity.test.mjs   baselines immutable at the table; build tag gated + logged (16)
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
npm test                        # 121 domain + concurrency + share + health + template + fingerprint checks (node only)
npm i && npm run test:backend   # 231 checks on an embedded Postgres
```

The backend suite runs as a non-root user and needs the `en_US.UTF-8` locale
(embedded-postgres pins it for `initdb`); on a bare container, `apt-get install
locales && locale-gen en_US.UTF-8` first. CI runs both suites on every push.

## Document types

A project is one of two types, chosen in Document Control. A product or project requirements specification (the default, and every existing project) assembles the full two-part PRD. A consulting engagement assembles an engagement record, numbered 1 to 8: objective and context, success metrics, scope and approach with workstreams, assumptions and dependencies and constraints, stakeholders and roles, decisions and rationale, glossary, revision history. It is the same worksheet and the same fields: engagement mode hides the software-specific sections and reuses everything else, so a team can switch a project's framing without re-entering it, and the requirements path is unchanged for every project that carries no type. The mechanism is the same section conditions used for AI sections; see `docs/ARCHITECTURE.md`.

New projects can start from a validated template - product requirements, consulting engagement charter, or baseline assessment - whose starter fields load through the same rev-checked RPCs as live editing (`app/js/templates.js`). Templates are shapes with deliberate `to confirm` placeholders, so a fresh project opens with its own punch list on the Health tab.

## Roles

Manager (internal, writes), Viewer (internal, reads everything and can reply), Partner (external account, assigned projects only, threads and file uploads with the team), SME (accountless tokened links for briefs, app testing, and input requests, plus a durable per-PRD workspace, each opening a two-way thread).

## Enterprise posture

The controls a security or procurement reviewer looks for:

- Append-only audit trail, written only by SECURITY DEFINER functions inside the database; no update or delete path exists from the app.
- A real approval state machine: a version cannot be Approved while a named approver is pending. Approvals can be routed in-app, where the assigned teammate gets a dashboard flag and signs off their own slot.
- Per-field edit attribution with server-stamped team identity, and immutable version baselines.
- Org-scoped row-level security on every table, rate-limited anonymous endpoints, and input size ceilings.
- Uploads stored in a private bucket and virus-scanned when a scanner is configured (see `docs/ATTACHMENTS.md`).
- A Health tab that computes baseline-readiness signals (a Must without a fit criterion, an approved version with no published brief, unresolved placeholders) from the record itself - derived, never stored.
- One-click promotion from discovery and the inbox into numbered requirements and decisions, back-linked to their source, with version notes attributing additions to their origin.
- A client baseline report whose cover carries a SHA-256 fingerprint of the exact baseline (recipe restated on the document); the fingerprint identifies the snapshot, and cryptographic sealing remains the e-signature phase.

Also a command palette (⌘K), dark mode, and exports that carry status, approvals, and revision history. See `SECURITY.md` for the threat model and accepted residual risks, and `CHANGELOG.md` for release history.
