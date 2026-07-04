-- ============================================================================
-- ReqPub v2 — relational backend
-- ============================================================================
-- Run once in the Supabase SQL Editor of the EXISTING ReqPub project.
-- Safe to re-run (idempotent). Creates only NEW objects; v1 tables (kv, shares,
-- submissions, partner_notes) are left untouched so the v1 app keeps working
-- until you cut over. Run migrate.sql AFTER this file to move v1 data in.
--
-- Design (see docs/ARCHITECTURE.md):
--   * Every shared collection is rows, not a JSON array under one key.
--     Adds are INSERTs, edits are UPDATEs by id — concurrent adds cannot
--     overwrite each other.
--   * Scalar worksheet fields live one-row-per-field with an integer `rev`.
--     Writes are conditional on `rev` (optimistic concurrency): a stale write
--     is DETECTED and returned to the client instead of silently clobbering.
--   * Version sequence numbers are allocated server-side under a lock.
--   * Realtime uses Broadcast-from-Database (recommended over postgres_changes
--     for multi-editor scale) on private, RLS-authorized channels.
--   * `activity` is an insert-only audit trail written by triggers.
--
-- Roles:
--   manager  (internal) — full write
--   viewer   (internal) — read everything, may post notes/replies, no doc edits
--   partner  (external) — assigned projects only, via SECURITY DEFINER RPCs
--   SME      (external) — no account; tokened share links + tokened reply threads
-- ============================================================================

create extension if not exists pgcrypto;

-- Helper functions below reference tables created later in this file; defer
-- body validation to first execution (the same setting pg_dump emits).
set check_function_bodies = off;

-- ----------------------------------------------------------------------------
-- 0) Helpers (shared with v1 — recreated here so this file stands alone)
-- ----------------------------------------------------------------------------
create or replace function is_org_member(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function is_org_manager(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'manager');
$$;

-- Org of a project (projects.id is text to preserve v1 ids and share links).
create or replace function project_org(p_project text)
returns uuid language sql security definer stable set search_path = public as $$
  select org_id from projects where id = p_project;
$$;

create or replace function is_project_member(p_project text)
returns boolean language sql security definer stable set search_path = public as $$
  select is_org_member(project_org(p_project));
$$;

create or replace function is_project_manager(p_project text)
returns boolean language sql security definer stable set search_path = public as $$
  select is_org_manager(project_org(p_project));
$$;

-- Partner assigned to a project (external role).
create or replace function is_project_partner(p_project text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from partner_access pa join partners p on p.id = pa.partner_id
    where pa.project_id = p_project and p.user_id = auth.uid());
$$;

-- Display name of the current user (profile, else member email, else 'Member').
create or replace function current_display_name()
returns text language sql security definer stable set search_path = public as $$
  select coalesce(
    nullif(trim((select display_name from user_profiles where user_id = auth.uid())), ''),
    nullif(trim((select email from auth.users where id = auth.uid())), ''),
    'Member');
$$;

-- Random, URL-safe, non-enumerable share/reply tokens.
-- search_path includes `extensions`: on Supabase, pgcrypto (gen_random_bytes)
-- lives there, while a plain Postgres installs it into public. Without this,
-- every function that mints a token fails on Supabase with
-- "function gen_random_bytes does not exist".
create or replace function url_token(p_bytes int default 18)
returns text language sql volatile set search_path = public, extensions as $$
  select translate(encode(gen_random_bytes(p_bytes), 'base64'), '+/=', '-_');
$$;

-- ----------------------------------------------------------------------------
-- 1) User profiles (display names for attribution and presence)
-- ----------------------------------------------------------------------------
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  updated_at timestamptz not null default now()
);
alter table user_profiles enable row level security;

drop policy if exists up_self_rw on user_profiles;
create policy up_self_rw on user_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Co-members of any shared org may read your display name.
drop policy if exists up_peers_read on user_profiles;
create policy up_peers_read on user_profiles for select using (
  exists(select 1 from org_members a join org_members b on a.org_id = b.org_id
         where a.user_id = auth.uid() and b.user_id = user_profiles.user_id));

-- ----------------------------------------------------------------------------
-- 2) Projects (one row per PRD; id is text to preserve v1 ids and links)
-- ----------------------------------------------------------------------------
create table if not exists projects (
  id text primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  disc_export boolean not null default false,   -- include discovery appendix in exports
  brand_logo text not null default '',          -- collaborator logo (data URL) shown on the shared PRD + exports
  brand_label text not null default '',         -- collaborator name shown under the logo
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Additive for projects created before this column existed.
alter table projects add column if not exists brand_logo text not null default '';
alter table projects add column if not exists brand_label text not null default '';
-- Monotonic counter for partner-note references (PN-1, PN-2, …); never reused.
alter table projects add column if not exists partner_note_seq int not null default 0;
-- Cap the stored logo (a downscaled data URL is ~10-60 KB; this bounds abuse).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_brand_cap') then
    alter table projects add constraint projects_brand_cap
      check (length(brand_logo) <= 600000 and length(brand_label) <= 160) not valid;
  end if;
end $$;
create index if not exists projects_org on projects(org_id) where not archived;
alter table projects enable row level security;

drop policy if exists projects_read on projects;
create policy projects_read on projects for select using (is_org_member(org_id));
drop policy if exists projects_write on projects;
create policy projects_write on projects for all
  using (is_org_manager(org_id)) with check (is_org_manager(org_id));

-- ----------------------------------------------------------------------------
-- 3) Worksheet storage
--    project_fields — one row per scalar answer (short/long/choice), rev-checked
--    field_rows     — one row per repeating item (rows/list questions)
-- ----------------------------------------------------------------------------
create table if not exists project_fields (
  project_id text not null references projects(id) on delete cascade,
  field_id text not null,
  value jsonb,
  rev integer not null default 1,
  updated_by uuid default auth.uid(),
  updated_by_name text not null default '',
  updated_at timestamptz not null default now(),
  primary key (project_id, field_id)
);
alter table project_fields enable row level security;

drop policy if exists pf_read on project_fields;
create policy pf_read on project_fields for select using (is_project_member(project_id));
-- Writes go through save_field() so rev checks cannot be bypassed by the client.
-- No direct insert/update/delete policies on purpose.

create table if not exists field_rows (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  field_id text not null,
  k integer not null,                       -- stable per-field counter; FR/NFR ids derive from it
  data jsonb not null default '{}'::jsonb,
  pos double precision not null,            -- sort position
  rev integer not null default 1,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_by_name text not null default '',
  updated_at timestamptz not null default now(),
  unique (project_id, field_id, k)
);
create index if not exists field_rows_live on field_rows(project_id, field_id, pos) where not deleted;
alter table field_rows enable row level security;

drop policy if exists frow_read on field_rows;
create policy frow_read on field_rows for select using (is_project_member(project_id));
-- Writes via upsert_row()/delete_row() RPCs only.

-- ----------------------------------------------------------------------------
-- 4) Versions (immutable baselines) + approvals (a real state machine)
-- ----------------------------------------------------------------------------
create table if not exists versions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  seq integer not null,
  label text not null,                      -- e.g. 1.0, 1.1, 2.0
  status text not null default 'draft'
    check (status in ('draft','in_review','approved','changes_requested')),
  note text not null default '',
  author_name text not null default '',
  build text not null default '',           -- deployed build tag for pilot feedback
  snapshot jsonb not null,                  -- {answers:{...}, sections:{...}}
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (project_id, seq)
);
create index if not exists versions_proj on versions(project_id, seq desc);
alter table versions enable row level security;

