-- fix-updates.sql - run once on the live database to add weekly updates.
-- Idempotent: safe to run again. Fresh installs get this from schema.sql (16).
--
-- A weekly update is a published, immutable digest of what moved on the
-- record: the asks, the movement, the open items - every line derived from
-- record truth (approvals, signatures, gates, health) plus one editorial
-- sentence. It is deliberately NOT a tracker surface: nothing here is
-- hand-maintained status. The row is evidence, like a version: published
-- once, never edited, always renderable at its token link. Next week's
-- digest diffs against this one to age closed items off.
--
-- Writes are RPC-only; members read; the client reads through the token.

create table if not exists updates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  seq integer not null,
  token text not null unique,
  window_from timestamptz,                    -- null on the first update
  window_to timestamptz not null default now(),
  prepared_by text not null default '',       -- the engagement lead's own name line
  payload jsonb not null,                     -- the frozen digest the link renders
  published_by uuid default auth.uid(),
  published_at timestamptz not null default now(),
  revoked boolean not null default false,     -- kill switch for a bad publish; the page says withdrawn
  unique (project_id, seq)
);
create index if not exists upd_proj on updates(project_id, seq desc);
alter table updates enable row level security;

drop policy if exists upd_read on updates;
create policy upd_read on updates for select using (is_project_member(project_id));
grant select on updates to authenticated;
revoke insert, update, delete on updates from authenticated, anon;

-- Publish: seq allocated under a project lock (the create_version discipline),
-- server-generated token, size-capped payload, activity logged. The payload
-- arrives assembled and approved by the composer; publishing freezes it.
create or replace function update_publish(
  p_project text, p_payload jsonb, p_window_from timestamptz default null,
  p_prepared_by text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_seq integer; v_token text; v_id uuid;
begin
  v_org := project_org(p_project);
  if v_org is null or not is_org_manager(v_org) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'bad_payload');
  end if;
  if pg_column_size(p_payload) > 262144 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('upd/' || p_project, 42));
  select coalesce(max(seq), 0) + 1 into v_seq from updates where project_id = p_project;
  v_token := url_token();
  insert into updates(org_id, project_id, seq, token, window_from, prepared_by, payload)
  values (v_org, p_project, v_seq, v_token, p_window_from,
          left(coalesce(trim(p_prepared_by), ''), 120), p_payload)
  returning id into v_id;
  perform log_activity(v_org, p_project, 'update.published', 'update', v_id::text,
    'Weekly update #' || v_seq || ' published', jsonb_build_object('seq', v_seq));
  return jsonb_build_object('ok', true, 'id', v_id, 'seq', v_seq, 'token', v_token);
end; $$;
grant execute on function update_publish(text, jsonb, timestamptz, text) to authenticated;

-- Everything the client's page needs, keyed by token. Revoked rows return
-- a marker instead of the payload, so the page can say "withdrawn" plainly
-- rather than pretending the link never existed.
create or replace function update_context(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select case when u.revoked then
    jsonb_build_object('ok', true, 'revoked', true, 'project', p.name, 'seq', u.seq)
  else
    jsonb_build_object(
      'ok', true, 'revoked', false,
      'project', p.name, 'logo', p.brand_logo, 'brandLabel', p.brand_label,
      'seq', u.seq, 'preparedBy', u.prepared_by,
      'windowFrom', u.window_from, 'windowTo', u.window_to,
      'publishedAt', u.published_at, 'payload', u.payload)
  end
  from updates u
  join projects p on p.id = u.project_id
  where u.token = p_token
  limit 1;
$$;
grant execute on function update_context(text) to anon, authenticated;

create or replace function update_revoke(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare r updates%rowtype;
begin
  select * into r from updates where id = p_id;
  if r.id is null or not is_project_manager(r.project_id) then return false; end if;
  if r.revoked then return true; end if;
  update updates set revoked = true where id = p_id;
  perform log_activity(r.org_id, r.project_id, 'update.revoked', 'update', r.id::text,
    'Weekly update #' || r.seq || ' withdrawn', '{}'::jsonb);
  return true;
end; $$;
grant execute on function update_revoke(uuid) to authenticated;
