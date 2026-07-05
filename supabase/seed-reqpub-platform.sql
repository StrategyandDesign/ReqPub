-- ============================================================================
-- ReqPub — seed the "ReqPub Platform" worked-example PRD (standalone; touches nothing else)
-- ============================================================================
-- Run ONCE in the Supabase SQL editor, AFTER schema.sql. Re-runnable (idempotent).
-- It targets the org named exactly 'Collection Ventures'. If your workspace is
-- named differently, change the name on the first line of the DO block.
-- Generated from tools/prd-seed-data.mjs; do not hand-edit.
-- ============================================================================

begin;

do $$
declare v_org uuid;
begin
  select id into v_org from orgs where name = 'Collection Ventures' order by created_at limit 1;
  if v_org is null then
    raise exception 'No workspace named "Collection Ventures" was found. Edit the name in this file and re-run.';
  end if;

  delete from projects where org_id = v_org and id = 'prd-reqpub-platform';

  -- Insert the project shells (owned by the workspace; filled drafts, no version).
  insert into projects (id, org_id, name, disc_export) values
    ('prd-reqpub-platform', v_org, 'ReqPub Platform', false);
end $$;

-- Scalar answers
insert into project_fields (project_id, field_id, value, rev, updated_by_name, updated_at) values
  ('prd-reqpub-platform', 'ctrl_product', '"ReqPub Platform"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ctrl_org', '"Collection Ventures"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ctrl_owner', '"Micah Canfield"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ctrl_status', '"In Review"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_purpose', '"This document is the working requirements record for ReqPub itself: the platform the team uses to turn discovery into a versioned, approved, testable requirements record. It states what has already shipped (so the team edits from reality) and what remains for the next phase (SOC 2 Type II and e-signature execution with cryptographic sealing). It is the record the team stress-tests the platform against."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_vision', '"The requirements record your client approves. ReqPub takes a project from discovery to an approved, testable baseline where every version is numbered, every approval is named, and every export carries its own history. When someone asks what was agreed, you open the record. The terminal promise is a sign-off that is cryptographically sealed to the exact baseline signed, so the document proves itself."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_problem', '"Projects fail at \"that’s not what we agreed,\" not at the build. Requirements live in decks, documents, and email threads; reconstructing who approved what, when, and what changed since the client last saw it burns senior hours and goodwill. Teams need a single record that moves with the scope and defends itself under review."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_market', '"Advisory and product teams whose work is reviewed, contested, and approved: consulting engagement teams, agencies, and internal product groups working with external subject-matter experts and partners. The buyer answers to a client and to procurement; the record is the artifact both trust."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'context', '"A static frontend (installable, no build step) on a managed Postgres backend with row-level security, realtime, and edge functions. Deployed on GitHub Pages against Supabase. Used live by internal teams (managers and viewers), external SMEs with no account (tokened links), and partners who manage SMEs (a portal). Multiplayer editing must survive nine or more concurrent editors without lost writes."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_solution', '"A relational requirements platform: every shared structure is rows, not a JSON blob, so concurrent adds cannot overwrite each other; every scalar field carries a revision so stale writes are detected and resolved rather than clobbered; version numbers are allocated server-side; approvals are a real state machine with named, server-stamped sign-off; sharing is section-scoped and brand-carrying; and every export carries its own history on the cover. The next phase seals that export cryptographically and executes sign-off by e-signature."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'staged', '"Yes"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'has_ai', '"No"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'vulnerable', '"No"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'consent', '"External reviewers (SMEs) act through tokened links with no account; they see only the curated, section-scoped brief the team publishes, never fit criteria, schedules, or internal notes. Partners see only the published brief of projects granted to them. All external participation is on the record with names and timestamps."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'retention', '"Every project, version, comment, and approval is retained for the life of the workspace. Versions are immutable baselines. The activity log is append-only and written by the database itself. Managers can archive a project; an administrator can restore it. Export to Word, PDF, and Markdown is available at any time."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'residency', '"Data is stored and processed in the Supabase project region. The public anon key ships in the client by design; all protection rests on row-level security and the rev-checked RPCs."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'access', '"Row-level security scopes every table to the organization. Managers write; viewers read everything and reply in threads; partners reach only assigned projects through the portal; SMEs reach only tokened briefs. Worksheet fields and rows are writable only through rev-checked SECURITY DEFINER RPCs; write is revoked from the audit-only tables. Approval provenance is stamped from the signed-in user and cannot be forged."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'verify_note', '"A capability is accepted when it passes its fit criterion in production and is covered by the automated suite (33 unit tests, 79 backend checks on a real Postgres). The SOC 2 and e-signature requirements are accepted only when independently audited and, for e-signature, when a sealed export verifies against its exact baseline."'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'link_repo', '"github.com/StrategyandDesign/ReqPub"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'link_board', '"to confirm"'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'link_design', '"reqpub.com"'::jsonb, 1, 'Seed', now())