drop policy if exists ver_read on versions;
create policy ver_read on versions for select using (is_project_member(project_id));
drop policy if exists ver_update on versions;
create policy ver_update on versions for update               -- build tag + status edits
  using (is_project_manager(project_id)) with check (is_project_manager(project_id));
-- Inserts via create_version() so seq/label allocation cannot race.

create table if not exists version_approvals (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references versions(id) on delete cascade,
  approver_role text not null default '',   -- e.g. Product, Engineering, Sponsor
  approver_name text not null default '',
  approver_user_id uuid,                     -- set when assigned to a team member (in-app flag + self-approve); null = manual sign-off
  status text not null default 'pending'
    check (status in ('pending','approved','changes_requested')),
  comment text not null default '',
  decided_by uuid,
  decided_at timestamptz
);
create index if not exists va_ver on version_approvals(version_id);
create index if not exists va_user on version_approvals(approver_user_id);
alter table version_approvals enable row level security;

drop policy if exists va_read on version_approvals;
create policy va_read on version_approvals for select using (
  exists(select 1 from versions v where v.id = version_id and is_project_member(v.project_id)));
drop policy if exists va_write on version_approvals;
create policy va_write on version_approvals for all
  using (exists(select 1 from versions v where v.id = version_id and is_project_manager(v.project_id)))
  with check (exists(select 1 from versions v where v.id = version_id and is_project_manager(v.project_id)));

-- Approval provenance is enforced, not merely conventional: a new approver
-- row always starts 'pending', and any transition to a decided state stamps
-- decided_by/decided_at from auth.uid() — so a manager cannot forge who
-- signed off, even writing the table directly. Decisions flow through
-- approval_decide(); this trigger is the backstop for direct writes.
create or replace function enforce_approval_provenance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';                 -- approvers are added pending, never pre-approved
    new.decided_by := null; new.decided_at := null;
  elsif new.status is distinct from old.status then
    if new.status = 'pending' then
      new.decided_by := null; new.decided_at := null;
    else
      new.decided_by := coalesce(auth.uid(), new.decided_by);
      new.decided_at := now();
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists va_provenance on version_approvals;
create trigger va_provenance before insert or update on version_approvals
  for each row execute function enforce_approval_provenance();

-- ----------------------------------------------------------------------------
-- 5) Communications
--    comms    — every inbound/outbound item (app feedback, brief reviews,
--               SME notes, partner notes, team notes, meeting notes)
--    messages — threaded replies on any parent (comm / request)
-- ----------------------------------------------------------------------------
create table if not exists comms (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,                    -- v1 id, for migration dedupe
  org_id uuid not null references orgs(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  origin text not null check (origin in ('app','brief','sme','partner','team','meeting')),
  request_id uuid,                          -- set when this answers an input request
  version_seq integer,                      -- version it was filed against, if any
  author_name text not null default '',
  author_email text not null default '',
  author_user uuid,
  partner_id uuid references partners(id) on delete set null,
  title text not null default '',
  body text not null default '',
  steps text not null default '',           -- steps to reproduce (app feedback)
  fb_type text not null default '',         -- Bug / Idea / Question / Review ...
  severity text not null default '',
  verdict text not null default '',         -- brief review verdict
  status text not null default 'new' check (status in ('new','in_review','actioned','closed')),
  assignee text not null default '',
  promoted_to text not null default '',     -- '', 'discovery', or a requirement id like FR-012
  reply_token text unique,                  -- SME two-way thread token (accountless)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comms_proj on comms(project_id, created_at desc);
create index if not exists comms_org on comms(org_id, created_at desc);   -- dashboard rollups
create index if not exists comms_req on comms(request_id) where request_id is not null;
-- Human-friendly per-project reference for partner notes (PN-1, PN-2, …) so each
-- is uniquely trackable in the inbox and in conversation.
alter table comms add column if not exists ref text;
alter table comms enable row level security;

drop policy if exists comms_member_read on comms;
create policy comms_member_read on comms for select using (is_org_member(org_id));
drop policy if exists comms_member_insert on comms;
create policy comms_member_insert on comms for insert with check (
  is_org_member(org_id) and origin in ('team','sme','meeting') and author_user = auth.uid());
drop policy if exists comms_manager_update on comms;
create policy comms_manager_update on comms for update
  using (is_org_manager(org_id)) with check (is_org_manager(org_id));
drop policy if exists comms_manager_delete on comms;
create policy comms_manager_delete on comms for delete using (is_org_manager(org_id));
-- External inserts (SME/partner/app) arrive via SECURITY DEFINER RPCs below.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  parent_kind text not null check (parent_kind in ('comm','request')),
  parent_id uuid not null,
  author_kind text not null check (author_kind in ('team','partner','sme')),
  author_name text not null default '',
  author_user uuid,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_parent on messages(parent_kind, parent_id, created_at);
alter table messages enable row level security;

drop policy if exists msg_member_read on messages;
create policy msg_member_read on messages for select using (is_org_member(org_id));
-- (msg_member_insert is created after input_requests exists — see section 6.)
-- Partner/SME replies via RPCs. No update/delete: messages are permanent record.

-- Team identity is asserted by the server, not the client: a signed-in member
-- posting as the team gets their profile name stamped on, so nobody can put
-- words under a teammate's name (SMEs and partners see these names).
-- Migration and SQL-console runs (auth.uid() is null) keep historical names.
create or replace function enforce_team_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Branch by table first: SQL boolean expressions do not short-circuit, so a
  -- combined condition would touch columns the other table does not have.
  if auth.uid() is null then return new; end if;
  if tg_table_name = 'messages' then
    if new.author_kind = 'team' then
      new.author_name := current_display_name();
      new.author_user := auth.uid();
    end if;
  elsif tg_table_name = 'comms' then
    if new.origin = 'team' then
      new.author_name := current_display_name();
      new.author_user := auth.uid();
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists messages_team_author on messages;
create trigger messages_team_author before insert on messages
  for each row execute function enforce_team_author();
drop trigger if exists comms_team_author on comms;
create trigger comms_team_author before insert on comms
  for each row execute function enforce_team_author();

-- Body-size ceilings for rows written directly (RPC paths enforce their own).
-- NOT VALID: applies to new writes without re-checking migrated history.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'comms_body_cap') then
    alter table comms add constraint comms_body_cap
      check (length(body) <= 20000 and length(title) <= 500) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_body_cap') then
    alter table messages add constraint messages_body_cap
      check (length(body) <= 20000) not valid;
  end if;
  -- Version labels must be numeric (create_version parses them with ::integer;
  -- a hand-edited non-numeric label would otherwise break version creation).
  if not exists (select 1 from pg_constraint where conname = 'versions_label_fmt') then
    alter table versions add constraint versions_label_fmt
      check (label ~ '^[0-9]+(\.[0-9]+)?$') not valid;
  end if;
end $$;

-- Per-user read receipts (v1 stored these org-wide, which was wrong).
create table if not exists read_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  comm_id uuid not null references comms(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, comm_id)
);
alter table read_marks enable row level security;
drop policy if exists rm_self on read_marks;
create policy rm_self on read_marks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6) Input requests (tokened "ask an SME" links) and discovery log
-- ----------------------------------------------------------------------------
create table if not exists input_requests (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  org_id uuid not null references orgs(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  title text not null,
  prompt text not null default '',
  author_name text not null default '',
  due date,
  status text not null default 'open' check (status in ('open','closed')),
  token text not null unique default url_token(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists req_proj on input_requests(project_id, created_at desc);
alter table input_requests enable row level security;

drop policy if exists req_member_read on input_requests;
create policy req_member_read on input_requests for select using (is_org_member(org_id));
drop policy if exists req_manager_write on input_requests;
create policy req_manager_write on input_requests for all
  using (is_org_manager(org_id)) with check (is_org_manager(org_id));

-- Members (managers and viewers) may reply on comms and requests in their org.
-- The parent must belong to the same org — prevents cross-org message injection.
drop policy if exists msg_member_insert on messages;
create policy msg_member_insert on messages for insert with check (
  is_org_member(org_id) and author_kind = 'team' and author_user = auth.uid()
  and ((parent_kind = 'comm' and exists(
          select 1 from comms c where c.id = parent_id and c.org_id = messages.org_id))
    or (parent_kind = 'request' and exists(
          select 1 from input_requests r where r.id = parent_id and r.org_id = messages.org_id))));

create table if not exists discovery_entries (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  org_id uuid not null references orgs(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  takeaway text not null default '',
  context text not null default '',
  heard text not null default '',
  decided text not null default '',
  open_questions text not null default '',
  notes text not null default '',
  tags text not null default '',
  who text not null default '',
  source text not null default '',
  links text not null default '',
  author_name text not null default '',
  rev integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists disc_proj on discovery_entries(project_id, created_at desc);
alter table discovery_entries enable row level security;

drop policy if exists disc_member_read on discovery_entries;
create policy disc_member_read on discovery_entries for select using (is_org_member(org_id));
drop policy if exists disc_manager_write on discovery_entries;
create policy disc_manager_write on discovery_entries for all
  using (is_org_manager(org_id)) with check (is_org_manager(org_id));

-- ----------------------------------------------------------------------------
-- 7) Activity — insert-only audit trail (Palantir-style: cannot be edited)
-- ----------------------------------------------------------------------------
create table if not exists activity (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs(id) on delete cascade,   -- audit rows can't outlive or misattribute their org
  project_id text,
  actor uuid,
  actor_name text not null default '',
  action text not null,                     -- e.g. field.saved, version.created
  entity_kind text not null default '',
  entity_id text not null default '',
  summary text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_org on activity(org_id, id desc);
create index if not exists activity_proj on activity(project_id, id desc) where project_id is not null;
alter table activity enable row level security;

drop policy if exists act_member_read on activity;
create policy act_member_read on activity for select using (is_org_member(org_id));
-- No insert/update/delete policies: rows arrive only via the definer function
-- below, and nothing can modify them afterward.

create or replace function log_activity(
  p_org uuid, p_project text, p_action text, p_entity_kind text,
  p_entity_id text, p_summary text, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into activity(org_id, project_id, actor, actor_name, action, entity_kind, entity_id, summary, meta)
  values (p_org, p_project, auth.uid(), coalesce(current_display_name(),''), p_action,
          coalesce(p_entity_kind,''), coalesce(p_entity_id,''), coalesce(p_summary,''), coalesce(p_meta,'{}'::jsonb));
exception when others then null;  -- the audit trail must never break a write
end; $$;

-- ----------------------------------------------------------------------------
-- 8) Realtime — broadcast-from-database on private channels
--    Topics:  org:<org_id>      (project list, inbox counters)
--             proj:<project_id> (fields, rows, versions, comms, messages, ...)
-- ----------------------------------------------------------------------------
create or replace function broadcast_project_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_project text; v_topic text;
begin
  v_project := coalesce(new.project_id, old.project_id);
  if v_project is null then return coalesce(new, old); end if;
  v_topic := 'proj:' || v_project;
  begin
    perform realtime.broadcast_changes(v_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
  exception when others then null;          -- realtime outage must never block a write
  end;
  return coalesce(new, old);
end; $$;

create or replace function broadcast_org_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  v_org := coalesce(new.org_id, old.org_id);
  if v_org is null then return coalesce(new, old); end if;
  begin
    perform realtime.broadcast_changes('org:' || v_org::text, tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
  exception when others then null;
  end;
  return coalesce(new, old);
end; $$;

-- messages and version_approvals have no project_id column; resolve it first.
create or replace function broadcast_message_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; v_project text;
begin
  r := coalesce(new, old);
  if r.parent_kind = 'comm' then
    select project_id into v_project from comms where id = r.parent_id;
  else
    select project_id into v_project from input_requests where id = r.parent_id;
  end if;
  if v_project is not null then
    begin
      perform realtime.broadcast_changes('proj:' || v_project, tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
    exception when others then null;
    end;
  end if;
  return r;
end; $$;

create or replace function broadcast_approval_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; v_project text;
begin
  r := coalesce(new, old);
  select project_id into v_project from versions where id = r.version_id;
  if v_project is not null then
    begin
      perform realtime.broadcast_changes('proj:' || v_project, tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
    exception when others then null;
    end;
  end if;
  return r;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['project_fields','field_rows','versions',
                           'comms','input_requests','discovery_entries'] loop
    execute format('drop trigger if exists %I on %I', t || '_bcast', t);
    execute format('create trigger %I after insert or update or delete on %I
                    for each row execute function broadcast_project_change()', t || '_bcast', t);
  end loop;
end $$;

drop trigger if exists messages_bcast on messages;
create trigger messages_bcast after insert or update or delete on messages
  for each row execute function broadcast_message_change();
drop trigger if exists version_approvals_bcast on version_approvals;
create trigger version_approvals_bcast after insert or update or delete on version_approvals
  for each row execute function broadcast_approval_change();
drop trigger if exists projects_bcast on projects;
create trigger projects_bcast after insert or update or delete on projects
  for each row execute function broadcast_org_change();

-- Authorize private channels: org members (and partners, for their projects)
-- may receive; the same set may send (presence tracking uses send).
drop policy if exists rt_recv on realtime.messages;
create policy rt_recv on realtime.messages for select to authenticated using (
  case
    when realtime.topic() like 'org:%'  then is_org_member(substring(realtime.topic() from 5)::uuid)
    when realtime.topic() like 'proj:%' then
      is_project_member(substring(realtime.topic() from 6))
      or is_project_partner(substring(realtime.topic() from 6))
    else false
  end);
-- Sending on a PROJECT channel (presence + client broadcast) is limited to
-- managers — the only role that can edit the document. Since a manager can
-- already make any change through the audited RPCs, a forged broadcast grants
-- them nothing new; and a read-only viewer therefore cannot broadcast
-- fabricated live edits onto teammates' screens. Partners and SMEs receive
-- only. Database state is never touched by broadcast either way.
-- Org channel send stays member-wide (dashboard presence, no document data).
drop policy if exists rt_send on realtime.messages;
create policy rt_send on realtime.messages for insert to authenticated with check (
  case
    when realtime.topic() like 'org:%'  then is_org_member(substring(realtime.topic() from 5)::uuid)
    when realtime.topic() like 'proj:%' then is_project_manager(substring(realtime.topic() from 6))
    else false
  end);

-- ----------------------------------------------------------------------------
-- 9) Write RPCs — the only mutation path for racy structures
-- ----------------------------------------------------------------------------

-- 9.1 Scalar field save with optimistic concurrency.
-- Returns: {ok:true, rev:N}                       — saved
--          {ok:false, conflict:true, rev:N,       — stale base; caller merges
--           value:<current>, by:<who>, at:<when>}
create or replace function save_field(
  p_project text, p_field text, p_value jsonb, p_base_rev integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_rev integer; v_cur project_fields%rowtype;
begin
  v_org := project_org(p_project);
  if v_org is null or not is_org_manager(v_org) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if pg_column_size(p_value) > 262144 then          -- 256 KB per answer
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;

  if p_base_rev is null or p_base_rev = 0 then
    insert into project_fields(project_id, field_id, value, rev, updated_by, updated_by_name)
    values (p_project, p_field, p_value, 1, auth.uid(), current_display_name())
    on conflict (project_id, field_id) do nothing;
    if found then
      update projects set updated_at = now() where id = p_project;
      return jsonb_build_object('ok', true, 'rev', 1);
    end if;
    -- Row appeared concurrently: fall through and report the conflict.
  else
    update project_fields
       set value = p_value, rev = rev + 1,
           updated_by = auth.uid(), updated_by_name = current_display_name(), updated_at = now()
     where project_id = p_project and field_id = p_field and rev = p_base_rev
    returning rev into v_rev;
    if v_rev is not null then
      update projects set updated_at = now() where id = p_project;
      return jsonb_build_object('ok', true, 'rev', v_rev);
    end if;
  end if;

  select * into v_cur from project_fields where project_id = p_project and field_id = p_field;
  if v_cur.project_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', false, 'conflict', true, 'rev', v_cur.rev,
    'value', v_cur.value, 'by', v_cur.updated_by_name, 'at', v_cur.updated_at);
end; $$;
grant execute on function save_field(text, text, jsonb, integer) to authenticated;

-- 9.2 Repeating rows: insert (id null) or rev-checked update.
create or replace function upsert_row(
  p_project text, p_field text, p_id uuid, p_data jsonb,
  p_pos double precision default null, p_base_rev integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_row field_rows%rowtype; v_k integer; v_pos double precision;
begin
  v_org := project_org(p_project);
  if v_org is null or not is_org_manager(v_org) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if pg_column_size(p_data) > 131072 then           -- 128 KB per row
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;

  if p_id is null then
    -- Serialize k allocation per (project, field): two simultaneous adds get
    -- distinct k values and distinct rows. This was v1's #1 data-loss bug.
    perform pg_advisory_xact_lock(hashtextextended(p_project || '/' || p_field, 42));
    select coalesce(max(k), 0) + 1 into v_k from field_rows
      where project_id = p_project and field_id = p_field;
    select coalesce(max(pos), 0) + 1 into v_pos from field_rows
      where project_id = p_project and field_id = p_field and not deleted;
    insert into field_rows(project_id, field_id, k, data, pos, updated_by, updated_by_name)
    values (p_project, p_field, v_k, coalesce(p_data, '{}'::jsonb), coalesce(p_pos, v_pos),
            auth.uid(), current_display_name())
    returning * into v_row;
  else
    update field_rows
       set data = coalesce(p_data, data), pos = coalesce(p_pos, pos), rev = rev + 1,
           updated_by = auth.uid(), updated_by_name = current_display_name(), updated_at = now()
     where id = p_id and project_id = p_project
       and (p_base_rev is null or rev = p_base_rev)
    returning * into v_row;
    if v_row.id is null then
      select * into v_row from field_rows where id = p_id;
      if v_row.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
      return jsonb_build_object('ok', false, 'conflict', true, 'rev', v_row.rev,
        'data', v_row.data, 'by', v_row.updated_by_name, 'at', v_row.updated_at);
    end if;
  end if;

  update projects set updated_at = now() where id = p_project;
  return jsonb_build_object('ok', true, 'id', v_row.id, 'k', v_row.k, 'rev', v_row.rev, 'pos', v_row.pos);
end; $$;
grant execute on function upsert_row(text, text, uuid, jsonb, double precision, integer) to authenticated;

create or replace function delete_row(p_project text, p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not is_project_manager(p_project) then return false; end if;
  update field_rows set deleted = true, rev = rev + 1,
         updated_by = auth.uid(), updated_by_name = current_display_name(), updated_at = now()
   where id = p_id and project_id = p_project and not deleted;
  if found then update projects set updated_at = now() where id = p_project; end if;
  return found;
end; $$;
grant execute on function delete_row(text, uuid) to authenticated;

-- 9.3 Version creation: seq and label allocated under a project lock, so two
-- managers clicking Generate at once produce v1.4 and v1.5 — never two v1.4s.
create or replace function create_version(
  p_project text, p_major boolean, p_note text, p_snapshot jsonb, p_build text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_seq integer; v_maj integer; v_min integer; v_label text; v_prev text; v_id uuid;
begin
  v_org := project_org(p_project);
  if v_org is null or not is_org_manager(v_org) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ver/' || p_project, 42));

  select coalesce(max(seq), 0) + 1 into v_seq from versions where project_id = p_project;
  select label into v_prev from versions where project_id = p_project order by seq desc limit 1;
  if v_prev is null then
    v_label := '1.0';
  else
    v_maj := coalesce(nullif(split_part(v_prev, '.', 1), ''), '1')::integer;
    v_min := coalesce(nullif(split_part(v_prev, '.', 2), ''), '0')::integer;
    v_label := case when p_major then (v_maj + 1) || '.0' else v_maj || '.' || (v_min + 1) end;
  end if;

  insert into versions(project_id, seq, label, note, author_name, build, snapshot)
  values (p_project, v_seq, v_label, coalesce(p_note, ''), current_display_name(),
          coalesce(p_build, ''), p_snapshot)
  returning id into v_id;

  perform log_activity(v_org, p_project, 'version.created', 'version', v_id::text,
    'Generated v' || v_label, jsonb_build_object('seq', v_seq, 'label', v_label));
  return jsonb_build_object('ok', true, 'id', v_id, 'seq', v_seq, 'label', v_label);
end; $$;
grant execute on function create_version(text, boolean, text, jsonb, text) to authenticated;

-- 9.4 Version status state machine + approvals.
create or replace function version_set_status(p_version uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v versions%rowtype; v_allowed boolean;
begin
  select * into v from versions where id = p_version;
  if v.id is null or not is_project_manager(v.project_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  v_allowed := (v.status, p_status) in (
    ('draft','in_review'),
    ('in_review','approved'), ('in_review','changes_requested'), ('in_review','draft'),
    ('changes_requested','in_review'), ('approved','in_review'));
  if not v_allowed then
    return jsonb_build_object('ok', false, 'error', 'bad_transition', 'from', v.status);
  end if;
  if p_status = 'approved'
     and exists(select 1 from version_approvals a where a.version_id = p_version and a.status <> 'approved') then
    return jsonb_build_object('ok', false, 'error', 'approvals_pending');
  end if;
  update versions set status = p_status where id = p_version;
  perform log_activity(project_org(v.project_id), v.project_id, 'version.status', 'version',
    p_version::text, 'v' || v.label || ' → ' || p_status, jsonb_build_object('from', v.status, 'to', p_status));
  return jsonb_build_object('ok', true, 'status', p_status);
end; $$;
grant execute on function version_set_status(uuid, text) to authenticated;

-- A manager may decide any slot; the ASSIGNED team member may decide their own
-- (in-app approval routing). Everyone else is refused. The provenance trigger
-- still stamps decided_by/decided_at from auth.uid(), so a sign-off is always
-- attributed to whoever actually made it.
create or replace function approval_decide(p_approval uuid, p_status text, p_comment text default '')
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ver versions%rowtype; v_uid uuid; v_self boolean;
begin
  select v.* into v_ver from versions v
    join version_approvals a on a.version_id = v.id where a.id = p_approval;
  if v_ver.id is null then return false; end if;
  select approver_user_id into v_uid from version_approvals where id = p_approval;
  v_self := v_uid is not null and v_uid = auth.uid();
  if not (is_project_manager(v_ver.project_id)
          or (v_self and is_project_member(v_ver.project_id))) then
    return false;
  end if;
  if p_status not in ('pending','approved','changes_requested') then return false; end if;
  update version_approvals
     set status = p_status, comment = coalesce(p_comment, ''),
         decided_by = auth.uid(), decided_at = case when p_status = 'pending' then null else now() end
   where id = p_approval;
  perform log_activity(project_org(v_ver.project_id), v_ver.project_id, 'approval.' || p_status,
    'approval', p_approval::text, 'v' || v_ver.label || ' approval ' || p_status, '{}'::jsonb);
  return true;
end; $$;
grant execute on function approval_decide(uuid, text, text) to authenticated;

-- Every pending slot assigned to the caller on an in-review version: the
-- "waiting on you" flag shown on the dashboard.
create or replace function my_open_approvals()
returns table(approval_id uuid, project_id text, project_name text,
              version_id uuid, version_label text, version_seq int, approver_role text)
language sql security definer set search_path = public as $$
  select a.id, v.project_id, p.name, v.id, v.label, v.seq, a.approver_role
    from version_approvals a
    join versions v on v.id = a.version_id
    join projects p on p.id = v.project_id
   where a.approver_user_id = auth.uid()
     and a.status = 'pending'
     and v.status = 'in_review'
   order by v.seq desc;
$$;
grant execute on function my_open_approvals() to authenticated;

-- Team roster with display names, for the approver "assign to" picker.
create or replace function org_members_named(p_org uuid)
returns table(user_id uuid, email text, display_name text)
language sql security definer set search_path = public as $$
  select m.user_id, m.email, coalesce(up.display_name, '')
    from org_members m
    left join user_profiles up on up.user_id = m.user_id
   where m.org_id = p_org
     and exists(select 1 from org_members me where me.org_id = p_org and me.user_id = auth.uid());
$$;
grant execute on function org_members_named(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 10) Shares (SME links) — server-generated tokens; v1 get_share still serves
-- ----------------------------------------------------------------------------
create or replace function share_put(
  p_project text, p_kind text, p_seq integer, p_payload jsonb, p_token text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_token text;
begin
  v_org := project_org(p_project);
  if v_org is null or not is_org_manager(v_org) then return null; end if;
  v_token := coalesce(p_token,
    (select token from shares where project_id = p_project and kind = p_kind and version_seq = p_seq
       and org_id = v_org limit 1),
    url_token());
  -- The conflict update is fenced to the caller's own org and project: a
  -- colliding token that belongs to someone else is refused, never overwritten.
  insert into shares(token, org_id, project_id, version_seq, kind, payload, revoked, updated_at)
  values (v_token, v_org, p_project, p_seq, p_kind, p_payload, false, now())
  on conflict (token) do update set payload = excluded.payload, revoked = false, updated_at = now()
  where shares.org_id = v_org and shares.project_id = p_project;
  if not found then return null; end if;
  return v_token;
end; $$;
grant execute on function share_put(text, text, integer, jsonb, text) to authenticated;

create or replace function share_revoke(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from shares where token = p_token;
  if v_org is null or not is_org_manager(v_org) then return false; end if;
  update shares set revoked = true, updated_at = now() where token = p_token;
  return true;
end; $$;
grant execute on function share_revoke(text) to authenticated;

-- SME submission → comms row + reply token for an accountless two-way thread.
create or replace function submit_share_v2(p_token text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s shares%rowtype; v_reply text; v_id uuid; v_origin text;
begin
  select * into s from shares where token = p_token and revoked = false;
  if s.token is null or s.org_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_link');
  end if;
  if length(coalesce(p_payload->>'body', '')) > 20000 or length(coalesce(p_payload->>'title', '')) > 500 then
    return jsonb_build_object('ok', false, 'error', 'too_long');
  end if;
  v_origin := case s.kind when 'brief' then 'brief' when 'pilot' then 'app' else 'sme' end;
  -- Throttle: this endpoint is reachable with only a link. 60 submissions per
  -- project per hour covers a busy pilot sprint and stops a flood. An advisory
  -- lock per project serializes the count-then-insert so parallel calls cannot
  -- each read a below-limit count and all slip through (TOCTOU). The cap counts
  -- ALL anon origins together, so it can't be multiplied by splitting kinds.
  perform pg_advisory_xact_lock(hashtextextended('anon/' || s.project_id, 7));
  if (select count(*) from comms c
       where c.project_id = s.project_id and c.origin in ('brief','app','sme')
         and c.created_at > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_reply := url_token();
  insert into comms(org_id, project_id, origin, version_seq, author_name, author_email,
                    title, body, steps, fb_type, severity, verdict, reply_token)
  values (s.org_id, s.project_id, v_origin, nullif(s.version_seq, 0),
          left(coalesce(p_payload->>'name',''), 200), left(coalesce(p_payload->>'email',''), 320),
          left(coalesce(p_payload->>'title',''), 500), coalesce(p_payload->>'body',''),
          coalesce(p_payload->>'steps',''), left(coalesce(p_payload->>'type',''), 40),
          left(coalesce(p_payload->>'severity',''), 40), left(coalesce(p_payload->>'verdict',''), 60), v_reply)
  returning id into v_id;
  perform log_activity(s.org_id, s.project_id, 'comm.received', 'comm', v_id::text,
    'New ' || v_origin || ' submission', jsonb_build_object('kind', s.kind));
  return jsonb_build_object('ok', true, 'reply_token', v_reply);
end; $$;
grant execute on function submit_share_v2(text, jsonb) to anon, authenticated;

-- Accountless SME thread reached by a durable personal link. Returns the one
-- persistent thread for that token PLUS the current branded PRD (latest
-- published brief, live brand overlaid) so the SME's link is a real workspace:
-- read-only PRD + one continuous conversation, device-independent and stable
-- across versions. `brief` is null until the team publishes a brief.
create or replace function sme_thread(p_reply_token text)
returns jsonb language sql security definer stable set search_path = public as $$
  select case when c.id is null then jsonb_build_object('ok', false) else jsonb_build_object(
    'ok', true, 'title', c.title, 'body', c.body, 'status', c.status, 'at', c.created_at,
    'name', c.author_name, 'product', pr.name,
    'brief', (select s.payload || jsonb_build_object('logo', pr.brand_logo, 'brandLabel', pr.brand_label)
              from shares s where s.project_id = c.project_id and s.kind = 'brief' and s.revoked = false
              order by s.version_seq desc limit 1),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('from', m.author_kind, 'name', m.author_name,
                                          'body', m.body, 'at', m.created_at) order by m.created_at)
      from messages m where m.parent_kind = 'comm' and m.parent_id = c.id), '[]'::jsonb),
    -- The SME's own uploads on their durable thread, so they persist across visits.
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'file_name', a.file_name, 'size_bytes', a.size_bytes,
                                          'mime', a.mime, 'scan_status', a.scan_status, 'created_at', a.created_at) order by a.created_at)
      from attachments a where a.comm_id = c.id), '[]'::jsonb))
  end
  from (select 1) one
  left join comms c on c.reply_token = p_reply_token
  left join projects pr on pr.id = c.project_id;
$$;
grant execute on function sme_thread(text) to anon, authenticated;

create or replace function sme_reply(p_reply_token text, p_body text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c comms%rowtype;
begin
  select * into c from comms where reply_token = p_reply_token;
  if c.id is null or coalesce(trim(p_body), '') = '' or length(p_body) > 20000 then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('smerep/' || c.id::text, 7));
  if (select count(*) from messages m
       where m.parent_kind = 'comm' and m.parent_id = c.id
         and m.created_at > now() - interval '1 hour') >= 30 then
    return false;
  end if;
  insert into messages(org_id, parent_kind, parent_id, author_kind, author_name, body)
  values (c.org_id, 'comm', c.id, 'sme', coalesce(nullif(c.author_name, ''), 'Reviewer'), p_body);
  update comms set updated_at = now(), status = case when status = 'closed' then 'new' else status end
    where id = c.id;
  return true;
end; $$;
grant execute on function sme_reply(text, text) to anon, authenticated;

-- Durable SME workspace. A manager seats an SME (name + email) on a PRD; this
-- finds-or-creates ONE persistent thread for that (project, email) and returns
-- its stable reply_token. Re-seating the same email returns the same token, so
-- every exchange with that SME on that PRD stays in one place across versions —
-- the SME's personal link never changes and needs no login. url_token() lives
-- in extensions; keep it on the search_path.
create or replace function sme_seat(p_project text, p_name text, p_email text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_org uuid; c comms%rowtype; v_email text; v_name text; v_existed boolean;
begin
  v_org := project_org(p_project);
  if v_org is null or not is_org_manager(v_org) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  v_email := lower(nullif(trim(p_email), ''));
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'email_required'); end if;
  v_name := left(coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)), 200);
  -- Serialize concurrent seating of the same SME so we never mint two threads.
  perform pg_advisory_xact_lock(hashtextextended('smeseat/' || p_project || '/' || v_email, 11));
  select * into c from comms
    where project_id = p_project and origin = 'sme' and lower(author_email) = v_email
    order by created_at limit 1;
  v_existed := c.id is not null;
  if not v_existed then
    insert into comms(org_id, project_id, origin, author_name, author_email, title, body, reply_token)
    values (v_org, p_project, 'sme', v_name, v_email, 'SME review workspace', '', url_token())
    returning * into c;
    perform log_activity(v_org, p_project, 'sme.seated', 'comm', c.id::text,
      'Seated SME ' || v_name, jsonb_build_object('email', v_email));
  elsif v_name <> '' and c.author_name is distinct from v_name then
    update comms set author_name = v_name where id = c.id returning * into c;
  end if;
  return jsonb_build_object('ok', true, 'reply_token', c.reply_token,
    'name', c.author_name, 'email', c.author_email, 'existed', v_existed);
end; $$;
grant execute on function sme_seat(text, text, text) to authenticated;

-- The SME roster for a PRD (managers only): who is seated, their personal link
-- token, and how many times they have written back. Powers the team-side list.
create or replace function sme_seats(p_project text)
returns jsonb language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', c.author_name, 'email', c.author_email, 'reply_token', c.reply_token, 'at', c.created_at,
    'replies', (select count(*) from messages m
                where m.parent_kind = 'comm' and m.parent_id = c.id and m.author_kind = 'sme')
  ) order by c.created_at), '[]'::jsonb)
  from comms c
  where c.project_id = p_project and c.origin = 'sme' and c.reply_token is not null
    and is_org_manager(c.org_id);
$$;
grant execute on function sme_seats(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6c) Attachments — files the team, partners, and seated SMEs upload onto a
--     conversation. The bytes live in the private 'attachments' Storage bucket
--     (see storage-attachments.sql); this table is the metadata + audit anchor.
--     Every row is written by attachment_add, which the upload edge function
--     calls only AFTER it type/size-checks and virus-scans the file — so a
--     stored file is always clean or explicitly flagged, never silently unsafe.
-- ----------------------------------------------------------------------------
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  comm_id uuid references comms(id) on delete cascade,        -- the thread it lands on
  message_id uuid references messages(id) on delete set null,
  uploader_kind text not null check (uploader_kind in ('team','partner','sme')),
  uploader_name text not null default '',
  uploader_user uuid,
  file_name text not null,
  mime text not null default '',
  size_bytes bigint not null default 0,
  storage_path text not null unique,                          -- key in the bucket
  scan_status text not null default 'unscanned'
    check (scan_status in ('clean','unscanned','infected','error')),
  scan_detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists attachments_proj on attachments(project_id, created_at desc);
create index if not exists attachments_comm on attachments(comm_id, created_at);
alter table attachments enable row level security;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attachments_caps') then
    alter table attachments add constraint attachments_caps
      check (size_bytes >= 0 and size_bytes <= 26214400
             and length(file_name) <= 300 and length(storage_path) <= 600) not valid;
  end if;
end $$;

-- Team members read their org's attachments; managers may delete. Nobody writes
-- directly — inserts go through attachment_add (service role, post-scan).
drop policy if exists attach_member_read on attachments;
create policy attach_member_read on attachments for select using (is_org_member(org_id));
drop policy if exists attach_manager_delete on attachments;
create policy attach_manager_delete on attachments for delete using (is_org_manager(org_id));
grant select, delete on attachments to authenticated;
-- Live: a new file surfaces in the team inbox + Files list within the second.
drop trigger if exists attachments_bcast on attachments;
create trigger attachments_bcast after insert or update or delete on attachments
  for each row execute function broadcast_project_change();

-- The single validated insert path. The upload edge function calls this with the
-- service role after it has scanned the file and put the bytes in Storage.
create or replace function attachment_add(
  p_project text, p_comm uuid, p_message uuid,
  p_uploader_kind text, p_uploader_name text, p_uploader_user uuid,
  p_file_name text, p_mime text, p_size bigint, p_path text,
  p_scan_status text, p_scan_detail text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_id uuid;
  v_allow text[] := array[
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv','text/markdown',
    'image/png','image/jpeg','image/gif','image/webp','image/heic','application/zip'];
begin
  v_org := project_org(p_project);
  if v_org is null then return jsonb_build_object('ok', false, 'error', 'unknown_project'); end if;
  if p_uploader_kind is null or p_uploader_kind not in ('team','partner','sme') then
    return jsonb_build_object('ok', false, 'error', 'bad_uploader'); end if;
  if coalesce(p_size, 0) <= 0 or p_size > 26214400 then
    return jsonb_build_object('ok', false, 'error', 'bad_size'); end if;
  if p_mime is null or not (p_mime = any(v_allow)) then
    return jsonb_build_object('ok', false, 'error', 'type_not_allowed'); end if;
  if p_scan_status = 'infected' then
    return jsonb_build_object('ok', false, 'error', 'infected'); end if;
  if p_scan_status is null or not (p_scan_status = any(array['clean','unscanned','error'])) then
    return jsonb_build_object('ok', false, 'error', 'bad_scan_status'); end if;
  if p_comm is not null and not exists (select 1 from comms c where c.id = p_comm and c.project_id = p_project) then
    return jsonb_build_object('ok', false, 'error', 'bad_thread'); end if;
  -- Throttle external floods: 40 files/hour/project.
  perform pg_advisory_xact_lock(hashtextextended('attach/' || p_project, 13));
  if (select count(*) from attachments a
        where a.project_id = p_project and a.created_at > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  insert into attachments(org_id, project_id, comm_id, message_id, uploader_kind, uploader_name,
                          uploader_user, file_name, mime, size_bytes, storage_path, scan_status, scan_detail)
  values (v_org, p_project, p_comm, p_message, p_uploader_kind,
          left(coalesce(p_uploader_name, ''), 200), p_uploader_user,
          left(p_file_name, 300), left(coalesce(p_mime, ''), 120), p_size, p_path,
          coalesce(p_scan_status, 'unscanned'), left(coalesce(p_scan_detail, ''), 500))
  returning id into v_id;

  if p_comm is not null then
    update comms set updated_at = now(), status = case when status = 'closed' then 'new' else status end
      where id = p_comm;
  end if;
  perform log_activity(v_org, p_project, 'attachment.added', 'attachment', v_id::text,
    coalesce(nullif(p_uploader_name, ''), 'Someone') || ' attached ' || left(p_file_name, 120),
    jsonb_build_object('mime', p_mime, 'size', p_size, 'scan', p_scan_status, 'by', p_uploader_kind));
  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;
revoke execute on function attachment_add(text, uuid, uuid, text, text, uuid, text, text, bigint, text, text, text) from public;
do $$ begin
  execute 'grant execute on function attachment_add(text, uuid, uuid, text, text, uuid, text, text, bigint, text, text, text) to service_role';
exception when undefined_object then null; end $$;

-- Authorize a signed-in uploader (team or partner) against a thread. The upload
-- edge function verifies the JWT, then passes the user id here to resolve who
-- they are and which project/org the thread belongs to.
create or replace function attachment_uploader(p_comm uuid, p_user uuid)
returns jsonb language sql security definer stable set search_path = public as $$
  select case
    when c.id is null then jsonb_build_object('ok', false, 'error', 'bad_thread')
    when exists (select 1 from org_members m where m.org_id = c.org_id and m.user_id = p_user)
      then jsonb_build_object('ok', true, 'kind', 'team', 'org_id', c.org_id, 'project_id', c.project_id,
             'name', coalesce((select display_name from user_profiles up where up.user_id = p_user), 'Team'))
    when exists (select 1 from partners pt join partner_access pa on pa.partner_id = pt.id
                 where pt.user_id = p_user and pa.project_id = c.project_id)
      then jsonb_build_object('ok', true, 'kind', 'partner', 'org_id', c.org_id, 'project_id', c.project_id,
             'name', coalesce((select name from partners where user_id = p_user and org_id = c.org_id limit 1), 'Partner'))
    else jsonb_build_object('ok', false, 'error', 'forbidden')
  end
  from (select 1) one left join comms c on c.id = p_comm;
$$;
-- Resolve a seated SME's durable thread from their personal reply_token.
create or replace function attachment_sme_target(p_reply_token text)
returns jsonb language sql security definer stable set search_path = public as $$
  select case when c.id is null then jsonb_build_object('ok', false, 'error', 'invalid_link')
    else jsonb_build_object('ok', true, 'org_id', c.org_id, 'project_id', c.project_id,
           'comm_id', c.id, 'name', coalesce(nullif(c.author_name, ''), 'Reviewer')) end
  from (select 1) one left join comms c on c.reply_token = p_reply_token and c.origin = 'sme';
$$;
do $$ begin
  execute 'grant execute on function attachment_uploader(uuid, uuid) to service_role';
  execute 'grant execute on function attachment_sme_target(text) to service_role';
exception when undefined_object then null; end $$;

-- Input-request intake (tokened, accountless).
create or replace function request_view(p_token text)
returns jsonb language sql security definer stable set search_path = public as $$
  select case when r.id is null then jsonb_build_object('ok', false) else jsonb_build_object(
    'ok', true, 'title', r.title, 'prompt', r.prompt, 'status', r.status,
    'product', (select name from projects where id = r.project_id),
    'thread', coalesce((
      select jsonb_agg(jsonb_build_object('name', m.author_name, 'body', m.body, 'at', m.created_at)
                       order by m.created_at)
      from messages m where m.parent_kind = 'request' and m.parent_id = r.id and m.author_kind = 'team'),
      '[]'::jsonb))
  end
  from (select 1) one left join input_requests r on r.token = p_token;
$$;
grant execute on function request_view(text) to anon, authenticated;

create or replace function request_submit(p_token text, p_name text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r input_requests%rowtype; v_reply text; v_id uuid;
begin
  select * into r from input_requests where token = p_token and status = 'open';
  if r.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_link'); end if;
  if coalesce(trim(p_body), '') = '' or length(p_body) > 20000 then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('req/' || r.id::text, 7));
  if (select count(*) from comms c
       where c.request_id = r.id and c.created_at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_reply := url_token();
  insert into comms(org_id, project_id, origin, request_id, author_name, title, body, reply_token)
  values (r.org_id, r.project_id, 'sme', r.id, left(coalesce(p_name, ''), 200),
          'Re: ' || r.title, p_body, v_reply)
  returning id into v_id;
  perform log_activity(r.org_id, r.project_id, 'comm.received', 'comm', v_id::text,
    'Input received: ' || r.title, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'reply_token', v_reply);
end; $$;
grant execute on function request_submit(text, text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 11) Partner portal RPCs (account-holding external collaborators)
-- ----------------------------------------------------------------------------

-- Partner-editable profile. Columns are additive and default-safe for v1 rows.
alter table partners add column if not exists title text not null default '';
alter table partners add column if not exists company text not null default '';

create or replace function partner_update_profile(p_name text, p_title text, p_company text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update partners
     set name = left(coalesce(trim(p_name), ''), 120),
         title = left(coalesce(trim(p_title), ''), 120),
         company = left(coalesce(trim(p_company), ''), 160)
   where user_id = auth.uid();
  return found;
end; $$;
grant execute on function partner_update_profile(text, text, text) to authenticated;
create or replace function partner_projects_v2()
returns jsonb language sql security definer stable set search_path = public as $$
  -- Every PRD assigned to the signed-in partner. `name` is the project's own
  -- name, so an assignment with no published brief yet still shows a real title
  -- instead of its internal id. The brief payload is a version snapshot, but the
  -- collaborator logo/label is a *current* property of the project, so overlay
  -- the live brand at read time (jsonb || overwrites the two keys) — a logo added
  -- after the brief was shared reaches the partner with no re-publish.
  select coalesce(jsonb_agg(jsonb_build_object(
    'project_id', pa.project_id,
    'name', pr.name,
    'payload', (select s.payload || jsonb_build_object('logo', pr.brand_logo, 'brandLabel', pr.brand_label)
                 from shares s
                 where s.project_id = pa.project_id and s.kind = 'brief' and s.revoked = false
                 order by s.version_seq desc limit 1))), '[]'::jsonb)
  from partner_access pa
  join partners p on p.id = pa.partner_id
  join projects pr on pr.id = pa.project_id
  where p.user_id = auth.uid()
    -- Only surface PRDs the team has actually published a brief for: a partner
    -- should see things ready to review, not assignments still being drafted.
    and exists (select 1 from shares s2
                where s2.project_id = pa.project_id and s2.kind = 'brief' and s2.revoked = false);
$$;
grant execute on function partner_projects_v2() to authenticated;

-- Same live-brand overlay for the accountless SME brief and the read-only
-- presentation link (both served by get_share). Redefines the v1 function so an
-- uploaded logo shows on every external surface the moment it is saved, even for
-- links shared before the logo existed. Falls back to the stored payload's own
-- brand when a share has no backing project row (defensive; all shares do).
create or replace function get_share(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select case when p.id is null then s.payload
              else s.payload || jsonb_build_object('logo', p.brand_logo, 'brandLabel', p.brand_label) end
  from shares s left join projects p on p.id = s.project_id
  where s.token = p_token and s.revoked = false limit 1;
$$;
grant execute on function get_share(text) to anon, authenticated;

-- The public read-only presentation token for an assigned project: the latest
-- non-revoked brief share the team has already published. Returns nothing if
-- no public brief exists. Creates nothing; only surfaces an existing token so
-- the partner can share the same read-only PRD the team made public.
create or replace function partner_present_token(p_project text)
returns jsonb language sql security definer stable set search_path = public as $$
  select case when s.token is null then jsonb_build_object('ok', false)
              else jsonb_build_object('ok', true, 'token', s.token, 'seq', s.version_seq) end
  from (select 1) one
  left join shares s on s.project_id = p_project and s.kind = 'brief' and s.revoked = false
       and exists (select 1 from partner_access pa join partners p on p.id = pa.partner_id
                   where pa.project_id = p_project and p.user_id = auth.uid())
  order by s.version_seq desc
  limit 1;
$$;
grant execute on function partner_present_token(text) to authenticated;

create or replace function partner_thread_v2(p_project text)
returns jsonb language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'ref', c.ref, 'title', c.title, 'body', c.body, 'status', c.status, 'at', c.created_at,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('from', m.author_kind, 'name', m.author_name,
                                          'body', m.body, 'at', m.created_at) order by m.created_at)
      from messages m where m.parent_kind = 'comm' and m.parent_id = c.id), '[]'::jsonb),
    -- The partner's own uploads on this thread, so they persist across reloads.
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'file_name', a.file_name, 'size_bytes', a.size_bytes,
                                          'mime', a.mime, 'scan_status', a.scan_status, 'created_at', a.created_at) order by a.created_at)
      from attachments a where a.comm_id = c.id), '[]'::jsonb))
    order by c.created_at), '[]'::jsonb)
  from comms c
  where c.project_id = p_project
    and c.partner_id in (select id from partners where user_id = auth.uid());
$$;
grant execute on function partner_thread_v2(text) to authenticated;

create or replace function partner_post(p_project text, p_body text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_pid uuid; v_org uuid; v_name text; v_id uuid; v_n int; v_title text; v_ref text;
begin
  select p.id, p.org_id, coalesce(nullif(trim(p.name), ''), 'Partner')
    into v_pid, v_org, v_name
  from partners p join partner_access pa on pa.partner_id = p.id
  where p.user_id = auth.uid() and pa.project_id = p_project limit 1;
  if v_pid is null or coalesce(trim(p_body), '') = '' or length(p_body) > 20000 then return false; end if;
  -- A self-describing headline from the note's first line, so no two notes read
  -- the same "Partner note" in the inbox.
  v_title := left(regexp_replace(split_part(btrim(p_body), E'\n', 1), '\s+', ' ', 'g'), 72);
  if length(v_title) < length(regexp_replace(btrim(p_body), '\s+', ' ', 'g')) then v_title := v_title || '…'; end if;
  if v_title = '' then v_title := 'Partner note'; end if;
  -- A stable per-project reference so every partner note is trackable: PN-1, PN-2…
  -- A monotonic counter means references are never reused, even after a delete;
  -- the row update also serializes concurrent posts.
  update projects set partner_note_seq = partner_note_seq + 1 where id = p_project returning partner_note_seq into v_n;
  v_ref := 'PN-' || v_n;
  insert into comms(org_id, project_id, origin, partner_id, author_name, title, body, ref)
  values (v_org, p_project, 'partner', v_pid, v_name, v_title, p_body, v_ref)
  returning id into v_id;
  perform log_activity(v_org, p_project, 'comm.received', 'comm', v_id::text,
    v_ref || ' from ' || v_name, jsonb_build_object('ref', v_ref));
  return true;
end; $$;
grant execute on function partner_post(text, text) to authenticated;

create or replace function partner_reply(p_comm uuid, p_body text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c comms%rowtype; v_name text;
begin
  select * into c from comms where id = p_comm;
  if c.id is null or coalesce(trim(p_body), '') = '' or length(p_body) > 20000 then return false; end if;
  -- The caller must be the comm's partner AND still hold access to its project.
  -- (partner_post enforces the same; without the partner_access join a
  --  de-assigned partner could keep replying on historical threads.)
  select coalesce(nullif(trim(p.name), ''), 'Partner') into v_name
    from partners p
    join partner_access pa on pa.partner_id = p.id and pa.project_id = c.project_id
    where p.id = c.partner_id and p.user_id = auth.uid();
  if v_name is null then return false; end if;
  insert into messages(org_id, parent_kind, parent_id, author_kind, author_name, body)
  values (c.org_id, 'comm', c.id, 'partner', v_name, p_body);
  update comms set updated_at = now() where id = c.id;
  return true;
end; $$;
grant execute on function partner_reply(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 12) Session context (one round-trip at boot)
-- ----------------------------------------------------------------------------
create or replace function v2_context()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'display_name', coalesce((select display_name from user_profiles where user_id = auth.uid()), ''),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object('org_id', m.org_id, 'org_name', o.name, 'role', m.role))
      from org_members m join orgs o on o.id = m.org_id where m.user_id = auth.uid()), '[]'::jsonb),
    'partner', (select jsonb_build_object('id', p.id, 'org_id', p.org_id, 'name', p.name,
                                          'title', p.title, 'company', p.company, 'email', p.email)
                from partners p where p.user_id = auth.uid() limit 1));
$$;
grant execute on function v2_context() to authenticated;

-- ----------------------------------------------------------------------------
-- 13) Grants (RLS still gates every row)
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on projects, comms, messages, read_marks,
  input_requests, discovery_entries, versions, version_approvals, user_profiles to authenticated;
grant select on project_fields, field_rows, activity to authenticated;

-- Defense in depth: this schema shares a project with v1, whose setup ran a
-- blanket `grant ... on all tables to authenticated`. Revoke write on the
-- three tables that must only ever be written by their SECURITY DEFINER RPCs,
-- so their protection does not rest on the absence of an RLS policy alone.
-- (project_fields/field_rows → save_field/upsert_row/delete_row; activity is
--  the append-only audit trail, written only by log_activity.)
revoke insert, update, delete on project_fields, field_rows, activity from authenticated;
revoke insert, update, delete on activity from anon;

-- New foreign-key / RLS-subquery indexes (partner paths run on every partner
-- RPC and every project channel subscribe; without these they seq-scan).
create index if not exists partners_user on partners(user_id);
create index if not exists partner_access_project on partner_access(project_id);

notify pgrst, 'reload schema';