on conflict (project_id, field_id) do update set value = excluded.value, rev = 1;

-- Repeating rows (lists and tables). k is the permanent per-field id used for FR-/NFR-style numbering.
insert into field_rows (project_id, field_id, k, data, pos, updated_by_name, updated_at) values
  ('prd-reqpub-platform', 'ov_goals', 1, '{"text":"Let a full team edit one requirements document at once with zero lost writes."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_goals', 2, '{"text":"Make every version numbered, every approval named, and every export self-documenting."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_goals', 3, '{"text":"Let external SMEs and partners review and approve from a link with no account."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_goals', 4, '{"text":"Reach SOC 2 Type II certification before the first enterprise contract renewal."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'ov_goals', 5, '{"text":"Execute sign-off by e-signature, cryptographically sealed to the exact baseline signed."}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_in', 1, '{"text":"Relational requirements model with permanent requirement IDs and per-field revisions."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_in', 2, '{"text":"Live multiplayer editing with presence, per-field conflict detection, and durable retried saves."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_in', 3, '{"text":"Immutable, server-numbered version baselines with a change diff by requirement ID."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_in', 4, '{"text":"A real approval state machine with named, server-stamped sign-off and a gate on Approved."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_in', 5, '{"text":"Section-scoped, brand-carrying sharing: SME review links, partner portal, and read-only presentation links."}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_in', 6, '{"text":"A designed, co-branded PDF and Word export carrying version, status, approvals, and history."}'::jsonb, 6, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_in', 7, '{"text":"An append-only audit trail written by the database."}'::jsonb, 7, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_out', 1, '{"text":"No per-seat pricing model in the product; pricing is per project."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_out', 2, '{"text":"No AI authoring of requirements; the platform structures human judgment, it does not replace it."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'sol_out', 3, '{"text":"No public claims of SOC 2 or e-signature until each ships and is verified."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'assume', 1, '{"text":"Supabase (Postgres, Auth, RLS, Realtime, Storage, Edge Functions) is the backend of record."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'assume', 2, '{"text":"The internal team is trusted staff; external parties are untrusted by default."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'assume', 3, '{"text":"Managed e-signature and timestamping services exist for the next phase rather than being built in-house."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'depend', 1, '{"text":"Supabase project with row-level security and the rev-checked RPC layer."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'depend', 2, '{"text":"GitHub Pages hosting for the static frontend."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'depend', 3, '{"text":"A managed e-signature provider and an RFC 3161 timestamp authority for the sealing phase."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'depend', 4, '{"text":"An independent auditor for the SOC 2 Type II examination."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'constrain', 1, '{"text":"Static frontend, no build step; ES modules and one CDN dependency only."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'constrain', 2, '{"text":"Content Security Policy with no inline scripts."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'constrain', 3, '{"text":"All racy writes flow through server-side rev-checked RPCs; no direct client writes to worksheet tables."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'constrain', 4, '{"text":"Every change ships with regression tests; the suite stays green."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'ctrl_approvers', 1, '{"role":"Owner","name":"Micah Canfield"}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'ctrl_approvers', 2, '{"role":"Engineering","name":"to confirm"}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'ctrl_approvers', 3, '{"role":"Security / Compliance","name":"to confirm"}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'seg', 1, '{"segment":"Internal engagement teams","share":"Primary","desc":"Author and own the requirements record; answer to a client."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'seg', 2, '{"segment":"Subject-matter experts","share":"External","desc":"Review and approve from a link with no account."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'seg', 3, '{"segment":"Partners","share":"External","desc":"Manage SMEs on the client side and relay requests through a portal."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'persona', 1, '{"persona":"The engagement lead","needs":"A record that answers with them: numbered baselines, named approvals, defensible change history."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'persona', 2, '{"persona":"The subject-matter expert","needs":"To weigh in once, on the record, from a link, without new software."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'persona', 3, '{"persona":"The downstream builder","needs":"Approved, testable requirements with fit criteria and permanent IDs."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'persona', 4, '{"persona":"The procurement reviewer","needs":"Isolated data, role-based access, an append-only audit log, and exportable records."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'release', 1, '{"rel":"Phase 1 Relational core (shipped)","obj":"Rebuild from key-value to relational: rev-checked fields, insert-based rows, server-numbered versions, migration.","mvp":"shipped","ship":"shipped"}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'release', 2, '{"rel":"Phase 2 Live collaboration (shipped)","obj":"Presence, per-field conflict resolution, durable retried saves, live document follow, presentation mode.","mvp":"shipped","ship":"shipped"}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'release', 3, '{"rel":"Phase 3 Approvals & audit (shipped)","obj":"Approval state machine with named sign-off, append-only activity trail, provenance trigger.","mvp":"shipped","ship":"shipped"}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'release', 4, '{"rel":"Phase 4 Sharing & brand (shipped)","obj":"Section-scoped SME links, partner portal, per-PRD brand logo, designed co-branded PDF, read-only presentation link.","mvp":"shipped","ship":"shipped"}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'release', 5, '{"rel":"Phase 5 SOC 2 Type II (next)","obj":"Controls, evidence collection, and an independent Type II examination.","mvp":"to confirm","ship":"to confirm"}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'release', 6, '{"rel":"Phase 6 E-signature & sealing (next)","obj":"Execute sign-off by e-signature and cryptographically seal each export to the exact baseline signed.","mvp":"to confirm","ship":"to confirm"}'::jsonb, 6, 'Seed', now()),
  ('prd-reqpub-platform', 'components', 1, '{"name":"Relational core","owner":"Engineering","status":"Shipped","desc":"Projects, fields, rows, versions; rev-checked RPCs; RLS; kv migration."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'components', 2, '{"name":"Live collaboration","owner":"Engineering","status":"Shipped","desc":"Presence, conflict resolution, durable saves, live doc follow, presentation mode."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'components', 3, '{"name":"Approvals & audit","owner":"Engineering","status":"Shipped","desc":"Approval state machine, named sign-off, append-only activity trail."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'components', 4, '{"name":"Sharing & brand","owner":"Engineering","status":"Shipped","desc":"Section-scoped links, partner portal, brand logo, designed PDF, presentation link."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'components', 5, '{"name":"SOC 2 compliance","owner":"Security / Compliance","status":"Planned","desc":"Control set, evidence automation, independent Type II examination."}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'components', 6, '{"name":"E-signature & sealing","owner":"Engineering","status":"Planned","desc":"E-signature execution and cryptographic sealing of exports to their baseline."}'::jsonb, 6, 'Seed', now()),
  ('prd-reqpub-platform', 'metrics', 1, '{"metric":"Concurrent editors without lost writes","target":"9 or more","method":"Multi-writer concurrency simulation against the rev-checked RPCs."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'metrics', 2, '{"metric":"Save durability","target":"100% confirmed or visibly failed","method":"Every write awaited, retried on transient failure, surfaced in the save indicator."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'metrics', 3, '{"metric":"Approval integrity","target":"no Approved while a sign-off is pending","method":"Backend check on the version status state machine."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'metrics', 4, '{"metric":"Share scoping","target":"zero internal fields in any external payload","method":"Payload-build tests asserting fit criteria never appear."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'metrics', 5, '{"metric":"Backend regression suite","target":"79 checks green on every change","method":"Embedded-Postgres end-to-end run in CI."}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'metrics', 6, '{"metric":"SOC 2 Type II","target":"certified (next phase)","method":"Independent auditor report; published only when live."}'::jsonb, 6, 'Seed', now()),
  ('prd-reqpub-platform', 'metrics', 7, '{"metric":"Sealed sign-off","target":"export verifies to its exact baseline (next phase)","method":"Cryptographic verification independent of the platform."}'::jsonb, 7, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 1, '{"stmt":"The platform stores every shared collection as rows so two people adding requirements at the same moment both persist with distinct permanent IDs.","fit":"Nine simultaneous adds yield nine rows with unique requirement IDs. Test.","pri":"Must","comp":"Relational core"}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 2, '{"stmt":"Every scalar field carries a revision; a save based on a stale revision is detected and resolved by name rather than silently overwriting.","fit":"A stale write returns the current value and author; the loser is never destroyed silently. Test.","pri":"Must","comp":"Relational core"}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 3, '{"stmt":"Version numbers are allocated server-side under a lock, and each baseline is an immutable snapshot with a change diff by requirement ID.","fit":"Two managers generating at once produce distinct version numbers; diffs list added, modified, and removed by ID. Test.","pri":"Must","comp":"Relational core"}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 4, '{"stmt":"Live presence shows who is editing which field, edits stream into the rendered document as they are typed, and every save is confirmed, retried on transient failure, or shown as failed.","fit":"Two editors see each other’s presence and edits; a dropped network retries without loss. Demonstration and Test.","pri":"Must","comp":"Live collaboration"}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 5, '{"stmt":"Approvals are a state machine (Draft, In review, Approved, Changes requested) with named approvers, and a version cannot read Approved while any approver is pending.","fit":"Attempting to approve with a pending approver is refused; sign-off is stamped from the signed-in user. Test.","pri":"Must","comp":"Approvals & audit"}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 6, '{"stmt":"An append-only audit trail records every edit, version, status change, and inbound submission with a name and timestamp, unmodifiable from the app.","fit":"The activity log cannot be edited or deleted through the application. Inspection and Test.","pri":"Must","comp":"Approvals & audit"}'::jsonb, 6, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 7, '{"stmt":"Sharing is section-scoped and brand-carrying: SME review links, a partner portal, and read-only presentation links, each showing only the sections the team selected and the assigned collaborator logo, never internal fields.","fit":"An unselected section is absent from the share payload; fit criteria never appear. Test.","pri":"Must","comp":"Sharing & brand"}'::jsonb, 7, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 8, '{"stmt":"Exports to PDF and Word carry a designed, co-branded cover with version, status, approval history, and revision record.","fit":"A printed and a Word export both carry the cover metadata and the assigned logo. Demonstration.","pri":"Must","comp":"Sharing & brand"}'::jsonb, 8, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 9, '{"stmt":"A read-only presentation link renders the branded record with no review form and no account, pointing at a specific published version so what a recipient opens is fixed.","fit":"Any role can copy a link that opens the record read-only; it cannot be edited. Test.","pri":"Must","comp":"Sharing & brand"}'::jsonb, 9, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 10, '{"stmt":"The platform earns SOC 2 Type II certification covering security, availability, and confidentiality.","fit":"An independent auditor issues a Type II report; the claim is published only once the report is in hand. Independent audit.","pri":"Should","comp":"SOC 2 compliance"}'::jsonb, 10, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 11, '{"stmt":"The platform executes sign-off by e-signature bound to the identity of the approver.","fit":"An approver signs a version and the signature records identity, intent, and timestamp on the record. Test.","pri":"Should","comp":"E-signature & sealing"}'::jsonb, 11, 'Seed', now()),
  ('prd-reqpub-platform', 'fr', 12, '{"stmt":"Each export is cryptographically sealed to the exact baseline signed, so a sealed document verifies independently even if ReqPub is offline.","fit":"A sealed export verifies against its baseline hash without the platform; tampering fails verification. Test.","pri":"Should","comp":"E-signature & sealing"}'::jsonb, 12, 'Seed', now()),
  ('prd-reqpub-platform', 'nfr', 1, '{"stmt":"Racy writes flow only through server-side rev-checked RPCs; direct client writes to worksheet tables are revoked.","fit":"The authenticated role cannot write project_fields or field_rows directly. Test.","pri":"Must","comp":"Relational core"}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'nfr', 2, '{"stmt":"Row-level security scopes every table to the organization, with the strictest policy on approvals and the audit trail.","fit":"A rival-org user reads and writes nothing; approval provenance cannot be forged. Test.","pri":"Must","comp":"Approvals & audit"}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'nfr', 3, '{"stmt":"The frontend ships a Content Security Policy with no inline scripts and escapes every interpolation.","fit":"A security review finds no script-injection vector. Inspection.","pri":"Must","comp":"Live collaboration"}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'nfr', 4, '{"stmt":"Every change ships with regression tests and the suite stays green (33 unit, 79 backend checks).","fit":"CI runs the suites on every push. Test.","pri":"Must","comp":"Relational core"}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'nfr', 5, '{"stmt":"Anonymous endpoints are rate-limited and input is size-capped.","fit":"Flooding a share link is throttled; oversized input is rejected. Test.","pri":"Should","comp":"Sharing & brand"}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'interfaces', 1, '{"iface":"Supabase backend","req":"Postgres, Auth, RLS, Realtime, Storage, Edge Functions","fit":"All data and auth flow through the managed backend. Inspection.","comp":"Relational core"}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'interfaces', 2, '{"iface":"GitHub Pages","req":"Static hosting of the frontend at reqpub.com","fit":"The site deploys from the main branch. Inspection.","comp":"Live collaboration"}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'interfaces', 3, '{"iface":"E-signature provider","req":"Identity-bound signature execution with audit metadata (next phase)","fit":"A sign-off records signer identity, intent, and timestamp. Test.","comp":"E-signature & sealing"}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'interfaces', 4, '{"iface":"Timestamp authority","req":"RFC 3161 timestamping for sealed exports (next phase)","fit":"A sealed export carries a trusted timestamp. Test.","comp":"E-signature & sealing"}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'people', 1, '{"name":"Micah Canfield","role":"Owner; product direction and approvals"}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'people', 2, '{"name":"Collection Ventures team","role":"Nine-person team stress-testing the platform as managers, viewers, partners, and SME reviewers"}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'glossary', 1, '{"term":"Baseline","def":"An immutable, numbered snapshot of the requirements at a point in time."}'::jsonb, 1, 'Seed', now()),
  ('prd-reqpub-platform', 'glossary', 2, '{"term":"Rev-checked save","def":"A write accepted only if it is based on the current revision of a field."}'::jsonb, 2, 'Seed', now()),
  ('prd-reqpub-platform', 'glossary', 3, '{"term":"Section-scoped share","def":"A published brief containing only the sections the team selected."}'::jsonb, 3, 'Seed', now()),
  ('prd-reqpub-platform', 'glossary', 4, '{"term":"Presentation link","def":"A fixed, read-only, branded view of a published version."}'::jsonb, 4, 'Seed', now()),
  ('prd-reqpub-platform', 'glossary', 5, '{"term":"Sealed export","def":"An export cryptographically bound to the exact baseline signed (next phase)."}'::jsonb, 5, 'Seed', now()),
  ('prd-reqpub-platform', 'glossary', 6, '{"term":"SOC 2 Type II","def":"An independent examination of security controls over a period (next phase)."}'::jsonb, 6, 'Seed', now())
on conflict (project_id, field_id, k) do update set data = excluded.data, pos = excluded.pos, rev = 1;

commit;
